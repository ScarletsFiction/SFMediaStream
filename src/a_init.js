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