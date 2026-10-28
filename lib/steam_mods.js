var events = require('events')

var cdlc = require('./cdlc')
var SteamWorkshop = require('./steam_workshop')
var isWorkshopId = require('./workshop_id')

var SteamMods = function (config) {
  this.config = config
  this.workshop = new SteamWorkshop(this.config.steam)
  this.mods = []
}

SteamMods.prototype = Object.create(events.EventEmitter.prototype)

SteamMods.prototype.delete = function (mod, cb) {
  var self = this

  if (!isWorkshopId(mod)) {
    return cb(new Error('Invalid Steam Workshop ID: ' + mod))
  }

  this.workshop.deleteMod(mod, function (err) {
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

  if (!isWorkshopId(workshopId)) {
    if (cb) {
      cb(new Error('Invalid Steam Workshop ID: ' + workshopId))
    }
    return
  }

  this.workshop.downloadMod(workshopId, function (err) {
    if (err) {
      var mod = self.find(workshopId)
      self.notifyError('Downloading ' + (mod ? mod.name : workshopId) + ' failed', err)
    }

    self.updateMods()

    if (cb) {
      cb(err)
    }
  })
  self.updateMods()
}

SteamMods.prototype.search = function (query, cb) {
  this.workshop.search(query, cb)
}

// Lists installed Creator DLCs first, then Steam Workshop mods
SteamMods.prototype.updateMods = function () {
  var self = this
  cdlc.installed(this.config.path, function (err, cdlcs) {
    if (err) {
      cdlcs = []
    }

    self.workshop.mods(function (err, workshopMods) {
      if (err && err.code === 'ENOENT') {
        // Steam creates the workshop manifest with the first download
        workshopMods = self.currentDownloads()
      } else if (err) {
        self.notifyError('Loading Steam Workshop mods failed', err)
        workshopMods = self.mods.filter(function (mod) {
          return !mod.cdlc
        })
      }

      self.mods = cdlcs.concat(workshopMods)
      self.emit('mods', self.mods)
    })
  })
}

SteamMods.prototype.notifyError = function (title, err) {
  console.log(title + ': ' + err)
  this.emit('notification', {
    type: 'error',
    title: title,
    message: err.message || String(err)
  })
}

SteamMods.prototype.currentDownloads = function () {
  return Object.keys(this.workshop.currentDownloads).map(function (id) {
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
