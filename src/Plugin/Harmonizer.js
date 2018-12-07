ScarletsMedia.harmonizer = function(sourceNode){
	var context = this.audioContext;
	var output = context.createGain();
	var input = sourceNode === undefined ? context.createGain() : null;
	if(input) sourceNode = input;
  	var bands = 8;

	// Cascading 2 filters for sharp resonance.
    var filters1 = [];
    var filters2 = [];
    var gains = [];

    for (var i = 0; i < bands; i++) {
      filters1[i] = context.createBiquadFilter();
      filters1[i].type = 'bandpass';
      filters2[i] = context.createBiquadFilter();
      filters2[i].type = 'bandpass';
      sourceNode.connect(filters1[i]);

      gains[i] = context.createGain();
      gains[i].connect(output);
      filters1[i].connect(filters2[i]).connect(gains[i]);
    }

    output.gain.value = 35.0;

	var ret = {
		// Connect to output
		// output.connect(context.destination);
		output:output,
		input:input,
		
		// Change frequency of filters
	    pitch: function (value) {
	    	var f0 = ScarletsMedia.convert.midiToFreq(value);
	    	for (var i = 0; i < bands; i++) {
	    		filters1[i].frequency.value = f0;
	    		filters2[i].frequency.value = f0;
	    	}
	    },

	    slope: function (value) {
	    	for (var i = 0; i < bands; i++) {
	    		gains[i].gain.value = 1.0 + Math.sin(Math.PI + (Math.PI/2 * (value + i / bands)));
	    	}
	    },

	    width: function (value) {
	    	for (var i = 1; i < bands; i++) {
	    		var q = 2 + 90 * Math.pow((1 - i / bands), value);
	    		filters1[i].Q.value = q;
	    		filters2[i].Q.value = q;
	    	}
	    },

		// This should be executed to clean memory
		destroy:function(){
			if(input) input.disconnect();
			output.disconnect();

		    for (var i = 0; i < bands; i++) {
		        filters1[i].disconnect();
		  	}

			for(var key in this){
				delete this[key];
			}
			output = null;
		}
	};

    ret.pitch(34);
    ret.slope(0.65);
    ret.width(0.15);

	return ret;

	// sample
	// noise x0.25 -> harmonizer -> reverb x0.85
};