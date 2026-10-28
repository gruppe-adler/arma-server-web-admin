var fs = require('fs')
var os = require('os')
var path = require('path')
var tar = require('tar')
require('should')

var steamCmd = require('../../lib/steamcmd.js')

describe('steamcmd', function () {
  describe('download()', function () {
    var originalFetch = global.fetch
    var tempPath

    beforeEach(function () {
      tempPath = fs.mkdtempSync(path.join(os.tmpdir(), 'arma-steamcmd-test-'))
    })

    afterEach(function () {
      global.fetch = originalFetch
      fs.rmSync(tempPath, { recursive: true, force: true })
    })

    it('should unpack SteamCMD and skip entries outside of target', function (done) {
      if (process.platform === 'win32') {
        return this.skip()
      }

      var source = path.join(tempPath, 'source')
      fs.mkdirSync(path.join(source, 'linux32'), { recursive: true })
      fs.writeFileSync(path.join(source, 'steamcmd.sh'), '#!/bin/sh\n')
      fs.writeFileSync(path.join(source, 'linux32', 'steamcmd'), 'binary')
      fs.writeFileSync(path.join(tempPath, 'outside'), 'original')
      var archive = tar.c({ gzip: true, sync: true, cwd: source, preservePaths: true }, ['steamcmd.sh', 'linux32/steamcmd', '../outside']).read()

      var requested
      global.fetch = function (url) {
        requested = url
        return Promise.resolve(new Response(archive))
      }

      var target = path.join(tempPath, 'steamcmd')
      steamCmd.download(target, function (err) {
        ;(err === null).should.be.true()
        requested.should.eql('https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz')
        fs.readFileSync(path.join(target, 'linux32', 'steamcmd'), 'utf8').should.eql('binary')
        fs.readFileSync(path.join(tempPath, 'outside'), 'utf8').should.eql('original')
        done()
      })
    })

    it('should fail on HTTP errors', function (done) {
      global.fetch = function () {
        return Promise.resolve(new Response('', { status: 404 }))
      }
      steamCmd.download(path.join(tempPath, 'steamcmd'), function (err) {
        err.message.should.eql('Downloading SteamCMD failed with HTTP 404')
        done()
      })
    })
  })

  describe('lastError()', function () {
    it('should return last error line', function () {
      steamCmd.lastError('Logging in\nFAILED login\nERROR! Not logged on\nquit').should.eql('ERROR! Not logged on')
      ;(steamCmd.lastError('Success') === null).should.be.true()
    })
  })
})
