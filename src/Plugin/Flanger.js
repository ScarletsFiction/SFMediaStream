ScarletsMedia.flanger = function(sourceNode){
	var context = this.audioContext;
	var output = context.createGain();
	var input = sourceNode === undefined ? context.createGain() : null;
	if(input) sourceNode = input;

	var inputFeedbackNode = context.createGain();
	var wetGainNode = context.createGain();
	var dryGainNode = context.createGain();
	var delayNode = context.createDelay();
	var oscillatorNode = context.createOscillator();
	var gainNode = context.createGain();
	var feedbackNode = context.createGain();
	oscillatorNode.type = 'sine';

	sourceNode.connect(inputFeedbackNode);
	sourceNode.connect(dryGainNode);

	inputFeedbackNode.connect(delayNode);
	inputFeedbackNode.connect(wetGainNode);

	delayNode.connect(wetGainNode);
	delayNode.connect(feedbackNode);

	feedbackNode.connect(inputFeedbackNode);

	oscillatorNode.connect(gainNode);
	gainNode.connect(delayNode.delayTime);

	dryGainNode.connect(output);
	wetGainNode.connect(output);

	oscillatorNode.start(0);
	
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
		time:function(value){ // value: 0 ~ 1
			if(value === undefined) return denormalize(delayNode.delayTime.value, 0.001, 0.02);
			delayNode.delayTime.value = normalize(value, 0.001, 0.02);
		},
		speed:function(value){ // value: 0 ~ 1
			if(value === undefined) return denormalize(delayNode.delayTime.value, 0.5, 5);
			oscillatorNode.frequency.value = normalize(value, 0.5, 5);
		},
		depth:function(value){ // value: 0 ~ 1
			if(value === undefined) return denormalize(delayNode.delayTime.value, 0.0005, 0.005);
			gainNode.gain.value = normalize(value, 0.0005, 0.005);
		},
		feedback:function(value){ // value: 0 ~ 1
			if(value === undefined) return denormalize(delayNode.delayTime.value, 0, 0.8);
			feedbackNode.gain.value = normalize(value, 0, 0.8);
		},

		// This should be executed to clean memory
		destroy:function(){
			if(input) input.disconnect();
			output.disconnect();
			inputFeedbackNode.disconnect();
			dryGainNode.disconnect();

			for(var key in this){
				delete this[key];
			}
			output = null;
		}
	};

	ret.time(0.45);
	ret.speed(0.2);
	ret.depth(0.1);
	ret.feedback(0.1);
	ret.mix(0.5);

	return ret;
};