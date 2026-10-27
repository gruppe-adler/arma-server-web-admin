var _ = require('underscore')
var Marionette = require('marionette')

var ListItemView = require('app/views/servers/mods/selected/list_item')
var tpl = require('tpl/servers/mods/selected/list.html')

module.exports = Marionette.CompositeView.extend({
  childView: ListItemView,
  childViewContainer: 'tbody',
  template: _.template(tpl)
})
