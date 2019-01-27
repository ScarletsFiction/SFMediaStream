// Minimum 3 bufferElement
var ScarletsAudioStreamer = function(chunksDuration){
	var bufferElement = 3;

	if(!chunksDuration) chunksDuration = 1000;
	var chunksSeconds = chunksDuration/1000;

	var scope = this;

	scope.debug = false;
	scope.playing = false;
	scope.latency = 0;
	scope.mimeType = null;
	scope.bufferElement = [];

	scope.audioContext = ScarletsMedia.audioContext;
	scope.outputNode = false; // Set this to a connectable Audio Node

	// If the outputNode is not set, then the audio will be outputted directly
	var directAudioOutput = true;

	var bufferHeader = false;
	var mediaBuffer = false;

	var audioElement = new Audio();
	var audioNode = scope.audioContext.createMediaElementSource(audioElement);

	scope.connect = function(node){
		if(directAudioOutput === true){
			directAudioOutput = false;
			audioNode.disconnect();
		}

		scope.outputNode = scope.audioContext.createGain();
		scope.outputNode.connect(node);
		audioNode.connect(node);
	}

	scope.disconnect = function(){
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
		if(!packet.data){
			bufferHeader = false;
			return;
		}

		var arrayBuffer = packet.data;
		scope.mimeType = packet.mimeType;

		if(mediaBuffer !== false)
			mediaBuffer.stop();
		else audioNode.connect(scope.audioContext.destination);

		mediaBuffer = new MediaBuffer(scope.mimeType, chunksDuration, arrayBuffer);
		bufferHeader = new Uint8Array(arrayBuffer);

		audioElement.src = scope.objectURL = mediaBuffer.objectURL;

		// Get buffer noise length
		scope.audioContext.decodeAudioData(arrayBuffer.slice(0), function(audioBuffer){
			// headerDuration = audioBuffer.duration;
			noiseLength = audioBuffer.getChannelData(0).length;
		});
	}

	// ===== For handling WebAudio =====
	function createBufferSource(){
		var temp = scope.audioContext.createBufferSource();
		temp.onended = function(){
			this.stop();
			this.disconnect();
		}
		return temp;
	}

	var addBufferHeader = function(arrayBuffer){
		var finalBuffer = new Uint8Array(bufferHeader.byteLength + arrayBuffer.byteLength);
		finalBuffer.set(bufferHeader, 0);
		finalBuffer.set(new Uint8Array(arrayBuffer), bufferHeader.byteLength);
		return finalBuffer.buffer;
	}

	var noiseLength = 0;
	function cleanNoise(buffer){
		var frameCount = buffer.getChannelData(0).length - noiseLength;
		if(frameCount === 0) return false;

  		var channelLength = buffer.numberOfChannels;
		var newBuffer = scope.audioContext.createBuffer(channelLength, frameCount, buffer.sampleRate);

		for (var i = 0; i < channelLength; i++) {
	    	newBuffer.getChannelData(i).set(buffer.getChannelData(i).subarray(noiseLength));
	    }

	    return newBuffer;
	}

	function webAudioBufferInsert(index, buffer){
		scope.bufferElement[index] = createBufferSource();
		buffer = cleanNoise(buffer);

		if(buffer === false) return false;
		scope.bufferElement[index].buffer = buffer;

		if(scope.outputNode && scope.outputNode.context && directAudioOutput === false)
			scope.bufferElement[index].connect(scope.outputNode);

		else // Direct output to destination
			scope.bufferElement[index].connect(scope.audioContext.destination);
		return true;
	}

	// ===== Realtime Playing =====
	// Play audio immediately after received

	scope.playStream = function(){
		scope.playing = true;
	}

	var bufferElementIndex = 0;
	scope.realtimeBufferPlay = function(arrayBuffer){
		if(scope.playing === false) return;

		if(scope.debug) console.log("Receiving data", arrayBuffer[0].byteLength);
		if(arrayBuffer[0].byteLength === 0) return;
		arrayBuffer = arrayBuffer[0];

		scope.latency = (Number(String(Date.now()).slice(-5, -3)) - arrayBuffer[1]) +
			chunksSeconds + scope.audioContext.baseLatency;

		var index = bufferElementIndex;
		bufferElementIndex++;
		if(bufferElementIndex > 2)
			bufferElementIndex = 0;

		scope.audioContext.decodeAudioData(addBufferHeader(arrayBuffer), function(buffer){
			if(webAudioBufferInsert(index, buffer) === false)
				return;

			scope.bufferElement[index].start(0);
		});
	}

	// ====== Synchronous Playing ======
	// Play next audio when last audio was finished

	scope.receiveBuffer = function(arrayBuffer){
		if(scope.playing === false || !mediaBuffer.append) return;

		mediaBuffer.append(arrayBuffer[0]);

		if(audioElement.paused)
			audioElement.play();

		if(chunksDuration){
			var unplayed = 0;
			scope.latency = (Number(String(Date.now()).slice(-5, -3)) - arrayBuffer[1]) + unplayed +  scope.audioContext.baseLatency;
			if(scope.debug) console.log("Total latency: "+scope.latency);
		}
	}
}