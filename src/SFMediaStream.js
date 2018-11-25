/*
	ScarletsFiction MediaStream Library
	
	HTML5 media streamer library for playing music, video, playlist,
	or even live streaming microphone & camera with node server
	https://github.com/ScarletsFiction/SFMediaStream
	
	Make sure you include this header on this script
*/
'use strict';

// Initialize global data
window.ScarletsMedia = {
	audioContext: window.AudioContext ? new AudioContext() : false
}

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

// Minimum 3 bufferElement
window.ScarletsAudioBufferStreamer = function(bufferElement, chunksDuration){
	if(!bufferElement || bufferElement < 3) bufferElement = 3;
	if(!chunksDuration) chunksDuration = 1000;

	var scope = this;

	scope.debug = false;
	scope.bufferElement = [];
	scope.bufferAvailable = [];
	scope.bufferPending = [];
	scope.currentBuffer = 0;
	scope.playing = false;
	scope.buffering = false;
	scope.streaming = false;
	scope.currentDuration = false;
	scope.latency = 0;
	scope.error = 0;
	scope.realtime = false;
	scope.bufferSkip = 0.07;
	scope.mimeType = null;

	// Use webAudio for mobile, and HTML5 audio for computer
	scope.webAudio = isMobile()?true:false; // Mobile browser have security on HTML element
	scope.audioContext = ScarletsMedia.audioContext;
	// Avoid webAudio for computer browser because memory usage

	var bufferHeader = false;
	var bufferHeaderLength = false;

	scope.setBufferHeader = function(arrayBuffer){
		if(!arrayBuffer){
			bufferHeader = bufferHeaderLength = false;
			return;
		}

		bufferHeader = arrayBuffer;
		bufferHeaderLength = arrayBuffer.byteLength;

		// Find buffer skip
		if(scope.audioContext)
			scope.audioContext.decodeAudioData(arrayBuffer.slice(0), function(audioBuffer){
				scope.bufferSkip = audioBuffer.duration;
			});
	}

	var initAudioEvent = function(i){
		scope.bufferElement[i].onended = function(){
			if(scope.debug) console.log("Buffer ended with ID: "+i);

			if(!scope.webAudio){ // HTML5 Audio
				URL.revokeObjectURL(scope.bufferElement[i].src);
				scope.bufferElement[i].src = '';
			} else this.disconnect(0);

			if(!scope.realtime){
				scope.bufferAvailable[i] = false;
				scope.playing = false;
				scope.buffering = true;
				scope.playAvailable();

				if(scope.bufferAvailable.indexOf(false)!=-1&&scope.bufferPending.length!=0)
					fillEmptyBuffer();
			}
		};
	}

	// First initialization
	for (var i = 0; i < bufferElement; i++) addBufferElement(i);
	function addBufferElement(i){
		if(scope.webAudio){
			scope.bufferElement.push(scope.audioContext.createBufferSource());
			scope.bufferAvailable.push(false);
		} else { // HTML5 Audio
			var audioHandler = new Audio();
			if(audioHandler){
				scope.bufferElement.push(audioHandler);
				scope.bufferAvailable.push(false);
				initAudioEvent(i);
			}
		}
	}

	var addBufferHeader = function(arrayBuffer){
		var finalBuffer = new Uint8Array(bufferHeaderLength + arrayBuffer.byteLength);
		finalBuffer.set(bufferHeader, 0);
		finalBuffer.set(new Uint8Array(arrayBuffer), bufferHeaderLength);
		return finalBuffer.buffer;
	}

	scope.receiveBuffer = function(arrayBuffer){
		if(scope.debug) console.log("Receiving data", arrayBuffer[0].byteLength);
		if(!scope.streaming) return;
		var streamingTime = arrayBuffer[1];
		scope.realtime = false;

		if(chunksDuration){
			var unplayed = scope.bufferPending.length;
			for (var i = 0; i < bufferElement; i++) {
				if(scope.bufferAvailable[i]) unplayed++;
			}
			scope.latency = (Number(String(Date.now()).slice(-5, -3)) - streamingTime) 
								+ chunksDuration*unplayed + scope.audioContext.baseLatency;
			if(scope.debug) console.log("Total latency: "+scope.latency);
		}

		scope.bufferPending.push(arrayBuffer[0]);
		fillEmptyBuffer();

		if(scope.buffering)
			scope.playAvailable();
	}

	function webAudioBufferInsert(index, buffer){
		var transferFunction = scope.bufferElement[index].onended;
		scope.bufferElement[index] = scope.audioContext.createBufferSource();
		scope.bufferElement[index].buffer = buffer;
		scope.bufferElement[index].connect(scope.audioContext.destination);
		scope.bufferElement[index].onended = transferFunction;
	}

	var fileReader = new FileReader();
	var realtimeBufferInterval = 0; // Need 3 bufferElement, other than this will give lower quality
	scope.realtimeBufferPlay = function(arrayBuffer){
		if(scope.debug) console.log("Receiving data", arrayBuffer[0].byteLength);
		scope.latency = (Number(String(Date.now()).slice(-5, -3)) - arrayBuffer[1]) +
			chunksDuration/1000 + scope.audioContext.baseLatency;

		scope.realtime = true;
		
		var index = realtimeBufferInterval;
		realtimeBufferInterval++;
		if(realtimeBufferInterval > 2)
			realtimeBufferInterval = 0;

		if(scope.webAudio){
			fileReader.onload = function() {
				scope.audioContext.decodeAudioData(this.result, function(buffer){
					webAudioBufferInsert(index, buffer);
					scope.bufferElement[index].start(scope.bufferSkip);
				});
			};
			fileReader.readAsArrayBuffer(new Blob([bufferHeader, arrayBuffer[0]], {type:scope.mimeType}));
		} else { // HTML5 Audio
			URL.revokeObjectURL(scope.bufferElement[index].src);
			scope.bufferElement[index].src = URL.createObjectURL(new Blob([bufferHeader, arrayBuffer[0]], {type:scope.mimeType}));
			scope.bufferElement[index].load();
			scope.bufferElement[index].play();
			scope.bufferElement[index].currentTime = scope.bufferSkip;
		}
	}

	var fillEmptyBuffer = function(){
		var index = scope.bufferAvailable.indexOf(false, scope.currentBuffer);
		if(index==-1)
			index = scope.bufferAvailable.indexOf(false);
		if(index==-1||scope.bufferPending.length==0)
			return;

		if(scope.webAudio){
			fileReader.onload = function() {
				scope.audioContext.decodeAudioData(this.result, function(buffer){
					webAudioBufferInsert(index, buffer);
				});
			};
			fileReader.readAsArrayBuffer(new Blob([bufferHeader, scope.bufferPending[0]], {type:scope.mimeType}));
		} else { // HTML5 Audio
			scope.bufferElement[index].src = URL.createObjectURL(new Blob([bufferHeader, scope.bufferPending[0]], {type:scope.mimeType}));
			scope.bufferElement[index].load();
		}

		scope.bufferPending.shift();
		scope.bufferAvailable[index] = true;

		if(scope.buffering) scope.playAvailable();
		if(scope.debug) console.log("Buffer updated with ID: "+index);
	}

	scope.playBuffer = function(index){
		if(!scope.bufferElement[index].duration)
			return;

		if(scope.debug) console.log("Current stream duration: "+scope.bufferElement[index].duration);

		if(chunksDuration===false){ //Skip to end to get current duration
			chunksDuration = scope.bufferElement[index].duration;
			return;
		}

		scope.buffering = false;
		scope.playing = true;
		chunksDuration = scope.bufferElement[index].duration;
		if(scope.bufferElement[index].start)
			scope.bufferElement[index].start(scope.bufferSkip);
		else {
			scope.bufferElement[index].play();
			scope.bufferElement[index].currentTime = scope.bufferSkip;
		}

		scope.currentBuffer = index;
		if(scope.debug) console.log("Playing buffer ID: "+scope.currentBuffer);
	}

	scope.playAvailable = function(){
		if(scope.playing) return;

		if(scope.bufferAvailable[scope.currentBuffer])
			return scope.playBuffer(scope.currentBuffer);

		else{
			var index = scope.bufferAvailable.indexOf(true, scope.currentBuffer);
			if(index!=-1) return scope.playBuffer(index);

			else{ // Scan from first array
				index = scope.bufferAvailable.indexOf(true);
				if(index!=-1) return scope.playBuffer(index);
			}
		}
	}

	scope.playStream = function(){
		scope.streaming = scope.buffering = true;
	}

	scope.stop = function(){
		scope.bufferPending.splice(0);
		for (var i = 0; i < bufferElement; i++) {
			scope.bufferElement[i].stop();
			initAudioEvent(i);
			scope.bufferAvailable[i] = false;
		}
		scope.playing = false;
		scope.buffering = false;
		scope.currentBuffer = 0;
	}
}

