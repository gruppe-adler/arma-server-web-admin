var _ = require('lodash')
var events = require('events')
var filesize = require('filesize')
var GameDig = require('gamedig').GameDig
var path = require('path')
var usage = require('pidusage')
var slugify = require('slugify')

var ArmaServer = require('arma-server')

var virtualServer = require('./virtualServer')

var processesInterval = 2000
var queryInterval = 5000
var queryTypes = {
  arma1: 'aaa',
  arma2: 'arma2',
  arma2oa: 'a2oa',
  arma3: 'arma3',
  arma3_x64: 'arma3',
  cwa: 'acwa',
  ofp: 'ofcwc',
  ofpresistance: 'ofr'
}

function exitReason (err, code, signal, lastOutput) {
  var reason
  if (err && err.code === 'ENOENT') {
    reason = 'Server executable not found: ' + err.path
  } else if (err && err.code === 'EACCES') {
    reason = 'Server executable cannot be run: ' + err.path
  } else if (err) {
    reason = err.message
  } else if (signal) {
    reason = 'Killed by ' + signal
  } else {
    reason = 'Exited with code ' + code
  }

  if (lastOutput) {
    reason += ', last output: ' + lastOutput.slice(0, 200)
  }

  return reason
}

var Server = function (config, logs, mods, options) {
  this.config = config
  this.logs = logs
  this.modsManager = mods
  this.update(options)
}

Server.prototype = Object.create(events.EventEmitter.prototype)

Server.prototype.createServerTitle = function (title) {
  if (this.config.prefix) {
    title = this.config.prefix + title
  }

  if (this.config.suffix) {
    title = title + this.config.suffix
  }

  return title
}

Server.prototype.generateId = function () {
  return slugify(this.title).replace(/\./g, '-')
}

Server.prototype.update = function (options) {
  this.additionalConfigurationOptions = options.additionalConfigurationOptions
  this.admin_password = options.admin_password
  this.allowed_file_patching = options.allowed_file_patching
  this.auto_start = options.auto_start
  this.battle_eye = options.battle_eye
  this.file_patching = options.file_patching
  this.forcedDifficulty = options.forcedDifficulty || null
  this.max_players = options.max_players
  this.missions = options.missions
  this.mods = options.mods || []
  this.motd = options.motd || null
  this.number_of_headless_clients = options.number_of_headless_clients || 0
  this.password = options.password
  this.parameters = options.parameters
  this.persistent = options.persistent
  this.port = options.port || 2302
  this.title = options.title
  this.von = options.von
  this.verify_signatures = options.verify_signatures

  this.id = this.generateId()
  this.port = parseInt(this.port, 10) // If port is a string then gamedig fails
}

function processStats (stats) {
  return {
    cpu: stats.cpu,
    cpuFormatted: stats.cpu.toFixed(0) + ' %',
    memory: stats.memory,
    memoryFormatted: filesize(stats.memory)
  }
}

Server.prototype.queryProcesses = function () {
  if (!this.instance) {
    return
  }

  var self = this
  var headlessPids = this.headlessClientInstances.map(function (instance) {
    return instance.pid
  })
  var serverPid = self.instance.pid
  var pids = [serverPid].concat(headlessPids)
  usage(pids, function (err, stats) {
    if (!self.instance) {
      return
    }

    if (err) {
      self.processes = null
    } else {
      self.processes = pids.map(function (pid, idx) {
        var pidStats = processStats(stats[pid])
        if (pid === serverPid) {
          pidStats.name = 'Server'
        } else {
          pidStats.name = 'Headless ' + idx // First headless at idx 1
        }
        return pidStats
      })
    }

    self.emit('state')
  })
}

Server.prototype.queryStatus = function () {
  if (!this.instance) {
    return
  }

  var self = this
  GameDig.query({
    type: queryTypes[this.config.game],
    host: '127.0.0.1',
    port: self.port
  }).then(function (state) {
    if (!self.instance) {
      return
    }

    self.state = state
    self.online = true
    self.startHeadlessClientsIfNeeded()
    self.emit('state')
  }, function () {
    if (!self.instance) {
      return
    }

    self.state = null
    self.emit('state')
  })
}

// Installed mods selected for this server, in the selected order
Server.prototype.findMods = function () {
  var self = this
  return this.mods.map(function (mod) {
    return self.modsManager.find(mod)
  }).filter(function (mod) {
    return mod
  })
}

