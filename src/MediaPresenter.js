// options = mediaDevices.getUserMedia({thisData})
// latency = 0ms is not possible (minimum is 70ms, or depend on computer performance)
var ScarletsMediaPresenter = function(options, latency){
	var scope = this;
	if(!latency) latency = 1000;
	//var options = {
	//    audio:{
	//        channelCount:1,
	//        echoCancellation: false
	//    },
	//    video:{
	//        frameRate:15,
	//        width: 1280,
	//        height: 720,
	//        facingMode: (front ? "user" : "environment")
	//    }
	//};

	scope.debug = false;
	scope.mediaStream = false;

	scope.onRecordingReady = null;
	scope.onBufferProcess = null;

	scope.mediaRecorder = null;
	scope.recordingReady = false;

	scope.recording = false;
	scope.mediaGranted = false;

	if(options === void 0)
		options = {};

	scope.debug = options.debug;

	// Deprecated
	scope.options = options;

	scope.polyfill = void 0;

	var mediaType = options.video ? 'video' : 'audio';

	// Check supported mimeType and codecs for the recorder
	if(!options.mimeType){
		var supportedMimeType = false;
		var codecsList = mediaType === 'audio' ? audioCodecs : videoCodecs;

		for(var format in codecsList){
			var mimeType = mediaType+'/'+format;
			var codecs = codecsList[format];

			for (var i = 0; i < codecs.length; i++) {
				var temp = mimeType+';codecs="'+codecs[i]+'"';
				if(MediaRecorder.isTypeSupported(temp) && MediaSource.isTypeSupported(temp)){
					supportedMimeType = temp;
					break;
				}
			}

			if(supportedMimeType === false && MediaRecorder.isTypeSupported(mimeType) && MediaSource.isTypeSupported(mimeType))
				supportedMimeType = mimeType;

			if(supportedMimeType !== false)
				break;
		}
		options.mimeType = supportedMimeType;
		console.log("mimeType: "+supportedMimeType);
	}

	var mediaGranted = function(mediaStream) {
		scope.mediaGranted = true;

		// For adding effect later (if audio available)
		if(options.audio !== void 0){
			scope.source = ScarletsMedia.audioContext.createMediaStreamSource(mediaStream);
			scope.mediaStream = mediaStream = scope.destination.stream;

			if(pendingConnect.length !== 0){
				for (var i = 0; i < pendingConnect.length; i++)
					scope.source(pendingConnect[i]);

				pendingConnect.length = 0;
			}
			else scope.source.connect(scope.destination);
		}

		scope.bufferHeader = null;
		var bufferHeaderLength = false;

		scope.mediaRecorder = new MediaRecorder(mediaStream, options, scope.polyfill);

		if(scope.debug) console.log("MediaRecorder obtained");
		scope.mediaRecorder.onstart = function(e) {
			scope.recording = true;
		};

		scope.mediaRecorder.ondataavailable = function(e){
			// Stream segments after the header was obtained
			if(bufferHeaderLength !== false){
				var streamingTime = Number(String(Date.now()).slice(-5, -3));
				scope.onBufferProcess([e.data, streamingTime]);
				return;
			}

			// Return if the recording was stopped
			if(scope.mediaRecorder.state !== 'recording')
				return;

			if(e.data.size <= 1) return;

			// The audio buffer can contain some duration that causes a noise
			// So we will need to remove it on streamer side
			// Because the AudioBuffer can't be converted to ArrayBuffer with WebAudioAPI
			scope.bufferHeader = e.data;
			bufferHeaderLength = e.data.size;

			if(scope.onRecordingReady)
				scope.onRecordingReady({
					mimeType:options.mimeType,
					startTime:Date.now(),
					data:scope.bufferHeader
				});
			scope.recordingReady = true;
		};

		// Get first header
		scope.mediaRecorder.start(latency);
	}

	var pendingConnect = [];

	scope.source = void 0;
	scope.destination = ScarletsMedia.audioContext.createMediaStreamDestination();

	scope.connect = function(node){
		if(scope.source === void 0){
			pendingConnect.push(node);
			return;
		}

		scope.source.connect(node);
	}

	scope.disconnect = function(node){
		if(scope.source)
			scope.source.disconnect(node);
		else{
			var i = pendingConnect.indexOf(node);
			if(i === -1)
				return;

			pendingConnect.splice(i, 1);
		}
	}

	scope.startRecording = function(){
		if(scope.mediaGranted === false || scope.mediaRecorder === null){
			scope.recordingReady = false;

			if(!scope.options.screen)
				navigator.mediaDevices.getUserMedia(options).then(mediaGranted).catch(console.error);
			else
				navigator.mediaDevices.getDisplayMedia(options).then(mediaGranted).catch(console.error);

			return false;
		}
		else if(scope.mediaRecorder.state === 'recording')
			return true;
		else{
			scope.mediaRecorder.start(latency);
			scope.recording = true;
			return true;
		}
	};

	// ToDo: Allow reuse instead of removing tracks when stopping
	scope.stopRecording = function(){
		scope.mediaRecorder.stop();
		if(!scope.mediaRecorder.stream.stop){
			var streams = scope.mediaRecorder.stream.getTracks();
			for(var i = 0; i < streams.length; i++){
				streams[i].stop();
				scope.mediaRecorder.stream.removeTrack(streams[i]);
			}
		} else scope.mediaRecorder.stream.stop();

		scope.mediaRecorder.ondataavailable = null;
		scope.mediaRecorder.onstart = null;

		scope.bufferHeader = null;
		scope.recording = false;
	};
}