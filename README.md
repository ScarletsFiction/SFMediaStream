<a href="https://www.patreon.com/stefansarya"><img src="http://anisics.stream/assets/img/support-badge.png" height="20"></a>

[![Written by](https://img.shields.io/badge/Written%20by-ScarletsFiction-%231e87ff.svg)](LICENSE)
[![Software License](https://img.shields.io/badge/License-MIT-brightgreen.svg)](LICENSE)
[![Tweet](https://img.shields.io/twitter/url/http/shields.io.svg?style=social)](https://twitter.com/intent/tweet?text=SFMediaStream%20is%20alibrary%20for%20playing%20media%20or%20stream%20microphone.&url=https://github.com/ScarletsFiction/SFMediaStream&via=github&hashtags=SFMediaStream,video,audio,playlist,stream,microphone)

# SFMediaStream
A HTML5 media streamer library for playing music, video, or even microphone & camera live streaming with node server

## How to use
### ScarletsMediaPresenter
This class is used for streaming local media like camera or microphone to the server.

#### Properties
###### debug
Set to true for outputting any message to browser console

###### mediaRecorder
Return current `mediaRecorder` that being used

###### recordingReady
Return true if the recording was ready

###### recording
Return true if currently recording

###### options.mimeType
Return mimeType that being used

```js
// Example for accessing the properties
presenterMedia.debug = true;
```

#### Method
###### startRecording
Start recording camera or microphone
```js
presenterMedia.startRecording();
```

###### stopRecording
Stop recording camera or microphone
```js
presenterMedia.stopRecording();
```

#### Event Listener
###### onRecordingReady
Callback when the library is ready for recording
```js
presenterMedia.onRecordingReady = function(arrayBuffer){
    console.log("Header size: " + arrayBuffer.byteLength);
};
```
###### onBufferProcess
Callback when data buffer is ready to be played
```js
presenterMedia.onBufferProcess = function(streamData){
    console.log("Data", streamData);
};
```

#### Example
```js
var presenterMedia = new ScarletsMediaPresenter({
    audio:{
        channelCount:1,
        echoCancellation: false
    }
}, 1000);

presenterMedia.onRecordingReady = function(arrayBuffer){
    console.log("Recording started!");
    console.log("Header size: " + arrayBuffer.byteLength);

    // Every new client streamer must receive this header buffer data
    mySocket.emit('bufferHeader', {
        data:arrayBuffer,
        mimeType:presenterMedia.options.mimeType
    });
}

presenterMedia.onBufferProcess = function(streamData){
    mySocket.emit('stream', {
        data:streamData
    });
}

presenterMedia.startRecording();
presenterMedia.stopRecording();
```

### ScarletsAudioBufferStreamer
This class is used for buffering and playing microphone stream from the server.

```js
var audioStreamer = new ScarletsAudioBufferStreamer(bufferStorage, chunksDurationInMicroSecond);
```

#### Properties
###### debug
Set to true for outputting any message to browser console

###### currentBuffer
Return index of Selected buffer that will be played

###### playing
Return true if playing a stream

###### buffering
Return true if playing a buffer

###### streaming
Return true when streaming

###### currentDuration
Return current duration in seconds

###### latency
Return current latency

###### realtime
Set to true if you want to instanly play received buffer

###### bufferSkip
Set this if you want to skip some seconds

###### mimeType
Return mimeType of current streamed media

###### webAudio
Set to false for using HTML5 media element

###### audioContext
Return `audioContext` that being used

```js
// Example for accessing the properties
audioStreamer.debug = true;
```

#### Method
###### playStream
Set this library to automatically play any received buffer
```js
presenterMedia.playStream();
```

###### receiveBuffer
Receive arrayBuffer and play it when ready
```js
presenterMedia.receiveBuffer(arrayBuffer);
```

###### playBuffer(index)
Play pending buffer
```js
// presenterMedia.bufferPending[0]
presenterMedia.playBuffer(0);
```

###### playAvailable
Play available pending buffer
```js
presenterMedia.playAvailable();
```

###### stop
Stop playing any buffer
```js
presenterMedia.stop();
```

#### Example
```js
var audioStreamer = new ScarletsAudioBufferStreamer(3, 1000);
audioStreamer.playStream();

mySocket.on('stream', function(packet){
    audioStreamer.realtimeBufferPlay(packet.data);
});
mySocket.on('bufferHeader', function(packet){
    audioStreamer.setBufferHeader(packet.data);
});
```

### ScarletsMediaPlayer
This class is used for playing video or audio from url.

```js
var mediaPlayer = new ScarletsMediaPlayer(document.querySelector('audio'));
```

#### Properties
###### autoplay
Sets or returns whether the audio/video should start playing as soon as it is loaded

###### preload
Sets or returns whether the audio/video should be loaded when the page loads

###### loop
Sets or returns whether the audio/video should start over again when finished

###### buffered
Returns a TimeRanges object representing the buffered parts of the audio/video

###### preload
Sets or returns whether the audio/video should be loaded when the page loads ("none", "metadata", "auto")

###### buffered
Returns a TimeRanges object representing the buffered parts of the audio/video

###### controller
Returns the MediaController object representing the current media controller of the audio/video

###### currentTime
Sets or returns the current playback position in the audio/video (in seconds)

###### currentSrc
Returns the URL of the current audio/video

###### duration
Returns the length of the current audio/video (in seconds)

###### ended
Returns whether the playback of the audio/video has ended or not

###### error
Returns a MediaError object representing the error state of the audio/video

###### readyState
Returns the current ready state of the audio/video

###### networkState
Returns the current network state of the audio/video

###### paused
Returns whether the audio/video is paused or not

###### played
Returns a TimeRanges object representing the played parts of the audio/video

###### seekable
Returns a TimeRanges object representing the seekable parts of the audio/video

###### seeking
Returns whether the user is currently seeking in the audio/video

```js
// Example for accessing the properties
mediaPlayer.preload = "metadata";
```

#### Method
###### load
Re-loads the audio/video element
```js
mediaPlayer.load();
```

###### canPlayType
Checks if the browser can play the specified audio/video type
```js
// https://www.w3schools.com/tags/av_met_canplaytype.asp
mediaPlayer.canPlayType();
```

###### speed
Sets or returns the speed of the audio/video playback
```js
mediaPlayer.speed(0.5);
```

###### mute
Sets or returns whether the audio/video is muted or not
```js
mediaPlayer.mute(true);
```

###### volume
Sets or returns the volume of the audio/video
```js
mediaPlayer.volume(0.8);
```

###### play
Starts playing the audio/video
```js
mediaPlayer.play();
```

###### pause
Pauses the currently playing audio/video
```js
mediaPlayer.pause();
```

###### prepare
Load media from URL
```js
mediaPlayer.prepare('my.mp3' || ['my.mp3', 'fallback.ogg'], function(){
    mediaPlayer.play();
});
```

###### on
Register event callback
```js
mediaPlayer.on('loadedmetadata', function(e){
    // See at the property above
    console.log(e.target.duration);
});
```

###### off
Un-register event callback
```js
mediaPlayer.off('abort');
```

###### once
Register event callback and remove listener after called
```js
mediaPlayer.once('abort', function(e){
    alert('User aborted the buffer');
});
```

#### Available Events
| Event  | Details |
| --- | --- |
| abort | Fires when the loading of an audio/video is aborted |
| canplay | Fires when the browser can start playing the audio/video |
| canplaythrough | Fires when the browser can play through the audio/video without stopping for buffering |
| durationchange | Fires when the duration of the audio/video is changed |
| emptied | Fires when the current playlist is empty |
| ended | Fires when the current playlist is ended |
| error | Fires when an error occurred during the loading of an audio/video |
| loadeddata | Fires when the browser has loaded the current frame of the audio/video |
| loadedmetadata | Fires when the browser has loaded meta data for the audio/video |
| loadstart | Fires when the browser starts looking for the audio/video |
| pause | Fires when the audio/video has been paused |
| play | Fires when the audio/video has been started or is no longer paused |
| playing | Fires when the audio/video is playing after having been paused or stopped for buffering |
| progress | Fires when the browser is downloading the audio/video |
| ratechange | Fires when the playing speed of the audio/video is changed |
| seeked | Fires when the user is finished moving/skipping to a new position in the audio/video |
| seeking | Fires when the user starts moving/skipping to a new position in the audio/video |
| stalled | Fires when the browser is trying to get media data, but data is not available |
| suspend | Fires when the browser is intentionally not getting media data |
| timeupdate | Fires when the current playback position has changed |
| volumechange | Fires when the volume has been changed |
| waiting | Fires when the video stops because it needs to buffer the next frame |

#### Video Properties
###### poster
Specifies an image to be shown while the video is downloading, or until the user hits the play button

###### height
Sets the height of the video player

###### width
Sets the width of the video player

```js
// Example for accessing the properties
mediaPlayer.poster = 'url.png';
```

#### Audio Properties
###### audioFadeEffect
```js
mediaPlayer.audioFadeEffect = true;
```

#### Playlist
This will be available on current media player

##### Properties
###### currentIndex
Return index of current playing media

###### list
Return array playlist that are being used

###### original
Return original array playlist

###### loop
Set this to true if you want to play this playlist again from beginning

###### shuffled
Return true if the list was shuffled

```js
// Example for accessing the properties
console.log('Current playlist count', mediaPlayer.playlist.original.length);
```

##### Method
###### reload
Replace old playlist data
```js
mediaPlayer.playlist.reload([{
    mp3:'main.mp3',
    ogg:'fallback.ogg',
    ...
}, ...]);
```

###### add
Add new data to playlist
```js
mediaPlayer.playlist.add({mp3:'main.mp3', ogg:'fallback.ogg'});
```

###### remove
Remove original playlist data by index
```js
// mediaPlayer.playlist.original[0]
mediaPlayer.playlist.remove(0);
```

###### next
Play next music
```js
mediaPlayer.playlist.next();
```

###### previous
Play previous music
```js
mediaPlayer.playlist.previous();
```

###### play
Play music by index
```js
// mediaPlayer.playlist.list[0]
mediaPlayer.playlist.play(0);
```

###### shuffle
Shuffle the playlist
```js
// mediaPlayer.playlist.list
mediaPlayer.playlist.shuffle(true || false);
```


## Contribution
If you want to help in SFMediaStream please fork this project and edit on your repository, then make a pull request to here. Otherwise, you can help with donation via [patreon](https://www.patreon.com/stefansarya).

Keep the code simple and clear.

## License
SFMediaStream is under the MIT license.

But don't forget to put the a link to this repository.
