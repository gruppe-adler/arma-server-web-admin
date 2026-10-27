var fs = require('fs')
var path = require('path')
var _ = require('underscore')
require('should')

function render (template, data) {
  var tpl = fs.readFileSync(path.join(__dirname, '..', '..', 'public', 'js', 'tpl', template), 'utf8')
  return _.template(tpl)(data)
}

var payload = '<img src=x onerror=alert(1)>'

describe('Templates', function () {
  it('should escape player names from game server queries', function () {
    var html = render('servers/players.html', {
      state: {},
      players: function () {
        return [{ name: payload, score: 1 }]
      }
    })
    html.should.not.containEql(payload)
    html.should.containEql(_.escape(payload))
  })

  it('should escape server info from game server queries', function () {
    var html = render('servers/info.html', {
      id: 'test',
      title: 'test',
      port: 2302,
      password: '',
      mods: [],
      pid: 1,
      processes: [{ name: payload, cpuFormatted: '1 %', memoryFormatted: '1 MB' }],
      state: { name: payload, map: payload, raw: { game: payload }, players: [], maxplayers: 10 }
    })
    html.should.not.containEql(payload)
  })
})
