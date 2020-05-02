// ============ Initialize minimal server ============
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var path = require('path');
var SpeakerJS = require('./speaker.js');

app.use('/dist', express.static("../../dist"));
app.use('/browser', express.static('browser'));

app.get('/', function(req, res){
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ============ Initialize socket.io ============
var io = require('socket.io')({
    perMessageDeflate: false // Disable compression
});

// Event listener
io.on('connection', function(socket){
    socket.emit('welcome', socket.id);

    // Server must receive the header first
    socket.on('bufferHeader', function(packet){
        console.log("Got BufferHeader:", packet.data.byteLength+'bytes');
        SpeakerJS.setHeaderBuffer(Buffer.from(packet.data));
    });

    // Handle stream to speaker
    socket.on('bufferStream', function(packet){
        SpeakerJS.play(packet[0]);
    });

    // Handle stream to file
    socket.on('bufferToFile', function(packet){
        SpeakerJS.writeFile(Buffer.from(packet[0]));
    });

    socket.on('endFile', function(){
        SpeakerJS.endFile();
    });

    socket.on('disconnect', function(){
        console.log(socket.id, "was disconnected");
        SpeakerJS.setHeaderBuffer(null);
    });
});

console.log("Server started - http://localhost:8000/");
io.listen(app.listen(8000));