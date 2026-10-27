var $ = require('jquery')
var _ = require('underscore')
var Ladda = require('ladda')
var Marionette = require('marionette')
var sweetAlert = require('sweet-alert')

var notifications = require('app/notifications')

var tpl = require('tpl/mods/list_item.html')

var template = _.template(tpl)

module.exports = Marionette.ItemView.extend({
  tagName: 'tr',
  template: template,

  events: {
    'click .install': 'installMod',
    'click .destroy': 'deleteMod'
  },

  modelEvents: {
    change: 'render'
  },

  templateHelpers: function () {
    var modFile = this.model.get('modFile')
    var steamMeta = this.model.get('steamMeta')

    var link = null
    var title = null

    if (steamMeta && steamMeta.id) {
      if (steamMeta.id) {
        link = 'https://steamcommunity.com/sharedfiles/filedetails/?id=' + steamMeta.id
      }

      if (steamMeta.name) {
        title = steamMeta.name
      }
    }

    if (modFile && modFile.name) {
      title = modFile.name
    }

    return {
      link: link,
      title: title
    }
  },

  installMod: function (event) {
    var self = this
    event.preventDefault()

    this.laddaBtn = Ladda.create(this.$el.find('.ladda-button').get(0))
    this.laddaBtn.start()
    this.$el.find('.ladda-button').addClass('disabled')

    $.ajax({
      url: '/api/mods/',
      type: 'POST',
      data: {
        id: this.model.get('id')
      },
      dataType: 'json',
      success: function (resp) {
        self.laddaBtn.stop()
        self.$el.find('.ladda-button').removeClass('disabled')
      },
      error: function (resp) {
        self.laddaBtn.stop()
        self.$el.find('.ladda-button').removeClass('disabled')
        notifications.requestError('Updating ' + self.model.get('name') + ' failed', resp)
      }
    })
  },

  deleteMod: function (event) {
    var self = this
    sweetAlert({
      title: 'Are you sure?',
      text: 'The mod will be deleted from the server!',
      type: 'warning',
      showCancelButton: true,
      confirmButtonClass: 'btn-danger',
      confirmButtonText: 'Yes, delete it!'
    },
    function () {
      var name = self.model.get('name')
      self.model.destroy({
        error: function (model, resp) {
          notifications.requestError('Deleting ' + name + ' failed', resp)
        }
      })
    })
  }
})