// https://www.w3schools.com/tags/ref_av_dom.asp
// https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement
window.ScarletsMediaPlayer = function(element){
	// https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Media_events
	var self = this;

	var functionLinker = ['load', 'canPlayType'];
	var propertyLinker = ['autoplay', 'preload', 'loop', 'buffered', 'preload', 'buffered', 'controller', 'currentTime', 'currentSrc', 'duration', 'ended', 'error', 'readyState', 'networkState', 'paused', 'played', 'seekable', 'seeking'];

	if(element.tagName === 'video'){
		propertyLinker = propertyLinker.concat(['poster', 'height', 'width']);
	}

	self.audioFadeEffect = true;

	// Reference element function
	for (var i = 0; i < functionLinker.length; i++) {
		self[functionLinker[i]] = element[functionLinker[i]]
	}

	// Reference element property
	for (var i = 0; i < propertyLinker.length; i++) {
		objectPropertyLinker(self, element, propertyLinker[i]);
	}

	self.preload = 'metadata';

	self.speed = function(set){
		if(set === undefined) return element.defaultPlaybackRate;
		element.defaultPlaybackRate = element.playbackRate = set;
	}

	self.mute = function(set){
		if(set === undefined) return element.muted;
		element.defaultMuted = element.muted = set;
	}

	var volume = 1;
	self.volume = function(set){
		if(set === undefined) return volume;
		element.volume = volume = set;
	}

	self.play = function(callback){
		if(!element.paused || !element.ended) return;
		if(self.audioFadeEffect){
			element.volume = 0;
			element.play();
			fadeNumber(0, volume, -0.05, 400, function(num){
				element.volume = num;
			}, callback);
		}
	}

	self.pause = function(callback){
		if(!element.paused || !element.ended){
			if(self.audioFadeEffect){
				fadeNumber(volume, 0, -0.05, 400, function(num){
					element.volume = num;
				}, function(){
					element.pause();
					if(callback) callback();
				});
				return;
			}
			element.pause();
		}
		if(callback) callback();
	}

	self.prepare = function(links, callback, force){
		// Stop playing media
		if(!force && (!element.paused || !element.ended))
			return self.pause(function(){
				self.prepare(links, callback, true);
			});

		var temp = element.querySelectorAll('source');
		for (var i = temp.length - 1; i >= 0; i--) {
			temp[i].remove();
		}

		if(links instanceof String)
			element.appendChild(`<source src="${links}"/>`);
		else{
			temp = '';
			for (var i = 0; i < links.length; i++) {
				temp += `<source src="${links[i]}"/>`;
			}
			element.appendChild(temp);
		}

		if(callback) callback();
	}

	var eventRegistered = {};
	function eventTrigger(e){
		for (var i = 0; i < eventRegistered[e.type].length; i++) {
			eventRegistered[e.type][i](e, self);
		}
	}

	// https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Media_events
	self.on = function(eventName, callback){
		var name = eventName.toLowerCase();
		if(eventRegistered[name] === undefined){
			element.addEventListener(eventName, eventTrigger, true);
			eventRegistered[name] = [];
		}
		eventRegistered[name].push(callback);
	}

	self.off = function(eventName, callback){
		var name = eventName.toLowerCase();
		if(eventRegistered[name] === undefined)
			return;

		if(!callback)
			eventRegistered[name].splice(0);
		else
			eventRegistered[name].splice(eventRegistered[name].indexOf(callback), 1);

		if(eventRegistered[name].length === 0){
			eventRegistered[name] = undefined;
			element.removeEventListener(eventName, eventTrigger, true);
		}
	}

	self.once = function(eventName, callback){
		element.addEventListener(eventName, callback, {once:true});
	}

	self.playlist = {
		currentIndex:0,
		list:[],
		original:[],
		loop:false,
		shuffled:false,

		// lists = [{mp3:'main.mp3', ogg:'fallback.ogg', ..}, ...]
		reload:function(lists){
			this.original = lists;
			if(this.shuffled)
				this.shuffle(true);
		},

		// obj = {mp3:'main.mp3', ogg:'fallback.ogg'}
		add:function(obj){
			original.push(obj);
			if(this.shuffled)
				this.shuffle(true);
		},

		// index from 'original' property
		remove:function(index){
			original.splice(index, 1);
			if(this.shuffled)
				this.shuffle(true);
		},

		next:function(index){
			this.currentIndex++;
			this.play(this.currentIndex);
		},

		previous:function(index){
			this.currentIndex--;
			this.play(this.currentIndex);
		},

		play:function(index){
			self.prepare(Object.values(this.original[index]), function(){
				self.play();
			});
		},

		shuffle:function(set){
			if(set === undefined) return this.shuffled;
			if(set === true){
			    var j, x, i;
			    for (i = this.list.length - 1; i > 0; i--) {
			        j = Math.floor(Math.random() * (i + 1));
			        x = this.list[i];
			        this.list[i] = this.list[j];
			        this.list[j] = x;
			    }
			}
			else this.list = this.original.slice(0);

			this.shuffled = set;
		}
	};
}