// Workshop mod folders, Creator DLCs are part of the game folder
Server.prototype.getMods = function () {
  return this.findMods().filter(function (mod) {
    return !mod.cdlc
  }).map(function (mod) {
    return mod.path
  })
}

// Creator DLCs relative to the game folder, virtual server folders link mods by folder name,
// otherwise local mods use their launch path and Workshop mods their full path
Server.prototype.getLaunchMods = function () {
  var virtualServer = !!this.virtualServerFolder

  return this.findMods().map(function (mod) {
    if (mod.cdlc) {
      return mod.id
    }

    if (virtualServer) {
      return path.basename(mod.path)
    }

    return mod.launchPath || mod.path
  })
}

Server.prototype.getParameters = function () {
  var parameters = []

  if (this.config.parameters && Array.isArray(this.config.parameters)) {
    parameters = parameters.concat(this.config.parameters)
  }

  if (this.parameters && Array.isArray(this.parameters)) {
    parameters = parameters.concat(this.parameters)
  }

  return parameters
}

Server.prototype.getAdditionalConfigurationOptions = function () {
  var additionalConfigurationOptions = ''

  if (this.config.additionalConfigurationOptions) {
    additionalConfigurationOptions += this.config.additionalConfigurationOptions
  }

  if (this.additionalConfigurationOptions) {
    if (additionalConfigurationOptions) {
      additionalConfigurationOptions += '\n'
    }

    additionalConfigurationOptions += this.additionalConfigurationOptions
  }

  return additionalConfigurationOptions
}

Server.prototype.start = function () {
  if (this.instance) {
    return this
  }

  var self = this
  var mods = this.getMods()

  if (self.config.virtualServer && self.config.virtualServer.enabled) {
    virtualServer.create(self.config, mods)
      .then((serverFolder) => {
        self.virtualServerFolder = serverFolder
        self.path = serverFolder
        self.realStart()
      }, (err) => {
        console.error('Error creating virtual server folder:', err)
        self.notifyStopped('Could not create virtual server folder: ' + err.message)
      })
  } else {
    self.path = self.config.path
    self.realStart()
  }
}

Server.prototype.realStart = function () {
  if (this.instance) {
    return this
  }

  var self = this
  var parameters = this.getParameters()
  var server = new ArmaServer.Server({
    additionalConfigurationOptions: this.getAdditionalConfigurationOptions(),
    admins: this.config.admins,
    allowedFilePatching: this.allowed_file_patching || 1,
    battleEye: this.battle_eye ? 1 : 0,
    config: this.id,
    disableVoN: this.von ? 0 : 1,
    game: this.config.game,
    filePatching: this.file_patching || false,
    forcedDifficulty: this.forcedDifficulty || null,
    headlessClients: this.number_of_headless_clients > 0 ? ['127.0.0.1'] : null,
    hostname: this.createServerTitle(this.title),
    localClient: this.number_of_headless_clients > 0 ? ['127.0.0.1'] : null,
    missions: this.missions,
    mods: this.getLaunchMods(),
    motd: (this.motd && this.motd.split('\n')) || null,
    parameters: parameters,
    password: this.password,
    passwordAdmin: this.admin_password,
    path: this.path,
    persistent: this.persistent ? 1 : 0,
    platform: this.config.type,
    players: this.max_players,
    port: this.port,
    serverMods: this.config.serverMods,
    verifySignatures: this.verify_signatures ? 2 : 0
  })

  this.online = false
  this.stopRequested = false

  var instance
  try {
    if (!server.armaServerPath()) {
      throw new Error('No server executable known for ' + this.config.game + ' on ' + this.config.type)
    }

    server.writeServerConfig()
    instance = server.start()
  } catch (err) {
    console.error('Error starting server ' + this.title + ':', err)
    this.removeVirtualServerFolder()
    this.notifyStopped(err.message)
    return this
  }

  // Remember why the server exits, to tell the user unless the stop was requested
  var spawnError = null
  var lastOutput = ''
  function rememberOutput (data) {
    var lines = data.toString().split(/\r?\n/).map(function (line) {
      return line.trim()
    }).filter(Boolean)

    if (lines.length) {
      lastOutput = lines[lines.length - 1]
    }
  }

  instance.stdout.on('data', rememberOutput)
  instance.stderr.on('data', rememberOutput)
  instance.on('error', function (err) {
    spawnError = err
  })

  instance.on('close', function (code, signal) {
    if (!self.stopRequested) {
      var reason = exitReason(spawnError, code, signal, lastOutput)
      console.error('Server ' + self.title + ' exited: ' + reason)
      self.notifyStopped(reason)
    }

    clearInterval(self.queryProcessesInterval)
    clearInterval(self.queryStatusInterval)
    self.state = null
    self.processes = null
    self.pid = null
    self.instance = null

    self.stopHeadlessClients()
      .then(() => {
        self.removeVirtualServerFolder()
        self.emit('state')
      })
  })

  this.pid = instance.pid
  this.instance = instance
  this.headlessClientInstances = []
  this.queryProcessesInterval = setInterval(function () {
    self.queryProcesses()
  }, processesInterval)
  this.queryStatusInterval = setInterval(function () {
    self.queryStatus()
  }, queryInterval)

  this.logs.logServerProcess(this.instance, this.id, 'server')
  this.logs.cleanupOldLogFiles()

  this.emit('state')

  return this
}

