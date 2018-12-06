ScarletsMedia.reverb = function(sourceNode){
	var context = this.audioContext;
	var output = context.createGain();

	var reverbNode = context.createConvolver();
	var wetGainNode = context.createGain();
	var dryGainNode = context.createGain();

	sourceNode.connect(dryGainNode);
	dryGainNode.connect(output);
	wetGainNode.connect(output);

	var mix = 0.5,
		time = 0.01,
		decay = 0.01,
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
	
	return {
		// Connect to output
		// node.connect(context.destination);
		node:output,

		mix: function(value){ // value: 0 ~ 1
			if(value === undefined) return mix;
			var dry = 1;
			if (mix > 0.5)
				dry = 1 - ((mix - 0.5) * 2);
			dryGainNode.gain.value = dry;

			var wet = 1;
			if (mix < 0.5)
				wet = 1 - ((0.5 - mix) * 2);
			wetGainNode.gain.value = wet;
		},

		time: function(value){ // value: 0.001 ~ 10
			if(time === undefined) return time;
			time = value;
			rebuildImpulse();
		},

		decay: function(value){// value: 0.001 ~ 10
			if(value === undefined) return decay;
			decay = value;
			rebuildImpulse();
		},

		reverse: function(value){ // value: bool
			if(value === undefined) return reverse;
			reverse = value;
			rebuildImpulse();
		},

		// This should be executed by dev to memory leak
		destroy:function(){
			dryGainNode.disconnect();
			output.disconnect();
			reverbNode.disconnect();
			this.node = output = null;
		}
	};
};