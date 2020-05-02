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

// Event listener
io.on('connection', function(socket){
    socket.emit('welcome', socket.id);


    // ===== Communication handler =====
    // 
    // Request/send bufferHeader with the presenter
    socket.on('bufferHeader', function(data){
        console.log(socket.id, data.type, "bufferHeader to", data.targetID);

        /* Streamer -> Presenter */
        if(data.type === 'request'){
            io.to(data.targetID).emit('bufferHeader', {
                type   : 'request',
                fromID : socket.id
            });
        }

        /* Presenter -> Streamer*/
        else if(data.type === 'send'){
            var streamer = io.sockets.connected[data.targetID];

            // Check if socket with id exist
            if(streamer === undefined)
                return console.error("No socket found for ID:", data.targetID);

            streamer.emit('bufferHeader', {
                type   : 'received',
                fromID : socket.id,
                packet : data.packet
            });

            // We will create "simple route" here
            // Where the presenter broadcast to a list of socket
            // Actually you can create Room with socket.io if you want

            var presenter = io.sockets.connected[socket.id];

            // Create list on presenter if not exist
            if(presenter.listener === undefined)
                presenter.listener = [];

            presenter.listener.push(streamer);


            // Also create list on streamer, so we can clear it on disconnect to avoid memory leak
            if(streamer.listening === undefined)
                streamer.listening = [];

            streamer.listening.push(presenter);
        }
    });

    // Broadcast the presenter's buffer to every listener
    socket.on('bufferStream', function(packet){
        // Return immediately if this user have no listener
        if(socket.listener === undefined)
            return;

        for (var i = 0; i < socket.listener.length; i++) {
            socket.listener[i].emit('bufferStream', {
                presenterID : socket.id,
                packet      : packet
            });
        }
    });



    // ===== Handle socket connection =====
    // 
    // Remove reference on disconnection to avoid memory leak
    socket.on('disconnect', function(){
        console.log(socket.id, "was disconnected");

        /* If this was Streamer */
        if(socket.listening){
            for (var i = 0; i < socket.listening.length; i++) {
                var presenter = socket.listening[i];
                var a = presenter.listener.indexOf(socket);

                if(a !== -1){
                    // Send status to presenter browser so he can also remove reference
                    presenter.emit('streamerGone', socket.id);
                    presenter.listener.splice(a, 1);
                }
            }

            socket.listening.splice(0);
        }

        /* If this was Presenter */
        if(socket.listener){
            for (var i = 0; i < socket.listener.length; i++) {
                var streamer = socket.listener[i];

                // Send status to client browser so they can also remove reference
                streamer.emit('presenterGone', socket.id);
            }

            socket.listener.splice(0);
        }
    });
});



// ============ Start server ============
console.log("Server started - http://localhost:8000/");
io.listen(app.listen(8000));