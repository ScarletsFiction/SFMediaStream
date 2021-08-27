// options = mediaDevices.getUserMedia({thisData})
// latency = 0ms is not possible (minimum is 70ms, or depend on computer performance)
var ScarletsMediaPresenter = function(options, latency){
	var scope = this;
	if(!latency) latency = 1000;

	// The options are optional
	//var options = {
	//    mediaStream: new MediaStream(), // For custom media stream
	//    element: document.querySelector(...), // Record <audio>, <video>, <canvas>
	//    screen: true, // Recording the screen
	//
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
	scope.onStop = null;

	scope.mediaRecorder = null;
	scope.recordingReady = false;

	scope.recording = false;
	scope.mediaGranted = false;

	if(options === void 0)
		options = {};

	if(options.element !== void 0)
		options.mediaStream = options.element.captureStream();

	scope.debug = options.debug;

	// Deprecated
	scope.options = options;

	var mediaType = options.video ? 'video' : 'audio';

	// Check supported mimeType and codecs for the recorder
	if (options.mimeType && !MediaRecorder.isTypeSupported(options.mimeType)) {
		console.log("MediaRecorder doesn't supports mimetype " + options.mimeType);
		options.mimeType = null;
	}

	if(!options.mimeType){
		var supportedMimeType = false;
		var codecsList = mediaType === 'audio' ? audioCodecs : videoCodecs;

		for(var format in codecsList){
			var mimeType = mediaType+'/'+format;
			var codecs = codecsList[format];

			for (var i = 0; i < codecs.length; i++) {
				var temp = mimeType+';codecs='+codecs[i];
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

		if (scope.debug) console.log("mimeType: "+supportedMimeType);
	}

	var mediaGranted = function(mediaStream) {
		scope.mediaGranted = true;

		// For adding effect later (if audio available)
		if(options.audio !== void 0){
			scope.source = ScarletsMedia.audioContext.createMediaStreamSource(mediaStream);
			scope.mediaStream = mediaStream = scope.destination.stream;

			if(pendingConnect.length !== 0){
				for (var i = 0; i < pendingConnect.length; i++)
					scope.source.connect(pendingConnect[i]);

				firstSourceConnect = false;
				pendingConnect.length = 0;
			}
			else scope.source.connect(scope.destination);
		}

		scope.bufferHeader = null;
		var bufferHeaderLength = false;

		scope.mediaRecorder = new MediaRecorder(mediaStream, options);

		if(scope.debug) console.log("MediaRecorder obtained");
		scope.mediaRecorder.onstart = function(e) {
			scope.recording = true;
		};

		const isVideo = options.video !== void 0;
		const headerLatency = isVideo ? 565 : 100;

		scope.mediaRecorder.ondataavailable = function(e){
			// Stream segments after the header was obtained
			if (bufferHeaderLength !== false){
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

			var predefinedBuffer = getBufferHeader(scope.mediaRecorder.mimeType);
			if(predefinedBuffer !== false)
				scope.bufferHeader = predefinedBuffer;

			bufferHeaderLength = scope.bufferHeader.size;

			if(bufferHeaderLength > 900 || bufferHeaderLength < 100)
				console.log('%c[WARN] The buffer header length was more than 0.9KB or smaller than 0.1KB. This sometime cause decode error on streamer side. Try to avoid any heavy CPU usage when using the recorder.', "color:yellow");

			if(scope.onRecordingReady)
				scope.onRecordingReady({
					mimeType:options.mimeType,
					startTime:Date.now(),
					hasVideo:isVideo,
					data:scope.bufferHeader
				});

			scope.recordingReady = true;

			if(latency === headerLatency) return;

			// Record with the custom latency
			scope.mediaRecorder.stop();
			setTimeout(function(){
				scope.mediaRecorder.start(latency);
			}, 10);
		};

		// Get first header
		scope.mediaRecorder.start(headerLatency);
	}

	var pendingConnect = [];

	scope.source = void 0;
	scope.destination = ScarletsMedia.audioContext.createMediaStreamDestination();

	var firstSourceConnect = true;
	scope.connect = function(node){
		if(scope.source === void 0){
			pendingConnect.push(node);
			return;
		}

		if(firstSourceConnect){
			try{
				scope.source.disconnect(scope.destination);
			}catch(e){}

			firstSourceConnect = false;
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

	function reAddTracks(mediaStream) {
		var streams = mediaStream.getTracks();
		for(var i = 0; i < streams.length; i++)
			scope.mediaRecorder.stream.addTrack(streams[i]);

		scope.mediaRecorder.start(latency);
		scope.recording = true;
	}

	var afterStop = false;
	scope.startRecording = function(){
		if(afterStop){
			afterStop = false;

			if(!options.mediaStream){ // Not custom
				if(!scope.options.screen) // Camera / Audio
					navigator.mediaDevices.getUserMedia(options).then(reAddTracks).catch(console.error);
				else // Screen
					navigator.mediaDevices.getDisplayMedia(options).then(reAddTracks).catch(console.error);
			}
			return;
		}
		else if(scope.mediaGranted === false || scope.mediaRecorder === null){
			scope.recordingReady = false;

			if(options.mediaStream) // Custom
				mediaGranted(options.mediaStream);
			else if(!scope.options.screen) // Camera / Audio
				navigator.mediaDevices.getUserMedia(options).then(mediaGranted).catch(console.error);
			else // Screen
				navigator.mediaDevices.getDisplayMedia(options).then(mediaGranted).catch(console.error);

			return false;
		}

		if(scope.mediaRecorder.state !== 'recording'){
			scope.mediaRecorder.start(latency);
			scope.recording = true;
		}

		return true;
	};

	scope.stopRecording = function(){
		if (!scope.recording ||!scope.mediaRecorder) {
			return;
		}
		scope.recording = false;
		scope.mediaRecorder.stop();

		if(!options.mediaStream){
			// Turn off stream from microphone/camera
			var streams = scope.mediaRecorder.stream.getTracks();
			for(var i = 0; i < streams.length; i++){
				streams[i].stop();
				scope.mediaRecorder.stream.removeTrack(streams[i]);
			}
		}

		// scope.mediaRecorder.ondataavailable = null;
		// scope.mediaRecorder.onstart = null;

		scope.bufferHeader = null;

		afterStop = true;

		if (scope.onStop) scope.onStop();
	};
}

ScarletsMediaPresenter.isTypeSupported = function(mimeType){
	if(!MediaSource.isTypeSupported(mimeType))
		return "MediaSource is not supporting this type";
	if(!MediaRecorder.isTypeSupported(mimeType))
		return "MediaRecorder is not supporting this type";
	return "Maybe supported";
}
