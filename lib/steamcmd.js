var childProcess = require('child_process')
var fs = require('fs')

var download = require('steamcmd/src/download')
var env = require('steamcmd/src/env')

function stripColors (text) {
  return text.replace(/\x1b\[[0-9;]*m/g, '') // eslint-disable-line no-control-regex
}

function ensureInstalled (cb) {
  fs.access(env.executable(), fs.constants.X_OK, function (err) {
    if (!err) {
      return cb(null)
    }

    console.log('Installing SteamCMD to ' + env.directory())
    download(cb)
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

    var steamCmd = childProcess.spawn(env.executable(), args)
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

module.exports = {
  run: run
}
