var fs = require('fs')
var os = require('os')
var path = require('path')
var VDF = require('@node-steam/vdf')
require('should')

var steamCmd = require('../../lib/steamcmd.js')
var SteamWorkshop = require('../../lib/steam_workshop.js')

describe('SteamWorkshop', function () {
  var originalFetch = global.fetch
  var originalRun = steamCmd.run
  var steamPath
  var workshopPath

  beforeEach(function () {
    steamPath = fs.mkdtempSync(path.join(os.tmpdir(), 'arma-steam-workshop-test-'))
    workshopPath = path.join(steamPath, 'steamapps', 'workshop')
    fs.mkdirSync(path.join(workshopPath, 'content', '107410', '450814997'), { recursive: true })
    fs.writeFileSync(path.join(workshopPath, 'appworkshop_107410.acf'), VDF.stringify({
      AppWorkshop: {
        appid: 107410,
        SizeOnDisk: 1500,
        WorkshopItemsInstalled: {
          450814997: { size: 1000, timeupdated: 100, manifest: '1' },
          463939057: { size: 500, timeupdated: 100, manifest: '2' }
        },
        WorkshopItemDetails: {
          450814997: { timeupdated: 100, BytesToDownload: 0 },
          463939057: { timeupdated: 100, BytesToDownload: 0 }
        }
      }
    }))

    global.fetch = function () {
      return Promise.resolve(new Response(JSON.stringify({
        response: {
          publishedfiledetails: [
            { publishedfileid: '450814997', title: 'CBA_A3', time_updated: 100 },
            { publishedfileid: '463939057', title: 'ace', time_updated: 200 }
          ]
        }
      })))
    }
  })

  afterEach(function () {
    global.fetch = originalFetch
    steamCmd.run = originalRun
    fs.rmSync(steamPath, { recursive: true, force: true })
  })

  describe('mods()', function () {
    it('should list installed mods with update status', function (done) {
      new SteamWorkshop({ path: steamPath }).mods(function (err, mods) {
        ;(err === null).should.be.true()
        mods.should.eql([
          { downloading: false, id: '463939057', name: 'ace', needsUpdate: true, path: path.join(workshopPath, 'content', '107410', '463939057') },
          { downloading: false, id: '450814997', name: 'CBA_A3', needsUpdate: false, path: path.join(workshopPath, 'content', '107410', '450814997') }
        ])
        done()
      })
    })

    it('should pass missing manifest on', function (done) {
      new SteamWorkshop({ path: path.join(steamPath, 'missing') }).mods(function (err) {
        err.code.should.eql('ENOENT')
        done()
      })
    })
  })

  describe('deleteMod()', function () {
    it('should remove mod from manifest and disk', function (done) {
      new SteamWorkshop({ path: steamPath }).deleteMod('450814997', function (err) {
        ;(err === null).should.be.true()
        var acf = VDF.parse(fs.readFileSync(path.join(workshopPath, 'appworkshop_107410.acf'), 'utf8')).AppWorkshop
        Object.keys(acf.WorkshopItemsInstalled).should.eql(['463939057'])
        Object.keys(acf.WorkshopItemDetails).should.eql(['463939057'])
        acf.SizeOnDisk.should.eql(500)
        fs.existsSync(path.join(workshopPath, 'content', '107410', '450814997')).should.be.false()
        done()
      })
    })
  })

  describe('downloadMod()', function () {
    it('should download with SteamCMD into steam path', function (done) {
      steamCmd.run = function (args, onLine, cb) {
        args.should.eql([
          '+@NoPromptForPassword 1',
          '+@ShutdownOnFailedCommand 1',
          '+force_install_dir "' + steamPath + '"',
          '+login user secret',
          '+workshop_download_item 107410 450814997',
          '+quit'
        ])
        cb(null, { code: 0, output: 'Success. Downloaded item 450814997' })
      }
      new SteamWorkshop({ path: steamPath, username: 'user', password: 'secret' }).downloadMod('450814997', function (err) {
        ;(err === null).should.be.true()
        done()
      })
    })

    it('should fail with SteamCMD error', function (done) {
      steamCmd.run = function (args, onLine, cb) {
        cb(null, { code: 0, output: 'ERROR! Download item 450814997 failed (Failure).' })
      }
      var workshop = new SteamWorkshop({ path: steamPath })
      workshop.downloadMod('450814997', function (err) {
        err.message.should.eql('ERROR! Download item 450814997 failed (Failure).')
        workshop.currentDownloads.should.eql({})
        done()
      })
    })
  })

  describe('search()', function () {
    it('should list mods and skip missions', function (done) {
      global.fetch = function () {
        return Promise.resolve(new Response(JSON.stringify({
          response: {
            publishedfiledetails: [
              { result: 1, publishedfileid: '450814997', title: 'CBA_A3', short_description: 'CBA', file_size: '5000000', subscriptions: 10 },
              { result: 1, publishedfileid: '1', title: 'Mission', filename: 'mission.pbo' }
            ]
          }
        })))
      }
      new SteamWorkshop({ path: steamPath, apiKey: 'key' }).search('cba', function (err, mods) {
        ;(err === null).should.be.true()
        mods.length.should.eql(1)
        mods[0].should.have.properties({ id: '450814997', title: 'CBA_A3', description: 'CBA', fileSizeFormatted: '4.77 MB', subscriptions: 10 })
        done()
      })
    })
  })
})
