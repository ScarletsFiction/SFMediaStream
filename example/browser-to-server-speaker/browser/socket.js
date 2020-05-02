var socket = io("/", {transports:['websocket']});

socket.on('welcome', function(){
	app.id = socket.id;
	app.debug("Connected to the server!");
});