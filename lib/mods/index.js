var async = require('async')
var events = require('events')
var filesize = require('filesize')
var fs = require('fs.extra')
var glob = require('glob')
var path = require('path')

var folderSize = require('./folderSize')
var modFile = require('./modFile')
var steamMeta = require('./steamMeta')

var Mods = function (config) {
  this.config = config
  this.mods = []
}

Mods.prototype = Object.create(events.EventEmitter.prototype)

Mods.prototype.delete = function (mod, cb) {
  var self = this
  fs.rmrf(self.getAbsoluteModPath(mod), function (err) {
    cb(err)

    if (!err) {
      self.updateMods()
    }
  })
}

Mods.prototype.find = function (id) {
  return this.mods.find(function (mod) {
    return mod.id === id
  })
}

Mods.prototype.updateMods = function () {
  var self = this
  glob('**/{@*,csla,ef,gm,rf,spe,vn,ws}/addons', { cwd: self.getAbsoluteModsPath() }, function (err, files) {
    if (err) {
      console.log(err)
      return
    }

    var mods = files.map(function (file) {
      // Find actual parent mod folder from addons folder
      return path.join(file, '..')
    })

    async.map(mods, self.resolveModData.bind(self), function (err, mods) {
      if (err) {
        console.log(err)
        return
      }

      self.mods = mods
      self.emit('mods', mods)
    })
  })
}

Mods.prototype.resolveModData = function (mod, cb) {
  var self = this
  var modPath = self.getAbsoluteModPath(mod)
  async.parallel({
    folderSize: function (cb) {
      folderSize(modPath, self.config, cb)
    },
    modFile: function (cb) {
      modFile(modPath, self.config, cb)
    },
    steamMeta: function (cb) {
      steamMeta(modPath, self.config, cb)
    }
  }, function (err, results) {
    if (err) {
      return cb(err)
    }

    cb(null, {
      id: mod,
      name: mod,
      size: results.folderSize,
      formattedSize: filesize(results.folderSize),
      modFile: results.modFile,
      steamMeta: results.steamMeta
    })
  })
}

Mods.prototype.getAbsoluteModsPath = function () {
  if (this.config.modsPath) {
    if (path.isAbsolute(this.config.modsPath)) {
      return this.config.modsPath
    }
    return path.join(this.config.path, this.config.modsPath)
  }
  return this.config.path
}

Mods.prototype.getApplicableModPath = function (mod) {
  if (!this.config.modsPath) {
    return mod
  }
  return path.join(this.config.modsPath, mod)
}

Mods.prototype.getAbsoluteModPath = function (mod) {
  return path.join(this.getAbsoluteModsPath(), mod)
}

module.exports = Mods
