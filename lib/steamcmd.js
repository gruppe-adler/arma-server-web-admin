var childProcess = require('child_process')
var fs = require('fs')
var os = require('os')
var path = require('path')
var stream = require('stream')
var tar = require('tar')

// Official SteamCMD downloads
var downloads = {
  darwin: 'https://steamcdn-a.akamaihd.net/client/installer/steamcmd_osx.tar.gz',
  linux: 'https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz',
  win32: 'https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip'
}

var pendingInstall = null

function stripColors (text) {
  return text.replace(/\x1b\[[0-9;]*m/g, '') // eslint-disable-line no-control-regex
}

// Same folders as the previous steamcmd package, existing installations are used
function directory () {
  if (process.platform === 'win32') {
    return path.join(process.env.LOCALAPPDATA || process.env.APPDATA, 'steamcmd')
  }

  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'steamcmd')
  }

  return path.join(os.homedir(), '.config', 'steamcmd')
}

function executable () {
  return path.join(directory(), process.platform === 'win32' ? 'steamcmd.exe' : 'steamcmd.sh')
}

// Downloads and unpacks SteamCMD into target, tar skips absolute paths and .. entries
function download (target, cb) {
  var url = downloads[process.platform]
  if (!url) {
    return cb(new Error('SteamCMD is not available for ' + process.platform))
  }

  fs.promises.mkdir(target, { recursive: true }).then(function () {
    return fetch(url)
  }).then(function (res) {
    if (!res.ok) {
      throw new Error('Downloading SteamCMD failed with HTTP ' + res.status)
    }

    var body = stream.Readable.fromWeb(res.body)

    if (process.platform !== 'win32') {
      return stream.promises.pipeline(body, tar.x({ cwd: target }))
    }

    // Windows 10 and newer include tar, which unpacks zip files
    var zipFile = path.join(target, 'steamcmd.zip')
    return stream.promises.pipeline(body, fs.createWriteStream(zipFile)).then(function () {
      return new Promise(function (resolve, reject) {
        childProcess.execFile('tar', ['-xf', zipFile, '-C', target], function (err) {
          return err ? reject(err) : resolve()
        })
      })
    }).then(function () {
      return fs.promises.unlink(zipFile)
    })
  }).then(function () {
    cb(null)
  }, function (err) {
    cb(err)
  })
}

function ensureInstalled (cb) {
  fs.access(executable(), fs.constants.X_OK, function (err) {
    if (!err) {
      return cb(null)
    }

    if (!pendingInstall) {
      console.log('Installing SteamCMD to ' + directory())
      pendingInstall = new Promise(function (resolve, reject) {
        download(directory(), function (err) {
          pendingInstall = null
          return err ? reject(err) : resolve()
        })
      })
    }

    pendingInstall.then(function () {
      cb(null)
    }, function (err) {
      cb(err)
    })
  })
}

// Runs SteamCMD with the given commands, calls onLine for each output line
function run (args, onLine, cb) {
  ensureInstalled(function (err) {
    if (err) {
      return cb(err)
    }

    var output = ''
    var partialLine = ''
    var done = false

    function finish (err, code) {
      if (!done) {
        done = true
        cb(err, { code: code, output: output })
      }
    }

    function handleData (data) {
      var text = stripColors(data.toString())
      output += text

      var lines = (partialLine + text).split(/\r?\n/)
      partialLine = lines.pop()
      if (onLine) {
        lines.forEach(onLine)
      }
    }

    var steamCmd = childProcess.spawn(executable(), args)
    steamCmd.stdout.on('data', handleData)
    steamCmd.stderr.on('data', handleData)
    steamCmd.on('error', function (err) {
      finish(err)
    })
    steamCmd.on('close', function (code) {
      if (partialLine && onLine) {
        onLine(partialLine)
      }

      if (code === 127) {
        return finish(new Error('SteamCMD could not be started, are its 32-bit libraries installed?'), code)
      }

      finish(null, code)
    })
  })
}

// Last error line of SteamCMD output, null if there is none
function lastError (output) {
  var errors = output.split(/\r?\n/).filter(function (line) {
    return /^\s*(ERROR|FAILED)/i.test(line)
  })

  return errors.length ? errors[errors.length - 1].trim() : null
}

module.exports = {
  directory: directory,
  download: download,
  lastError: lastError,
  run: run
}
