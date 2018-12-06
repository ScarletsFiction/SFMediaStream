ScarletsMedia.equalizer = function(sourceNode, frequencies){
	var freq = frequencies || [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
	var context = this.audioContext;
	var equalizer = {};
	var lastIndex = freq.length - 1;
	var output = context.createGain(); // Combine all effect

	for (var i = 0; i < freq.length; i++) {
        var filter = context.createBiquadFilter();
        filter.gain.value = 0.0;
        filter.Q.value = 1.0;
        filter.frequency.value = freq[i];

        if(i === 0) filter.type = 'lowshelf';
        else if(i === lastIndex) filter.type = 'peaking';
        else filter.type = 'highshelf';

    	sourceNode.connect(filter);
    	filter.connect(output);
        equalizer[freq[i]] = filter;
	}

	return {
		// Connect to output
		// node.connect(context.destination);
		node:output,
		
		equalizer:equalizer,

		// This should be executed by dev to memory leak
		destroy:function(){
			for (var i = 0; i < freq.length; i++) {
	    		equalizer[freq[i]].disconnect();
			}

			output.disconnect();
			this.equalizer = equalizer = this.node = output = null;
		}
	};
};