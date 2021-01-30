// ============ Initialize minimal server ============
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var path = require('path');

app.use('/dist', express.static("../../dist"));
app.use('/browser', express.static('browser'));

app.get('/', function(req, res){
    res.sendFile(path.join(__dirname, 'index.html'));
});



// ============ Initialize socket.io ============
var io = require('socket.io')({
    perMessageDeflate: false // Disable compression
});

// This just a very simple routing (presenter to streamer only)

// Every new streamer must have the buffer header from the presenter
var bufferHeader = null;

// Event listener
io.on('connection', function(socket){
    /* Presenter */
    socket.on('bufferHeader', function(packet){
        // Buffer header can be saved on server so it can be passed to new user
        bufferHeader = packet;
        socket.broadcast.emit('bufferHeader', packet);
    });

    // Broadcast the received buffer
    socket.on('stream', function(packet){
        socket.broadcast.emit('stream', packet);
    });

    // Send buffer header to new user
    socket.on('requestBufferHeader', function(){
        socket.emit('bufferHeader', bufferHeader);
    });
});



// ============ Start server ============
console.log("Server started - http://localhost:8000/");
io.listen(app.listen(8000));