// Minimum 3 bufferElement
var ScarletsAudioStreamer = function(chunksDuration){
	if(!chunksDuration) chunksDuration = 1000;
	var chunksSeconds = chunksDuration/1000;

	var scope = this;

	scope.debug = false;
	scope.playing = false;
	scope.latency = 0;
	scope.mimeType = null;
	scope.bufferElement = [];

	scope.onStop = null;

	scope.audioContext = ScarletsMedia.audioContext;
	scope.outputNode = false; // Set this to a connectable Audio Node

	// If the outputNode is not set, then the audio will be outputted directly
	var directAudioOutput = true;

	var bufferHeader = false;
	var mediaBuffer = false;

	var audioElement = scope.element = new Audio();
	var audioNode = scope.audioContext.createMediaElementSource(audioElement);

	// ToDo: we may need to try to recreate the element if error happen
	// Or reducing the extra latency
	audioElement.addEventListener('error', function(e){
		console.error(e.target.error);
	});

	scope.connect = function(node){
		if(directAudioOutput === true){
			directAudioOutput = false;
			audioNode.disconnect();
		}

		scope.outputNode = scope.audioContext.createGain();
		scope.outputNode.connect(node);
		audioNode.connect(node);
	}

	scope.disconnect = function(node){
		scope.outputNode.disconnect(node);
		directAudioOutput = true;

		audioNode.disconnect(node);
		audioNode.connect(scope.audioContext.destination);
	}

	scope.stop = function(){
		mediaBuffer.stop();
		scope.playing = false;
		scope.buffering = false;
		if (scope.onStop) scope.onStop();
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
	scope.realtimeBufferPlay = function(packet){
		if(scope.playing === false) return;

		var arrayBuffer = packet[0];
		var streamingTime = packet[1];

		if(scope.debug) console.log("Receiving data", arrayBuffer.byteLength);
		if(arrayBuffer.byteLength === 0) return;

		scope.latency = (Number(String(Date.now()).slice(-5, -3)) - streamingTime) + chunksSeconds + scope.audioContext.baseLatency;

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

	scope.receiveBuffer = function(packet){
		if(scope.playing === false || !mediaBuffer.append) return;

		var arrayBuffer = packet[0];
		var streamingTime = packet[1];

		mediaBuffer.append(arrayBuffer);

		if(audioElement.paused)
			audioElement.play();

		scope.latency = (Number(String(Date.now()).slice(-5, -3)) - streamingTime) +  scope.audioContext.baseLatency + chunksSeconds;
		if(scope.debug) console.log("Total latency: "+scope.latency);
	}
}
