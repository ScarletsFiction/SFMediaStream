ScarletsMedia.distortion = function(sourceNode){
	var context = this.audioContext;
	var output = context.createGain();
	var input = sourceNode === undefined ? context.createGain() : null;
	if(input) sourceNode = input;
	var deg = 57 * Math.PI / 180;

	var waveShaperNode = context.createWaveShaper();
	waveShaperNode.connect(output);
	sourceNode.connect(waveShaperNode);

	var options = {
		amount:0
	};
	return {
		set:function(amount){ // amount: 0 ~ 1
			if(amount === undefined) return options.amount;
			options.amount = amount;
			
			amount = amount * 10;
		    var curve = new Float32Array(context.sampleRate);
		    var temp = 2 / context.sampleRate;

		    for (var i = 0 ; i < context.sampleRate; i++) {
		    	var x = i * temp - 1;

		    	// http://kevincennis.github.io/transfergraph/
		    	curve[i] = (3 + amount) * x * deg / (Math.PI + amount * Math.abs(x));
		    }

		    waveShaperNode.curve = curve;
		},

		// Connect to output
		// output.connect(context.destination);
		output:output,
		input:input,

		// This should be executed to clean memory
		destroy:function(){
			if(input) input.disconnect();
			waveShaperNode.disconnect();
			output.disconnect();

			waveShaperNode = output = null;
			for(var key in this){
				delete this[key];
			}
		}
	};
};