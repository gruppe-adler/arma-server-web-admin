var Backbone = require('backbone')

module.exports = Backbone.Model.extend({
  defaults: {
    id: '',
    downloading: false,
    formattedSize: '',
    name: '',
    path: ''
  },
  idAttribute: 'id',
  urlRoot: '/api/mods/'
})
