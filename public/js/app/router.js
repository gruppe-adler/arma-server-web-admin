define(function (require) {

  "use strict";

  var $               = require('jquery'),
      Backbone        = require('backbone'),
      LayoutView      = require('app/views/layout'),
      NavigationView  = require('app/views/navigation'),
      ServersView     = require('app/views/servers/list'),
      LogsListView    = require('app/views/logs/list'),
      MissionsView    = require('app/views/missions/index'),
      ModsListView    = require('app/views/mods/list'),
      ServerView      = require('app/views/servers/view'),
      Logs            = require('app/collections/logs'),
      Missions        = require('app/collections/missions'),
      Mods            = require('app/collections/mods'),
      Settings        = require('app/models/settings'),
      Servers         = require('app/collections/servers'),

      $body = $('body'),
      missions = new Missions(),
      mods = new Mods(),
      settings = new Settings(),
      servers = new Servers(),
      layoutView = new LayoutView({el: $body}).render();

  return Backbone.Router.extend({

    routes: {
      "logs": "logs",
      "missions": "missions",
      "mods": "mods",
      "servers/:id": "server",
      "": "home",
    },

    initialize: function () {
      layoutView.navigation.show(new NavigationView({settings: settings, servers: servers}));

      var initialized = false;

      var socket = io.connect();
      socket.on('missions', function (_missions) {
        missions.set(_missions);
      });
      socket.on('mods', function (_mods) {
        mods.set(_mods);
      });
      socket.on('servers', function (_servers) {
        servers.set(_servers);

        if (!initialized) {
          initialized = true;
          Backbone.history.start();
        }
      });
      socket.on('settings', function (_settings) {
        settings.set(_settings);
      });
    },

    home: function () {
      layoutView.content.show(new ServersView({collection: servers}));
    },

    logs: function () {
      var logs = new Logs();
      logs.fetch();
      layoutView.content.show(new LogsListView({collection: logs}));
    },

    missions: function () {
      layoutView.content.show(new MissionsView({missions: missions}));
    },

    mods: function () {
      layoutView.content.show(new ModsListView({collection: mods}));
    },

    server: function (id) {
      var server = servers.get(id);
      if (server) {
        layoutView.content.show(new ServerView({
          model: server,
          missions: missions,
          mods: mods,
        }));
      } else {
        this.navigate("#", true);
      }
    }

  });

});
