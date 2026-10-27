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
      presetUrl: 'https://admin.example.com/presets/test.html',
      pid: 1,
      processes: [{ name: payload, cpuFormatted: '1 %', memoryFormatted: '1 MB' }],
      state: { name: payload, map: payload, raw: { game: payload }, players: [], maxplayers: 10 }
    })
    html.should.not.containEql(payload)
  })

  it('should link launcher preset on server info', function () {
    var html = render('servers/info.html', { id: 'test', title: 'test', port: 2302, mods: [], presetUrl: 'https://admin.example.com/presets/test.html', pid: null, processes: null, state: null })
    html.should.containEql('<a href="https://admin.example.com/presets/test.html" target="_blank" rel="noopener noreferrer">https://admin.example.com/presets/test.html</a>')
  })

  describe('Workshop mods', function () {
    var mod = { cdlc: false, downloading: false, id: '450814997', name: 'CBA_A3', needsUpdate: true, path: '/steam/450814997' }
    var link = 'https://steamcommunity.com/sharedfiles/filedetails/?id=450814997'

    it('should link mod to Workshop page in mods list', function () {
      var html = render('mods/list_item.html', Object.assign({ link: link }, mod))
      html.should.containEql("<a href='" + link + "' target=_blank rel='noopener noreferrer'>CBA_A3</a>")
      html.should.containEql('Update')
    })

    it('should link mod to Workshop page in server mods', function () {
      var html = render('servers/mods/available/list_item.html', Object.assign({ link: link, isDisabledButton: function () { return '' } }, mod))
      html.should.containEql("<a href='" + link + "' target=_blank rel='noopener noreferrer'>CBA_A3</a>")
    })
  })

  describe('Creator DLCs', function () {
    var cdlc = { cdlc: true, downloading: false, id: 'gm', link: null, name: 'Global Mobilization', needsUpdate: false, path: '/arma3/gm' }

    it('should show Creator DLC without Workshop link and buttons in mods list', function () {
      var html = render('mods/list_item.html', cdlc)
      html.should.containEql('Global Mobilization')
      html.should.containEql('Creator DLC')
      html.should.not.containEql('<a ')
    })

    it('should show selected mod name without editing', function () {
      var html = render('servers/mods/selected/list_item.html', { name: 'Global Mobilization' })
      html.should.containEql('Global Mobilization')
      html.should.not.containEql('<input')
      html.should.containEql('delete')
    })

    it('should allow adding Creator DLC to servers', function () {
      var html = render('servers/mods/available/list_item.html', Object.assign({ isDisabledButton: function () { return '' } }, cdlc))
      html.should.containEql('Creator DLC')
      html.should.containEql('add-mod')
    })
  })

  describe('Arma 3 install dialog', function () {
    var branches = [
      { name: 'public', description: '', buildId: '1', updated: null },
      { name: 'contact', description: 'Contact Build', buildId: '2', updated: null }
    ]
    var base = { installing: false, branch: null, state: null, progress: null, error: null, path: '/arma3', branches: branches }

    it('should preselect listed default branch', function () {
      var html = render('game/install.html', Object.assign({ defaultBranch: 'contact', customBranch: '' }, base))
      html.should.match(/<option value="contact" selected>/)
      html.should.match(/<option value="public" >/)
      html.should.containEql('id="custom-branch-group" style="display: none;"')
    })

    it('should preselect private default branch as custom branch', function () {
      var html = render('game/install.html', Object.assign({ defaultBranch: 'legacy', customBranch: 'legacy' }, base))
      html.should.containEql('<option value="" selected>Other branch...</option>')
      html.should.not.containEql('id="custom-branch-group" style="display: none;"')
      html.should.containEql('id="custom-branch" autocomplete="off" value="legacy"')
    })
  })
})
