define(function (require) {

  "use strict";

  var $                   = require('jquery'),
      _                   = require('underscore'),
      Backbone            = require('backbone'),
      Marionette          = require('marionette'),
      swal                = require('sweet-alert'),
      tpl                 = require('text!tpl/servers/list_item.html'),

      template = _.template(tpl);

  return Marionette.ItemView.extend({
    tagName: "tr",
    template: template,

    events: {
      "click .clone": "clone",
      "click .delete": "delete",
    },

    modelEvents: {
      "change": "serverUpdated",
    },

    clone: function (e) {
      var newTitle = prompt('Title for the new server:');
      var clone = this.model.clone();
      clone.set({id: null, title: newTitle});
      clone.save();
    },

    delete: function (event) {
      var self = this;
      sweetAlert({
        title: "Are you sure?",
        text: "Your server configuration will be deleted!",
        type: "warning",
        showCancelButton: true,
        confirmButtonClass: "btn-danger",
        confirmButtonText: "Yes, delete it!",
      },
      function(){
        self.model.destroy();
      });
    },

    serverUpdated: function (event) {
      this.render();
    },
  });
});
