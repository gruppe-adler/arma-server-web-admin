var $ = require('jquery')
var _ = require('underscore')
var Marionette = require('marionette')
var BootstrapModal = require('backbone.bootstrap-modal')

var DownloadFormView = require('app/views/mods/download/form')
var ListView = require('app/views/mods/list')
var SearchFormView = require('app/views/mods/search/form')
var tpl = require('tpl/mods/index.html')

var template = _.template(tpl)

module.exports = Marionette.LayoutView.extend({
  template: template,
  templateHelpers: function () {
    return {
      filterValue: this.filterValue
    }
  },

  regions: {
    listView: '#list'
  },

  events: {
    'click #download': 'download',
    'click #refresh': 'refresh',
    'click #search': 'search',
    'keyup #filterMods': 'updateFilter'
  },

  initialize: function () {
    this.filterValue = ''
    this.modsListView = new ListView({ collection: this.options.mods, filterValue: this.filterValue })
  },

  updateFilter: function (event) {
    this.filterValue = event.target.value
    this.modsListView.filterValue = this.filterValue
    this.modsListView.render()
  },

  onRender: function () {
    this.listView.show(this.modsListView)
  },

  download: function (event) {
    event.preventDefault()
    var view = new DownloadFormView({ mods: this.options.mods })
    var modal = new BootstrapModal({
      content: view,
      animate: true,
      cancelText: 'Close',
      okText: 'Download'
    })
    view.modal = modal
    modal.open()
  },

  refresh: function (event) {
    event.preventDefault()
    $.ajax({
      url: '/api/mods/refresh',
      type: 'POST',
      success: function (resp) {

      },
      error: function (resp) {

      }
    })
  },

  search: function (event) {
    event.preventDefault()
    var view = new SearchFormView({ mods: this.options.mods })
    var modal = new BootstrapModal({
      content: view,
      animate: true,
      cancelText: 'Close',
      okText: 'Search'
    })
    view.modal = modal
    modal.open()
  }
})
