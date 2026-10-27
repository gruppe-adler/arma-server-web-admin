const express = require('express')
const request = require('supertest')
require('should')

const presets = require('../../routes/presets.js')

const servers = [{ id: 'Preset-Test', title: 'Preset Test', mods: ['gm', '450814997'] }]
const manager = {
  getServers: () => servers
}
const mods = {
  find: (id) => id === '450814997' ? { id, name: 'CBA_A3' } : undefined
}

const app = express()
app.use('/presets', presets(manager, mods))

describe('presets route', function () {
  it('should serve server preset', function (done) {
    request(app)
      .get('/presets/Preset-Test.html')
      .expect('Content-Type', /html/)
      .expect('Content-Disposition', 'inline; filename="Preset-Test.html"')
      .expect(200)
      .expect(function (res) {
        res.text.should.containEql('<meta name="arma:PresetName" content="Preset Test" />')
        res.text.should.containEql('<td data-type="DisplayName">CBA_A3</td>')
        res.text.should.containEql('https://store.steampowered.com/app/1042220')
      })
      .end(done)
  })

  it('should answer unknown servers with 404', function (done) {
    request(app)
      .get('/presets/unknown.html')
      .expect(404)
      .end(done)
  })

  it('should not resolve object properties as servers', function (done) {
    request(app)
      .get('/presets/__proto__.html')
      .expect(404)
      .end(done)
  })
})
