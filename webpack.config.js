var path = require('path')
var webpack = require('webpack')

module.exports = {
  mode: 'development',

  // Entry point for static analyzer
  entry: path.join(__dirname, 'public', 'js', 'app.js'),

  output: {
    // Where to build results
    path: path.join(__dirname, 'assets'),

    // Filename to use in HTML
    filename: 'bundle.js',

    // Path to use in HTML
    publicPath: '/'
  },

  resolve: {
    alias: {
      app: path.join(__dirname, 'public', 'js', 'app'),
      marionette: 'backbone.marionette',
      'sweet-alert': 'sweetalert',
      tpl: path.join(__dirname, 'public', 'js', 'tpl'),
      // The ES module build cannot be changed, backbone.bootstrap-modal changes _.templateSettings
      underscore$: require.resolve('underscore/underscore-umd.js')
    }
  },

  plugins: [
    new webpack.ProvidePlugin({
      _: 'underscore',
      $: 'jquery',
      Backbone: 'backbone',
      jQuery: 'jquery'
    })
  ],

  module: {
    rules: [
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
      { test: /\.html$/, type: 'asset/source' },
      {
        // Images and fonts up to 8 KB are inlined
        test: /\.(png|jpe?g|gif|svg|woff2?|ttf|eot)$/,
        type: 'asset',
        parser: { dataUrlCondition: { maxSize: 8192 } }
      }
    ]
  },

  devtool: 'inline-source-map'
}
