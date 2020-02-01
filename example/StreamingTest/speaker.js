var speaker = require('speaker');
var opus = require('node-opus');
var ogg = require('ogg');
var stream = require('stream');
speaker = new speaker();

// you should decomment `speaker.js#dependencies` in `package.json` to use this

module.exports = function(headerBuffer){
    return {
        _internal:{},
        play:function(chunk){
            var decoder = new ogg.Decoder();
            decoder.on('stream', function(stream){
                var opusDecoder = new opus.Decoder();
                opusDecoder.on('format', function(format){
                    if(!format.signed && format.bitDepth !== 16)
                        throw new Error('unexpected format: ' + JSON.stringify(format));

                    // Send the raw PCM data to speaker
                    opusDecoder.pipe(speaker);
                });

                opusDecoder.on('error', console.error);
                stream.pipe(opusDecoder);
            });

            var bufferStream = new stream.PassThrough();
            bufferStream.end(Buffer.concat([headerBuffer, chunk]));
            bufferStream.pipe(decoder);
        },
        writeFile:function(array, callback){
            fs.writeFile("test.webm", Buffer.concat(headerBuffer, ...temp), "binary", callback);
        }
    }
}