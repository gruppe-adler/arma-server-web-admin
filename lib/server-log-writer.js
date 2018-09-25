var fs = require('fs')
var logPathModule = require('./server-log-paths')
var config = require('../config')
var logger = require('./logger').getLogger('server-log-writer')

var logPaths = new logPathModule(config);

var rptAnalyzers = (config.rptAnalyzers || []).map(function(rptAnalyzer) {
  return require('./rpt-analyzer/' + rptAnalyzer)
})

function prefixLines(prefix, data) {
    // return String(data).replace(/\n/g, '\n' + prefix).replace(/$)
    var lines = String(data).split('\n')

    return lines
        .map(function (line, idx) {
          if (line === '' && idx === lines.length - 1) {
            return line
          } else {
            return prefix + line
          }
        })
        .join('\n')
}

function logInstance(server, instance, logFileName) {
  var callRptAnalyzers = function (data) {
    rptAnalyzers.forEach(function(rptAnalyzer, streamName) {
      rptAnalyzer(server, instance, data, streamName)
    })
  }

  var logStream = fs.createWriteStream(logFileName, {
    'flags': 'a'
  })

  instance.stdout.on('data', function (data) {
    logStream.write(prefixLines('STDOUT ', data))
    callRptAnalyzers(data, 'stdout')
  })

  instance.stderr.on('data', function (data) {
    logger.debug(data.toString())
    logStream.write(prefixLines('STDERR ', data))
    callRptAnalyzers(data, 'stderr')
  })

  instance.on('close', function (code) {
    logStream.write('###### EXITED WITH ' + code)
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

module.exports.prefixLines = prefixLines