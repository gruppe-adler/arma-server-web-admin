var path = require('path')
require('should')

var SteamMods = require('../../lib/steam_mods.js')

var dummyMods = [
  {
    id: 'test',
    name: 'test'
  }
]

describe('SteamMods', function () {
  describe('find()', function () {
    it('should find mod', function () {
      var steamMods = new SteamMods({})
      steamMods.mods = dummyMods
      var mod = steamMods.find('test')
      mod.should.eql(dummyMods[0])
    })
  })

  describe('download()', function () {
    it('should notify about failed download', function (done) {
      var steamMods = new SteamMods({ steam: {} })
      steamMods.mods = [{ id: '450814997', name: 'CBA_A3' }]
      steamMods.armaSteamWorkshop.downloadMod = function (id, cb) {
        cb(new Error('steamcmd failed with status code 127'))
      }
      steamMods.armaSteamWorkshop.mods = function () {}
      steamMods.on('notification', function (notification) {
        notification.should.eql({
          type: 'error',
          title: 'Downloading CBA_A3 failed',
          message: 'steamcmd failed with status code 127'
        })
        done()
      })
      steamMods.download('450814997')
    })
  })

  describe('updateMods()', function () {
    it('should notify when mods cannot be loaded', function (done) {
      var steamMods = new SteamMods({ steam: {} })
      steamMods.armaSteamWorkshop.mods = function (cb) {
        cb(new Error('Steam API unavailable'))
      }
      steamMods.on('notification', function (notification) {
        notification.should.have.property('message', 'Steam API unavailable')
        done()
      })
      steamMods.updateMods()
    })

    var emptySteamPath = path.join(__dirname, '..', 'resources', 'steam')

    it('should have no mods before first download', function (done) {
      var steamMods = new SteamMods({ steam: { path: emptySteamPath } })
      steamMods.on('mods', function (mods) {
        mods.should.eql([])
        done()
      })
      steamMods.updateMods()
    })

    it('should list first download while downloading', function (done) {
      var steamMods = new SteamMods({ steam: { path: emptySteamPath } })
      steamMods.armaSteamWorkshop.currentDownloads['450814997'] = true
      steamMods.on('mods', function (mods) {
        mods.should.eql([{ downloading: true, id: '450814997', name: '450814997', needsUpdate: true, path: null }])
        done()
      })
      steamMods.updateMods()
    })
  })
})
