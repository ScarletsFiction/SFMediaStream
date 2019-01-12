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