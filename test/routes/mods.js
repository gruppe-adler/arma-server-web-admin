const express = require('express')
const request = require('supertest')
require('should')

const LocalMods = require('../../lib/local_mods.js')
const modsRoute = require('../../routes/mods.js')

describe('mods route with local mods', function () {
  const app = express()
  app.use(express.json())
  app.use('/api/mods', modsRoute(new LocalMods({ path: '/nonexistent' })))

  it('should not download from Steam Workshop', function (done) {
    request(app)
      .post('/api/mods')
      .send({ id: '450814997' })
      .expect(404, 'Steam Workshop is disabled')
      .end(done)
  })

  it('should not search Steam Workshop', function (done) {
    request(app)
      .post('/api/mods/search')
      .send({ query: 'cba' })
      .expect(404, 'Steam Workshop is disabled')
      .end(done)
  })

  it('should not delete unknown mods', function (done) {
    request(app)
      .delete('/api/mods/..%2F..')
      .expect(400, 'Invalid mod: ../..')
      .end(done)
  })
})
