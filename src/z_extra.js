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
	  get: function(){ return target[property]; },
	  set: function(value){ target[property] = value; },
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

function normalize(value, min, max){
	return ((max - min) * value) + min;
}

function denormalize(value, min, max){
	return (value - min) / (min - max);
}