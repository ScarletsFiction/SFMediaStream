/*
	ScarletsFiction MediaStream Library

	HTML5 media streamer library for playing music, video, playlist,
	or even live streaming microphone & camera with node server
	https://github.com/ScarletsFiction/SFMediaStream
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

var waitingUnlock = [];
var userInteracted = false;

// Unlock mobile media security
(function(){
	const AudioContext = window.AudioContext || window.webkitAudioContext;
	if(!AudioContext) return console.error("`AudioContext` was not available");	
	ScarletsMedia.audioContext = new AudioContext();

	var mobileMediaUnlock = function(e){
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

		for (var i = 0; i < waitingUnlock.length; i++) {
			waitingUnlock[i]();
		}

		waitingUnlock.length = 0;
	}

	document.addEventListener('touchstart', mobileMediaUnlock, true);
	document.addEventListener('touchend', mobileMediaUnlock, true);
	document.addEventListener('click', mobileMediaUnlock, true);
})();