ScarletsMedia.cutOff = function(passType, sourceNode){ // passType: 'lowpass' | 'bandpass' | 'highpass'
	var context = this.audioContext;
	var output = context.createGain();
	var input = sourceNode === undefined ? context.createGain() : null;
	if(input) sourceNode = input;

	var filterNode = context.createBiquadFilter();
	filterNode.type = passType || 'lowpass';
	filterNode.frequency.value = 350;
	filterNode.Q.value = 1;
	filterNode.connect(output);
	sourceNode.connect(filterNode);
	
	return {
		// Connect to output
		// output.connect(context.destination);
		output:output,
		input:input,
		
		type: function(value){
			if(value === undefined)
				return filterNode.type;
			filterNode.type = value;
		},
		frequency: function(value){
			if(value === undefined)
				return filterNode.frequency.value;
			filterNode.frequency.value = value;
		},
		width: function(value){
			if(value === undefined)
				return filterNode.Q.value;
			filterNode.Q.value = value;
		},

		// This should be executed to clean memory
		destroy:function(){
			if(input) input.disconnect();
			filterNode.disconnect();
			output.disconnect();
			
			for(var key in this){
				delete this[key];
			}
			output = null;
		}
	};
};