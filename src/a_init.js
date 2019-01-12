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