var async = require('async')
var fs = require('fs.extra')
var glob = require('glob')
var filesize = require('filesize')
var path = require('path')
var userhome = require('userhome')

function toBoolean(x) { return Boolean(x) }

var gamesLogFolder = {
  arma1: 'ArmA',
  arma2: 'ArmA 2',
  arma2oa: 'ArmA 2 OA',
  arma3: 'Arma 3',
  arma3_x64: 'Arma 3'
}

var Logs = function (config) {
  this.config = config

  if (this.config.type === 'linux') {
    fs.mkdirp(this.logsPath())
  }
}

Logs.generateLogFileName = function (game, identifier) {
  var dateStr = new Date().toISOString()
    .replace(/:/g, '-') // Replace time dividers with dash
    .replace(/T/, '_') // Remove date and time divider
    .replace(/\..+/, '') // Remove milliseconds

  return [game, identifier, dateStr].filter(toBoolean).join('_') + '.log'
}

Logs.prototype.generateLogFilePath = function (subdir, identifier) {
  var dir = path.join(this.logsPath(), subdir)
  fs.mkdirpSync(dir)
  return path.join(dir, Logs.generateLogFileName(this.config.game, identifier))
}

Logs.prototype.delete = function (id, callback) {
  this.getLogFile(id, function (err, logFile) {
    if (err) {
      if (callback) {
        return callback(err)
      }
    } else {
      if (logFile && logFile.path) {
        fs.unlink(logFile.path, callback)
      } else {
        if (callback) {
          return callback(new Error('File not found'))
        }
      }
    }
  })
}

Logs.prototype.logsPath = function () {
  if (this.config.type === 'linux') {
    return path.join(this.config.path, 'logs')
  }

  var gameLogFolder = gamesLogFolder[this.config.game]

  if (!gameLogFolder) {
    return null
  }

  if (this.config.type === 'windows') {
    return userhome('AppData', 'Local', gameLogFolder)
  }

  if (this.config.type === 'wine') {
    var username = process.env.USER
    return userhome('.wine', 'drive_c', 'users', username, 'Local Settings', 'Application Data', gameLogFolder)
  }

  return null
}

Logs.prototype.logFiles = function (callback) {
  var directory = this.logsPath()

  if (directory === null) {
    return callback(null, [])
  }

  glob(directory + '/**/*.log', {}, function (err, files) {
    if (err) {
      callback(err)
      return
    }

    files = files.map(function (file) {

      var bits = file.substr(directory.length).split('/')
      var name = bits.pop()
      var subdir = bits.pop()
      return {
        subdir: subdir,
        name: name,
        path: file,
        id: subdir + '-' + name
      }
    })

    async.filter(files, function (file, cb) {
      fs.stat(file.path, function (err, stat) {
        file.formattedSize = filesize(stat.size)
        file.size = stat.size
        file.mtime = stat.mtime
        file.birthtime = stat.birthtime
        cb(!err && stat.isFile())
      })
    }, function (files) {
      files.sort(function (a, b) {
        return a.subdir.localeCompare(b.subdir)
          || a.name.toLowerCase().localeCompare(b.name.toLowerCase())
      })

      callback(null, files)
    })
  })
}

Logs.prototype.getLogFile = function (id, callback) {
  this.logFiles(function (err, files) {
    if (err) {
      callback(err)
    } else {
      var validLogs = files.filter(function (file) {
        return file.id === id
      })

      if (validLogs.length > 0) {
        callback(null, validLogs[0])
      } else {
        callback(null, null)
      }
    }
  })
}

Logs.prototype.readLogFile = function (filename, callback) {
  fs.readFile(filename, callback)
}

module.exports = Logs
