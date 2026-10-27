var fs = require('fs')
var path = require('path')
require('should')

var GameInstaller = require('../../lib/game_installer.js')
var steamCmd = require('../../lib/steamcmd.js')

var appInfoOutput = fs.readFileSync(path.join(__dirname, '..', 'resources', 'steamcmd', 'app_info_233780.txt'), 'utf8')

describe('GameInstaller', function () {
  describe('parseBranches()', function () {
    it('should list branches with public first', function () {
      var branches = GameInstaller.parseBranches(appInfoOutput)
      branches.map(function (branch) {
        return branch.name
      }).should.eql(['public', 'contact', 'creatordlc', 'profiling'])
    })

    it('should include branch details', function () {
      var contact = GameInstaller.parseBranches(appInfoOutput)[1]
      contact.should.eql({
        name: 'contact',
        description: 'Contact Build',
        buildId: '25600525',
        updated: new Date(1790774519 * 1000).toISOString()
      })
    })

    it('should fail without app info', function () {
      (function () {
        GameInstaller.parseBranches('Connecting anonymously to Steam Public...FAILED')
      }).should.throw(/no app info/)
    })
  })

  describe('parseProgress()', function () {
    it('should parse download progress', function () {
      GameInstaller.parseProgress(' Update state (0x61) downloading, progress: 45.12 (1234 / 5678)').should.eql({
        state: 'downloading',
        progress: 45.12
      })
    })

    it('should ignore other output', function () {
      (GameInstaller.parseProgress('Logging in user ...') === null).should.be.true()
    })
  })

  describe('parseResult()', function () {
    it('should succeed when app is installed', function () {
      (GameInstaller.parseResult("Success! App '233780' fully installed.") === null).should.be.true()
    })

    it('should fail with last error line', function () {
      GameInstaller.parseResult("Logging in...\nERROR! Failed to install app '233780' (No subscription)\n").message
        .should.eql("ERROR! Failed to install app '233780' (No subscription)")
    })

    it('should fail when installation did not finish', function () {
      GameInstaller.parseResult('Logging in...').message.should.eql('SteamCMD did not finish the installation')
    })
  })

  describe('installArguments()', function () {
    it('should log in with Steam account and select branch', function () {
      GameInstaller.installArguments({
        path: '/arma3',
        type: 'linux',
        steam: { username: 'user', password: 'secret' }
      }, { branch: 'contact' }).should.eql([
        '+@sSteamCmdForcePlatformType linux',
        '+@NoPromptForPassword 1',
        '+force_install_dir "/arma3"',
        '+login user secret',
        '+app_update 233780 -beta contact validate',
        '+quit'
      ])
    })

    it('should install Windows server for Wine anonymously with branch password', function () {
      var args = GameInstaller.installArguments({ path: '/arma3', type: 'wine' }, { branch: 'profiling', password: 'pw' })
      args.should.containEql('+@sSteamCmdForcePlatformType windows')
      args.should.containEql('+login anonymous')
      args.should.containEql('+app_update 233780 -beta profiling -betapassword pw validate')
    })
  })

  describe('install()', function () {
    var originalRun = steamCmd.run

    afterEach(function () {
      steamCmd.run = originalRun
    })

    it('should reject invalid branch', function (done) {
      new GameInstaller({}).install({ branch: 'public +quit' }, function (err) {
        err.message.should.eql('Invalid branch name')
        done()
      })
    })

    it('should reject invalid branch password', function (done) {
      new GameInstaller({}).install({ branch: 'profiling', password: 'a b' }, function (err) {
        err.message.should.eql('Invalid branch password')
        done()
      })
    })

    it('should report progress and success', function (done) {
      steamCmd.run = function (args, onLine, cb) {
        onLine(' Update state (0x61) downloading, progress: 50.00 (1 / 2)')
        cb(null, { code: 0, output: "Success! App '233780' fully installed." })
      }

      var installer = new GameInstaller({ path: '/arma3', type: 'linux' })
      var progress = []
      installer.on('status', function (status) {
        progress.push(status.progress)
      })
      installer.on('notification', function (notification) {
        progress.should.eql([null, 50, null])
        installer.status.installing.should.be.false()
        notification.should.eql({
          type: 'success',
          title: 'Arma 3 installed',
          message: 'Branch public is installed to /arma3'
        })
        done()
      })
      installer.install({ branch: 'public' }, function (err) {
        (err === null).should.be.true()
      })
    })

    it('should report failure and refuse parallel installs', function (done) {
      var finish
      steamCmd.run = function (args, onLine, cb) {
        finish = cb
      }

      var installer = new GameInstaller({ path: '/arma3', type: 'linux' })
      installer.on('notification', function (notification) {
        notification.should.have.property('type', 'error')
        notification.should.have.property('message', 'FAILED login with result code Invalid Password')
        done()
      })
      installer.install({ branch: 'public' }, function () {})
      installer.install({ branch: 'contact' }, function (err) {
        err.message.should.eql('Arma 3 is already being installed')
        finish(null, { code: 5, output: 'FAILED login with result code Invalid Password' })
      })
    })
  })
})
