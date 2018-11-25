var Serberries = require('serberries');
var SocketIO = require('socket.io');

// Initialize minimal server
var myserver = new Serberries({
    path:__dirname+'/logic'
});

myserver.setPublicFolder("../../dist");

myserver.on('error', function(errcode, msg, trace){
    console.error("Error code: "+errcode+' ('+msg+')');
    if(trace){
        console.error(trace.message);
        for (var i = 0; i < trace.stack.length; i++) {
            console.error("   at "+trace.stack[i]);
        }
    }
    console.error("");
});

myserver.on('loaded', function(urlpath, type){
    console.log('URL to '+urlpath+' was '+type);
});

myserver.on('navigation', function(data){
    console.log("Navigation to '"+data.path+"'");
    console.log('  - '+data.headers['user-agent']);
});

// Initialize socket.io
var io = SocketIO({
  perMessageDeflate: false // Disable compression
}).listen(myserver.server);

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

// Start server
console.log("Server started - http://localhost:8000/");
myserver.start(8000);
