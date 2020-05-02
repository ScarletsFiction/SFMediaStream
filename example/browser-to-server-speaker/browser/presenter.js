// You can try it from browser's console after initialize presenter
var presenter = false;
var presenterInstance = null;

// Scope for <sf-m name="presenter">
sf.model('presenter', function(self){
	presenter = self;
	self.broadcastBytes = 0;

	// Server must receive this bufferHeader data
	self.bufferHeader = null;
	self.toServerSpeaker = false;

	self.init = function(){
		app.debug("Stream will be saved in ./test.webm");
	}

	// Start recording, or create instance first
	self.start = function(){
		if(!presenterInstance)
			createInstance();

		presenterInstance.startRecording();
	}

	self.stop = function(){
		presenterInstance.stopRecording();
		socket.emit('endFile');
	}

	self.toServerFile = function(){
		self.toServerSpeaker = !self.toServerSpeaker;

		// Send signal to end file writing to the server
		if(self.toServerSpeaker && self.bufferHeader)
			socket.emit('endFile');
	}

	// We just need to create this once, and save the bufferHeader
	function createInstance(){
		app.debug("New presenter instance was created");

		// Set latency to 100ms (Equal with streamer)
		presenterInstance = new ScarletsMediaPresenter({
		    audio:{
		        channelCount:1,
		        sampleRate:44100,
		        echoCancellation: false
		    },
		    debug:true
		}, 100);

		presenterInstance.onRecordingReady = function(packet){
		    app.debug("Recording started!");
		    app.debug("Header size:", packet.data.size, 'bytes');
		    app.debug('Mimetype:', presenterInstance.mediaRecorder.mimeType)

		    self.bufferHeader = packet;

			// Immediately send to the server when presenter ready
			app.debug("Sending bufferHeader to the server");
			socket.emit('bufferHeader', packet);
		}

		presenterInstance.onBufferProcess = function(streamData){
			self.broadcastBytes = streamData[0].size;

			if(self.toServerSpeaker)
			    socket.emit('bufferStream', streamData);
			else
			    socket.emit('bufferToFile', streamData);
		}
	}
});