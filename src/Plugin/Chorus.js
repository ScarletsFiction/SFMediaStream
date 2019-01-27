ScarletsMediaEffect.chorus = function(sourceNode){
	var context = ScarletsMedia.audioContext;
	var output = context.createGain();
	var input = sourceNode === undefined ? context.createGain() : null;
	if(input) sourceNode = input;

	var dry = context.createGain();
    var wet = context.createGain();
    var splitter = context.createChannelSplitter(2);
    var merger = context.createChannelMerger(2);
    sourceNode.connect(splitter);
    sourceNode.connect(dry);

    var channel = [{/* left */}, {/* right */}];

    for (var i = 0; i < channel.length; i++) {
    	var c = channel[i];

    	// Declaration
    	c.stream = context.createGain();
    	c.delayVibrato = context.createDelay();
    	c.delayFixed = context.createDelay();
    	c.feedback = context.createGain();
    	c.feedforward = context.createGain();
    	c.blend = context.createGain();

    	// Connection
	    splitter.connect(c.stream, i, 0);
	    c.stream.connect(c.delayVibrato);
	    c.stream.connect(c.delayFixed);
	    c.delayVibrato.connect(c.feedforward);
	    c.delayVibrato.connect(merger, 0, i);
	    c.delayFixed.connect(c.feedback);
	    c.feedback.connect(c.stream);
	    c.blend.connect(merger, 0, i);
    }

    // Output
    merger.connect(wet);
    dry.connect(output);
    wet.connect(output);

    // LFO modulation
    var lfo = context.createOscillator();
    var LDepth = context.createGain();
    var RDepth = context.createGain();
    lfo.connect(LDepth);
    lfo.connect(RDepth);
    LDepth.connect(channel[0].delayVibrato.delayTime);
    RDepth.connect(channel[1].delayVibrato.delayTime);
    lfo.start(0);

    // Settings
    lfo.type = 'sine';
    lfo.frequency.value = 0.15;
    LDepth.gain.value = 0.013;
    RDepth.gain.value = -0.017;
    channel[0].delayFixed.delayTime.value = 0.005;
    channel[1].delayFixed.delayTime.value = 0.007;
    channel[0].delayVibrato.delayTime.value = 0.013;
    channel[1].delayVibrato.delayTime.value = 0.017;

    var options = {rate:0, intensity:0, mix:0};

	var ret =  {
		// Connect to output
		// output.connect(context.destination);
		output:output,
		input:input,

		rate: function (value) { // value: 0 ~ 1
			if(value === undefined) return options.rate;
			options.rate = value;

	    	value = value * 0.29 + 0.01;
	    	lfo.frequency.value = value;
	    },

	    intensity: function (value) { // value: 0 ~ 1
			if(value === undefined) return options.intensity;
			options.intensity = value;

	    	var blend = 1.0 - (value * 0.2929);
	    	var feedforward = value * 0.2929 + 0.7071;
	    	var feedback = value * 0.7071;

	    	for (var i = 0; i < channel.length; i++) {
		    	channel[i].blend.gain.value = blend;
		    	channel[i].feedforward.gain.value = feedforward;
		    	channel[i].feedback.gain.value = feedback;
	    	}
	    },

	    mix: function (value) {
			if(value === undefined) return options.mix;
			options.mix = value;
			
	    	dry.gain.value = value;
	    },

		// This should be executed to clean memory
		destroy:function(){
			if(input) input.disconnect();
			output.disconnect();
			lfo.stop(0);
			lfo.disconnect();
			
	    	for (var i = 0; i < channel.length; i++) {
		    	channel[i].stream.disconnect();
	    	}
			for(var key in this){
				delete this[key];
			}
			output = null;
		}
	};

	// Initial settings
    ret.rate(0.5);
    ret.intensity(0.0);
    ret.mix(0.75);

	return ret;
};