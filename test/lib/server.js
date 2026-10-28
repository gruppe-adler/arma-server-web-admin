var events = require('events')
var path = require('path')
require('should')
var ArmaServer = require('arma-server')

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

  describe('start()', function () {
    var original = {}
    var processes

    beforeEach(function () {
      processes = []
      ;['armaServerPath', 'writeServerConfig', 'start'].forEach(function (method) {
        original[method] = ArmaServer.Server.prototype[method]
      })
      ArmaServer.Server.prototype.armaServerPath = function () {
        return '/arma3/arma3server_x64'
      }
      ArmaServer.Server.prototype.writeServerConfig = function () {}
      ArmaServer.Server.prototype.start = function () {
        var instance = new events.EventEmitter()
        instance.stdout = new events.EventEmitter()
        instance.stderr = new events.EventEmitter()
        instance.pid = 1234
        instance.kill = function () {
          instance.emit('close', null, 'SIGTERM')
        }
        processes.push(instance)
        return instance
      }
    })

    afterEach(function () {
      Object.keys(original).forEach(function (method) {
        ArmaServer.Server.prototype[method] = original[method]
      })
    })

    var logs = { logServerProcess: function () {}, cleanupOldLogFiles: function () {} }

    function startServer (notifications) {
      var server = new Server({ game: 'arma3_x64', type: 'linux', path: '/arma3' }, logs, modsManager, { title: 'test' })
      server.on('notification', function (notification) {
        notifications.push(notification)
      })
      server.start()
      return server
    }

    it('should report missing server executable', function () {
      var notifications = []
      startServer(notifications)
      var error = new Error('spawn /arma3/arma3server_x64 ENOENT')
      error.code = 'ENOENT'
      error.path = '/arma3/arma3server_x64'
      processes[0].emit('error', error)
      processes[0].emit('close', -2, null)
      notifications.should.eql([{ type: 'error', title: 'Starting test failed', message: 'Server executable not found: /arma3/arma3server_x64' }])
    })

    it('should report early exit with last output', function () {
      var notifications = []
      var server = startServer(notifications)
      processes[0].stderr.emit('data', Buffer.from('Loading\n./arma3server_x64: error while loading shared libraries: libSDL2.so\n'))
      processes[0].emit('close', 127, null)
      notifications.should.eql([{ type: 'error', title: 'Starting test failed', message: 'Exited with code 127, last output: ./arma3server_x64: error while loading shared libraries: libSDL2.so' }])
      ;(server.instance === null).should.be.true()
    })

    it('should report crash of running server', function () {
      var notifications = []
      var server = startServer(notifications)
      server.online = true
      processes[0].emit('close', null, 'SIGSEGV')
      notifications.should.eql([{ type: 'error', title: 'test stopped unexpectedly', message: 'Killed by SIGSEGV' }])
    })

    it('should not report requested stop', function (done) {
      var notifications = []
      var server = startServer(notifications)
      server.stop(function () {
        notifications.should.eql([])
        done()
      })
    })

    it('should report unknown server executable', function () {
      ArmaServer.Server.prototype.armaServerPath = function () {
        return null
      }
      var notifications = []
      var server = startServer(notifications)
      processes.should.eql([])
      ;(server.instance === undefined || server.instance === null).should.be.true()
      notifications.should.eql([{ type: 'error', title: 'Starting test failed', message: 'No server executable known for arma3_x64 on linux' }])
    })

    it('should report failing server config', function () {
      ArmaServer.Server.prototype.writeServerConfig = function () {
        throw new Error("EACCES: permission denied, open '/arma3/server.cfg'")
      }
      var notifications = []
      startServer(notifications)
      notifications.should.eql([{ type: 'error', title: 'Starting test failed', message: "EACCES: permission denied, open '/arma3/server.cfg'" }])
    })
  })

  describe('toJSON()', function () {
    it('should include title', function () {
      var server = new Server(null, null, null, { title: 'test' })
      server.toJSON().should.have.property('title', 'test')
    })
  })
})
