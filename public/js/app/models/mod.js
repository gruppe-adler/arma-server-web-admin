var Backbone = require('backbone')

module.exports = Backbone.Model.extend({
  defaults: {
    id: '',
    cdlc: false,
    downloading: false,
    name: '',
    needsUpdate: false,
    path: ''
  },
  idAttribute: 'id',
  urlRoot: '/api/mods/'
})
