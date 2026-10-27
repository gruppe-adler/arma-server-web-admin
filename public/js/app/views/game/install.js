var $ = require('jquery')
var _ = require('underscore')
var Marionette = require('marionette')

var notifications = require('app/notifications')
var tpl = require('tpl/game/install.html')

module.exports = Marionette.ItemView.extend({
  template: _.template(tpl),

  events: {
    'change #branch': 'branchChanged',
    'submit form': 'beforeSubmit'
  },

  modelEvents: {
    change: 'render'
  },

  templateHelpers: function () {
    return {
      branches: this.branches,
      error: this.error,
      path: this.path
    }
  },

  initialize: function () {
    this.branches = null
    this.error = null
    this.path = ''
    this.submitting = false
    this.bind('ok', this.submit)
    this.loadBranches()
  },

  loadBranches: function () {
    var self = this

    // Render once, re-rendering would reset a branch the user already picked
    $.when($.getJSON('/api/game'), $.getJSON('/api/game/branches'))
      .done(function (game, branches) {
        self.path = game[0].path
        self.branches = branches[0]
      })
      .fail(function (xhr) {
        self.error = xhr.responseText || xhr.statusText
      })
      .always(function () {
        self.render()
      })
  },

  onRender: function () {
    this.updateOkButton()
  },

  updateOkButton: function () {
    if (this.modal) {
      this.modal.$el.find('.btn.ok')
        .toggle(!this.model.get('installing'))
        .toggleClass('disabled', !this.branches || this.submitting)
    }
  },

  branchChanged: function () {
    var custom = this.$('#branch').val() === ''
    this.$('#custom-branch-group').toggle(custom)
    if (custom) {
      this.$('#custom-branch').focus()
    }
  },

  beforeSubmit: function (event) {
    event.preventDefault()
    this.submit()
  },

  submit: function () {
    var self = this

    if (this.modal) {
      this.modal.preventClose()
    }

    if (!this.branches || this.submitting || this.model.get('installing')) {
      return
    }

    var data = {
      branch: this.$('#branch').val() || this.$('#custom-branch').val().trim(),
      password: this.$('#password').val()
    }

    this.submitting = true
    this.updateOkButton()

    $.ajax({
      url: '/api/game/install',
      type: 'POST',
      data: data,
      dataType: 'json'
    })
      .done(function (status) {
        self.model.set(status)
      })
      .fail(function (xhr) {
        notifications.requestError('Installing Arma 3 failed', xhr)
      })
      .always(function () {
        self.submitting = false
        self.updateOkButton()
      })
  }
})
