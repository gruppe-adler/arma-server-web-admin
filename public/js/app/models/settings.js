var Backbone = require('backbone')

module.exports = Backbone.Model.extend({
  defaults: {
    path: '',
    type: '',
    workshop: false
  },
  urlRoot: '/api/settings'
})
