/*
	ScarletsFiction MediaStream Library
	
	HTML5 media streamer library for playing music, video, playlist,
	or even live streaming microphone & camera with node server
	https://github.com/ScarletsFiction/SFMediaStream
	
	Make sure you include this header on this script
*/
(function(global, factory){
  if(typeof exports === 'object' && typeof module !== 'undefined'){
  	module.exports = {};
  	factory(module.exports, window, true);
  }
  else factory(global, window);
}(this || window, (function(global, window, moduleMode){'use strict';
// ===== Module Init =====

// Initialize global data
var ScarletsMedia = {
	audioContext: false, // Created after user gesture

	// Get Audio Node from HTML5's audio tag
	getElementAudioNode:function(elem){
		elem.crossOrigin = 'anonymous';
		return this.audioContext.createMediaElementSource(elem);
	},

	// videoContext: window.VideoContext ? new VideoContext() : false,

	// Still underdevelopment: https://github.com/bbc/VideoContext
	getElementVideoNode:function(elem){
		elem.crossOrigin = 'anonymous';
		return null;
	}
};

var ScarletsMediaEffect = {};
var audioCodecs = {
	webm:['opus', 'vorbis'],
	mp4:['mp4a.67', 'mp4a.40.29', 'mp4a.40.5', 'mp4a.40.2', 'mp3'],
	ogg:['opus', 'vorbis'], // This may not work on mobile
};
var videoCodecs = {
	webm:['vp8,opus', 'vp8,vorbis'],
	mp4:['mp4v.20.8,mp4a.40.2', 'mp4v.20.240,mp4a.40.2', 'avc1.42E01E,mp4a.40.2', 'avc1.58A01E,mp4a.40.2', 'avc1.64001E,mp4a.40.2'],
	'3gpp':['mp4v.20.8,samr'],
	ogg:['dirac,vorbis', 'theora,vorbis'], // This may not work on mobile
};

// Unlock mobile media security
(function(){
	var mobileMediaUnlock = function(e){
		if(!window.AudioContext) return removeListener();
		ScarletsMedia.audioContext = new AudioContext();

		var emptyBuffer = ScarletsMedia.audioContext.createBuffer(1, 1, 22050);
		var source = ScarletsMedia.audioContext.createBufferSource();
		source.buffer = emptyBuffer;
		source.connect(ScarletsMedia.audioContext.destination);

		source.onended = function(){
			source.disconnect(0);
			source = emptyBuffer = null;

			removeListener();
		}

		// Play the empty buffer.
		if(!source.start) source.noteOn(0);
		else source.start(0);
		ScarletsMedia.audioContext.resume();
	}

	function removeListener(){
		document.removeEventListener('touchstart', mobileMediaUnlock, true);
		document.removeEventListener('touchend', mobileMediaUnlock, true);
		document.removeEventListener('click', mobileMediaUnlock, true);
	}

	document.addEventListener('touchstart', mobileMediaUnlock, true);
	document.addEventListener('touchend', mobileMediaUnlock, true);
	document.addEventListener('click', mobileMediaUnlock, true);
})();
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
ScarletsMedia.convert = {
	// Converts a MIDI pitch number to frequency.
	// midi = 0 ~ 127
	midiToFreq:function (midi) {
	    if(midi <= -1500) return 0;
	    else if(midi > 1499) return 3.282417553401589e+38;
	    else return 440.0 * Math.pow(2, (Math.floor(midi) - 69) / 12.0);
	},

	// Converts frequency to MIDI pitch.
	freqToMidi:function(freq){
		if(freq > 0)
			return Math.floor(Math.log(freq/440.0) / Math.LN2 * 12 + 69);
		else return -1500;
	},

    // Converts power to decibel. Note that it is off by 100dB to make it
	powerToDb:function(power){
	    if (power <= 0)
	    	return 0;
	    else {
	        var db = 100 + 10.0 / Math.LN10 * Math.log(power);
	        if(db < 0) return 0;
	        return db;
	    }
	},

    // Converts decibel to power
	dbToPower:function(db){
	    if (db <= 0) return 0;
	    else {
  	        if (db > 870) db = 870;
  	        return Math.exp(Math.LN10 * 0.1 * (db - 100.0));
	    }
	},

	// Converts amplitude to decibel.
	ampToDb:function(lin){
	    return 20.0 * (lin > 0.00001 ? (Math.log(lin) / Math.LN10) : -5.0);
	},

	// Converts decibel to amplitude
	dbToAmp:function(db) {
	    return Math.pow(10.0, db / 20.0);
	},

	// Converts MIDI velocity to amplitude
	velToAmp:function (velocity) {
	    return velocity / 127;
	},
}
var MediaBuffer = function(mimeType, chunksDuration, bufferHeader){
	var scope = this;
	scope.source = new MediaSource();
	scope.objectURL = URL.createObjectURL(scope.source);

	var sourceBuffer = null;
	scope.source.addEventListener('sourceopen', function(){
		sourceBuffer = scope.source.addSourceBuffer(mimeType);
		sourceBuffer.mode = 'sequence';
		sourceBuffer.appendBuffer(bufferHeader);
	}, {once:true});

	var removing = false;
	scope.source.addEventListener('updateend', function(){
		if(removing === false) return;

		removing = false;
		sourceBuffer.remove(0, 10);
	});

	var totalTime = 0;
	scope.append = function(arrayBuffer){
		if(sourceBuffer === null) return false;

		sourceBuffer.appendBuffer(arrayBuffer);
		totalTime += chunksDuration;

		if(totalTime >= 20000)
			removing = true;

		return totalTime/1000;
	}

	scope.stop = function(){
		if(sourceBuffer.updating)
			sourceBuffer.abort();

		if(scope.source.readyState === "open")
			scope.source.endOfStream();
	}
}
// https://www.w3schools.com/tags/ref_av_dom.asp
// https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement
var ScarletsMediaPlayer = function(element){
	// https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Media_events
	var self = this;

	var propertyLinker = ['autoplay', 'loop', 'buffered', 'buffered', 'controller', 'currentTime', 'currentSrc', 'duration', 'ended', 'error', 'readyState', 'networkState', 'paused', 'played', 'seekable', 'seeking'];

	// Get element audio for output node
	var audioOutputNode = false;
	Object.defineProperty(self, 'audioOutput', {
		get: function(){
			if(!audioOutputNode)
				audioOutputNode = ScarletsMedia.getElementAudioNode(element);

			return audioOutputNode;
		},
		enumerable: true
	});

	if(element.tagName.toLowerCase() === 'video'){
		propertyLinker = propertyLinker.concat(['poster', 'height', 'width']);

		// Get element video for output node
		var videoOutputNode = false;
		Object.defineProperty(self, 'videoOutput', {
			get: function(){
				if(!videoOutputNode)
					videoOutputNode = ScarletsMedia.getElementVideoNode(element);

				return videoOutputNode;
			},
			enumerable: true
		});
	}

	// Reference element function
	self.load = function(){
		element.load();
	}

	self.canPlayType = function(){
		element.canPlayType();
	}

	// Reference element property
	for (var i = 0; i < propertyLinker.length; i++) {
		ScarletsMedia.extra.objectPropertyLinker(self, element, propertyLinker[i]);
	}

	self.preload = true;
	element.preload = 'metadata';
	self.audioFadeEffect = true;

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
		if(!element.paused){
			if(callback) callback();
			return;
		}
		if(self.audioFadeEffect){
			element.volume = 0;
			element.play();
			ScarletsMedia.extra.fadeNumber(0, volume, 0.02, 400, function(num){
				element.volume = num;
			}, callback);
			return;
		}
		element.play();
		if(callback) callback();
	}

	self.pause = function(callback){
		if(element.paused){
			if(callback) callback();
			return;
		}
		if(self.audioFadeEffect){
			ScarletsMedia.extra.fadeNumber(volume, 0, -0.02, 400, function(num){
				element.volume = num;
			}, function(){
				element.pause();
				if(callback) callback();
			});
			return;
		}
		element.pause();
		if(callback) callback();
	}

	self.prepare = function(links, callback, force){
		// Stop playing media
		if(!force && !element.paused)
			return self.pause(function(){
				self.prepare(links, callback, true);
			});

		var temp = element.querySelectorAll('source');
		for (var i = temp.length - 1; i >= 0; i--) {
			temp[i].remove();
		}

		if(typeof links === 'string')
			element.insertAdjacentHTML('beforeend', `<source src="${links}"/>`);
		else{
			temp = '';
			for (var i = 0; i < links.length; i++) {
				temp += `<source src="${links[i]}"/>`;
			}
			element.insertAdjacentHTML('beforeend', temp);
		}

		// Preload data
		if(self.preload) element.load();
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
		return self;
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
		return self;
	}

	self.once = function(eventName, callback){
		element.addEventListener(eventName, callback, {once:true});
		return self;
	}

	self.destroy = function(){
		for(var key in eventRegistered){
			self.off(key);
		}
		self.playlist.list.splice(0);
		self.playlist.original.splice(0);
		for(var key in self){
			delete self[key];
		}
		self = null;

		element.pause();
		element.innerHTML = '';
	}

	var playlistInitialized = false;
	function internalPlaylistEvent(){
		if(playlistInitialized) return;
		playlistInitialized = true;

		self.on('ended', function(){
			if(self.playlist.currentIndex < self.playlist.list.length - 1)
				self.playlist.next(true);
			else if(self.playlist.loop)
				self.playlist.play(0);
		});
	}

	function playlistTriggerEvent(name){
		if(!eventRegistered[name]) return;
		for (var i = 0; i < eventRegistered[name].length; i++) {
			eventRegistered[name][i](self, self.playlist, self.playlist.currentIndex);
		}
	}

	self.playlist = {
		currentIndex:0,
		list:[],
		original:[],
		loop:false,
		shuffled:false,

		// lists = [{yourProperty:'', stream:['main.mp3', 'fallback.ogg', ..]}, ...]
		reload:function(lists){
			this.original = lists;
			this.shuffle(this.shuffled);
			internalPlaylistEvent();
		},

		// obj = {yourProperty:'', stream:['main.mp3', 'fallback.ogg']}
		add:function(obj){
			this.original.push(obj);
			this.shuffle(this.shuffled);
			internalPlaylistEvent();
		},

		// index from 'original' property
		remove:function(index){
			this.original.splice(index, 1);
			this.shuffle(this.shuffled);
		},

		next:function(autoplay){
			this.currentIndex++;
			if(this.currentIndex >= this.list.length){
				if(this.loop)
					this.currentIndex = 0;
				else{
					this.currentIndex--;
					return;
				}
			}

			if(autoplay)
				this.play(this.currentIndex);
			else playlistTriggerEvent('playlistchange');
		},

		previous:function(autoplay){
			this.currentIndex--;
			if(this.currentIndex < 0){
				if(this.loop)
					this.currentIndex = this.list.length - 1;
				else{
					this.currentIndex++;
					return;
				}
			}

			if(autoplay)
				this.play(this.currentIndex);
			else playlistTriggerEvent('playlistchange');
		},

		play:function(index){
			this.currentIndex = index;
			playlistTriggerEvent('playlistchange');

			self.prepare(this.list[index].stream, function(){
				self.play();
			});
		},

		shuffle:function(set){
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
// streamInfo = mediaDevices.getUserMedia({thisData})
// latency = 0ms is not possible (minimum is 70ms, or depend on computer performance)
var ScarletsMediaPresenter = function(streamInfo, latency){
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

	scope.options = {};
	var mediaType = streamInfo.video ? 'video' : 'audio';

	// Check supported mimeType and codecs for the recorder
	if(!scope.options.mimeType){
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
		scope.options.mimeType = supportedMimeType;
		console.log("mimeType: "+supportedMimeType);
	}

	var mediaGranted = function(mediaStream) {
		scope.mediaGranted = true;
		scope.mediaStream = mediaStream;

		scope.bufferHeader = null;
		var bufferHeaderLength = false;

		scope.mediaRecorder = new MediaRecorder(mediaStream, scope.options);

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
					mimeType:scope.options.mimeType,
					startTime:Date.now(),
					data:scope.bufferHeader
				});
			scope.recordingReady = true;
		};

		// Get first header
		scope.mediaRecorder.start(latency);
	}

	scope.startRecording = function(){
		if(scope.mediaGranted === false || scope.mediaRecorder === null){
			scope.recordingReady = false;
			navigator.mediaDevices.getUserMedia(streamInfo)
				.then(mediaGranted).catch(console.error);
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
ScarletsMediaEffect.chorus = function(sourceNode){
	var context = ScarletsMedia.audioContext;
	var output = context.createGain();
	var input = sourceNode === undefined ? context.createGain() : null;
	if(input) sourceNode = input;

	var dry = context.createGain();
    var wet = context.createGain();
    var splitter = context.createChannelSplitter(2);
    var merger = context.createChannelMerger(2);
    sourceNode.connect(splitter);
    sourceNode.connect(dry);

    var channel = [{/* left */}, {/* right */}];

    for (var i = 0; i < channel.length; i++) {
    	var c = channel[i];

    	// Declaration
    	c.stream = context.createGain();
    	c.delayVibrato = context.createDelay();
    	c.delayFixed = context.createDelay();
    	c.feedback = context.createGain();
    	c.feedforward = context.createGain();
    	c.blend = context.createGain();

    	// Connection
	    splitter.connect(c.stream, i, 0);
	    c.stream.connect(c.delayVibrato);
	    c.stream.connect(c.delayFixed);
	    c.delayVibrato.connect(c.feedforward);
	    c.delayVibrato.connect(merger, 0, i);
	    c.delayFixed.connect(c.feedback);
	    c.feedback.connect(c.stream);
	    c.blend.connect(merger, 0, i);
    }

    // Output
    merger.connect(wet);
    dry.connect(output);
    wet.connect(output);

    // LFO modulation
    var lfo = context.createOscillator();
    var LDepth = context.createGain();
    var RDepth = context.createGain();
    lfo.connect(LDepth);
    lfo.connect(RDepth);
    LDepth.connect(channel[0].delayVibrato.delayTime);
    RDepth.connect(channel[1].delayVibrato.delayTime);
    lfo.start(0);

    // Settings
    lfo.type = 'sine';
    lfo.frequency.value = 0.15;
    LDepth.gain.value = 0.013;
    RDepth.gain.value = -0.017;
    channel[0].delayFixed.delayTime.value = 0.005;
    channel[1].delayFixed.delayTime.value = 0.007;
    channel[0].delayVibrato.delayTime.value = 0.013;
    channel[1].delayVibrato.delayTime.value = 0.017;

    var options = {rate:0, intensity:0, mix:0};

	var ret =  {
		// Connect to output
		// output.connect(context.destination);
		output:output,
		input:input,

		rate: function (value) { // value: 0 ~ 1
			if(value === undefined) return options.rate;
			options.rate = value;

	    	value = value * 0.29 + 0.01;
	    	lfo.frequency.value = value;
	    },

	    intensity: function (value) { // value: 0 ~ 1
			if(value === undefined) return options.intensity;
			options.intensity = value;

	    	var blend = 1.0 - (value * 0.2929);
	    	var feedforward = value * 0.2929 + 0.7071;
	    	var feedback = value * 0.7071;

	    	for (var i = 0; i < channel.length; i++) {
		    	channel[i].blend.gain.value = blend;
		    	channel[i].feedforward.gain.value = feedforward;
		    	channel[i].feedback.gain.value = feedback;
	    	}
	    },

	    mix: function (value) {
			if(value === undefined) return options.mix;
			options.mix = value;
			
	    	dry.gain.value = value;
	    },

		// This should be executed to clean memory
		destroy:function(){
			if(input) input.disconnect();
			output.disconnect();
			lfo.stop(0);
			lfo.disconnect();
			
	    	for (var i = 0; i < channel.length; i++) {
		    	channel[i].stream.disconnect();
	    	}
			for(var key in this){
				delete this[key];
			}
			output = null;
		}
	};

	// Initial settings
    ret.rate(0.5);
    ret.intensity(0.0);
    ret.mix(0.75);

	return ret;
};
ScarletsMediaEffect.conReverb = function(sourceNode){
	var context = ScarletsMedia.audioContext;
	var output = context.createGain();
	var input = sourceNode === undefined ? context.createGain() : null;
	if(input) sourceNode = input;

    var reverbNode = context.createConvolver();
	var wetGainNode = context.createGain();
	var dryGainNode = context.createGain();

	sourceNode.connect(dryGainNode);
	sourceNode.connect(reverbNode);

    reverbNode.connect(wetGainNode);
    dryGainNode.connect(output);
    wetGainNode.connect(output);

    function setBuffer(buffer){
    	if(reverbNode.buffer !== null){
    		reverbNode.disconnect();
    		reverbNode = context.createConvolver();

			sourceNode.connect(reverbNode);
		    reverbNode.connect(wetGainNode);
    	}
    	reverbNode.buffer = buffer;
    }

	return {
		// Connect to output
		// output.connect(context.destination);
		output:output,
		input:input,

		// This must be set
		setBuffer:setBuffer,

		// Load audio buffer from url
		loadBuffer:function(url){
			var ajaxRequest = new XMLHttpRequest();
			ajaxRequest.open('GET', url, true);
			ajaxRequest.responseType = 'arraybuffer';

			ajaxRequest.onload = function(){
			  var audioData = ajaxRequest.response;
			  context.decodeAudioData(audioData, function(buffer) {
			      setBuffer(buffer);
			  }, function(e){"Error with decoding audio data" + e.err});
			}

			ajaxRequest.send();
		},

		mix: function(value){ // value: 0 ~ 1
			if(value === undefined) return wetGainNode.gain.value;
			dryGainNode.gain.value = 1 - value;
			wetGainNode.gain.value = value;
		},

		// This should be executed to clean memory
		destroy:function(){
			if(input) input.disconnect();
			dryGainNode.disconnect();
			output.disconnect();
			reverbNode.disconnect();
			
			for(var key in this){
				delete this[key];
			}
			output = null;
		}
	};
};
ScarletsMediaEffect.cutOff = function(passType, sourceNode){ // passType: 'lowpass' | 'bandpass' | 'highpass'
	var context = ScarletsMedia.audioContext;
	var output = context.createGain();
	var input = sourceNode === undefined ? context.createGain() : null;
	if(input) sourceNode = input;

	var filterNode = context.createBiquadFilter();
	filterNode.type = passType || 'lowpass';
	filterNode.frequency.value = 350;
	filterNode.Q.value = 1;
	filterNode.connect(output);
	sourceNode.connect(filterNode);
	
	return {
		// Connect to output
		// output.connect(context.destination);
		output:output,
		input:input,
		
		type: function(value){
			if(value === undefined)
				return filterNode.type;
			filterNode.type = value;
		},
		frequency: function(value){
			if(value === undefined)
				return filterNode.frequency.value;
			filterNode.frequency.value = value;
		},
		width: function(value){
			if(value === undefined)
				return filterNode.Q.value;
			filterNode.Q.value = value;
		},

		// This should be executed to clean memory
		destroy:function(){
			if(input) input.disconnect();
			filterNode.disconnect();
			output.disconnect();
			
			for(var key in this){
				delete this[key];
			}
			output = null;
		}
	};
};
ScarletsMediaEffect.delay = function(sourceNode){
	var context = ScarletsMedia.audioContext;
	var output = context.createGain();
	var input = sourceNode === undefined ? context.createGain() : null;
	if(input) sourceNode = input;

	var dryGainNode = context.createGain();
	var wetGainNode = context.createGain();
	var feedbackGainNode = context.createGain();
	var delayNode = context.createDelay();

	sourceNode.connect(dryGainNode);
	dryGainNode.connect(output);

	delayNode.connect(feedbackGainNode);
	feedbackGainNode.connect(delayNode);

	sourceNode.connect(delayNode);
	delayNode.connect(wetGainNode);
	
	wetGainNode.connect(output);
	
	var ret = {
		// Connect to output
		// output.connect(context.destination);
		output:output,
		input:input,

		mix:function(value){ // value: 0 ~ 1
			if(value === undefined) return wetGainNode.gain.value;
			dryGainNode.gain.value = 1 - value;
			wetGainNode.gain.value = value;
		},
		time:function(value){ // value: 0 ~ 180
			if(value === undefined) return delayNode.delayTime.value;
			delayNode.delayTime.value = value;
		},
		feedback:function(value){ // value: 0 ~ 1
			if(value === undefined) return feedbackGainNode.gain.value;
			feedbackGainNode.gain.value = value;
		},

		// This should be executed to clean memory
		destroy:function(){
			if(input) input.disconnect();
			output.disconnect();
			dryGainNode.disconnect();
			wetGainNode.disconnect();
			feedbackGainNode.disconnect();
			delayNode.disconnect();
			
			for(var key in this){
				delete this[key];
			}
			output = null;
		}
	};

	ret.mix(0.5);
	ret.time(0.3);
	ret.feedback(0.5);

	return ret;
};
ScarletsMediaEffect.distortion = function(sourceNode){
	var context = ScarletsMedia.audioContext;
	var output = context.createGain();
	var input = sourceNode === undefined ? context.createGain() : null;
	if(input) sourceNode = input;
	var deg = 57 * Math.PI / 180;

	var waveShaperNode = context.createWaveShaper();
	waveShaperNode.connect(output);
	sourceNode.connect(waveShaperNode);

	var options = {
		amount:0
	};
	return {
		set:function(amount){ // amount: 0 ~ 1
			if(amount === undefined) return options.amount;
			options.amount = amount;
			
			amount = amount * 10;
		    var curve = new Float32Array(context.sampleRate);
		    var temp = 2 / context.sampleRate;

		    for (var i = 0 ; i < context.sampleRate; i++) {
		    	var x = i * temp - 1;

		    	// http://kevincennis.github.io/transfergraph/
		    	curve[i] = (3 + amount) * x * deg / (Math.PI + amount * Math.abs(x));
		    }

		    waveShaperNode.curve = curve;
		},

		// Connect to output
		// output.connect(context.destination);
		output:output,
		input:input,

		// This should be executed to clean memory
		destroy:function(){
			if(input) input.disconnect();
			waveShaperNode.disconnect();
			output.disconnect();

			waveShaperNode = output = null;
			for(var key in this){
				delete this[key];
			}
		}
	};
};
ScarletsMediaEffect.dubDelay = function(sourceNode){
	var context = ScarletsMedia.audioContext;
	var output = context.createGain();
	var input = sourceNode === undefined ? context.createGain() : null;
	if(input) sourceNode = input;

	var dryGainNode = context.createGain();
	var wetGainNode = context.createGain();
	var feedbackGainNode = context.createGain();
	var delayNode = context.createDelay();
	var bqFilterNode = context.createBiquadFilter(); 

	sourceNode.connect(dryGainNode);
	dryGainNode.connect(output);

	sourceNode.connect(wetGainNode);
	sourceNode.connect(feedbackGainNode);

	feedbackGainNode.connect(bqFilterNode);
	bqFilterNode.connect(delayNode);
	delayNode.connect(feedbackGainNode);
	delayNode.connect(wetGainNode);

	wetGainNode.connect(output);
	
	var ret = {
		// Connect to output
		// output.connect(context.destination);
		output:output,
		input:input,
		
		mix:function(value){ // value: 0 ~ 1
			if(value === undefined) return wetGainNode.gain.value;
			dryGainNode.gain.value = 1 - value;
			wetGainNode.gain.value = value;
		},
		time:function(value){ // value: 0 ~ 180
			if(value === undefined) return delayNode.delayTime.value;
			delayNode.delayTime.value = value;
		},
		feedback:function(value){ // value: 0 ~ 1
			if(value === undefined) return feedbackGainNode.gain.value;
			feedbackGainNode.gain.value = value;
		},
		cutoff:function(value){ // value: 0 ~ 4000
			if(value === undefined) return bqFilterNode.frequency.value;
			bqFilterNode.frequency.value = value;
		},

		// This should be executed to clean memory
		destroy:function(){
			if(input) input.disconnect();
			output.disconnect();
			dryGainNode.disconnect();
			wetGainNode.disconnect();
			feedbackGainNode.disconnect();

			for(var key in this){
				delete this[key];
			}
			output = null;
		}
	};

	ret.mix(0.5);
	ret.time(0.7);
	ret.feedback(0.6);
	ret.cutoff(700);

	return ret;
};
ScarletsMediaEffect.equalizer = function(frequencies, sourceNode){
	var freq = frequencies || [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
	var context = ScarletsMedia.audioContext;
	
	var output = context.createGain(); // Combine all effect
	var input = sourceNode === undefined ? context.createGain() : null;
	if(input) sourceNode = input;

	var equalizer = {};
	var lastIndex = freq.length - 1;

	for (var i = 0; i < freq.length; i++) {
        var filter = context.createBiquadFilter(); // Frequency pass
		filter.gain.value = 0;
        filter.frequency.value = freq[i];

        if(i === 0) filter.type = 'lowshelf';
        else if(i === lastIndex) filter.type = 'highshelf';
        else filter.type = 'peaking';

		if(i !== 0)
	    	equalizer[freq[i - 1]].connect(filter);
        equalizer[freq[i]] = filter;
	}

	sourceNode.connect(equalizer[freq[0]]);
	filter.connect(output);

	return {
		// Connect to output
		// output.connect(context.destination);
		output:output,
		input:input,
		
		frequency:function(frequency, dB){ // value: -20 ~ 20
			if(dB === undefined) return equalizer[frequency].gain.value;
			equalizer[frequency].gain.value = dB;
		},

		// This should be executed to clean memory
		destroy:function(){
			for (var i = 0; i < freq.length; i++) {
	    		equalizer[freq[i]].disconnect(); // filter
			}
			equalizer.splice(0);

			if(input) input.disconnect();
			output.disconnect();
			
			for(var key in this){
				delete this[key];
			}
			equalizer = output = null;
		}
	};
};
ScarletsMediaEffect.fade = function(sourceNode){
	var context = ScarletsMedia.audioContext;
	var output = context.createGain();
	var input = sourceNode === undefined ? context.createGain() : null;
	if(input) sourceNode = input;

	output.gain.value = 1;
	sourceNode.connect(output);
	
	return {
		// Connect to output
		// output.connect(context.destination);
		output:output,
		input:input,

		in:function(value, time, callback){ // value: 0~1, time: in seconds
			output.gain.cancelScheduledValues(context.currentTime);

			var remainingTime = (1 - output.gain.value) * value;
			output.gain.setTargetAtTime(1.0, context.currentTime, remainingTime * time);

			if(callback) setTimeout(callback, time * 1000);
		},
		out:function(value, time, callback){ // value: 0~1, time: in seconds
			output.gain.cancelScheduledValues(context.currentTime);

			var remainingTime = output.gain.value * value;
			output.gain.setTargetAtTime(0.00001, context.currentTime, remainingTime / time);

			if(callback) setTimeout(callback, time * 1000);
		},

		// This should be executed to clean memory
		destroy:function(){
			if(input) input.disconnect();
			output.disconnect();
			
			for(var key in this){
				delete this[key];
			}
			output = null;
		}
	};
};
ScarletsMediaEffect.flanger = function(sourceNode){
	var context = ScarletsMedia.audioContext;
	var output = context.createGain();
	var input = sourceNode === undefined ? context.createGain() : null;
	if(input) sourceNode = input;

	var inputFeedbackNode = context.createGain();
	var wetGainNode = context.createGain();
	var dryGainNode = context.createGain();
	var delayNode = context.createDelay();
	var oscillatorNode = context.createOscillator();
	var gainNode = context.createGain();
	var feedbackNode = context.createGain();
	oscillatorNode.type = 'sine';

	sourceNode.connect(inputFeedbackNode);
	sourceNode.connect(dryGainNode);

	inputFeedbackNode.connect(delayNode);
	inputFeedbackNode.connect(wetGainNode);

	delayNode.connect(wetGainNode);
	delayNode.connect(feedbackNode);

	feedbackNode.connect(inputFeedbackNode);

	oscillatorNode.connect(gainNode);
	gainNode.connect(delayNode.delayTime);

	dryGainNode.connect(output);
	wetGainNode.connect(output);

	oscillatorNode.start(0);
	
	var ret = {
		// Connect to output
		// output.connect(context.destination);
		output:output,
		input:input,

		mix: function(value){ // value: 0 ~ 1
			if(value === undefined) return wetGainNode.gain.value;
			dryGainNode.gain.value = 1 - value;
			wetGainNode.gain.value = value;
		},
		time:function(value){ // value: 0 ~ 1
			if(value === undefined) return ScarletsMedia.extra.denormalize(delayNode.delayTime.value, 0.001, 0.02);
			delayNode.delayTime.value = ScarletsMedia.extra.normalize(value, 0.001, 0.02);
		},
		speed:function(value){ // value: 0 ~ 1
			if(value === undefined) return ScarletsMedia.extra.denormalize(delayNode.delayTime.value, 0.5, 5);
			oscillatorNode.frequency.value = ScarletsMedia.extra.normalize(value, 0.5, 5);
		},
		depth:function(value){ // value: 0 ~ 1
			if(value === undefined) return ScarletsMedia.extra.denormalize(delayNode.delayTime.value, 0.0005, 0.005);
			gainNode.gain.value = ScarletsMedia.extra.normalize(value, 0.0005, 0.005);
		},
		feedback:function(value){ // value: 0 ~ 1
			if(value === undefined) return ScarletsMedia.extra.denormalize(delayNode.delayTime.value, 0, 0.8);
			feedbackNode.gain.value = ScarletsMedia.extra.normalize(value, 0, 0.8);
		},

		// This should be executed to clean memory
		destroy:function(){
			if(input) input.disconnect();
			output.disconnect();
			inputFeedbackNode.disconnect();
			dryGainNode.disconnect();

			for(var key in this){
				delete this[key];
			}
			output = null;
		}
	};

	ret.time(0.45);
	ret.speed(0.2);
	ret.depth(0.1);
	ret.feedback(0.1);
	ret.mix(0.5);

	return ret;
};
ScarletsMediaEffect.harmonizer = function(sourceNode){
	var context = ScarletsMedia.audioContext;
	var output = context.createGain();
	var input = sourceNode === undefined ? context.createGain() : null;
	if(input) sourceNode = input;
  	var bands = 8;

	// Cascading 2 filters for sharp resonance.
    var filters1 = [];
    var filters2 = [];
    var gains = [];

    for (var i = 0; i < bands; i++) {
      filters1[i] = context.createBiquadFilter();
      filters1[i].type = 'bandpass';
      filters2[i] = context.createBiquadFilter();
      filters2[i].type = 'bandpass';
      sourceNode.connect(filters1[i]);

      gains[i] = context.createGain();
      gains[i].connect(output);
      filters1[i].connect(filters2[i]).connect(gains[i]);
    }

    output.gain.value = 35.0;
    var options = {
    	pitch:0,
    	slope:0,
    	width:0
    };

	var ret = {
		// Connect to output
		// output.connect(context.destination);
		output:output,
		input:input,
		
		// Change frequency of filters
	    pitch: function (value) {
			if(value === undefined) return options.pitch;
			options.pitch = value;
			
	    	var f0 = ScarletsMedia.convert.midiToFreq(value);
	    	for (var i = 0; i < bands; i++) {
	    		filters1[i].frequency.value = f0;
	    		filters2[i].frequency.value = f0;
	    	}
	    },

	    slope: function (value) {
			if(value === undefined) return options.slope;
			options.slope = value;
			
	    	for (var i = 0; i < bands; i++) {
	    		gains[i].gain.value = 1.0 + Math.sin(Math.PI + (Math.PI/2 * (value + i / bands)));
	    	}
	    },

	    width: function (value) {
			if(value === undefined) return options.width;
			options.width = value;
			
	    	for (var i = 1; i < bands; i++) {
	    		var q = 2 + 90 * Math.pow((1 - i / bands), value);
	    		filters1[i].Q.value = q;
	    		filters2[i].Q.value = q;
	    	}
	    },

		// This should be executed to clean memory
		destroy:function(){
			if(input) input.disconnect();
			output.disconnect();

		    for (var i = 0; i < bands; i++) {
		        filters1[i].disconnect();
		  	}

			for(var key in this){
				delete this[key];
			}
			output = null;
		}
	};

    ret.pitch(34);
    ret.slope(0.65);
    ret.width(0.15);

	return ret;

	// sample
	// noise x0.25 -> harmonizer -> reverb x0.85
};
ScarletsMediaEffect.noise = function(){
	var context = ScarletsMedia.audioContext;
	var output = context.createGain();
	var input = sourceNode === undefined ? context.createGain() : null;
	if(input) sourceNode = input;

	var length = Math.floor(context.sampleRate * 9.73);
	var noiseFloat32 = new Float32Array(length);

	for (var i = 0; i < length; i++) {
		noiseFloat32[i] = Math.sqrt(-2.0 * Math.log(Math.random())) * Math.cos(2.0 * Math.PI * Math.random()) * 0.5;
	}

	var noiseBuffer = context.createBuffer(2, length, context.sampleRate);
	noiseBuffer.getChannelData(0).set(noiseFloat32, 0);
	noiseBuffer.getChannelData(1).set(noiseFloat32, 0);

    var src = context.createBufferSource();
    src.to(output);
    src.loop = true;
    src.start(0);
    src.buffer = noiseBuffer;
    src.loopStart = Math.random() * 9.73;
	
	return {
		// Connect to output
		// output.connect(context.destination);
		output:output,
		input:input,

		// This should be executed to clean memory
		destroy:function(){
			src.loop = false;
			src.buffer = null;
    		src.stop(0);
			src.disconnect();
			src = null;

			if(input) input.disconnect();
			output.disconnect();
			
			for(var key in this){
				delete this[key];
			}
			output = null;
		}
	};
};
ScarletsMediaEffect.pingPongDelay = function(sourceNode){
	var context = ScarletsMedia.audioContext;
	var output = context.createGain();
	var input = sourceNode === undefined ? context.createGain() : null;
	if(input) sourceNode = input;
	var mix = 0;

	var delayNodeLeft = context.createDelay();
	var delayNodeRight = context.createDelay();
	var dryGainNode = context.createGain();
	var wetGainNode = context.createGain();
	var feedbackGainNode = context.createGain();
	var channelMerger = context.createChannelMerger(2);

	sourceNode.connect(dryGainNode);
	dryGainNode.connect(output);

	delayNodeLeft.connect(channelMerger, 0, 0);
	delayNodeRight.connect(channelMerger, 0, 1);
	delayNodeLeft.connect(delayNodeRight);

	feedbackGainNode.connect(delayNodeLeft);
	delayNodeRight.connect(feedbackGainNode);

	sourceNode.connect(feedbackGainNode);

	channelMerger.connect(wetGainNode);
	wetGainNode.connect(output);
	
	var ret = {
		// Connect to output
		// output.connect(context.destination);
		output:output,
		input:input,

		mix: function(value){ // value: 0 ~ 1
			if(value === undefined) return wetGainNode.gain.value;
			dryGainNode.gain.value = 1 - value;
			wetGainNode.gain.value = value;
		},
		time:function(value){ // value: 0 ~ 180
			if(value === undefined) return delayNodeLeft.delayTime.value;
			delayNodeLeft.delayTime.value = value;
			delayNodeRight.delayTime.value = value;
		},
		feedback:function(value){ // value: 0 ~ 1
			if(value === undefined) return feedbackGainNode.gain.value;
			feedbackGainNode.gain.value = value;
		},

		// This should be executed to clean memory
		destroy:function(){
			if(input) input.disconnect();
			output.disconnect();
			dryGainNode.disconnect();
			feedbackGainNode.disconnect();
			
			for(var key in this){
				delete this[key];
			}
			output = null;
		}
	};

	ret.mix(0.5);
	ret.time(0.3);
	ret.feedback(0.5);

	return ret;
};
ScarletsMediaEffect.pitchShift = function(sourceNode){
    var context = ScarletsMedia.audioContext;
    var output = context.createGain();
    var input = sourceNode === undefined ? context.createGain() : null;
    if(input) sourceNode = input;

    var bufferTime = 0.100;
    var fadeTime = bufferTime / 2;
    var bufferRate = bufferTime * context.sampleRate;

    // Delay amount for changing pitch.
    var modulateGain1 = context.createGain();
    var modulateGain2 = context.createGain();

    var delayNode1 = context.createDelay();
    var delayNode2 = context.createDelay();
    modulateGain1.connect(delayNode1.delayTime);
    modulateGain2.connect(delayNode2.delayTime);

    sourceNode.connect(delayNode1);
    sourceNode.connect(delayNode2);

    var fTime = context.currentTime + fadeTime;
    var bTime = context.currentTime + bufferTime;

    function createPitchBuffer(shiftUp){
        var buffer = context.createBuffer(1, bufferRate, context.sampleRate);
        var pitch = buffer.getChannelData(0);
        
        // Buffer pitch shift
        for (var i = 0; i < bufferRate; i++) {
            if(shiftUp)
              pitch[i] = (bufferRate - i) / bufferRate;
            else
              pitch[i] = i / bufferRate;
        }

        return buffer;
    }
    
    // Delay modulation.
    var bufferSource = [0,0,0,0];
    var bufferGain = [0,0,0,0];
    for (var i = 0; i < bufferSource.length; i++) {
        bufferSource[i] = context.createBufferSource();
        bufferSource[i].loop = true;

        bufferGain[i] = context.createGain();

        if(i < 2)
            bufferSource[i].buffer = createPitchBuffer(false);
        else {
            bufferSource[i].buffer = createPitchBuffer(true);
            bufferGain[i].gain.value = 0;
        }

        if(i % 2){ // Odd
            bufferGain[i].connect(modulateGain2);
	    	bufferSource[i].start(bTime);
        }
        else { // Even
            bufferGain[i].connect(modulateGain1);
	    	bufferSource[i].start(fTime);
        }

        bufferSource[i].connect(bufferGain[i]);
    }

    function createPitchFadeBuffer(){
        var buffer = context.createBuffer(1, bufferRate, context.sampleRate);
        var pitch = buffer.getChannelData(0);
            
        var fadeLength = fadeTime * context.sampleRate;
        var bufferLeft = bufferRate - fadeLength;
        
        // Buffer pitch shift
        for (var i = 0; i < bufferRate; i++) {
            if (i < fadeLength)
                pitch[i] = Math.sqrt(i / fadeLength);
            else
                pitch[i] = Math.sqrt(1 - (i - bufferLeft) / fadeLength);
        }

        return buffer;
    }

    var fadeBuffer = createPitchFadeBuffer();

    // Delay modulation.
    var fadeNode = [0,0];
    var mixNode = [0,0];
    for (var i = 0; i < fadeNode.length; i++) {
        fadeNode[i] = context.createBufferSource();
        fadeNode[i].loop = true;
        fadeNode[i].buffer = fadeBuffer;

        mixNode[i] = context.createGain();
    	mixNode[i].gain.value = 0;
        fadeNode[i].connect(mixNode[i].gain);

        if(i % 2){ // Odd
            bufferGain[i].connect(modulateGain2);
	    	fadeNode[i].start(bTime);
        }
        else { // Even
            bufferGain[i].connect(modulateGain1);
	    	fadeNode[i].start(fTime);
        }

        mixNode[i].connect(output);
    }
    
    delayNode1.connect(mixNode[0]);
    delayNode2.connect(mixNode[1]);

    function pitchGain(value){
	    modulateGain1.gain.value = 
	    modulateGain2.gain.value = 0.5 * bufferTime * Math.abs(value);
    }

    var ret = {
        // Connect to output
        // output.connect(context.destination);
        output:output,
        input:input,

        // pitchNode:[modulateGain1, modulateGain2],

        shift:function(value){ // -3 ~ 3
            if(value === undefined) return;

            var pitchUp = value > 0;
		    bufferGain[0].gain.value = 
		    bufferGain[1].gain.value = pitchUp ? 0 : 1;
		    bufferGain[2].gain.value = 
		    bufferGain[3].gain.value = pitchUp ? 1 : 0;

		    pitchGain(value);
        },

        // This should be executed to clean memory
        destroy:function(){
            if(input) input.disconnect();
            output.disconnect();

            for (var i = 0; i < fadeNode.length; i++) {
            	fadeNode[i].stop();
            	fadeNode[i].disconnect();
            	mixNode[i].disconnect();
            }

            for (var i = 0; i < bufferSource.length; i++) {
            	bufferSource[i].stop();
            	bufferSource[i].disconnect();
            	bufferGain[i].disconnect();
            }

            modulateGain1.disconnect();
			modulateGain2.disconnect();
			delayNode1.disconnect();
			delayNode2.disconnect();
            
            for(var key in this){
                delete this[key];
            }
            output = null;
        }
    };

    pitchGain(0);
    return ret;
}
ScarletsMediaEffect.reverb = function(sourceNode){
	var context = ScarletsMedia.audioContext;
	
	var output = context.createGain();
	var input = sourceNode === undefined ? context.createGain() : null;
	if(input) sourceNode = input;

	var reverbNode = context.createConvolver();
	var wetGainNode = context.createGain();
	var dryGainNode = context.createGain();
	
	sourceNode.connect(dryGainNode);
	dryGainNode.connect(output);
	wetGainNode.connect(output);

	var time = 1,
		decay = 0.1,
		reverse = false;

	function rebuildImpulse(){
		var length = context.sampleRate * time;
		var impulse = context.createBuffer(2, length, context.sampleRate);
		var impulseL = impulse.getChannelData(0);
		var impulseR = impulse.getChannelData(1);

		for (var i = 0; i < length; i++) {
			var n = reverse ? length - i : i;
			impulseL[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
			impulseR[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
		}

	    reverbNode.disconnect();

	    reverbNode = context.createConvolver();
	    sourceNode.connect(reverbNode);
	    reverbNode.connect(wetGainNode);

		reverbNode.buffer = impulse;
	}
	rebuildImpulse();

	return {
		// Connect to output
		// output.connect(context.destination);
		output:output,
		input:input,

		mix: function(value){ // value: 0 ~ 1
			if(value === undefined) return wetGainNode.gain.value;
			dryGainNode.gain.value = 1 - value;
			wetGainNode.gain.value = value;
		},

		time: function(value){ // value: 0 ~ 3
			if(value === undefined) return time;
			time = value;
			rebuildImpulse();
		},

		decay: function(value){// value: 0 ~ 3
			if(value === undefined) return decay;
			decay = value;
			rebuildImpulse();
		},

		reverse: function(value){ // value: bool
			if(value === undefined) return reverse;
			reverse = value;
			rebuildImpulse();
		},

		// This should be executed to clean memory
		destroy:function(){
			if(input) input.disconnect();
			dryGainNode.disconnect();
			output.disconnect();
			reverbNode.disconnect();
			
			for(var key in this){
				delete this[key];
			}
			output = null;
		}
	};
};
ScarletsMediaEffect.stereoPanner = function(sourceNode){
	var context = ScarletsMedia.audioContext;
	var output = context.createGain();
	var input = sourceNode === undefined ? context.createGain() : null;
	if(input) sourceNode = input;

	var stereoSupport = false;
	if(context.createStereoPanner){
		var pannerNode = context.createStereoPanner();
		stereoSupport = true;
	}
	else {
		var pannerNode = context.createPanner();
		pannerNode.type = 'equalpower';
	}

	sourceNode.connect(pannerNode);
	pannerNode.connect(output);
	pannerNode.pan.value = 0;

	return {
		// Connect to output
		// output.connect(context.destination);
		output:output,
		input:input,

		set:function(pan){ // pan: -1 ~ 1
			if(pan === undefined) return pannerNode.pan.value;
			if(stereoSupport)
				pannerNode.pan.value = pan;
			else pannerNode.setPosition(pan, 0, 1 - Math.abs(pan));
		},

		// This should be executed to clean memory
		destroy:function(){
			if(input) input.disconnect();
			output.disconnect();
			pannerNode.disconnect();
			
			for(var key in this){
				delete this[key];
			}
			output = pannerNode = null;
		}
	};
};
ScarletsMediaEffect.tremolo = function(sourceNode){
	var context = ScarletsMedia.audioContext;
	var output = context.createGain();
	var input = sourceNode === undefined ? context.createGain() : null;
	if(input) sourceNode = input;

	var dryGainNode = context.createGain();
	var wetGainNode = context.createGain();

	var tremoloGainNode = context.createGain();
	tremoloGainNode.gain.value = 0;

	var shaperNode = context.createWaveShaper();
	shaperNode.curve = new Float32Array([0, 1]);
	shaperNode.connect(tremoloGainNode.gain);

	sourceNode.connect(dryGainNode);
	dryGainNode.connect(output);

	var lfoNode = context.createOscillator();
	lfoNode.connect(shaperNode);
	lfoNode.type = 'sine';
	lfoNode.start(0);

	sourceNode.connect(tremoloGainNode);
	tremoloGainNode.connect(wetGainNode);
	wetGainNode.connect(output);

	var ret = {
		// Connect to output
		// output.connect(context.destination);
		output:output,
		input:input,

		mix: function(value){ // value: 0 ~ 1
			if(value === undefined) return wetGainNode.gain.value;
			dryGainNode.gain.value = 1 - value;
			wetGainNode.gain.value = value;
		},
		speed:function(value){
			if(value === undefined) return ScarletsMedia.extra.denormalize(lfoNode.frequency.value, 0, 20);
			lfoNode.frequency.value = ScarletsMedia.extra.normalize(value, 0, 20);
		},
		depth:function(value){
			if(value === undefined) return 1 - this.shaperNode.curve[0];
			shaperNode.curve = new Float32Array([1 - value, 1]);
		},

		// This should be executed to clean memory
		destroy:function(){
			if(input) input.disconnect();
			output.disconnect();
			dryGainNode.disconnect();
			tremoloGainNode.disconnect();
			
			for(var key in this){
				delete this[key];
			}
			output = null;
		}
	};

	ret.speed(0.2);
	ret.depth(1);
	ret.mix(0.8);

	return ret;
};
ScarletsMediaEffect.vibrato = function(sourceNode){
	var context = ScarletsMedia.audioContext;
	var output = context.createGain();
	var input = sourceNode === undefined ? context.createGain() : null;
	if(input) sourceNode = input;

	console.log("Vibrato was not finished yet");

    var delayNode = context.createDelay();
	var wetGainNode = context.createGain();
	var dryGainNode = context.createGain();
    var lfoNode = context.createOscillator();
    //var depthNode = context.createGain();

	sourceNode.connect(dryGainNode);
	dryGainNode.connect(output);
	wetGainNode.connect(output);

    delayNode.delayTime.value = 1;
    //depthNode.gain.value = 1;
    lfoNode.frequency.value = 3;
    lfoNode.type = 'sine';
    lfoNode.start(0);

    lfoNode.connect(delayNode.delayTime);
    //depthNode.connect(delayNode.delayTime);
    sourceNode.connect(delayNode);
    delayNode.connect(wetGainNode);

	return {
		// Connect to output
		// output.connect(context.destination);
		output:output,
		input:input,
		
		mix:function(value){ // value: 0 ~ 1
			if(value === undefined) return wetGainNode.gain.value;
			dryGainNode.gain.value = 1 - value;
			wetGainNode.gain.value = value;
		},
		
		delay:function(value){
			if(value === undefined) return delayNode.delayTime.value;
			delayNode.delayTime.value = value;
		},
		
		depth:function(value){
			if(value === undefined) return depthNode.gain.value;
			depthNode.gain.value = value;
		},
		
		speed:function(value){
			if(value === undefined) return lfoNode.frequency.value;
			lfoNode.frequency.value = value;
		},

		// This should be executed to clean memory
		destroy:function(){
			if(input) input.disconnect();
			output.disconnect();

    		sourceNode.disconnect(delayNode);
    		sourceNode.disconnect(dryGainNode);

			lfoNode.stop();
			lfoNode.disconnect();
			depthNode.disconnect();
			
			for(var key in this){
				delete this[key];
			}
			output = null;
		}
	};
};
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
ScarletsMedia.extra = new function(){
	var self = this;
	self.isMobile = function(){
	    return /iPhone|iPad|iPod|Android|BlackBerry|BB10|Silk|Mobi/i.test(navigator.userAgent);
	}

	self.objectPropertyLinker = function(self, target, property){
		Object.defineProperty(self, property, {
		  get: function(){ return target[property]; },
		  set: function(value){ target[property] = value; },
		  enumerable: true,
		  configurable: true
		});
	}

	self.normalize = function(value, min, max){
		return ((max - min) * value) + min;
	}

	self.denormalize = function(value, min, max){
		return (value - min) / (max - min);
	}

	var maxFade = 0;
	self.fadeNumber = function(from, to, increment, fadeTime, onIncrease, onFinish){
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

	// ===== Precise Timer =====
	// 
	var timeout = [];
	var timeoutIncrement = 0;
	self.preciseTimeout = function(func, miliseconds){
		var now = Date.now();
		timeoutIncrement++;
		timeout.push({
			id:timeoutIncrement,
			when:now+miliseconds,
			func:func,

			// When browser loss focus
			fallback:setTimeout(function(){
				clearPreciseTimer(timeoutIncrement).func();
			}, miliseconds)
		});
		startPreciseTime();
		return timeoutIncrement;
	}
	self.clearPreciseTimeout = function(id){
		clearPreciseTimer(id, timeout);
	}

	var interval = [];
	var intervalIncrement = 0;
	self.preciseInterval = function(func, miliseconds){
		var now = Date.now();
		intervalIncrement++;
		var temp = {
			id:intervalIncrement,
			interval:miliseconds,
			when:now+miliseconds,
			func:func
		};

		// When browser loss focus
		temp.fallback = setInterval(function(){
			if(temp.when >= Date.now())
				return; // Avoid multiple call

			temp.when += temp.interval;
			temp.func();
		}, miliseconds);

		interval.push(temp);
		startPreciseTime();
		return intervalIncrement;
	}
	self.clearPreciseInterval = function(id){
		var temp = clearPreciseTimer(id, interval);
		clearInterval(temp.fallback);
	}

	function clearPreciseTimer(id, list){
		for (var i in list) {
			if(list[i].id === id)
				return list.splice(i, 1);
		}
	}

	var preciseTimerStarted = false;
	function startPreciseTime(){
		if(preciseTimerStarted) return;
		preciseTimerStarted = true;

		var preciseTimer = function(){
			if(timeout.length === 0 && interval.length === 0){
				preciseTimerStarted = false;
				return;
			}

			requestAnimationFrame(preciseTimer);
			
			var currentTime = Date.now();
			for (var i in timeout) {
				if(timeout[i].when < currentTime){
					timeout[i].func();
					clearTimeout(timeout[i].fallback);
					timeout.splice(i, 1);
				}
			}

			for (var i in interval) {
				if(interval[i].when < currentTime){
					interval[i].func();
					interval[i].when += interval[i].interval;
				}
			}
		};
		requestAnimationFrame(preciseTimer);
	}
};

if(moduleMode){
	global.Media = ScarletsMedia;
	global.MediaEffect = ScarletsMediaEffect;
	global.AudioStreamer = ScarletsAudioStreamer;
	global.VideoStreamer = ScarletsVideoStreamer;
	global.MediaPlayer = ScarletsMediaPlayer;
	global.MediaPresenter = ScarletsMediaPresenter;
}
else{
	global.ScarletsMedia = ScarletsMedia;
	global.ScarletsMediaEffect = ScarletsMediaEffect;
	global.ScarletsAudioStreamer = ScarletsAudioStreamer;
	global.ScarletsVideoStreamer = ScarletsVideoStreamer;
	global.ScarletsMediaPlayer = ScarletsMediaPlayer;
	global.ScarletsMediaPresenter = ScarletsMediaPresenter;
}

// ===== Module End =====
})));