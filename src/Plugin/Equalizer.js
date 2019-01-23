ScarletsMediaEffect.equalizer = function(frequencies, sourceNode){
	var freq = frequencies || [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
	var context = this.audioContext;
	
	var output = context.createGain(); // Combine all effect
	var input = sourceNode === undefined ? context.createGain() : null;
	if(input) sourceNode = input;

	var equalizer = {};
	var lastIndex = freq.length - 1;

	for (var i = 0; i < freq.length; i++) {
        var filter = context.createBiquadFilter(); // Frequency pass
		filter.gain.value = 0;
        filter.frequency.value = freq[i];

        if(i === 0) filter.type = 'lowshelf';
        else if(i === lastIndex) filter.type = 'highshelf';
        else filter.type = 'peaking';

		if(i !== 0)
	    	equalizer[freq[i - 1]].connect(filter);
        equalizer[freq[i]] = filter;
	}

	sourceNode.connect(equalizer[freq[0]]);
	filter.connect(output);

	return {
		// Connect to output
		// output.connect(context.destination);
		output:output,
		input:input,
		
		frequency:function(frequency, dB){ // value: -20 ~ 20
			if(dB === undefined) return equalizer[frequency].gain.value;
			equalizer[frequency].gain.value = dB;
		},

		// This should be executed to clean memory
		destroy:function(){
			for (var i = 0; i < freq.length; i++) {
	    		equalizer[freq[i]].disconnect(); // filter
			}
			equalizer.splice(0);

			if(input) input.disconnect();
			output.disconnect();
			
			for(var key in this){
				delete this[key];
			}
			equalizer = output = null;
		}
	};
};