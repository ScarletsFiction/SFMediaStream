// https://www.w3schools.com/tags/ref_av_dom.asp
// https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement

var stillWaiting = false;
function interactedPlay(element, successCallback, errorCallback){
	element.play().then(function(){
		stillWaiting = false;
		if(successCallback) successCallback();
	}).catch(function(e){
		if(errorCallback) errorCallback(e);
		else{
			// If user haven't interacted with the page
			// and media play was requested, let's pending it
			if(userInteracted === false){
				if(stillWaiting === false){
					waitingUnlock.push(function(){
						interactedPlay(element, successCallback, errorCallback);
					});
				}
				return;
			}

			console.error(e);
		}
	});
}

class ScarletsMediaPlayer{
	element = null;
	type = '';
	preload = true;
	audioFadeEffect = true;
	videoNode = null;
	audioNode = null;
	events = {};

	constructor(element, options){
		if(element && element.constructor === Object){
			options = element;
			element = void 0;
		}

		// https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Media_events
		if(element === void 0)
			element = 'audio';

		if(element.constructor === String){
			if(element !== 'audio' && element !== 'video')
				return console.error('Supported player is "audio" or "video"');

			this.type = element;

			element = document.createElement(element);
			document.body.appendChild(element);
		}
		else this.type = element.tagName.toLowerCase();

		this.element = element;
		element.MediaPlayer = this;

		element.preload = 'metadata';
		element.crossorigin = 'anonymous';

		this.playlist = new Playlist(this, this.events);

		if(options && options.fadeEffect){
			if(options.fadeEffect === 'experimental'){
				this.audioNode = ScarletsMedia.getElementAudioNode(this.element);
				this.audioFadeEffect = ScarletsMediaEffect.fade(this.audioNode);
				this.audioFadeEffect.output.connect(ScarletsMedia.audioContext.destination);
			}
		}
	}

	load(){
		this.element.load();
	}

	canPlayType(){
		this.element.canPlayType();
	}

	get speed(){return this.element.defaultPlaybackRate}
	set speed(val){this.element.defaultPlaybackRate = this.element.playbackRate = val}

	get mute(){return this.element.muted}
	set mute(val){this.element.defaultMuted = this.element.muted = val}

	#volume = 1; // Dont delete this, used for volume fade in out
	get volume(){return this.#volume}
	set volume(val){this.element.volume = this.#volume = val}

	_eventTrigger(e){
		var self = this;
		if(self.MediaPlayer !== void 0)
			self = self.MediaPlayer;

		for (var i = 0; i < self.events[e.type].length; i++)
			self.events[e.type][i](e, self);
	}

	// https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Media_events
	on(name, callback){
		if(this.events[name] === void 0){
			this.element.addEventListener(name, this._eventTrigger, true);
			this.events[name] = [];
		}

		this.events[name].push(callback);
		return this;
	}

	off(name, callback){
		if(this.events[name] === void 0){
			this.element.removeEventListener(name, callback, true);
			return;
		}

		if(!callback)
			this.events[name].splice(0);
		else
			this.events[name].splice(this.events[name].indexOf(callback), 1);

		if(this.events[name].length === 0){
			this.events[name] = void 0;
			this.element.removeEventListener(name, this._eventTrigger, true);
		}
		return this;
	}

	once(name, callback){
		this.element.addEventListener(name, callback, {once:true});
		return this;
	}

	destroy(){
		for(var key in this.events)
			this.off(key);

		this.playlist.list.splice(0);
		this.playlist.original.splice(0);

		element.pause();
		element.innerHTML = '';
	}

	play(successCallback, errorCallback){
		if(!this.element.paused){
			if(successCallback) successCallback();
			return;
		}

		if(!this.element.currentSrc)
			return console.error("There's nothing to play, have you called .prepare('link') function?");

		if(this.audioFadeEffect){
			var that = this;

			if(this.audioFadeEffect !== true)
				this.audioFadeEffect.out(1, 400, successCallback);
			else ScarletsMedia.extra.fadeNumber(0, this.#volume, 0.02, 400, function(num){
				that.element.volume = num;
			}, successCallback);

			interactedPlay(this.element, successCallback, errorCallback);

			return;
		}

		interactedPlay(this.element, successCallback, errorCallback);
	}

	pause(callback){
		if(this.element.paused){
			if(callback) callback();
			return;
		}

		if(this.audioFadeEffect){
			var that = this;
			if(this.audioFadeEffect !== true)
				this.audioFadeEffect.out(0, 400, function(){
					this.element.pause();
					if(callback) callback();
				});
			else ScarletsMedia.extra.fadeNumber(this.#volume, 0, -0.02, 400, function(num){
				that.element.volume = num;
			}, function(){
				that.element.pause();
				if(callback) callback();
			});
			return;
		}

		this.element.pause();
		if(callback) callback();
	}

