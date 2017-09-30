var async = require('async')
var fs = require('fs.extra')
var path = require('path')
var userhome = require('userhome')

function dirname(path) {
  return path.split('/').slice(0, -1).join('/')
}

var Logs = function (config) {
  this.config = config

  if (!this.config.logPath) {
    this.config.logPath = this.defaultLogDir() + '/arma3server_$DATE.log'
  }


  if (this.config.type === 'linux') {
    fs.mkdirp(config.logPath.split('/').slice(0, -1).join('/'))
  }
}

Logs.generateDefaultLogFileName = function () {
  var dateStr = new Date().toISOString()
    .replace(/:/g, '-') // Replace time dividers with dash
    .replace(/T/, '_') // Remove date and time divider
    .replace(/\..+/, '') // Remove milliseconds
  return 'arma3server_' + dateStr + '.log'
}

Logs.prototype.generateLogFilePath = function () {
  return path.join(this.defaultLogDir(), Logs.generateDefaultLogFileName())
}

Logs.prototype.defaultLogDir = function () {
  if (this.config.type === 'linux') {
    return path.join(this.config.path, 'logs')
  }

  if (this.config.type === 'windows') {
    return userhome('AppData', 'Local', 'Arma 3')
  }

  if (this.config.type === 'wine') {
    var username = process.env.USER
    return userhome('.wine', 'drive_c', 'users', username, 'Local Settings', 'Application Data', 'Arma 3')
  }

  return null
}

Logs.prototype.logFiles = function (callback) {
  var directory = this.defaultLogDir()

  if (directory === null) {
    callback(null, [])
  }

  fs.readdir(directory, function (err, files) {
    if (err) {
      callback(err)
      return
    }

    files = files.map(function (file) {
      return {
        name: file,
        path: path.join(directory, file)
      }
    })

    async.filter(files, function (file, cb) {
      fs.stat(file.path, function (err, stat) {
        file.size = stat.size
        cb(!err && stat.isFile())
      })
    }, function (files) {
      files.sort(function (a, b) {
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase())
      })

      callback(null, files)
    })
  })
}

Logs.prototype.getLogFile = function (filename, callback) {
  this.logFiles(function (err, files) {
    if (err) {
      callback(err)
    } else {
      var validLogs = files.filter(function (file) {
        return file.name === filename
      })

      if (validLogs.length > 0) {
        callback(null, validLogs[0])
      } else {
        callback(null, null)
      }
    }
  })
}

module.exports = Logs
