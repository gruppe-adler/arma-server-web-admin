define(function (require) {
  
  "use strict";
  
  var $                   = require('jquery'),
      _                   = require('underscore'),
      Backbone            = require('backbone');
  
  return Backbone.Model.extend({
    defaults: {
      name: '',
      subdir: '',
      formattedSize: '0 B',
      size: 0,
    },
    idAttribute: 'id',
  });
  
});
