ScarletsMedia.stereoPanner = function(sourceNode){
	var context = this.audioContext;
	var output = context.createGain();

	var gain = context.createGain();
	sourceNode.connect(gain);

	var stereoSupport = false;
	if(context.createStereoPanner){
		var pannerNode = context.createStereoPanner();
		stereoSupport = true;
	}
	else {
		var pannerNode = context.createPanner();
		pannerNode.type = 'equalpower';
	}

	sourceNode.connect(pannerNode);
	pannerNode.connect(output);
	pannerNode.pan.value = 0;

	return {
		// Connect to output
		// node.connect(context.destination);
		node:output,
		gain:gain.gain,

		set:function(pan){ // pan: -1 ~ 1
			if(stereoSupport)
				pannerNode.pan.value = pan;
			else pannerNode.setPosition(pan, 0, 1 - Math.abs(pan));
		},

		// This should be executed by dev to memory leak
		destroy:function(){
			gain.disconnect();
			output.disconnect();
			pannerNode.disconnect();
			this.gain = gain = this.node = output = pannerNode = null;
		}
	};
};