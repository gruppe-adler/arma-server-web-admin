var _ = require('lodash')

var Settings = function (config) {
  this.config = config
}

// Steam Workshop mods and SteamCMD installs need a steam config, local mods are used without
Settings.workshopEnabled = function (config) {
  return !!config.steam && config.steam.enabled !== false
}

Settings.prototype.getPublicSettings = function () {
  return Object.assign(_.pick(this.config, ['game', 'path', 'type']), {
    workshop: Settings.workshopEnabled(this.config)
  })
}

module.exports = Settings
