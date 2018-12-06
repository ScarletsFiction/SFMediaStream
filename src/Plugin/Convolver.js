ScarletsMedia.convolver = function(sourceNode){
	var context = this.audioContext;
	var output = context.createGain();

	var wetGainNode = context.createGain();
	var convolverNode = context.createConvolver();
	sourceNode.connect(convolverNode);
	convolverNode.connect(wetGainNode);
	wetGainNode.connect(output);

	var dryGainNode = context.createGain();
	sourceNode.connect(dryGainNode);
	dryGainNode.connect(output);
	
	var ret = {
		// Connect to output
		// node.connect(context.destination);
		node:output,

		set:function(mix){ // mix: 0 ~ 1
			var dry = 1;
			if (mix > 0.5)
				dry = 1 - ((mix - 0.5) * 2);
			dryGainNode.gain.value = dry;

			var wet = 1;
			if (mix < 0.5)
				wet = 1 - ((0.5 - mix) * 2);
			wetGainNode.gain.value = wet;
		},

		// This should be executed by dev to memory leak
		destroy:function(){
			output.disconnect();
			this.node = output = null;
		}
	};

	ret.set(0.5);
	return ret;
};