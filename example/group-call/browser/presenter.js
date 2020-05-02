// You can try it from browser's console after initialize presenter
var presenter = false;
var presenterInstance = null;

// Scope for <sf-m name="presenter">
sf.model('presenter', function(self){
	presenter = self;
	self.broadcastBytes = 0;

	// Save the streamer ID who listen to me..
	// This will become RepeatedList datatype
	self.listener = [/*
		streamerID1, streamerID2, ...
	*/];

	// Every streamer must receive this bufferHeader data
	self.bufferHeader = null;

	// Start recording, or create instance first
	self.start = function(){
		if(!presenterInstance)
			createInstance();

		presenterInstance.startRecording();
	}

	// We just need to create this once, and save the bufferHeader
	function createInstance(){
		app.debug("New presenter instance was created");

		// Set latency to 100ms (Equal with streamer)
		presenterInstance = new ScarletsMediaPresenter({
		    audio:{
		        channelCount:1,
		        echoCancellation: false
		    },
		    debug:true
		}, 100);

		presenterInstance.onRecordingReady = function(packet){
		    app.debug("Recording started!");
		    app.debug("Header size:", packet.data.size, 'bytes');
		    app.debug('Mimetype:', presenterInstance.mediaRecorder.mimeType)

		    self.bufferHeader = packet;
		}

		presenterInstance.onBufferProcess = function(streamData){
			self.broadcastBytes = streamData[0].size;
		    socket.emit('bufferStream', streamData);
		}
	}

	self.requestBufferHeader = function(streamerID){
		if(!self.bufferHeader)
			return app.debug("We haven't start presenting yet, but the streamer want to listen me?");

		app.debug("Sending bufferHeader to streamer with ID:", streamerID);
		socket.emit('bufferHeader', {
			targetID:streamerID,
			type:'send',
			packet:self.bufferHeader
		});
	}
});