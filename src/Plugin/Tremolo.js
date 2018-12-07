ScarletsMedia.tremolo = function(sourceNode){
	var context = this.audioContext;
	var output = context.createGain();
	var input = sourceNode === undefined ? context.createGain() : null;
	if(input) sourceNode = input;

	var dryGainNode = context.createGain();
	var wetGainNode = context.createGain();

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

		mix: function(value){ // value: 0 ~ 1
			if(value === undefined) return wetGainNode.gain.value;
			dryGainNode.gain.value = 1 - value;
			wetGainNode.gain.value = value;
		},
		speed:function(value){
			if(value === undefined) return ScarletsMedia.extra.denormalize(lfoNode.frequency.value, 0, 20);
			lfoNode.frequency.value = ScarletsMedia.extra.normalize(value, 0, 20);
		},
		depth:function(value){
			if(value === undefined) return 1 - this.shaperNode.curve[0];
			shaperNode.curve = new Float32Array([1 - value, 1]);
		},

		// This should be executed to clean memory
		destroy:function(){
			if(input) input.disconnect();
			output.disconnect();
			dryGainNode.disconnect();
			tremoloGainNode.disconnect();
			
			for(var key in this){
				delete this[key];
			}
			output = null;
		}
	};

	ret.speed(0.2);
	ret.depth(1);
	ret.mix(0.8);

	return ret;
};