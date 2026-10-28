var fs = require('fs')
var os = require('os')
var path = require('path')
require('should')

var LocalMods = require('../../lib/local_mods.js')

describe('LocalMods', function () {
  var gamePath

  function createFolder (folder, files) {
    fs.mkdirSync(path.join(gamePath, folder, 'addons'), { recursive: true })
    Object.keys(files || {}).forEach(function (file) {
      fs.writeFileSync(path.join(gamePath, folder, file), files[file])
    })
  }

  function updateMods (config, cb) {
    var mods = new LocalMods(Object.assign({ path: gamePath }, config))
    mods.on('mods', function (list) {
      cb(mods, list)
    })
    mods.updateMods()
  }

  beforeEach(function () {
    gamePath = fs.mkdtempSync(path.join(os.tmpdir(), 'arma-local-mods-test-'))
    createFolder('@ace', { 'mod.cpp': '﻿name = "ACE3";\n', 'meta.cpp': 'protocol = 1;\npublishedid = 463939057;\nname = "ace";\n' })
    createFolder('@cba_a3')
    createFolder('@ace/optionals/@ace_compat')
    createFolder('gm')
    fs.mkdirSync(path.join(gamePath, '@empty'))
  })

  afterEach(function () {
    fs.rmSync(gamePath, { recursive: true, force: true })
  })

  describe('updateMods()', function () {
    it('should list Creator DLCs and mod folders with addons', function (done) {
      updateMods({}, function (mods, list) {
        list.map(function (mod) {
          return mod.id
        }).should.eql(['gm', '@ace/optionals/@ace_compat', '@cba_a3', '@ace'])
        done()
      })
    })

    it('should read name from mod.cpp and Workshop id from meta.cpp', function (done) {
      updateMods({}, function (mods) {
        mods.find('@ace').should.eql({
          downloading: false,
          id: '@ace',
          launchPath: '@ace',
          local: true,
          name: 'ACE3',
          needsUpdate: false,
          path: path.join(gamePath, '@ace'),
          workshopId: '463939057'
        })
        mods.find('@cba_a3').should.have.properties({ name: '@cba_a3', workshopId: undefined })
        done()
      })
    })

    it('should use relative modsPath for launch path', function (done) {
      fs.mkdirSync(path.join(gamePath, 'mods'))
      fs.renameSync(path.join(gamePath, '@cba_a3'), path.join(gamePath, 'mods', '@cba_a3'))
      updateMods({ modsPath: 'mods' }, function (mods, list) {
        list.map(function (mod) {
          return mod.id
        }).should.eql(['gm', '@cba_a3'])
        mods.find('@cba_a3').should.have.properties({ launchPath: path.join('mods', '@cba_a3'), path: path.join(gamePath, 'mods', '@cba_a3') })
        done()
      })
    })

    it('should use absolute modsPath for launch path', function (done) {
      updateMods({ modsPath: gamePath }, function (mods) {
        mods.find('@cba_a3').launchPath.should.eql(path.join(gamePath, '@cba_a3'))
        done()
      })
    })
  })

  describe('delete()', function () {
    it('should delete listed mod', function (done) {
      updateMods({}, function (mods) {
        mods.removeAllListeners('mods')
        mods.delete('@cba_a3', function (err) {
          ;(err === null).should.be.true()
          fs.existsSync(path.join(gamePath, '@cba_a3')).should.be.false()
          done()
        })
      })
    })

    it('should not delete unknown folders or Creator DLCs', function (done) {
      updateMods({}, function (mods) {
        mods.delete('..', function (err) {
          err.invalid.should.be.true()
          mods.delete('gm', function (err) {
            err.message.should.eql('Invalid mod: gm')
            fs.existsSync(path.join(gamePath, 'gm')).should.be.true()
            done()
          })
        })
      })
    })
  })
})
