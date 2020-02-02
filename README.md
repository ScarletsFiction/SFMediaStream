<a href='https://patreon.com/stefansarya'><img src='https://img.shields.io/endpoint.svg?url=https%3A%2F%2Fshieldsio-patreon.herokuapp.com%2Fstefansarya%2Fpledges&style=for-the-badge' height='20'></a>

[![Written by](https://img.shields.io/badge/Written%20by-ScarletsFiction-%231e87ff.svg)](LICENSE)
[![Software License](https://img.shields.io/badge/License-MIT-brightgreen.svg)](LICENSE)
[![Tweet](https://img.shields.io/twitter/url/http/shields.io.svg?style=social)](https://twitter.com/intent/tweet?text=SFMediaStream%20is%20alibrary%20for%20playing%20media%20or%20stream%20microphone.&url=https://github.com/ScarletsFiction/SFMediaStream&via=github&hashtags=SFMediaStream,video,audio,playlist,stream,microphone)

# SFMediaStream
A HTML5 media streamer library for playing music, video, or even microphone & camera live streaming with node server. The transmitted data is compressed (depend on the browser media encoder) before being sent to node server, and the latency is configurable.

The default configuration is intended for newer browser. If you want to build 2-way communication for older and newer browser, then you must send streamer encoding information to the presenter before start the communication or using mp4 instead of opus.

## Install with CDN link
You can download minified js from this repository or use this CDN link
`<script type="text/javascript" src='https://unpkg.com/sfmediastream@latest/dist/SFMediaStream.min.js'></script>`

And include it on your project
```js
var presenter = new ScarletsMediaPresenter(...);
var streamer = new ScarletsAudioStreamer(...);
```

#### Install with NPM
`npm i sfmediastream`

And include it on your project
```js
const {MediaPresenter, AudioStreamer, ...} = require('sfmediastream');
var presenter = new MediaPresenter(...);
var streamer = new AudioStreamer(...);
```

## How to use
### ScarletsMediaPresenter
This class is used for streaming local media like camera or microphone to the server.

#### Properties
| Property  | Details |
| --- | --- |
| debug | Set to true for outputting any message to browser console |
| mediaRecorder | Return current `mediaRecorder` that being used |
| mediaStream | Return current `mediaStream` that being used |
| mediaGranted | Return true if user granted the recorder |
| recordingReady | Return true if the recording was ready |
| recording | Return true if currently recording |
| options.mimeType | Return mimeType that being used |

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
presenterMedia.onRecordingReady = function(packet){
    console.log("Header size: " + packet.data.size);
    mySocket.emit('bufferHeader', packet);
};
```
###### onBufferProcess
Callback when data buffer is ready to be played
```js
presenterMedia.onBufferProcess = function(packet){
    console.log("Data", packet);
    mySocket.emit('stream', packet);
};
```

#### Example
```js
var presenterMedia = new ScarletsMediaPresenter({
    audio:{
        channelCount:1,
        echoCancellation: false
    },/* video:{
        frameRate:15,
        width: 1280,
        height: 720,
        facingMode: (frontCamera ? "user" : "environment")
    } */
}, 1000); // 1sec

presenterMedia.onRecordingReady = function(packet){
    console.log("Recording started!");
    console.log("Header size: " + packet.data.size + "bytes");

    // Every new streamer must receive this header packet
    mySocket.emit('bufferHeader', packet);
}

presenterMedia.onBufferProcess = function(packet){
    console.log("Buffer sent: " + packet[0].size + "bytes");
    mySocket.emit('stream', packet);
}

presenterMedia.startRecording();
presenterMedia.stopRecording();
```

### ScarletsAudioStreamer
This class is used for buffering and playing microphone stream from the server.

```js
// The minimum duration for audio is ~100ms
var audioStreamer = new ScarletsAudioStreamer(1000); // 1sec
```

#### Properties
| Property  | Details |
| --- | --- |
| debug | Set to true for outputting any message to browser console |
| playing | Return true if playing a stream |
| latency | Return current latency |
| mimeType | Return mimeType of current streamed media |
| outputNode | Will be available when using `.connect(AudioNode)` |

```js
// Example for accessing the properties
audioStreamer.debug = true;
```

#### Method
###### playStream
Set this library to automatically play any received buffer
```js
audioStreamer.playStream();
```

###### receiveBuffer
Receive arrayBuffer and play it when last buffer finished playing
```js
audioStreamer.receiveBuffer(arrayBuffer);
```

###### realtimeBufferPlay
Receive arrayBuffer and immediately play it
```js
audioStreamer.realtimeBufferPlay(arrayBuffer);
```

###### stop
Stop playing any buffer
```js
audioStreamer.stop();
```

###### connect
Connect the streamer to other AudioNode and disable direct output
```js
audioStreamer.connect(AudioNode);
```

###### disconnect
Disconnect the streamer from any AudioNode and enable direct output
```js
audioStreamer.disconnect();
```

### ScarletsVideoStreamer
This class is used for buffering and playing microphone & camera stream from the server.

```js
// Usually the minimum duration for video is 1000ms
var videoStreamer = new ScarletsVideoStreamer(videoHTML, 1000); // 1sec
```

#### Properties
| Property  | Details |
| --- | --- |
| debug | Set to true for outputting any message to browser console |
| playing | Return true if playing a stream |
| latency | Return current latency |
| mimeType | Return mimeType of current streamed media |
| outputNode | Will be available when using `.connect(AudioNode)` |

```js
// Example for accessing the properties
videoStreamer.debug = true;
```

#### Method
###### playStream
Set this library to automatically play any received buffer
```js
videoStreamer.playStream();
```

###### receiveBuffer
Receive arrayBuffer and play it when last buffer finished playing
```js
videoStreamer.receiveBuffer(arrayBuffer);
```

###### stop
Stop playing any buffer
```js
videoStreamer.stop();
```

###### audioConnect
Connect the streamer to other AudioNode and disable direct output
```js
videoStreamer.audioConnect(AudioNode);
```

###### audioDisconnect
Disconnect the streamer from any AudioNode and enable direct output
```js
videoStreamer.audioDisconnect();
```

#### Example
```js
var videoStreamer = new ScarletsVideoStreamer(1000); // 1sec
videoStreamer.playStream();

// First thing that must be received
mySocket.on('bufferHeader', function(packet){
    videoStreamer.setBufferHeader(packet);
});

mySocket.on('stream', function(packet){
    console.log("Buffer received: " + packet[0].byteLength + "bytes");
    videoStreamer.receiveBuffer(packet);
});

// Add an effect
var ppDelay = ScarletsMediaEffect.pingPongDelay();

// Stream (source) -> Ping pong delay -> destination
videoStreamer.audioConnect(ppDelay.input);
ppDelay.output.connect(ScarletsMedia.audioContext.destination);
```

### ScarletsMediaPlayer
This class is used for playing video or audio from url.

```js
var mediaPlayer = new ScarletsMediaPlayer(document.querySelector('audio'));
```

#### Properties
| Property  | Details |
| --- | --- |
| autoplay | Sets or returns whether the audio/video should start playing as soon as it is loaded |
| preload | Sets or returns whether the audio/video should be loaded when the page loads |
| loop | Sets or returns whether the audio/video should start over again when finished |
| buffered | Returns a TimeRanges object representing the buffered parts of the audio/video |
| preload | Sets or returns whether the audio/video should be loaded when the page loads ("none", "metadata", "auto") |
| controller | Returns the MediaController object representing the current media controller of the audio/video |
| currentTime | Sets or returns the current playback position in the audio/video (in seconds) |
| currentSrc | Returns the URL of the current audio/video |
| duration | Returns the length of the current audio/video (in seconds) |
| ended | Returns whether the playback of the audio/video has ended or not |
| error | Returns a MediaError object representing the error state of the audio/video |
| readyState | Returns the current ready state of the audio/video |
| networkState | Returns the current network state of the audio/video |
| paused | Returns whether the audio/video is paused or not |
| played | Returns a TimeRanges object representing the played parts of the audio/video |
| seekable | Returns a TimeRanges object representing the seekable parts of the audio/video |
| seeking | Returns whether the user is currently seeking in the audio/video |
| audioOutput | Return `audioContext` from media source |
| videoOutput | Return `videoContext` from media source |
The videoContext still in [experimental mode](https://github.com/bbc/VideoContext) and haven't been implemented.

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
| emptied | Fires when the current player is empty |
| ended | Fires when the current player is ended |
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
| playlistchange | Fires when the player starts another playlist |

`playlistchange` the callback function will get `(player, playlist, index)` as the arguments.

#### Video Properties
| Property  | Details |
| --- | --- |
| poster | Specifies an image to be shown while the video is downloading, or until the user hits the play button |
| height | Sets the height of the video player |
| width | Sets the width of the video player |

```js
// Example for accessing the properties
mediaPlayer.poster = 'url.png';
```

#### Properties
###### audioFadeEffect
Enable fade effect when playing or pausing the sound
```js
mediaPlayer.audioFadeEffect = true;
```

###### audioOutput
Can be used to connect the media to other effect or plugin like equalizer
```js
// Create equalizer and pass audio output as equalizer input
var equalizer = ScarletsMediaEffect.equalizer(null, mediaPlayer.audioOutput);

// Connect to final destination
equalizer.output.connect(ScarletsMedia.audioContext.destination);
```

#### ScarletsMediaEffect
This feature can be used on every media if you have the media source node as the input. And make sure every node is connected to `AudioContext.destination` or it will not playable.

The plugins have a function to destroy node connection that aren't being used. So don't forget to destroy your unused effect to clean unused memory.
```js
effect.destroy();
```

##### Available Plugin
| Effect  | Details |
| --- | --- |
| Chorus | An effect to make a single voice like multiple voices |
| ConReverb | An reverb effect that simulates from other audio source |
| CutOff | An cutoff filter that have adjustable width |
| Delay | An effect that play the audio back after a period of time |
| Distortion | It's.. like.. distortion.. |
| DubDelay | Delay with feedback saturation and time/pitch modulation |
| Equalizer | Adjustable frequency pass filter |
| Fade | Volume fade in and fade out effect |
| Flanger | An audio effect by mixing two identical signals together with one signal who get delayed |
| Harmonizer | An pitch shift effect which like playing an harmony |
| Noise | Noise generator like a radio |
| PingPongDelay | Stereo delay effect that alternates each delay between the left and right channels |
| Reverb | Configurable reflection effect |
| StereoPanner | Can be used to pan an audio stream left or right |
| Tremolo | Modulation effect that creates a change in volume |

```js
// Directly connect audio output as an input for ping pong delay plugin
var ppDelay = ScarletsMediaEffect.pingPongDelay(mediaPlayer.audioOutput);

// Create StereoPanner handler
var panner = ScarletsMediaEffect.stereoPanner(/* input [optional] */);
// panner.input (will be available if no input passed on plugin)

// Connect ppDelay output to panner input
ppDelay.output.connect(panner.input);

// Modify the plugin (Still need to be documented)
panner.set(-1); // Left channel

// Connect to final destination
panner.connect(ScarletsMedia.audioContext.destination);

// Visualization
// player.audioOutput -> pingPongDelay -> Panner -> final destination
```

#### Playlist
This will be available on current media player

##### Properties
| Property  | Details |
| --- | --- |
| currentIndex | Return index of current playing media |
| list | Return array playlist that are being used |
| original | Return original array playlist |
| loop | Set this to true if you want to play this playlist again from beginning |
| shuffled | Return true if the list was shuffled |

```js
// Example for accessing the properties
console.log('Current playlist count', mediaPlayer.playlist.original.length);
```

##### Method
###### reload
Replace old playlist data
```js
mediaPlayer.playlist.reload([{
    yourProperty:'',
    stream:['main.mp3', 'fallback.ogg']
}, ...]);
```

###### add
Add new data to playlist
```js
mediaPlayer.playlist.add({
    yourProperty:'',
    stream:['main.mp3', 'fallback.ogg']
});
```

###### remove
Remove original playlist data by index
```js
// mediaPlayer.playlist.original[0]
mediaPlayer.playlist.remove(0);
```

###### next
Play next music, this will also trigger `playlistchange` event
```js
mediaPlayer.playlist.next();
```

###### previous
Play previous music, this will also trigger `playlistchange` event
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

### Compile from source
After you downloaded this repo you need to install some devDependencies.
```sh
$ npm i
$ gulp watch
```

After you make some changes on `/src` it will automatically compile into `/dist/SFMediaStream.js`. Make sure you cleared your cache when doing some experiment.

## License
SFMediaStream is under the MIT license.

But don't forget to put the a link to this repository.
