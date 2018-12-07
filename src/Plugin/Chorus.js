ScarletsMedia.chorus = function(sourceNode){
	var context = this.audioContext;
	var output = context.createGain();
	var input = sourceNode === undefined ? context.createGain() : null;
	if(input) sourceNode = input;

	var dry = context.createGain();
    var wet = context.createGain();
    var splitter = context.createChannelSplitter(2);
    var merger = context.createChannelMerger(2);
    sourceNode.to(splitter, dry);

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
	    c.stream.to(c.delayVibrato);
	    c.stream.to(c.delayFixed);
	    c.delayVibrato.to(c.feedforward);
	    c.delayVibrato.connect(merger, 0, i);
	    c.delayFixed.to(c.feedback);
	    c.feedback.to(c.stream);
	    c.blend.connect(merger, 0, i);
    }

    // Output
    merger.to(wet);
    dry.to(output);
    wet.to(output);

    // LFO modulation
    var lfo = context.createOscillator();
    var LDepth = context.createGain();
    var RDepth = context.createGain();
    lfo.to(LDepth, RDepth);
    LDepth.to(channel[0].delayVibrato.delayTime);
    RDepth.to(channel[1].delayVibrato.delayTime);
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

	var ret =  {
		// Connect to output
		// output.connect(context.destination);
		output:output,
		input:input,

		rate: function (value, time, rampType) { // value: 0 ~ 1
	    	value = value * 0.29 + 0.01;
	    	lfo.frequency.set(value, time, rampType);
	    },

	    intensity: function (value, time, rampType) { // value: 0 ~ 1
	    	var blend = 1.0 - (value * 0.2929);
	    	var feedforward = value * 0.2929 + 0.7071;
	    	var feedback = value * 0.7071;

	    	for (var i = 0; i < channel.length; i++) {
		    	channel[i].blend.gain.set(blend, time, rampType);
		    	channel[i].feedforward.gain.set(feedforward, time, rampType);
		    	channel[i].feedback.gain.set(feedback, time, rampType);
	    	}
	    },

	    mix: function (value, time, rampType) {
	    	dry.gain.set(1.0 - value, time, rampType);
	    	dry.gain.set(value, time, rampType);
	    },

		// This should be executed to clean memory
		destroy:function(){
			output.disconnect();
			lfo.disconnect();
	    	for (var i = 0; i < channel.length; i++) {
		    	channel[i].stream.disconnect();
	    	}
			this.node = output = null;
		}
	};

	// Initial settings
    ret.rate(0.5);
    ret.intensity(0.0);
    ret.mix(0.75);

	return ret;
};