var fs = require('fs')
var path = require('path')

// Creator DLCs are part of the game folder and loaded like mods, e.g. -mod=gm, appId is the Steam store app
var creatorDlcs = [
  { id: 'csla', name: 'CSLA Iron Curtain', appId: 1294440 },
  { id: 'ef', name: 'Expeditionary Forces', appId: 2647830 },
  { id: 'gm', name: 'Global Mobilization', appId: 1042220 },
  { id: 'rf', name: 'Reaction Forces', appId: 2647760 },
  { id: 'spe', name: 'Spearhead 1944', appId: 1175380 },
  { id: 'vn', name: 'S.O.G. Prairie Fire', appId: 1227700 },
  { id: 'ws', name: 'Western Sahara', appId: 1681170 }
]

// Known Creator DLC by folder name, installed or not
module.exports.find = function (id) {
  return creatorDlcs.find(function (cdlc) {
    return cdlc.id === id
  })
}

// Calls back with the Creator DLCs installed in the game folder, as mods
module.exports.installed = function (gamePath, cb) {
  if (!gamePath) {
    return cb(null, [])
  }

  var pending = creatorDlcs.length
  var installed = []

  creatorDlcs.forEach(function (cdlc) {
    var cdlcPath = path.join(gamePath, cdlc.id)
    fs.access(path.join(cdlcPath, 'addons'), function (err) {
      if (!err) {
        installed.push({
          cdlc: true,
          downloading: false,
          id: cdlc.id,
          name: cdlc.name,
          needsUpdate: false,
          path: cdlcPath
        })
      }

      if (--pending === 0) {
        cb(null, installed.sort(function (a, b) {
          return a.name.localeCompare(b.name)
        }))
      }
    })
  })
}
