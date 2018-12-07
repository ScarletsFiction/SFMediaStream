ScarletsMedia.vibrato = function(sourceNode){
	var context = this.audioContext;
	var output = context.createGain();
	var input = sourceNode === undefined ? context.createGain() : null;
	if(input) sourceNode = input;

	console.error("The vibrato effect still need some maintenance");

    var filter = context.createBiquadFilter();
	filter.type = 'peaking';
	filter.gain.value = 1;
	filter.Q.value = 1
	filter.connect(output);

    sourceNode.connect(filter);

	var vibratoGainNode = context.createGain();
	vibratoGainNode.gain.value = 30;
	vibratoGainNode.connect(filter.detune);

	var lfoNode = context.createOscillator();
	lfoNode.connect(vibratoGainNode);
	lfoNode.frequency.value = 5;
	lfoNode.start(0);

	return {
		// Connect to output
		// output.connect(context.destination);
		output:output,
		input:input,
		
		speed:function(value){
			if(value === undefined) return ScarletsMedia.extra.denormalize(lfoNode.frequency.value, 0, 20);
			lfoNode.frequency.value = ScarletsMedia.extra.normalize(value, 0, 20);
		},

		// This should be executed to clean memory
		destroy:function(){
			if(input) input.disconnect();
			output.disconnect();
			lfoNode.stop();
			lfoNode.disconnect();
			
			for(var key in this){
				delete this[key];
			}
			output = null;
		}
	};
};