	prepare(links, callback, force){
		// Stop playing media
		if(!force && !this.element.paused){
			var that = this;
			return this.pause(function(){
				that.prepare(links, callback, true);
			});
		}

		var temp = this.element.querySelectorAll('source');
		for (var i = temp.length - 1; i >= 0; i--)
			temp[i].remove();

		if(this.preload && callback){
			var that = this;
			this.once('canplay', callback);
			this.once('error', function(){
				that.off('canplay', callback);
			});
		}

		if(typeof links === 'string')
			this.element.insertAdjacentHTML('beforeend', `<source src="${links.split('"').join('\\"')}"/>`);
		else{
			temp = '';
			for (var i = 0; i < links.length; i++)
				temp += `<source src="${links[i].split('"').join('\\"')}"/>`;

			this.element.insertAdjacentHTML('beforeend', temp);
		}

		// Preload data
		if(this.preload)
			this.element.load();

		else if(callback)
			callback();
	}

	get seek(){return this.currentTime / this.duration}
	set seek(pos){this.currentTime = this.duration * pos}

	get videoOutput(){
		if(this.type !== 'video')
			return console.error("Can be used for video player");

		if(!this.videoNode)
			this.videoNode = ScarletsMedia.getElementVideoNode(this.element);

		return this.videoNode;
	}

	get audioOutput(){
		if(this.type !== 'audio')
			return console.error("Can be used for audio player");

		if(!this.audioNode)
			this.audioNode = ScarletsMedia.getElementAudioNode(this.element);

		return this.audioNode;
	}

	get autoplay(){return this.element.autoplay}
	set autoplay(val){this.element.autoplay = val}
	get loop(){return this.element.loop}
	set loop(val){this.element.loop = val}
	get buffered(){return this.element.buffered}
	get controller(){return this.element.controller}
	set controller(val){this.element.controller = val}
	get currentTime(){return this.element.currentTime}
	set currentTime(val){this.element.currentTime = val}
	get currentSrc(){return this.element.currentSrc}
	set currentSrc(val){this.element.currentSrc = val}
	get duration(){return this.element.duration}
	set duration(val){this.element.duration = val}
	get ended(){return this.element.ended}
	set ended(val){this.element.ended = val}
	get error(){return this.element.error}
	get readyState(){return this.element.readyState}
	get networkState(){return this.element.networkState}
	get paused(){return this.element.paused}
	set paused(val){this.element.paused = val}
	get played(){return this.element.played}
	set played(val){this.element.played = val}
	get seekable(){return this.element.seekable}
	set seekable(val){this.element.seekable = val}
	get seeking(){return this.element.seeking}
	set seeking(val){this.element.seeking = val}
	get poster(){return this.element.poster}
	set poster(val){this.element.poster = val}
	get height(){return this.element.height}
	set height(val){this.element.height = val}
	get width(){return this.element.width}
	set width(val){this.element.width = val}
}

class Playlist{
	currentIndex = 0;
	list = [];
	original = [];
	loop = false;
	shuffled = false;
	#player = null;

	constructor(player){
		this.#player = player;
	}

	#playlistInitialized = false;
	_internalPlaylistEvent(){
		if(this.#playlistInitialized) return;
		this.#playlistInitialized = true;

		var that = this;
		this.#player.on('ended', function(){
			if(that.currentIndex < that.list.length - 1)
				that.next();
			else if(that.loop)
				that.play(0);
		});
	}

	_playlistTriggerEvent(name){
		var player = this.#player;
		if(!player.events[name]) return;

		for (var i = 0; i < player.events[name].length; i++)
			player.events[name][i](player, this, this.currentIndex);
	}

	// Clear and add a new list
	// lists = [{yourProperty:'', stream:['main.mp3', 'fallback.ogg', ..]}, ...]
	// lists = [{yourProperty:'', stream:'main.mp3'}, ...]
	reload(lists){
		this.original = lists;
		this.shuffle(this.shuffled);
		this._internalPlaylistEvent();

		this.#player.prepare(lists[0].stream);
	}

	// Add new list
	// obj = {yourProperty:'', stream:['main.mp3', 'fallback.ogg']}
	// obj = {yourProperty:'', stream:'main.mp3'}
	add(obj){
		Array.prototype.push.apply(this.original, arguments);
		this.shuffle(this.shuffled);
		this._internalPlaylistEvent();

		if(!this.#player.currentSrc)
			this.#player.prepare(obj.stream);
	}

	// Remove an index from 'original' list
	remove(index){
		if(this.currentIndex === index)
			this.#player.pause();

		this.original.splice(index, 1);
		this.shuffle(this.shuffled);
	}

	// Clear list
	clear(){this.original.length = 0}

	next(pending){
		this.currentIndex++;
		if(this.currentIndex >= this.list.length){
			if(this.loop)
				this.currentIndex = 0;
			else{
				this.currentIndex--;
				return;
			}
		}

		if(!pending)
			this.play(this.currentIndex);
		this._playlistTriggerEvent('playlistchange');
	}

	previous(pending){
		this.currentIndex--;
		if(this.currentIndex < 0){
			if(this.loop)
				this.currentIndex = this.list.length - 1;
			else{
				this.currentIndex++;
				return;
			}
		}

		if(!pending)
			this.play(this.currentIndex);
		this._playlistTriggerEvent('playlistchange');
	}

	play(index){
		this.currentIndex = index;

		var player = this.#player;
		player.prepare(this.list[index].stream, function(){
			player.play();
		});

		this._playlistTriggerEvent('playlistchange');
	}

	shuffle(set){
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
}