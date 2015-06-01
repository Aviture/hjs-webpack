var autoPrefixer = require('autoprefixer-core')
var HtmlPlugin = require('./html-plugin')

module.exports = function getBaseConfig (spec) {
  return {
    entry: {
      'app' : [
        spec.entry
      ],
      'test' : [
         spec.test
      ]
    }
    ,
    output: spec.output,
    resolve: {
      extensions: [
        '',
        '.js',
        '.json'
      ]
    },
    plugins: [
      new HtmlPlugin({
        html: spec.html
      })
    ],
    module: {
      loaders:
        {
          test: /\.js$/,
          exclude: /node_modules/,
          loaders: [
            'babel-loader'
          ]
        },
        {
          test: /\.json$/,
          loaders: ['json']
        },
        {
          test: /\.(otf|eot|svg|ttf|woff)/,
          loader: 'url-loader?limit=10000'
        },
        {
          test : /\.test\.js/,
          loader : 'mocha-loader'
        }
      ]
    },
    postcss: [autoPrefixer()]
  }
}
