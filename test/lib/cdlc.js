var fs = require('fs')
var os = require('os')
var path = require('path')
require('should')

var cdlc = require('../../lib/cdlc.js')

describe('cdlc', function () {
  describe('installed()', function () {
    var gamePath

    before(function () {
      gamePath = fs.mkdtempSync(path.join(os.tmpdir(), 'arma-cdlc-test-'))
      fs.mkdirSync(path.join(gamePath, 'gm', 'addons'), { recursive: true })
      fs.mkdirSync(path.join(gamePath, 'vn', 'addons'), { recursive: true })
      fs.mkdirSync(path.join(gamePath, 'ws')) // Without addons, e.g. leftover folder
    })

    after(function () {
      fs.rmSync(gamePath, { recursive: true, force: true })
    })

    it('should list Creator DLCs with addons in game folder', function (done) {
      cdlc.installed(gamePath, function (err, installed) {
        (err === null).should.be.true()
        installed.should.eql([
          { cdlc: true, downloading: false, id: 'gm', name: 'Global Mobilization', needsUpdate: false, path: path.join(gamePath, 'gm') },
          { cdlc: true, downloading: false, id: 'vn', name: 'S.O.G. Prairie Fire', needsUpdate: false, path: path.join(gamePath, 'vn') }
        ])
        done()
      })
    })

    it('should list nothing without game folder', function (done) {
      cdlc.installed(undefined, function (err, installed) {
        (err === null).should.be.true()
        installed.should.eql([])
        done()
      })
    })
  })
})
