var async = require('async')
var events = require('events')
var filesize = require('filesize')
var fs = require('fs.extra')
var path = require('path')
var stream = require('stream')

var steamApi = require('./steam_api')
var isWorkshopId = require('./workshop_id')

var Missions = function (config) {
  this.config = config
  this.missions = []

  this.updateMissions()
}

Missions.prototype = new events.EventEmitter()

Missions.prototype.missionsPath = function () {
  return path.join(this.config.path, 'mpmissions')
}

// Only plain file names, requests must not reach files outside of the missions folder
Missions.prototype.missionPath = function (name) {
  if (!name || name !== path.basename(name) || name === '.' || name === '..') {
    return null
  }

  return path.join(this.missionsPath(), name)
}

Missions.prototype.updateMissions = function (cb) {
  var self = this
  fs.readdir(this.missionsPath(), function (err, files) {
    if (err) {
      console.log(err)

      if (cb) {
        return cb(err)
      }

      return
    }

    async.map(files, function (filename, cb) {
      fs.stat(self.missionPath(filename), function (err, stat) {
        if (err) {
          console.log(err)
          return cb(err)
        }

        var filenameWithoutPbo = path.basename(filename, '.pbo')
        var worldName = path.extname(filenameWithoutPbo)
        var missionName = path.basename(filenameWithoutPbo, worldName)
        worldName = worldName.replace('.', '')

        cb(null, {
          dateCreated: new Date(stat.ctime),
          dateModified: new Date(stat.mtime),
          missionName: missionName,
          name: filename,
          size: stat.size,
          sizeFormatted: filesize(stat.size),
          worldName: worldName
        })
      })
    }, function (err, missions) {
      if (!err) {
        self.missions = missions
        self.emit('missions', missions)
      }

      if (cb) {
        cb(err, missions)
      }
    })
  })
}

Missions.prototype.handleUpload = function (uploadedFile, cb) {
  var filename = decodeURI(uploadedFile.originalname.toLowerCase())
  var missionPath = this.missionPath(filename)
  var self = this

  if (!missionPath) {
    return cb(new Error('Invalid mission name'))
  }

  fs.move(uploadedFile.path, missionPath, function (err) {
    self.updateMissions()

    if (cb) {
      cb(err)
    }
  })
}

Missions.prototype.delete = function (missionName, cb) {
  var missionPath = this.missionPath(missionName)
  var self = this

  if (!missionPath) {
    return cb(new Error('Invalid mission name'))
  }

  fs.unlink(missionPath, function (err) {
    self.updateMissions()

    if (cb) {
      cb(err)
    }
  })
}

Missions.prototype.downloadSteamWorkshop = function (id, cb) {
  if (!isWorkshopId(id)) {
    return cb(new Error('Not a valid Steam Workshop ID: ' + id))
  }

  var self = this

  steamApi.getPublishedFileDetails([id], function (err, files) {
    if (err) {
      return cb(err)
    }

    var file = files[0] || {}
    // The file name comes from the Workshop item, only its base name is used
    var filename = file.filename && path.basename(file.filename.replace(/\\/g, '/'))
    var missionPath = filename && self.missionPath(filename)

    if (!file.file_url || !missionPath) {
      return cb(new Error('Steam Workshop item ' + id + ' is not a downloadable mission'))
    }

    fetch(file.file_url).then(function (res) {
      if (!res.ok) {
        throw new Error('Downloading mission failed with HTTP ' + res.status)
      }

      return stream.promises.pipeline(stream.Readable.fromWeb(res.body), fs.createWriteStream(missionPath))
    }).then(function () {
      self.updateMissions()
      cb(null)
    }, function (err) {
      cb(err)
    })
  })
}

module.exports = Missions
