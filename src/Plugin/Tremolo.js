ScarletsMedia.tremolo = function(sourceNode){
	var context = this.audioContext;
	var output = context.createGain();
	var input = sourceNode === undefined ? context.createGain() : null;
	if(input) sourceNode = input;

	var dryGainNode = context.createGain();
	var wetGainNode = context.createGain();
	var mix = 0;

	var tremoloGainNode = context.createGain();
	tremoloGainNode.gain.value = 0;

	var shaperNode = context.createWaveShaper();
	shaperNode.curve = new Float32Array([0, 1]);
	shaperNode.connect(tremoloGainNode.gain);

	sourceNode.connect(dryGainNode);
	dryGainNode.connect(output);

	var lfoNode = context.createOscillator();
	lfoNode.connect(shaperNode);
	lfoNode.type = 'sine';
	lfoNode.start(0);

	sourceNode.connect(tremoloGainNode);
	tremoloGainNode.connect(wetGainNode);
	wetGainNode.connect(output);

	var ret = {
		// Connect to output
		// output.connect(context.destination);
		output:output,
		input:input,

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
		depth:function(value){
			if(value === undefined) return 1 - this.shaperNode.curve[0];
			this.shaperNode.curve = new Float32Array([1 - value, 1]);
		},

		// This should be executed to clean memory
		destroy:function(){
			gain.disconnect();
			output.disconnect();
			this.node = output = null;
		}
	};

	ret.speed(0.2);
	ret.depth(1);
	ret.mix(0.8);

	return ret;
};