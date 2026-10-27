var fs = require('fs')
var os = require('os')
var path = require('path')
require('should')

var Missions = require('../../lib/missions.js')

describe('Missions', function () {
  var gamePath
  var missions

  beforeEach(function () {
    gamePath = fs.mkdtempSync(path.join(os.tmpdir(), 'arma-missions-test-'))
    fs.mkdirSync(path.join(gamePath, 'mpmissions'))
    fs.writeFileSync(path.join(gamePath, 'mpmissions', 'co10_test.altis.pbo'), '')
    fs.writeFileSync(path.join(gamePath, 'secret.txt'), 'secret')
    missions = new Missions({ path: gamePath })
  })

  afterEach(function () {
    fs.rmSync(gamePath, { recursive: true, force: true })
  })

  describe('missionPath()', function () {
    it('should resolve mission in missions folder', function () {
      missions.missionPath('co10_test.altis.pbo').should.eql(path.join(gamePath, 'mpmissions', 'co10_test.altis.pbo'))
    })

    it('should reject paths outside of missions folder', function () {
      ['../secret.txt', '..', '.', '', 'sub/co10_test.altis.pbo', path.join(gamePath, 'secret.txt')].forEach(function (name) {
        (missions.missionPath(name) === null).should.be.true(name)
      })
    })
  })

  describe('delete()', function () {
    it('should delete mission', function (done) {
      missions.delete('co10_test.altis.pbo', function (err) {
        (err === null).should.be.true()
        fs.existsSync(path.join(gamePath, 'mpmissions', 'co10_test.altis.pbo')).should.be.false()
        done()
      })
    })

    it('should not delete files outside of missions folder', function (done) {
      missions.delete('../secret.txt', function (err) {
        err.message.should.eql('Invalid mission name')
        fs.existsSync(path.join(gamePath, 'secret.txt')).should.be.true()
        done()
      })
    })
  })

  describe('downloadSteamWorkshop()', function () {
    it('should reject invalid Steam Workshop ids', function (done) {
      missions.steamWorkshop.downloadFile = function () {
        done(new Error('download should not be called'))
      }
      missions.downloadSteamWorkshop('../123', function (err) {
        err.message.should.eql('Not a valid Steam Workshop ID: ../123')
        done()
      })
    })
  })
})
