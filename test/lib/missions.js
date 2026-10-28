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
    var originalFetch = global.fetch

    afterEach(function () {
      global.fetch = originalFetch
    })

    function workshopItem (filename) {
      global.fetch = function (url) {
        if (String(url).indexOf('GetPublishedFileDetails') >= 0) {
          return Promise.resolve(new Response(JSON.stringify({
            response: { publishedfiledetails: [{ publishedfileid: '123', filename: filename, file_url: 'https://cdn.example.com/123' }] }
          })))
        }
        return Promise.resolve(new Response('mission data'))
      }
    }

    it('should download mission into missions folder', function (done) {
      workshopItem('mpmissions\\co10_workshop.altis.pbo')
      missions.downloadSteamWorkshop('123', function (err) {
        ;(err === null).should.be.true()
        fs.readFileSync(path.join(gamePath, 'mpmissions', 'co10_workshop.altis.pbo'), 'utf8').should.eql('mission data')
        done()
      })
    })

    it('should keep Workshop file names in missions folder', function (done) {
      workshopItem('../../escape.pbo')
      missions.downloadSteamWorkshop('123', function (err) {
        ;(err === null).should.be.true()
        fs.existsSync(path.join(gamePath, 'escape.pbo')).should.be.false()
        fs.existsSync(path.join(gamePath, 'mpmissions', 'escape.pbo')).should.be.true()
        done()
      })
    })

    it('should reject invalid Steam Workshop ids', function (done) {
      global.fetch = function () {
        done(new Error('Steam should not be asked'))
      }
      missions.downloadSteamWorkshop('../123', function (err) {
        err.message.should.eql('Not a valid Steam Workshop ID: ../123')
        done()
      })
    })
  })
})
