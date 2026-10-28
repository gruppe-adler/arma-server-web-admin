require('jquery.iframe-transport')

require('bootstrap/dist/css/bootstrap.css')
require('ladda/dist/ladda-themeless.min.css')
require('sweetalert/dist/sweetalert.css')
require('../css/styles.css')

require(['jquery', 'bootstrap', 'backbone', 'app/router'], function ($, Bootstrap, Backbone, Router) {
  return new Router()
})
