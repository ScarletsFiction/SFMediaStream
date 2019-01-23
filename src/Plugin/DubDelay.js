ScarletsMediaEffect.dubDelay = function(sourceNode){
	var context = this.audioContext;
	var output = context.createGain();
	var input = sourceNode === undefined ? context.createGain() : null;
	if(input) sourceNode = input;

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
			if(value === undefined) return wetGainNode.gain.value;
			dryGainNode.gain.value = 1 - value;
			wetGainNode.gain.value = value;
		},
		time:function(value){ // value: 0 ~ 180
			if(value === undefined) return delayNode.delayTime.value;
			delayNode.delayTime.value = value;
		},
		feedback:function(value){ // value: 0 ~ 1
			if(value === undefined) return feedbackGainNode.gain.value;
			feedbackGainNode.gain.value = value;
		},
		cutoff:function(value){ // value: 0 ~ 4000
			if(value === undefined) return bqFilterNode.frequency.value;
			bqFilterNode.frequency.value = value;
		},

		// This should be executed to clean memory
		destroy:function(){
			if(input) input.disconnect();
			output.disconnect();
			dryGainNode.disconnect();
			wetGainNode.disconnect();
			feedbackGainNode.disconnect();

			for(var key in this){
				delete this[key];
			}
			output = null;
		}
	};

	ret.mix(0.5);
	ret.time(0.7);
	ret.feedback(0.6);
	ret.cutoff(700);

	return ret;
};