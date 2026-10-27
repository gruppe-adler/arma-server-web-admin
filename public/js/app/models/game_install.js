var Backbone = require('backbone')

module.exports = Backbone.Model.extend({
  defaults: {
    installing: false,
    branch: null,
    state: null,
    progress: null
  }
})
