var fs = require('fs')
var logPathModule = require('./server-log-paths')
var config = require('../config')
var logger = require('./logger').getLogger('server-log-writer')

var logPaths = new logPathModule(config);

var rptAnalyzers = (config.rptAnalyzers || []).map(function(rptAnalyzer) {
  return require('./rpt-analyzer/' + rptAnalyzer)
})

function logInstance(server, instance, logFileName) {
  var callRptAnalyzers = function (data) {
    rptAnalyzers.forEach(function(rptAnalyzer) {
      rptAnalyzer(server, instance, data)
    })
  }
  var logStream = fs.createWriteStream(logFileName, {
    'flags': 'a'
  })

  instance.stdout.on('data', function (data) {
    logStream.write(data)
    callRptAnalyzers(data)
  })

  instance.stderr.on('data', function (data) {
    logStream.write(data)
    callRptAnalyzers(data)
  })

  instance.on('close', function (code) {
    logStream.end()
  })
}

module.exports.setupFileLog = function (server) {
  var instance = server.instance;
  var subdir = server.title;
  if (!instance) {
    logger.warn('server has no instance, cannot set up logging')
    return
  }

  logInstance(server, instance, logPaths.generateLogFilePath(subdir, 'server'))
  server.headlessClientInstances.forEach(function (hcInstance, idx) {
    logInstance(server, hcInstance, logPaths.generateLogFilePath(subdir, 'hc' + idx))
  })
}

module.exports.addRptAnalyzer = function (rptAnalyzer) {
  rptAnalyzers.push(rptAnalyzer)
}