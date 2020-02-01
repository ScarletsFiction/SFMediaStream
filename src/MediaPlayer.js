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
	element.crossorigin = 'anonymous';
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

	self.play = function(successCallback, errorCallback){
		if(!element.paused){
			if(successCallback) successCallback();
			return;
		}
		if(self.audioFadeEffect){
			element.volume = 0;
			element.play();
			ScarletsMedia.extra.fadeNumber(0, volume, 0.02, 400, function(num){
				element.volume = num;
			}, successCallback);
			return;
		}

		element.play().then(function(){
			if(successCallback) successCallback();
		}).catch(function(e){
			console.error(e);
			if(errorCallback) errorCallback();
		});
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

		if(self.preload && callback)
			self.once('canplay', callback);

		if(typeof links === 'string')
			element.insertAdjacentHTML('beforeend', `<source src="${links.split('"').join('\\"')}"/>`);
		else{
			temp = '';
			for (var i = 0; i < links.length; i++) {
				temp += `<source src="${links[i].split('"').join('\\"')}"/>`;
			}
			element.insertAdjacentHTML('beforeend', temp);
		}

		// Preload data
		if(self.preload)
			element.load();

		else if(callback)
			callback();
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