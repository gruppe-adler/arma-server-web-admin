var util = require('util')
var FullLineDecorator = require('./stream-full-line-decorator')
var EventEmitter = require('events').EventEmitter

util.inherits(StreamLinePrefixDecorator, EventEmitter);

function StreamLinePrefixDecorator(inStream, prefix) {
    var self = this
    var fullLineDecorator = new FullLineDecorator(inStream)
    fullLineDecorator.on('data', function (buffer) {
        self.emit('data', prefix + buffer)
    })
    inStream.on('close', function () {
        self.emit('close')
    })
}

module.exports = StreamLinePrefixDecorator;
