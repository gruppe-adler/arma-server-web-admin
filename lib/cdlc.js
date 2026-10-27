var fs = require('fs')
var path = require('path')

// Creator DLCs are part of the game folder and loaded like mods, e.g. -mod=gm
var creatorDlcs = [
  { id: 'csla', name: 'CSLA Iron Curtain' },
  { id: 'ef', name: 'Expeditionary Forces' },
  { id: 'gm', name: 'Global Mobilization' },
  { id: 'rf', name: 'Reaction Forces' },
  { id: 'spe', name: 'Spearhead 1944' },
  { id: 'vn', name: 'S.O.G. Prairie Fire' },
  { id: 'ws', name: 'Western Sahara' }
]

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
