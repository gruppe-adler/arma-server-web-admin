var path = require('path')
require('should')

var GameDig = require('gamedig').GameDig
var Server = require('../../lib/server.js')

var workshopPath = path.join(path.sep, 'steam', 'steamapps', 'workshop', 'content', '107410')
var modsManager = {
  find: function (id) {
    if (id === '111') {
      return { id: '111', path: path.join(workshopPath, '111') }
    }

    if (id === 'gm') {
      return { cdlc: true, id: 'gm', path: path.join(path.sep, 'arma3', 'gm') }
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

    it('should use Creator DLCs relative to game folder', function () {
      var server = new Server(null, null, modsManager, { title: 'test', mods: ['gm', '111'] })
      server.getLaunchMods().should.eql(['gm', path.join(workshopPath, '111')])
      server.virtualServerFolder = path.join(path.sep, 'tmp', 'arma-server-test')
      server.getLaunchMods().should.eql(['gm', '111'])
    })
  })

  describe('getMods()', function () {
    it('should only include Workshop mod folders', function () {
      var server = new Server(null, null, modsManager, { title: 'test', mods: ['gm', '111'] })
      server.getMods().should.eql([path.join(workshopPath, '111')])
    })
  })

  describe('queryStatus()', function () {
    var originalQuery = GameDig.query

    afterEach(function () {
      GameDig.query = originalQuery
    })

    function runningServer (game) {
      var server = new Server({ game: game }, null, null, { title: 'test', port: 2302 })
      server.instance = {}
      server.headlessClientInstances = []
      return server
    }

    it('should query game type with game port', function (done) {
      GameDig.query = function (options) {
        options.should.eql({ type: 'acwa', host: '127.0.0.1', port: 2302 })
        done()
        return new Promise(function () {})
      }
      runningServer('cwa').queryStatus()
    })

    it('should store state of running server', function (done) {
      var state = { name: 'test', map: 'altis', players: [{ name: 'player', raw: { score: 3 } }], raw: { game: 'Mission' } }
      GameDig.query = function () {
        return Promise.resolve(state)
      }
      var server = runningServer('arma3')
      server.on('state', function () {
        server.state.should.equal(state)
        done()
      })
      server.queryStatus()
    })

    it('should clear state when server does not answer', function (done) {
      GameDig.query = function () {
        return Promise.reject(new Error('Failed all 1 attempts'))
      }
      var server = runningServer('arma3')
      server.state = { name: 'old' }
      server.on('state', function () {
        ;(server.state === null).should.be.true()
        done()
      })
      server.queryStatus()
    })
  })

  describe('toJSON()', function () {
    it('should include title', function () {
      var server = new Server(null, null, null, { title: 'test' })
      server.toJSON().should.have.property('title', 'test')
    })
  })
})
