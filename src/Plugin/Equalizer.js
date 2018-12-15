ScarletsMedia.equalizer = function(frequencies, sourceNode){
	var freq = frequencies || [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
	var context = this.audioContext;
	
	var output = context.createGain(); // Combine all effect
	var input = sourceNode === undefined ? context.createGain() : null;
	if(input) sourceNode = input;

	var equalizer = {};
	var lastIndex = freq.length - 1;

	// Calculate bandpass width
    var width = (freq.length - 2);
    if(width <= 0)
    	width = 0.5;
    else
    	width = (1 - 1 / width).toFixed(2);

	for (var i = 0; i < freq.length; i++) {
        var filter = context.createBiquadFilter(); // Frequency pass
		var gain = context.createGain(); // Gain control
		gain.gain.value = 0.5;
        filter.Q.value = 1.0;
        filter.frequency.value = freq[i];

        if(i === 0) filter.type = 'lowpass';
        else if(i === lastIndex) filter.type = 'highpass';
        else {
        	filter.type = 'bandpass';
        	filter.Q.value = width;
        }

		sourceNode.connect(filter);

    	filter.connect(gain);
    	gain.connect(output);
        equalizer[freq[i]] = [gain, filter];
	}

	return {
		// Connect to output
		// output.connect(context.destination);
		output:output,
		input:input,
		
		frequency:function(frequency, gain){ // value: 0 ~ 2
			if(gain === undefined) return equalizer[frequency][0].gain.value;
			equalizer[frequency][0].gain.value = gain;
		},

		// This should be executed to clean memory
		destroy:function(){
			for (var i = 0; i < freq.length; i++) {
	    		equalizer[freq[i]][0].disconnect(); // gain
	    		equalizer[freq[i]][1].disconnect(); // filter
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