var _ = require('lodash')

var cdlc = require('./cdlc')
var isWorkshopId = require('./workshop_id')

var style = [
  'body { margin: 0; padding: 0; color: #fff; background: #000; font-family: Roboto, Arial, sans-serif; }',
  'h1 { padding: 20px 20px 0 20px; color: white; font-weight: 200; font-size: 16pt; }',
  'p { padding: 0 20px; }',
  'a { color: #3a95d4; }',
  'table { border-collapse: collapse; width: 100%; }',
  'td { padding: 3px 20px; }',
  'tr:nth-child(even) { background: rgba(255, 255, 255, 0.05); }',
  '.from-steam { color: #449EBD; }',
  '.footer { padding: 20px; color: gray; }'
].join('\n      ')

function link (url) {
  return '<a href="' + _.escape(url) + '" data-type="Link">' + _.escape(url) + '</a>'
}

function modRow (mod) {
  return [
    '        <tr data-type="ModContainer">',
    '          <td data-type="DisplayName">' + _.escape(mod.name) + '</td>',
    '          <td><span class="from-steam">Steam</span></td>',
    '          <td>' + link('https://steamcommunity.com/sharedfiles/filedetails/?id=' + mod.id) + '</td>',
    '        </tr>'
  ].join('\n')
}

function dlcRow (dlc) {
  return [
    '        <tr data-type="DlcContainer">',
    '          <td data-type="DisplayName">' + _.escape(dlc.name) + '</td>',
    '          <td>' + link('https://store.steampowered.com/app/' + dlc.appId) + '</td>',
    '        </tr>'
  ].join('\n')
}

// Arma 3 Launcher mod preset of a server, the launcher imports the data-type marked rows
module.exports = function (server, modsManager) {
  var mods = []
  var dlcs = []

  server.mods.forEach(function (id) {
    var dlc = cdlc.find(id)
    if (dlc) {
      dlcs.push(dlc)
    } else if (isWorkshopId(id)) {
      var mod = modsManager.find(id)
      mods.push({ id: id, name: mod ? mod.name : id })
    }
  })

  var name = _.escape(server.title)
  var lines = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<html>',
    '  <head>',
    '    <meta name="arma:Type" content="preset" />',
    '    <meta name="arma:PresetName" content="' + name + '" />',
    '    <meta name="generator" content="Arma Server Admin" />',
    '    <title>Arma 3 - Preset ' + name + '</title>',
    '    <style>',
    '      ' + style,
    '    </style>',
    '  </head>',
    '  <body>',
    '    <h1>Arma 3 - Preset <strong>' + name + '</strong></h1>',
    '    <p class="before-list">',
    '      <em>To import this preset, drag this file onto the Launcher window. Or click the MODS tab, then PRESET in the top right, then IMPORT at the bottom, and finally select this file.</em>',
    '    </p>',
    '    <div class="mod-list">',
    '      <table>',
    mods.map(modRow).join('\n'),
    '      </table>',
    '    </div>'
  ]

  if (dlcs.length) {
    lines = lines.concat([
      '    <div class="dlc-list">',
      '      <table>',
      dlcs.map(dlcRow).join('\n'),
      '      </table>',
      '    </div>'
    ])
  }

  lines = lines.concat([
    '    <div class="footer">',
    '      <span>Created by Arma Server Admin.</span>',
    '    </div>',
    '  </body>',
    '</html>',
    ''
  ])

  return lines.filter(function (line) {
    return line !== ''
  }).join('\n') + '\n'
}
