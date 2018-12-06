ScarletsMedia.delay = function(sourceNode){
	var context = this.audioContext;
	var output = context.createGain();
	var mix = 0;

	var dryGainNode = context.createGain();
	var wetGainNode = context.createGain();
	var feedbackGainNode = context.createGain();
	var delayNode = context.createDelay();

	sourceNode.connect(dryGainNode);
	dryGainNode.connect(output);

	delayNode.connect(feedbackGainNode);
	feedbackGainNode.connect(delayNode);

	sourceNode.connect(delayNode);
	delayNode.connect(wetGainNode);
	
	wetGainNode.connect(output);
	
	var ret = {
		// Connect to output
		// node.connect(context.destination);
		node:output,

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

		// This should be executed by dev to memory leak
		destroy:function(){
			output.disconnect();
			this.node = output = null;
		}
	};

	ret.mix(0.5);
	ret.time(0.3);
	ret.feedback(0.5);

	return ret;
};