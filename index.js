var path = require('path')
var webpack = require('webpack')
var defaults = require('lodash.defaults')
var ExtractTextPlugin = require('extract-text-webpack-plugin')
var getbaseconfig = require('./lib/base-config')
var getpackage = require('./lib/get-package')

module.exports = function (opts) {
  checkRequired(opts)
  var outputfolder = path.resolve(opts.out)

  // add in our defaults
  var spec = defaults(opts, {
    entry: path.resolve(opts.in),
    output: defaults(opts.output || {}, {
      path: outputfolder + '/',
      filename: null,
      cssfilename: null,
      hash: false,
      publicpath: '/'
    }),
    configfile: null,
    isdev: true,
    package: null,
    replace: null,
    port: 3000,
    hostname: 'localhost',
    html: true,
    urlloaderlimit: 10000
  })

  spec.package = getpackage(spec.package)

  if (!spec.output.filename) {
    spec.output.filename = spec.isdev ? '[name].js' : buildfilename(spec.package, spec.output.hash, 'js')
  }

  if (!spec.output.cssfilename) {
    spec.output.cssfilename = spec.isdev ? 'app.css' : buildfilename(spec.package, spec.output.hash, 'css')
  }

  var config = getbaseconfig(spec)

  // re-attach original spec items so they can be accessed from dev-server script
  config.spec = spec

  // check for any module replacements
  if (spec.replace) {
    for (var item in spec.replace) {
      // allow for simple strings
      if (typeof item === 'string') {
        var regex = new regexp('^' + item + '$')
      }
      var newresource = spec.replace[item]
      if (typeof newresource === 'string') {
        newresource = path.resolve(newresource)
      }
      config.plugins.push(new webpack.normalmodulereplacementplugin(regex, newresource))
    }
  }

  // check for any module definitions
  if (spec.define) {
    config.plugins.push(new webpack.defineplugin(spec.define))
  }

  config.module.unknowncontextcritical = false

  // dev specific stuff
  if (spec.isdev) {
    // debugging option
    config.devtool = 'eval'

    // add dev server and hotloading clientside code
    config.entry.app.unshift(
      'webpack-dev-server/client?http://' + spec.hostname + ':' + spec.port,
      'webpack/hot/only-dev-server'
    )

    config.devserver = {
      port: spec.port,
      info: false,
      historyApiFallback: true,
      host: spec.hostname,
      // For some reason simply setting this doesn't seem to be enough
      // which is why we also do the manual entry above and the
      // manual adding of the hot module replacment plugin below
      hot: true
    }

    // add dev plugins
    config.plugins = config.plugins.concat([
      new webpack.HotModuleReplacementPlugin(),
      new webpack.NoErrorsPlugin()
    ])

    config.module.loaders.push(
      {
        test: /\.css$/,
        loader: 'style-loader!css-loader!postcss-loader'
      },
      {
        test: /\.less$/,
        loader: 'style-loader!css-loader!postcss-loader!less-loader'
      },
      {
        test: /\.hbs$/,
        loader: 'handlebars-loader'
      },
      {
        test: /\.(png|gif)$/,
        loader: 'file-loader'
      }
    )

  } else {
    // minify in production
    config.plugins.push(
      new webpack.optimize.DedupePlugin(),
      new webpack.optimize.OccurenceOrderPlugin(true),
      new webpack.optimize.UglifyJsPlugin({
        compress: {
          warnings: false
        },
        output: {
          comments: false
        },
        sourceMap: false
      }),
      new ExtractTextPlugin(config.output.cssFilename, {
        allChunks: true
      }),
      new webpack.DefinePlugin({
        'process.env': {NODE_ENV: JSON.stringify('production')}
      })
    )

    // extract in production
    config.module.loaders.push(
      {
        test: /\.css$/,
        loader: ExtractTextPlugin.extract('style-loader', 'css-loader!postcss-loader')
      },
      {
        test: /\.less/,
        loader: ExtractTextPlugin.extract('style-loader', 'css-loader!postcss-loader!less-loader')
      },
      {
        test: /\.hbs$/,
        loader: 'handlebars-loader'
      },
      {
        test: /\.(png|gif)$/,
        loader: 'file-loader'
      }
    )
  }

  return config
}

function buildFilename (pack, hash, ext) {
  return [
    pack.name,
    // extract-text-plugin uses [contenthash] and webpack uses [hash]
    hash ? (ext === 'css' ? '[contenthash]' : '[hash]') : pack.version,
    ext || 'js'
  ].join('.')
}

function checkRequired (opts) {
  var props = ['out', 'in', 'isDev']
  if (!opts || !props.every(function (prop) { return opts.hasOwnProperty(prop) })) {
    throw new Error('Must pass in options with `in`, `out`, and `isDev` properties')
  }
}
