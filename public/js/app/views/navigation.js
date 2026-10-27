var _ = require('underscore')
var $ = require('jquery')
var Backbone = require('backbone')
var Marionette = require('marionette')
var BootstrapModal = require('backbone.bootstrap-modal')

var GameInstallView = require('app/views/game/install')
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
    'click #install-game': 'installGame',
    'click #settings': 'settings',
    'click #logout': 'logout'
  },

  initialize: function (options) {
    this.gameInstall = options.gameInstall
    this.settings = options.settings
    this.servers = options.servers
    this.serversListView = new ServersListView({ collection: this.servers })
    Backbone.history.on('route', this.render)
    this.user = 'Unknown User'
    this.avatar = ''
    this.permissions = {}
    this.loadUser()
    this.listenTo(this.gameInstall, 'change', this.renderInstallGame)
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

  installGame: function (event) {
    event.preventDefault()
    var view = new GameInstallView({ model: this.gameInstall })
    var modal = new BootstrapModal({
      title: 'Install Arma 3',
      content: view,
      animate: true,
      cancelText: 'Close',
      okText: 'Install'
    })
    view.modal = modal
    modal.open()
    view.render()
  },

  loadUser: function () {
    $.getJSON('/api/user').done(function (user) {
      this.user = user.username || 'Unknown User'
      this.avatar = user.avatar || ''
      this.permissions = user.permissions || {}
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
    this.renderInstallGame()
  },

  renderInstallGame: function () {
    var installing = this.gameInstall.get('installing')
    var progress = this.gameInstall.get('progress')
    var label = 'Install Arma 3'

    if (installing) {
      label = 'Installing Arma 3' + (progress === null ? '...' : ' (' + progress.toFixed(0) + ' %)')
    }

    this.$('#install-game-item').toggle(!!this.permissions.installGame)
    this.$('#install-game').text(label)
  }
})
