var async = require('async')
var fs = require('fs')
var fsExtra = require('fs.extra')
var path = require('path')
var os = require('os')
var should = require('should')

var virtualServer = require('../../lib/virtualServer.js')

var basicServerFiles = [
  'addons/data_f.pbo',
  'arma3server',
  'arma3server.exe',
  'arma3server_x64',
  'arma3server_x64.exe',
  'dta/product.bin',
  'keys/a3.bikey',
  'libsteam.so',
  'mpmissions/test.vr.pbo',
  'steam.dll',
  'steam_appid.txt'
]

var workshopFiles = [
  '111/addons/addon.pbo',
  '111/keys/mod_111.bikey',
  '222/addons/addon.pbo',
  '222/keys/mod_222.bikey'
]

function createEmptyFile (file, cb) {
  fs.open(file, 'w', function (err, fd) {
    if (err) {
      return cb(err)
    }

    fs.close(fd, cb)
  })
}

function createTempServerFolder (files, cb) {
  fs.mkdtemp(path.join(os.tmpdir(), 'arma-server-test-'), function (err, serverFolder) {
    if (err) {
      return cb(err)
    }

    async.forEach(files, function (file, cb) {
      var fileFolder = path.dirname(file)
      if (fileFolder) {
        fsExtra.mkdirp(path.join(serverFolder, fileFolder), function (err) {
          if (err) {
            return cb(err)
          }

          createEmptyFile(path.join(serverFolder, file), cb)
        })
      } else {
        createEmptyFile(path.join(serverFolder, file), cb)
      }
    }, function (err, files) {
      cb(err, serverFolder)
    })
  })
}

describe('VirtualServer', function () {
  var serverFolder
  var tempServerFolder
  var workshopFolder

  function createVirtualServer (mods, done) {
    createTempServerFolder(basicServerFiles, function (err, folder) {
      if (err) {
        return done(err)
      }

      serverFolder = folder

      createTempServerFolder(workshopFiles, function (err, folder) {
        if (err) {
          return done(err)
        }

        workshopFolder = folder

        // Workshop mods are passed with their full path
        return virtualServer.create({
          path: serverFolder
        }, mods.map(function (mod) {
          return path.join(workshopFolder, mod)
        }))
          .then(function (serverFolder) {
            tempServerFolder = serverFolder
            done()
          })
          .catch(done)
      })
    })
  }

  function removeVirtualServer (done) {
    if (tempServerFolder) {
      virtualServer.remove(tempServerFolder, function (err) {
        if (err) {
          return done(err)
        }

        fsExtra.rmrf(serverFolder, function (err) {
          if (err) {
            return done(err)
          }

          fsExtra.rmrf(workshopFolder, done)
        })
      })
    } else if (serverFolder) {
      fsExtra.rmrf(serverFolder, done)
    } else {
      done()
    }
  }

  function checkForFile (file, cb) {
    fs.access(path.join(tempServerFolder, file), function (err) {
      should.not.exist(err)
      cb(err)
    })
  }

  function checkForLink (file, cb) {
    fs.lstat(path.join(tempServerFolder, file), function (err, stats) {
      if (err) {
        return cb(err)
      }

      should(stats.isSymbolicLink()).be.exactly(true)
      cb()
    })
  }

  describe('basic server', function () {
    before(function (done) {
      var mods = []
      createVirtualServer(mods, done)
    })

    after(function (done) {
      removeVirtualServer(done)
    })

    it('should copy Linux binary', function (done) {
      checkForFile('arma3server.exe', done)
    })

    it('should copy Linux x64 binary', function (done) {
      checkForFile('arma3server_x64.exe', done)
    })

    it('should copy Linux libsteam.so', function (done) {
      checkForFile('libsteam.so', done)
    })

    it('should copy Windows binary', function (done) {
      checkForFile('arma3server.exe', done)
    })

    it('should copy Windows x64 binary', function (done) {
      checkForFile('arma3server_x64.exe', done)
    })

    it('should copy Windows steam.dll', function (done) {
      checkForFile('steam.dll', done)
    })

    it('should link addons folder', function (done) {
      checkForLink('addons', done)
    })

    it('should have addons folder with data_f.pbo', function (done) {
      checkForFile('addons/data_f.pbo', done)
    })

    it('should link dta folder', function (done) {
      checkForLink('dta', done)
    })

    it('should have dta folder with product.bin', function (done) {
      checkForFile('dta/product.bin', done)
    })

    it('should have keys folder with a3.bikey', function (done) {
      checkForFile('keys/a3.bikey', done)
    })

    it('should link mpmissions folder', function (done) {
      checkForLink('mpmissions', done)
    })

    it('should have mpmissions folder with test.vr.pbo', function (done) {
      checkForFile('mpmissions/test.vr.pbo', done)
    })
  })

  describe('workshop mod', function () {
    before(function (done) {
      createVirtualServer(['111'], done)
    })

    after(function (done) {
      removeVirtualServer(done)
    })

    it('should link mod folder by workshop id', function (done) {
      checkForLink('111', done)
    })

    it('should have mod folder with addons folder containing addon.pbo', function (done) {
      checkForFile('111/addons/addon.pbo', done)
    })

    it('should have keys folder with mod key', function (done) {
      checkForFile('keys/mod_111.bikey', done)
    })

    it('should not have keys of other mods', function (done) {
      fs.access(path.join(tempServerFolder, 'keys', 'mod_222.bikey'), function (err) {
        should.exist(err)
        done()
      })
    })
  })

  describe('multiple workshop mods', function () {
    before(function (done) {
      createVirtualServer(['111', '222'], done)
    })

    after(function (done) {
      removeVirtualServer(done)
    })

    it('should link first mod folder', function (done) {
      checkForLink('111', done)
    })

    it('should link second mod folder', function (done) {
      checkForLink('222', done)
    })

    it('should have second mod folder with addons folder containing addon.pbo', function (done) {
      checkForFile('222/addons/addon.pbo', done)
    })

    it('should have keys folder with first mod key', function (done) {
      checkForFile('keys/mod_111.bikey', done)
    })

    it('should have keys folder with second mod key', function (done) {
      checkForFile('keys/mod_222.bikey', done)
    })
  })
})
