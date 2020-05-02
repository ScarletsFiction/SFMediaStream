var stream = require('stream');
var speaker = require('speaker');
var fs = require('fs');
const { OpusEncoder } = require('@discordjs/opus');

const opus = new OpusEncoder(48000, 2);
speaker = new speaker({
    channels: 2,
    sampleRate: 48000
});

var headerBuffer = null;
var fileHandle = false;

module.exports = {
    setHeaderBuffer:function(buffer){
        headerBuffer = buffer;
    },
    play:function(chunk){
        if(!headerBuffer)
            return console.error("BufferHeader haven't been set");

        var buffer = opus.decode(chunk, 480);
        speaker.write(buffer);
    },
    writeFile:function(buffer){
        if(!headerBuffer)
            return;

        if(fileHandle === false){
            fileHandle = fs.createWriteStream("test.webm", {flags:'a'});
            fileHandle.write(headerBuffer);
        }

        fileHandle.write(buffer);
    },
    endFile:function(){
        if(fileHandle)
            fileHandle.end();

        fileHandle = false;
    }
}