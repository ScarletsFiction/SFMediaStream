// Minimum 3 bufferElement
var ScarletsVideoStreamer = function(videoElement, chunksDuration){
	if(!chunksDuration) chunksDuration = 1000;
	var chunksSeconds = chunksDuration/1000;

	var scope = this;

	scope.debug = false;
	scope.playing = false;
	scope.latency = 0;
	scope.mimeType = null;

	scope.audioContext = ScarletsMedia.audioContext;
	scope.outputNode = false; // Set this to a connectable Audio Node

	// If the outputNode is not set, then the audio will be outputted directly
	var directAudioOutput = true;

	var mediaBuffer = false;
	var audioNode = scope.audioContext.createMediaElementSource(videoElement);

	scope.audioConnect = function(node){
		if(directAudioOutput === true){
			directAudioOutput = false;
			audioNode.disconnect();
		}

		scope.outputNode = scope.audioContext.createGain();
		scope.outputNode.connect(node);
		audioNode.connect(node);
	}

	scope.audioDisconnect = function(){
		outputNode.disconnect();
		directAudioOutput = true;

		audioNode.disconnect();
		audioNode.connect(scope.audioContext.destination);
	}

	scope.stop = function(){
		mediaBuffer.stop();
		scope.playing = false;
		scope.buffering = false;
	}

	scope.setBufferHeader = function(packet){
		if(!packet.data)
			return;

		var arrayBuffer = packet.data;
		scope.mimeType = packet.mimeType;

		if(mediaBuffer !== false)
			mediaBuffer.stop();
		else audioNode.connect(scope.audioContext.destination);

		mediaBuffer = new MediaBuffer(scope.mimeType, chunksDuration, arrayBuffer);

		videoElement.src = scope.objectURL = mediaBuffer.objectURL;
	}

	scope.playStream = function(){
		scope.playing = true;
	}

	scope.receiveBuffer = function(arrayBuffer){
		if(scope.playing === false || !mediaBuffer.append) return;

		mediaBuffer.append(arrayBuffer[0]);

		if(videoElement.paused)
			videoElement.play();

		if(chunksDuration){
			var unplayed = 0;
			scope.latency = (Number(String(Date.now()).slice(-5, -3)) - arrayBuffer[1]) + unplayed +  scope.audioContext.baseLatency;
			if(scope.debug) console.log("Total latency: "+scope.latency);
		}
	}
}