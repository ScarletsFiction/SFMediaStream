var socket = io("/", {transports:['websocket']});

socket.on('welcome', function(){
	app.id = socket.id;
	app.debug("Connected to the server!");
});

// Handle BufferHeader request/response
socket.on('bufferHeader', function(data){
	app.debug("Buffer header ("+data.type+") by", data.fromID);

	// Is request from Streamer?
	if(data.type === 'request')
		presenter.requestBufferHeader(data.fromID);

	// Is response from Presenter?
	else if(data.type === 'received')
		streamer.setBufferHeader(data.fromID, data.packet);
});

// Handle buffer stream from the presenter to streaming instance
socket.on('bufferStream', function(data){
	// From = data.presenterID

	streamer.receiveBuffer(data.presenterID, data.packet);
});

// Handle disconnected streamer
socket.on('streamerGone', function(id){
	var i = app.presenter.listener.indexOf(id);

	if(i !== -1){
		app.presenter.listener.splice(i, 1);
		app.debug("Listener with ID:", id, "was removed");
	}
});

// Handle disconnected presenter
socket.on('presenterGone', function(id){
	if(app.streamer.listening[id] !== undefined){
		app.streamer.listening.delete(id);
		app.debug("Listener with ID:", id, "was removed");
	}
});