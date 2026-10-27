var _ = require('underscore')
var Marionette = require('marionette')

var ListItemView = require('app/views/logs/list_item')
var tpl = require('tpl/logs/list.html')

var template = _.template(tpl)

var refreshInterval = 5000

module.exports = Marionette.CompositeView.extend({
  childView: ListItemView,
  childViewContainer: 'tbody',
  template: template,

  onRender: function () {
    var collection = this.collection
    clearInterval(this.interval)
    this.interval = setInterval(function () {
      collection.fetch()
    }, refreshInterval)
  },

  onDestroy: function () {
    clearInterval(this.interval)
  }
})
