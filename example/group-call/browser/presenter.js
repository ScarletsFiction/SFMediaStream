// You can try it from browser's console after initialize presenter
var presenter = false;
var presenterInstance = null;

// Scope for <sf-m name="presenter">
sf.model('presenter', function(My){
	presenter = My;
	My.broadcastBytes = 0;

	// Save the streamer ID who listen to me..
	// This will become RepeatedList datatype
	My.listener = [/*
		streamerID1, streamerID2, ...
	*/];

	// Every streamer must receive this bufferHeader data
	My.bufferHeader = null;

	// Start recording, or create instance first
	My.started = false;
	My.start = function(){
		if(!presenterInstance)
			createInstance();

		presenterInstance.startRecording();
		My.started = true;
	}
	My.stop = function(){
		My.started = false;
		presenterInstance.stopRecording();
	}

	// We just need to create this once, and save the bufferHeader
	function createInstance(){
		app.debug("New presenter instance was created");

		var element;

		// Set this to true for recording an element
		if(false){
			element = document.querySelector('#file_test');
			const audioContext = ScarletsMedia.audioContext;

			// Mute output to current device's speaker
			let sourceNode = audioContext.createMediaElementSource(element);
			let gainNode = audioContext.createGain();
			gainNode.gain.value = 0;

			sourceNode.connect(gainNode);
			gainNode.connect(audioContext.destination);

			// Let's play it, and it will be recorded
			element.play();
		}	

		// Set latency to 100ms (Equal with streamer)
		const latency = 100;
		presenterInstance = new ScarletsMediaPresenter({
			mimeType:'audio/webm;codecs=opus', // Optional
			element, // Optional
		    audio:{
		        channelCount:1,
		        echoCancellation: false
		    },
		    debug:true,
			// uncomment this for use OpusMediaRecorder polyfill as fallback
			// (find globally #2908210050 for all related references in this project)
			// alwaysUsePolyfill:false,  // Optional
			workerOptions:{
				OggOpusEncoderWasmPath:'https://cdn.jsdelivr.net/npm/opus-media-recorder@latest/OggOpusEncoder.wasm',
				WebMOpusEncoderWasmPath:'https://cdn.jsdelivr.net/npm/opus-media-recorder@latest/WebMOpusEncoder.wasm'
			}
		}, latency);

		presenterInstance.onRecordingReady = function(packet){
		    app.debug("Recording started!");
		    app.debug("Header size:", packet.data.size, 'bytes');
		    app.debug('Mimetype:', presenterInstance.mediaRecorder.mimeType)

		    My.bufferHeader = packet;
		}

		presenterInstance.onBufferProcess = function(streamData){
			My.broadcastBytes = streamData[0].size;
		    socket.emit('bufferStream', streamData);
		}
	}

	My.requestBufferHeader = function(streamerID){
		if(!My.bufferHeader)
			return app.debug("We haven't start presenting yet, but the streamer want to listen me?");

		app.debug("Sending bufferHeader to streamer with ID:", streamerID);
		socket.emit('bufferHeader', {
			targetID:streamerID,
			type:'send',
			packet:My.bufferHeader
		});
	}

	// if this == true, this will change the button to 'remove'
	My.effect = false;

	var ppDelay;
	My.addPingPongDelay = function(){
		if(My.effect){
			// Removing effect
			My.effect = false;

			// Disconnect from effect
			presenterInstance.disconnect(ppDelay.input);

			// And immediately connect to it's original destination
			presenterInstance.connect(presenterInstance.destination);
			return;
		}

		if(!presenterInstance)
			return app.debug("Are we the presenter? start it first :)");

		ppDelay = ScarletsMediaEffect.pingPongDelay();

		// Increase the gain by using mix when using media effect
		ppDelay.mix(20);

		// Try disconnect from presenter's original destination first
		presenterInstance.disconnect(presenterInstance.destination);

		presenterInstance.connect(ppDelay.input);
		ppDelay.output.connect(presenterInstance.destination);

		My.effect = true;
	}
});