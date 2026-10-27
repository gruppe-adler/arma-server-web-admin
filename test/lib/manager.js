require('should')

var Manager = require('../../lib/manager.js')

describe('Manager', function () {
  describe('notifications', function () {
    it('should forward server notification once', function () {
      var manager = new Manager({}, null, null)
      var first = manager._addServer({ title: 'first' })
      manager._addServer({ title: 'second' })

      var notifications = []
      manager.on('notification', function (notification) {
        notifications.push(notification)
      })

      first.emit('notification', { type: 'error', title: 'Starting first failed' })
      notifications.should.eql([{ type: 'error', title: 'Starting first failed' }])
    })
  })
})
