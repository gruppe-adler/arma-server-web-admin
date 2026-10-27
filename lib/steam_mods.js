var events = require('events')
var ArmaSteamWorkshop = require('arma-steam-workshop')

var SteamMods = function (config) {
  this.config = config
  this.armaSteamWorkshop = new ArmaSteamWorkshop(this.config.steam)
  this.mods = []
}

SteamMods.prototype = Object.create(events.EventEmitter.prototype)

SteamMods.prototype.delete = function (mod, cb) {
  var self = this
  this.armaSteamWorkshop.deleteMod(mod, function (err) {
    if (err) {
      console.log(err)
    } else {
      self.updateMods()
    }

    if (cb) {
      cb(err)
    }
  })
}

SteamMods.prototype.find = function (id) {
  return this.mods.find(function (mod) {
    return mod.id === id
  })
}

SteamMods.prototype.download = function (workshopId, cb) {
  var self = this
  this.armaSteamWorkshop.downloadMod(workshopId, function (err) {
    if (err) {
      console.log('Error downloading mod ' + workshopId + ': ' + err)
    }

    self.updateMods()

    if (cb) {
      cb(err)
    }
  })
  self.updateMods()
}

SteamMods.prototype.search = function (query, cb) {
  this.armaSteamWorkshop.search(query, cb)
}

SteamMods.prototype.updateMods = function () {
  var self = this
  this.armaSteamWorkshop.mods(function (err, mods) {
    if (err && err.code === 'ENOENT') {
      // Steam creates the workshop manifest with the first download
      mods = self.currentDownloads()
    } else if (err) {
      console.log(err)
      return
    }

    self.mods = mods
    self.emit('mods', mods)
  })
}

SteamMods.prototype.currentDownloads = function () {
  return Object.keys(this.armaSteamWorkshop.currentDownloads).map(function (id) {
    return {
      downloading: true,
      id: id,
      name: id,
      needsUpdate: true,
      path: null
    }
  })
}

module.exports = SteamMods
