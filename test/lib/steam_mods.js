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

  describe('updateMods()', function () {
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
