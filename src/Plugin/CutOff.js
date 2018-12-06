ScarletsMedia.cutOff = function(sourceNode, passType){ // passType: 'lowpass' || 'highpass'
	var context = this.audioContext;
	var output = context.createGain();

	var filterNode = context.createBiquadFilter();
	filterNode.type = passType || 'lowpass';
	filterNode.frequency.value = 350;
	filterNode.Q.value = 1;
	filterNode.connect(output);
	sourceNode.connect(filterNode);
	
	return {
		// Connect to output
		// node.connect(context.destination);
		node:output,
		
		frequency: function(value){
			if(value === undefined)
				return filterNode.frequency.value;
			filterNode.frequency.value = value;
		},
		peak: function(value){
			if(value === undefined)
				return filterNode.Q.value;
			filterNode.Q.value = value;
		},

		// This should be executed by dev to memory leak
		destroy:function(){
			output.disconnect();
			this.node = output = null;
		}
	};
};