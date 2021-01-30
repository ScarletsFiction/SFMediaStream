// You can try it from browser's console after initialize presenter
var streamer = false;

// Scope for <sf-m name="streamer">
sf.model('streamer', function(My){
	streamer = My;
	My.active = false;

	// Save the stream instance for every presenter
	// This will become RepeatedProperty datatype
	My.listening = {/*
		presenterID: {
			instance: new ScarletsAudioStreamer(),
			recvBytes: 0
		}
	*/};

	My.start = function(){
		swal("Presenter's Socket ID:", {content:"input"}).then(create);
	}

	// Request bufferHeader to presenter, or create new streaming instance first
	function create(presenterID){
		if(My.listening[presenterID] === undefined){
			// Set latency to 100ms (Equal with presenter)
			var streamer = {
				instance:new ScarletsAudioStreamer(100),
				recvBytes:0,
				bufferHeader:false
			};

			My.active = true;

			// Set object property
			sf.Obj.set(My.listening, presenterID, streamer);
			streamer.instance.playStream();

			app.debug("New streamer instance was created");
		}

		app.debug("Sending request to presenter with ID:", presenterID);

		// Let's send bufferHeader request to the presenter
		socket.emit('bufferHeader', {
			type:'request',
			targetID:presenterID
		});
	}

	My.setBufferHeader = function(fromID, packet){
		// Add status that we have added the buffer header to this streamer (just for HTML interface)
		// Now we can play the presenter's stream
		My.listening[fromID].bufferHeader = true;

		// Set buffer header to the streaming instance
		My.listening[fromID].instance.setBufferHeader(packet);
	}

	My.receiveBuffer = function(presenterID, packet){
		var presenter = My.listening[presenterID];

		if(presenter === void 0)
			return app.debug("Why we receive buffer from ID:", presenterID, "?");

		// For watching received bytes length
		presenter.recvBytes = packet[0].byteLength;

		// Let the packet played by the streamer instance
		presenter.instance.receiveBuffer(packet);
		// presenter.instance.realtimeBufferPlay(packet);
	}

	// Audio Effect
	My.addEffect = function(presenterItem){
		// presenterItem == My.listening[prensenterID]
		var presenterStream = presenterItem.instance;

		app.debug("Adding sound effect to presenter");
		var ppDelay = ScarletsMediaEffect.pingPongDelay();

		// source (stream) -> Ping pong delay -> destination (speaker)
		presenterStream.connect(ppDelay.input);
		ppDelay.output.connect(ScarletsMedia.audioContext.destination);
	}
})