ScarletsMedia.vibrato = function(sourceNode){
	var context = this.audioContext;
	var output = context.createGain();

	var dryGainNode = context.createGain();
	var wetGainNode = context.createGain();
	var mix = 0;

	var vibratoGainNode = audioContext.createGain();
	vibratoGainNode.gain.value = 100;
	vibratoGainNode.connect(sourceNode.detune);

	sourceNode.connect(dryGainNode);
	dryGainNode.connect(output);

	var lfoNode = audioContext.createOscillator();
	lfoNode.connect(vibratoGainNode);
	lfoNode.start(0);

	sourceNode.connect(vibratoGainNode);
	tremoloGainNode.connect(wetGainNode);
	wetGainNode.connect(output);

	return {

		// Connect to output
		// node.connect(context.destination);
		node:output,
		
		mix:function(value){
			if(value === undefined) return mix;
			mix = value;
			var dry = 1;
			if (mix > 0.5)
				dry = 1 - ((mix - 0.5) * 2);
			dryGainNode.gain.value = dry;

			var wet = 1;
			if (mix < 0.5)
				wet = 1 - ((0.5 - mix) * 2);
			wetGainNode.gain.value = wet;
		},
		speed:function(value){
			if(value === undefined) return denormalize(lfoNode.frequency.value, 0, 20);
			lfoNode.frequency.value = normalize(value, 0, 20);
		},

		// This should be executed by dev to memory leak
		destroy:function(){
			output.disconnect();
			this.node = output = null;
		}
	};
};