Server.prototype.removeVirtualServerFolder = function () {
  if (this.virtualServerFolder) {
    virtualServer.remove(this.virtualServerFolder)
    this.virtualServerFolder = null
  }
}

// Servers that never answered a status query failed to start, otherwise they stopped
Server.prototype.notifyStopped = function (reason) {
  this.emit('notification', {
    type: 'error',
    title: this.online ? this.title + ' stopped unexpectedly' : 'Starting ' + this.title + ' failed',
    message: reason
  })
}

Server.prototype.startHeadlessClientsIfNeeded = function () {
  if (this.number_of_headless_clients > 0 && this.headlessClientInstances.length === 0) {
    this.startHeadlessClients()
  }
}

Server.prototype.startHeadlessClients = function () {
  var mods = this.getLaunchMods()
  var parameters = this.getParameters()
  var self = this
  var headlessClientInstances = _.times(this.number_of_headless_clients, function (i) {
    var headless = new ArmaServer.Headless({
      filePatching: self.file_patching,
      game: self.config.game,
      host: '127.0.0.1',
      mods: mods,
      parameters: parameters,
      password: self.password,
      path: self.path,
      platform: self.config.type,
      port: self.port
    })
    var headlessInstance = headless.start()
    self.logs.logServerProcess(headlessInstance, self.id, 'hc_' + (i + 1))
    return headlessInstance
  })

  this.headlessClientInstances = headlessClientInstances
}

Server.prototype.stop = function (cb) {
  var handled = false
  this.stopRequested = true

  this.instance.on('close', function (code) {
    if (!handled) {
      handled = true

      if (cb) {
        cb()
      }
    }
  })

  this.instance.kill()

  // Fallback if the server does not exit, does not keep the application running
  setTimeout(function () {
    if (!handled) {
      handled = true

      if (cb) {
        cb()
      }
    }
  }, 5000).unref()

  return this
}

Server.prototype.stopHeadlessClients = function () {
  var self = this
  return Promise.all(this.headlessClientInstances.map(function (headlessClientInstance) {
    var handled = false
    return new Promise(function (resolve, reject) {
      headlessClientInstance.on('close', function () {
        if (!handled) {
          handled = true
          resolve()
        }
      })

      setTimeout(function () {
        if (!handled) {
          handled = true
          resolve()
        }
      }, 5000)

      headlessClientInstance.kill()
    })
  })).then(function () {
    self.headlessClientInstances = []
  })
}

Server.prototype.toJSON = function () {
  return {
    additionalConfigurationOptions: this.additionalConfigurationOptions,
    admin_password: this.admin_password,
    allowed_file_patching: this.allowed_file_patching,
    auto_start: this.auto_start,
    battle_eye: this.battle_eye,
    id: this.id,
    file_patching: this.file_patching,
    forcedDifficulty: this.forcedDifficulty,
    max_players: this.max_players,
    missions: this.missions,
    motd: this.motd,
    mods: this.mods,
    number_of_headless_clients: this.number_of_headless_clients,
    parameters: this.parameters,
    password: this.password,
    persistent: this.persistent,
    pid: this.pid,
    port: this.port,
    processes: this.processes,
    state: this.state,
    title: this.title,
    von: this.von,
    verify_signatures: this.verify_signatures
  }
}

module.exports = Server
