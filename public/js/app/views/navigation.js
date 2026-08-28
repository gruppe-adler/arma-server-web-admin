var _ = require('underscore')
var $ = require('jquery')
var Backbone = require('backbone')
var Marionette = require('marionette')
var BootstrapModal = require('backbone.bootstrap-modal')

var ServersListView = require('app/views/navigation/servers/list')
var SettingsView = require('app/views/settings')
var tpl = require('tpl/navigation.html')

module.exports = Marionette.ItemView.extend({
  template: _.template(tpl),

  templateHelpers: function () {
    return {
      isActiveRoute: function (route) {
        return Backbone.history.fragment === route ? 'active' : ''
      }
    }
  },

  events: {
    'click #settings': 'settings',
    'click #logout': 'logout'
  },

  initialize: function (options) {
    this.settings = options.settings
    this.servers = options.servers
    this.serversListView = new ServersListView({ collection: this.servers })
    Backbone.history.on('route', this.render)
    this.user = 'User'
    this.avatar = ''
    this.loadUser()
  },

  onDomRefresh: function () {
    this.serversListView.setElement('#servers-list')
    this.serversListView.render()
    this.renderUser()
  },

  settings: function (event) {
    event.preventDefault()
    var view = new SettingsView({ model: this.settings })
    new BootstrapModal({ content: view, animate: true, cancelText: false }).open()
  },

  loadUser: function () {
    $.getJSON('/api/user').done(function (user) {
      this.user = user.username || 'User'
      this.avatar = user.avatar || ''
      this.renderUser()
    }.bind(this))
  },

  renderUser: function () {
    this.$('#username, #user-menu-username').text(this.user)
    this.$('#user-avatar')
      .toggle(!!this.avatar)
      .attr('src', this.avatar)
      .attr('alt', this.user)
    this.$('#user-avatar-fallback')
      .toggle(!this.avatar)
      .text(this.user.charAt(0).toUpperCase())
  },

  logout: function (event) {
    event.preventDefault()
    window.location.href = '/logout'
  }
})
