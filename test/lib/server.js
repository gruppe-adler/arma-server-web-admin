var path = require('path')
require('should')

var Server = require('../../lib/server.js')

var workshopPath = path.join(path.sep, 'steam', 'steamapps', 'workshop', 'content', '107410')
var modsManager = {
  find: function (id) {
    if (id === '111') {
      return { id: '111', path: path.join(workshopPath, '111') }
    }
  }
}

describe('Server', function () {
  describe('generateId()', function () {
    it('should include title', function () {
      var server = new Server(null, null, null, { title: 'title.with.lot.of.dots' })
      server.generateId().should.eql('title-with-lot-of-dots')
    })
  })

  describe('getLaunchMods()', function () {
    it('should use full path of installed mods', function () {
      var server = new Server(null, null, modsManager, { title: 'test', mods: ['111', 'missing'] })
      server.getLaunchMods().should.eql([path.join(workshopPath, '111')])
    })

    it('should use folder name of installed mods in virtual server', function () {
      var server = new Server(null, null, modsManager, { title: 'test', mods: ['111', 'missing'] })
      server.virtualServerFolder = path.join(path.sep, 'tmp', 'arma-server-test')
      server.getLaunchMods().should.eql(['111'])
    })
  })

  describe('toJSON()', function () {
    it('should include title', function () {
      var server = new Server(null, null, null, { title: 'test' })
      server.toJSON().should.have.property('title', 'test')
    })
  })
})
