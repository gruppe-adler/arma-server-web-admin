require('should')

var preset = require('../../lib/preset.js')

var modsManager = {
  find: function (id) {
    if (id === '450814997') {
      return { id: '450814997', name: 'CBA_A3' }
    }
    if (id === '463939057') {
      return { id: '463939057', name: '<script>alert(1)</script>' }
    }
  }
}

describe('preset()', function () {
  var html = preset({ id: 'main', title: 'Main <Server>', mods: ['gm', '450814997', '999', '@legacy'] }, modsManager)

  it('should be an Arma 3 Launcher preset named after the server', function () {
    html.should.containEql('<meta name="arma:Type" content="preset" />')
    html.should.containEql('<meta name="arma:PresetName" content="Main &lt;Server&gt;" />')
  })

  it('should list Workshop mods with name and Workshop link', function () {
    html.should.containEql([
      '        <tr data-type="ModContainer">',
      '          <td data-type="DisplayName">CBA_A3</td>',
      '          <td><span class="from-steam">Steam</span></td>',
      '          <td><a href="https://steamcommunity.com/sharedfiles/filedetails/?id=450814997" data-type="Link">https://steamcommunity.com/sharedfiles/filedetails/?id=450814997</a></td>',
      '        </tr>'
    ].join('\n'))
  })

  it('should list Workshop mods that are not installed by id', function () {
    html.should.containEql('<td data-type="DisplayName">999</td>')
  })

  it('should list Creator DLCs with Steam store link', function () {
    html.should.containEql('<tr data-type="DlcContainer">')
    html.should.containEql('<td data-type="DisplayName">Global Mobilization</td>')
    html.should.containEql('https://store.steampowered.com/app/1042220')
  })

  it('should skip mods that are neither Workshop mods nor Creator DLCs', function () {
    html.should.not.containEql('@legacy')
  })

  it('should escape mod names', function () {
    var html = preset({ id: 'main', title: 'Main', mods: ['463939057'] }, modsManager)
    html.should.not.containEql('<script>')
    html.should.containEql('&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  it('should leave out DLC list without Creator DLCs', function () {
    var html = preset({ id: 'main', title: 'Main', mods: ['450814997'] }, modsManager)
    html.should.not.containEql('dlc-list')
  })
})
