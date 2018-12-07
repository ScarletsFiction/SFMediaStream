ScarletsMedia.stereoPanner = function(sourceNode){
	var context = this.audioContext;
	var output = context.createGain();
	var input = sourceNode === undefined ? context.createGain() : null;
	if(input) sourceNode = input;

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
		// output.connect(context.destination);
		output:output,
		input:input,

		set:function(pan){ // pan: -1 ~ 1
			if(stereoSupport)
				pannerNode.pan.value = pan;
			else pannerNode.setPosition(pan, 0, 1 - Math.abs(pan));
		},

		// This should be executed to clean memory
		destroy:function(){
			if(input) input.disconnect();
			output.disconnect();
			pannerNode.disconnect();
			
			for(var key in this){
				delete this[key];
			}
			output = pannerNode = null;
		}
	};
};