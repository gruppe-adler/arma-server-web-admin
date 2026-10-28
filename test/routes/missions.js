const express = require('express')
const fs = require('fs')
const os = require('os')
const path = require('path')
const request = require('supertest')
require('should')

const Missions = require('../../lib/missions.js')
const missionsRoute = require('../../routes/missions.js')

describe('missions route', function () {
  let gamePath
  let app

  before(function () {
    gamePath = fs.mkdtempSync(path.join(os.tmpdir(), 'arma-missions-route-test-'))
    fs.mkdirSync(path.join(gamePath, 'mpmissions'))
    app = express()
    app.use('/api/missions', missionsRoute(new Missions({ path: gamePath })))
  })

  after(function () {
    fs.rmSync(gamePath, { recursive: true, force: true })
  })

  it('should upload missions', function (done) {
    request(app)
      .post('/api/missions')
      .attach('missions', Buffer.from('mission'), 'CO10_Test.Altis.pbo')
      .attach('missions', Buffer.from('not a mission'), 'readme.txt')
      .expect(200, { success: true })
      .end(function (err) {
        if (err) {
          return done(err)
        }
        fs.readdirSync(path.join(gamePath, 'mpmissions')).should.eql(['co10_test.altis.pbo'])
        done()
      })
  })

  it('should keep uploads in missions folder', function (done) {
    request(app)
      .post('/api/missions')
      .attach('missions', Buffer.from('mission'), '../escape.pbo')
      .end(function () {
        fs.existsSync(path.join(gamePath, 'escape.pbo')).should.be.false()
        done()
      })
  })
})
