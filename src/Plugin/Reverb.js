ScarletsMedia.reverb = function(sourceNode){
	var context = this.audioContext;
	
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