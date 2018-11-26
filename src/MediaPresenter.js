// streamInfo = mediaDevices.getUserMedia({thisData})
// latency = 0ms is not possible (minimum is 70ms, or depend on computer performance)
window.ScarletsMediaPresenter = function(streamInfo, latency){
	var scope = this;
	if(!latency) latency = 1000;
	//var streamInfo = {
	//    audio:{
	//        channelCount:1,
	//        echoCancellation: false
	//    }, 
	//    video:{
	//        frameRate:15,
	//        width: 1280,
	//        height: 720,
	//        facingMode: (front? "user" : "environment")
	//    }
	//};

	scope.debug = false;

	scope.onRecordingReady = null;
	scope.onBufferProcess = null;

	scope.mediaRecorder = null;
	scope.recordingReady = false;

	scope.recording = false;

	scope.mediaGranted = false;

	var fileReader = new FileReader();
	scope.options = {};
	if(streamInfo.audio&&!streamInfo.video){
		if(MediaRecorder.isTypeSupported('audio/webm;codecs="vp9"'))
			scope.options.mimeType = 'audio/webm;codecs="vp9"';
		else if(MediaRecorder.isTypeSupported('audio/webm;codecs="vp8"'))
			scope.options.mimeType = 'audio/webm;codecs="vp8"';
		else if(MediaRecorder.isTypeSupported('audio/webm;codecs="vorbis"'))
			scope.options.mimeType = 'audio/webm;codecs="vorbis"';
		else if(MediaRecorder.isTypeSupported('audio/webm'))
			scope.options.mimeType = 'audio/webm';
		else if(MediaRecorder.isTypeSupported('audio/ogg;codecs="opus"'))
			scope.options.mimeType = 'audio/ogg;codecs="opus"';
		else if(MediaRecorder.isTypeSupported('audio/ogg;codecs="vorbis"'))
			scope.options.mimeType = 'audio/ogg;codecs="vorbis"';
		else if(MediaRecorder.isTypeSupported('audio/ogg'))
			scope.options.mimeType = 'audio/ogg';
		else if(MediaRecorder.isTypeSupported('audio/mp4;codecs="mp4a.40.5'))
			scope.options.mimeType = 'audio/mp4;codecs="mp4a.40.5';
		else if(MediaRecorder.isTypeSupported('audio/mp4'))
			scope.options.mimeType = 'audio/mp4';
	}
	else if(!streamInfo.audio&&streamInfo.video){
		if(MediaRecorder.isTypeSupported('video/webm;codecs="vp9"'))
			scope.options.mimeType = 'video/webm;codecs="vp9"';
		else if(MediaRecorder.isTypeSupported('video/webm;codecs="vp8"'))
			scope.options.mimeType = 'video/webm;codecs="vp8"';
		else if(MediaRecorder.isTypeSupported('video/webm;codecs="vorbis"'))
			scope.options.mimeType = 'video/webm;codecs="vorbis"';
		else if(MediaRecorder.isTypeSupported('video/webm'))
			scope.options.mimeType = 'video/webm';
		else if(MediaRecorder.isTypeSupported('video/ogg;codecs="opus"'))
			scope.options.mimeType = 'video/ogg;codecs="opus"';
		else if(MediaRecorder.isTypeSupported('video/ogg;codecs="vorbis"'))
			scope.options.mimeType = 'video/ogg;codecs="vorbis"';
		else if(MediaRecorder.isTypeSupported('video/ogg'))
			scope.options.mimeType = 'video/ogg';
		else if(MediaRecorder.isTypeSupported('video/mp4;codecs="mp4a.40.5'))
			scope.options.mimeType = 'video/mp4;codecs="mp4a.40.5';
		else if(MediaRecorder.isTypeSupported('video/mp4'))
			scope.options.mimeType = 'video/mp4';
	}
	else{
		if(MediaRecorder.isTypeSupported('video/webm'))
			scope.options.mimeType = 'video/webm';
		else if(MediaRecorder.isTypeSupported('video/mp4'))
			scope.options.mimeType = 'video/mp4';
	}

	var recordingInterval = false;
	var mediaGranted = function(mediaStream) {
		scope.mediaGranted = true;

		scope.bufferHeader = null;
		var bufferHeaderLength = false;

		scope.mediaRecorder = new MediaRecorder(mediaStream, scope.options);

		if(scope.debug) console.log("MediaRecorder obtained");
		scope.mediaRecorder.onstart = function(e) {
			scope.recording = true;
			if(bufferHeaderLength===false){
				scope.mediaRecorder.requestData();
			}
		};

		scope.mediaRecorder.ondataavailable = function(e) {
			fileReader.onload = function() {
				var arrayBuffer = this.result;

				if(bufferHeaderLength===false){
					bufferHeaderLength = arrayBuffer.byteLength;
					if(bufferHeaderLength==0){
						bufferHeaderLength = false;
						setTimeout(function(){scope.mediaRecorder.requestData()}, 1);
						return;
					}

					// ToDo: Clean media header
					scope.bufferHeader = arrayBuffer;

					if(scope.onRecordingReady)
						scope.onRecordingReady(scope.bufferHeader);
					scope.recordingReady = true;
				}
				else{
					if(scope.onBufferProcess){
						var streamingTime = Number(String(Date.now()).slice(-5, -3));
						scope.onBufferProcess([arrayBuffer, streamingTime]);
					}
				}
			};
			fileReader.readAsArrayBuffer(e.data);
		};

		// Get first header
		scope.mediaRecorder.start();

		// Stop recording after 3 seconds and broadcast it to server
		recordingInterval = setInterval(function() {
			if(!scope.recordingReady) return;
			scope.mediaRecorder.requestData();
		}, latency);
	}

	scope.startRecording = function(){
		if(!scope.mediaGranted || !scope.mediaRecorder.stream || !scope.mediaRecorder.stream.active){
			scope.recordingReady = false;
			navigator.mediaDevices.getUserMedia(streamInfo).then(mediaGranted).catch(console.error);
		}
		else{
			scope.mediaRecorder.start();
			scope.recording = true;
		}
	};

	scope.stopRecording = function(){
		clearInterval(recordingInterval);
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