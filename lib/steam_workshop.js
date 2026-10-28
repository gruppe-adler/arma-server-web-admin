var filesize = require('filesize')
var fs = require('fs')
var path = require('path')
var VDF = require('@node-steam/vdf')

var steamApi = require('./steam_api')
var steamCmd = require('./steamcmd')

var appId = '107410' // Arma 3

function acfPath (steamPath) {
  return path.join(steamPath, 'steamapps', 'workshop', 'appworkshop_' + appId + '.acf')
}

function modPath (steamPath, id) {
  return path.join(steamPath, 'steamapps', 'workshop', 'content', appId, String(id))
}

function readAcf (steamPath, cb) {
  fs.readFile(acfPath(steamPath), 'utf8', function (err, text) {
    if (err) {
      return cb(err)
    }

    try {
      cb(null, VDF.parse(text))
    } catch (err) {
      cb(err)
    }
  })
}

// Steam Workshop mods of Arma 3, installed with SteamCMD into the steam path
var SteamWorkshop = function (options) {
  this.currentDownloads = {}
  this.options = options || {}
}

SteamWorkshop.prototype.mods = function (cb) {
  var self = this
  var steamPath = this.options.path

  readAcf(steamPath, function (err, acf) {
    if (err) {
      return cb(err)
    }

    var workshop = acf.AppWorkshop || {}
    var installed = Object.assign({}, workshop.WorkshopItemsInstalled, workshop.WorkshopItemDetails)
    var ids = Object.keys(installed)
    Object.keys(self.currentDownloads).forEach(function (id) {
      if (ids.indexOf(id) === -1) {
        ids.push(id)
      }
    })

    if (ids.length === 0) {
      return cb(null, [])
    }

    steamApi.getPublishedFileDetails(ids, function (err, files) {
      if (err) {
        return cb(err)
      }

      cb(null, files.filter(function (file) {
        return file && file.publishedfileid
      }).map(function (file) {
        var id = String(file.publishedfileid)
        var downloading = self.currentDownloads[id] === true
        var installedMod = installed[id]
        var partial = !!installedMod && installedMod.BytesToDownload > 0
        var outdated = !!installedMod && file.time_updated > installedMod.timeupdated

        return {
          downloading: downloading,
          id: id,
          name: file.title || id,
          needsUpdate: downloading || outdated || partial,
          path: modPath(steamPath, id)
        }
      }).sort(function (a, b) {
        return a.name.localeCompare(b.name)
      }))
    })
  })
}

SteamWorkshop.prototype.downloadMod = function (id, cb) {
  var self = this
  id = String(id)

  if (this.currentDownloads[id]) {
    return cb(new Error('Already downloading ' + id))
  }

  var options = this.options
  var login = options.username && options.password ? options.username + ' ' + options.password : (options.username || 'anonymous')
  var args = [
    '+@NoPromptForPassword 1',
    '+@ShutdownOnFailedCommand 1',
    '+force_install_dir "' + options.path + '"',
    '+login ' + login,
    '+workshop_download_item ' + appId + ' ' + id,
    '+quit'
  ]

  this.currentDownloads[id] = true
  steamCmd.run(args, null, function (err, result) {
    delete self.currentDownloads[id]

    if (!err) {
      var error = steamCmd.lastError(result.output)
      if (error) {
        err = new Error(error)
      } else if (result.code !== 0) {
        err = new Error('SteamCMD exited with code ' + result.code)
      }
    }

    cb(err || null)
  })
}

SteamWorkshop.prototype.deleteMod = function (id, cb) {
  var steamPath = this.options.path
  id = String(id)

  readAcf(steamPath, function (err, acf) {
    if (err) {
      return cb(err)
    }

    var workshop = acf.AppWorkshop
    if (workshop) {
      var installedMods = workshop.WorkshopItemsInstalled
      if (installedMods && installedMods[id]) {
        var size = parseInt(installedMods[id].size, 10)
        var sizeOnDisk = parseInt(workshop.SizeOnDisk, 10)
        if (size && sizeOnDisk) {
          workshop.SizeOnDisk = sizeOnDisk - size
        }
        delete installedMods[id]
      }

      if (workshop.WorkshopItemDetails) {
        delete workshop.WorkshopItemDetails[id]
      }
    }

    fs.writeFile(acfPath(steamPath), VDF.stringify(acf), function (err) {
      if (err) {
        return cb(err)
      }

      fs.rm(modPath(steamPath, id), { recursive: true, force: true }, cb)
    })
  })
}

SteamWorkshop.prototype.search = function (text, cb) {
  if (!text) {
    return cb(new Error('Missing search text'))
  }

  steamApi.queryFiles({
    appid: appId,
    key: this.options.apiKey,
    numperpage: 100,
    return_metadata: 1,
    return_short_description: 1,
    search_text: text
  }, function (err, files) {
    if (err) {
      return cb(err)
    }

    // Missions have a file name, mods do not
    cb(null, files.filter(function (file) {
      return file.result === 1 && !file.filename
    }).map(function (file) {
      return {
        created: file.time_created,
        description: file.short_description,
        fileSize: Number(file.file_size),
        fileSizeFormatted: file.file_size ? filesize(Number(file.file_size)) : undefined,
        id: file.publishedfileid,
        image: file.preview_url,
        link: 'https://steamcommunity.com/sharedfiles/filedetails/?id=' + file.publishedfileid,
        subscriptions: file.subscriptions,
        title: file.title,
        updated: file.time_updated
      }
    }))
  })
}

module.exports = SteamWorkshop
