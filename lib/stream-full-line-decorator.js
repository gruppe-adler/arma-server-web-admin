var util = require('util')

var EventEmitter = require('events').EventEmitter
util.inherits(StreamFullLineDecorator, EventEmitter);

function StreamFullLineDecorator(inStream) {
    var incomplete = '';
    var self = this
    inStream.on('data', function (buffer) {

        var inString = buffer.toString()
        var lines = inString.split('\n')
        if (lines.length > 1) {
            self.emit('data', incomplete + lines.shift() + '\n')
        }
        incomplete = lines.pop()

        lines.forEach(function (line) {
            self.emit('data', line + '\n')
        })
    })
    inStream.on('close', function () {
        if (incomplete) {
            self.emit('data', incomplete + '\n')
        }
        self.emit('close')
    })
}

module.exports = StreamFullLineDecorator;
