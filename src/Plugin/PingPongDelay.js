ScarletsMediaEffect.pingPongDelay = function(sourceNode){
	var context = this.audioContext;
	var output = context.createGain();
	var input = sourceNode === undefined ? context.createGain() : null;
	if(input) sourceNode = input;
	var mix = 0;

	var delayNodeLeft = context.createDelay();
	var delayNodeRight = context.createDelay();
	var dryGainNode = context.createGain();
	var wetGainNode = context.createGain();
	var feedbackGainNode = context.createGain();
	var channelMerger = context.createChannelMerger(2);

	sourceNode.connect(dryGainNode);
	dryGainNode.connect(output);

	delayNodeLeft.connect(channelMerger, 0, 0);
	delayNodeRight.connect(channelMerger, 0, 1);
	delayNodeLeft.connect(delayNodeRight);

	feedbackGainNode.connect(delayNodeLeft);
	delayNodeRight.connect(feedbackGainNode);

	sourceNode.connect(feedbackGainNode);

	channelMerger.connect(wetGainNode);
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
		time:function(value){ // value: 0 ~ 180
			if(value === undefined) return delayNodeLeft.delayTime.value;
			delayNodeLeft.delayTime.value = value;
			delayNodeRight.delayTime.value = value;
		},
		feedback:function(value){ // value: 0 ~ 1
			if(value === undefined) return feedbackGainNode.gain.value;
			feedbackGainNode.gain.value = value;
		},

		// This should be executed to clean memory
		destroy:function(){
			if(input) input.disconnect();
			output.disconnect();
			dryGainNode.disconnect();
			feedbackGainNode.disconnect();
			
			for(var key in this){
				delete this[key];
			}
			output = null;
		}
	};

	ret.mix(0.5);
	ret.time(0.3);
	ret.feedback(0.5);

	return ret;
};