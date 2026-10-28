var armaClassParser = require('arma-class-parser')
var async = require('async')
var events = require('events')
var fs = require('fs')
var glob = require('glob')
var path = require('path')

var cdlc = require('./cdlc')

function stripBOM (data) {
  return data.charCodeAt(0) === 0xFEFF ? data.slice(1) : data
}

// Reads mod.cpp or meta.cpp of a mod, null if missing or invalid
function readCpp (file, cb) {
  fs.readFile(file, 'utf8', function (err, data) {
    if (err) {
      return cb(null, null)
    }

    try {
      cb(null, armaClassParser.parse(stripBOM(data)))
    } catch (err) {
      console.log('Error parsing ' + file + ', ' + err)
      cb(null, null)
    }
  })
}

// Mods in the game folder or modsPath, used when Steam Workshop is disabled
var LocalMods = function (config) {
  this.config = config
  this.mods = []
}

LocalMods.prototype = Object.create(events.EventEmitter.prototype)

LocalMods.prototype.modsPath = function () {
  var modsPath = this.config.modsPath
  if (!modsPath) {
    return this.config.path
  }

  return path.isAbsolute(modsPath) ? modsPath : path.join(this.config.path, modsPath)
}

// Path used for -mod, relative to the game folder unless modsPath is absolute
LocalMods.prototype.launchPath = function (id) {
  return this.config.modsPath ? path.join(this.config.modsPath, id) : id
}

LocalMods.prototype.find = function (id) {
  return this.mods.find(function (mod) {
    return mod.id === id
  })
}

LocalMods.prototype.updateMods = function () {
  var self = this
  var modsPath = this.modsPath()

  cdlc.installed(this.config.path, function (err, cdlcs) {
    if (err) {
      cdlcs = []
    }

    glob('**/@*/addons', { cwd: modsPath }, function (err, files) {
      if (err) {
        console.log('Error listing mods in ' + modsPath + ', ' + err)
        files = []
      }

      async.map(files, function (file, cb) {
        // Mod folder of its addons folder, relative to the mods folder
        var id = path.posix.dirname(file)
        var modPath = path.join(modsPath, id)

        async.parallel({
          modCpp: readCpp.bind(null, path.join(modPath, 'mod.cpp')),
          metaCpp: readCpp.bind(null, path.join(modPath, 'meta.cpp'))
        }, function (err, cpp) {
          cb(err, {
            downloading: false,
            id: id,
            launchPath: self.launchPath(id),
            local: true,
            name: (cpp.modCpp && cpp.modCpp.name) || path.posix.basename(id),
            needsUpdate: false,
            path: modPath,
            workshopId: cpp.metaCpp && cpp.metaCpp.publishedid ? String(cpp.metaCpp.publishedid) : undefined
          })
        })
      }, function (err, mods) {
        if (err) {
          console.log('Error reading mods in ' + modsPath + ', ' + err)
          return
        }

        self.mods = cdlcs.concat(mods.sort(function (a, b) {
          return a.name.localeCompare(b.name)
        }))
        self.emit('mods', self.mods)
      })
    })
  })
}

// Deletes a listed local mod, Creator DLCs are part of the game
LocalMods.prototype.delete = function (id, cb) {
  var self = this
  var mod = this.find(id)

  if (!mod || mod.cdlc) {
    var err = new Error('Invalid mod: ' + id)
    err.invalid = true
    return cb(err)
  }

  fs.rm(mod.path, { recursive: true, force: true }, function (err) {
    if (!err) {
      self.updateMods()
    }

    cb(err || null)
  })
}

module.exports = LocalMods