// Unlock mobile media security
if(isMobile()){
	var emptyBuffer = ScarletsMedia.audioContext.createBuffer(1, 1, 22050);
	var mobileMediaUnlock = function(e){
		var source = ScarletsMedia.audioContext.createBufferSource();
		source.buffer = emptyBuffer;
		source.connect(ScarletsMedia.audioContext.destination);

		source.onended = function(){
			source.disconnect(0);
			source = emptyBuffer = null;

			document.removeEventListener('touchstart', mobileMediaUnlock, true);
			document.removeEventListener('touchend', mobileMediaUnlock, true);
			document.removeEventListener('click', mobileMediaUnlock, true);
		}

		// Play the empty buffer.
		if(!source.start) source.noteOn(0);
		else source.start(0);
		ScarletsMedia.audioContext.resume();
	}

	document.addEventListener('touchstart', mobileMediaUnlock, true);
	document.addEventListener('touchend', mobileMediaUnlock, true);
	document.addEventListener('click', mobileMediaUnlock, true);
}

function isMobile(){
    return /iPhone|iPad|iPod|Android|BlackBerry|BB10|Silk|Mobi/i.test(navigator.userAgent);
}

function objectPropertyLinker(self, target, property){
	Object.defineProperty(self, property, {
	  get: function(){ return target.property; },
	  set: function(value){ target.property = value; },
	  enumerable: true,
	  configurable: true
	});
}

var maxFade = 0;
function fadeNumber(from, to, increment, fadeTime, onIncrease, onFinish){
	maxFade = 0;
	var current = from;
	var interval = fadeTime/(Math.abs(from-to)/Math.abs(increment));
	if(!interval || interval == Infinity){
		setTimeout(function(){
			if(onIncrease) onIncrease(to);
			if(onFinish) onFinish();
		}, fadeTime);
		return;
	}

	var timer = setInterval(function(){
		if(maxFade>=100) clearInterval(timer);
		maxFade++;
	
		current = (current+increment)*1000;
		current = Math.ceil(current)/1000;
	
		//Increasing and current is more than target
		if((increment >= 0 && (current >= to || from >= to))
			||
		//Decreasing and current is lower than target
		(increment <= 0 && (current <= to || from <= to))
			||
		//Infinity or Zero number
		(current == Infinity || !current))
		{
			clearInterval(timer);
			onIncrease(to);
			if(onFinish) onFinish();
			return;
		}
		
		if(onIncrease) onIncrease(current); 
	}, interval);
}