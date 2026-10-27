var events = require('events')
var VDF = require('@node-steam/vdf')

var steamCmd = require('./steamcmd')

var appId = '233780' // Arma 3 Server

// Branch names and passwords end up in a SteamCMD command line
var validBranch = /^[A-Za-z0-9_.-]+$/
var validPassword = /^[^\s"+]+$/

function extractAppInfo (output) {
  var start = output.indexOf('"' + appId + '"')
  if (start < 0) {
    throw new Error('SteamCMD returned no app info for ' + appId)
  }

  var depth = 0
  for (var i = output.indexOf('{', start); i >= 0 && i < output.length; i++) {
    if (output[i] === '{') {
      depth++
    } else if (output[i] === '}' && --depth === 0) {
      return VDF.parse(output.slice(start, i + 1))[appId]
    }
  }

  throw new Error('SteamCMD returned incomplete app info for ' + appId)
}

function parseBranches (output) {
  var branches = (extractAppInfo(output).depots || {}).branches || {}

  return Object.keys(branches).map(function (name) {
    var branch = branches[name]
    return {
      name: name,
      description: branch.description || '',
      buildId: String(branch.buildid || ''),
      updated: branch.timeupdated ? new Date(branch.timeupdated * 1000).toISOString() : null
    }
  }).sort(function (a, b) {
    if (a.name === 'public') {
      return -1
    }
    if (b.name === 'public') {
      return 1
    }
    return a.name.localeCompare(b.name)
  })
}

function parseProgress (line) {
  var match = line.match(/Update state \(0x[0-9a-f]+\) ([^,]+), progress: ([0-9.]+)/i)
  if (!match) {
    return null
  }

  return {
    state: match[1].trim(),
    progress: parseFloat(match[2])
  }
}

function parseResult (output) {
  if (output.indexOf("Success! App '" + appId + "' fully installed") >= 0) {
    return null
  }

  var errorLines = output.split(/\r?\n/).filter(function (line) {
    return /^\s*(ERROR|FAILED)/i.test(line)
  })

  return new Error(errorLines.length ? errorLines[errorLines.length - 1].trim() : 'SteamCMD did not finish the installation')
}

function installArguments (config, options) {
  var steam = config.steam || {}
  var platform = config.type === 'linux' ? 'linux' : 'windows'
  var login = steam.username && steam.password ? steam.username + ' ' + steam.password : 'anonymous'
  var appUpdate = '+app_update ' + appId + ' -beta ' + options.branch

  if (options.password) {
    appUpdate += ' -betapassword ' + options.password
  }

  return [
    '+@sSteamCmdForcePlatformType ' + platform,
    '+@NoPromptForPassword 1',
    '+force_install_dir "' + config.path + '"',
    '+login ' + login,
    appUpdate + ' validate',
    '+quit'
  ]
}

var GameInstaller = function (config) {
  this.config = config
  this.status = {
    installing: false,
    branch: null,
    state: null,
    progress: null
  }
}

GameInstaller.prototype = Object.create(events.EventEmitter.prototype)

GameInstaller.prototype.branches = function (cb) {
  var args = ['+login anonymous', '+app_info_update 1', '+app_info_print ' + appId, '+quit']
  steamCmd.run(args, null, function (err, result) {
    if (err) {
      return cb(err)
    }

    try {
      cb(null, parseBranches(result.output))
    } catch (err) {
      cb(err)
    }
  })
}

GameInstaller.prototype.install = function (options, cb) {
  var self = this

  if (this.status.installing) {
    return cb(new Error('Arma 3 is already being installed'))
  }

  if (!validBranch.test(options.branch || '')) {
    return cb(new Error('Invalid branch name'))
  }

  if (options.password && !validPassword.test(options.password)) {
    return cb(new Error('Invalid branch password'))
  }

  this.setStatus({ installing: true, branch: options.branch, state: 'starting', progress: null })
  cb(null)

  steamCmd.run(installArguments(this.config, options), function (line) {
    var progress = parseProgress(line)
    if (progress) {
      self.setStatus(progress)
    }
  }, function (err, result) {
    err = err || parseResult(result.output)
    self.setStatus({ installing: false, state: null, progress: null })

    if (err) {
      console.log('Installing Arma 3 failed: ' + err)
      self.emit('notification', {
        type: 'error',
        title: 'Installing Arma 3 (' + options.branch + ') failed',
        message: err.message
      })
    } else {
      self.emit('notification', {
        type: 'success',
        title: 'Arma 3 installed',
        message: 'Branch ' + options.branch + ' is installed to ' + self.config.path
      })
    }
  })
}

GameInstaller.prototype.setStatus = function (status) {
  Object.assign(this.status, status)
  this.emit('status', this.status)
}

GameInstaller.parseBranches = parseBranches
GameInstaller.parseProgress = parseProgress
GameInstaller.parseResult = parseResult
GameInstaller.installArguments = installArguments

module.exports = GameInstaller
