ScarletsMedia.dubDelay = function(sourceNode){
	var context = this.audioContext;
	var output = context.createGain();
	var input = sourceNode === undefined ? context.createGain() : null;
	if(input) sourceNode = input;
	var mix = 0;

	var dryGainNode = context.createGain();
	var wetGainNode = context.createGain();
	var feedbackGainNode = context.createGain();
	var delayNode = context.createDelay();
	var bqFilterNode = context.createBiquadFilter(); 

	sourceNode.connect(dryGainNode);
	dryGainNode.connect(output);

	sourceNode.connect(wetGainNode);
	sourceNode.connect(feedbackGainNode);

	feedbackGainNode.connect(bqFilterNode);
	bqFilterNode.connect(delayNode);
	delayNode.connect(feedbackGainNode);
	delayNode.connect(wetGainNode);

	wetGainNode.connect(output);
	
	var ret = {
		// Connect to output
		// output.connect(context.destination);
		output:output,
		input:input,
		
		mix:function(value){ // value: 0 ~ 1
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
		time:function(value){ // value: 0 ~ 180
			if(value === undefined) return ;
			delayNode.delayTime.value = value;
		},
		feedback:function(value){ // value: 0 ~ 1
			if(value === undefined) return ;
			feedbackGainNode.gain.value = value;
		},
		cutoff:function(value){ // value: 0 ~ 4000
			if(value === undefined) return ;
			bqFilterNode.frequency.value = value;
		},

		// This should be executed to clean memory
		destroy:function(){
			output.disconnect();
			this.node = output = null;
		}
	};

	ret.mix(0.5);
	ret.time(0.7);
	ret.feedback(0.6);
	ret.cutoff(700);

	return ret;
};