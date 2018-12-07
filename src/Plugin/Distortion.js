ScarletsMedia.distortion = function(sourceNode){
	var context = this.audioContext;
	var deg = 57 * Math.PI / 180;
	
	var gain = context.createGain();
	sourceNode.connect(gain);
	gain.gain.value = 0.5;

	var output = context.createWaveShaper();
	gain.connect(output);

	return {
		set:function(amount){ // amount: 0 ~ 1
		    var curve = new Float32Array(context.sampleRate);
		    var temp = 2 / context.sampleRate;
		    
		    for (var i = 0 ; i < context.sampleRate; i++) {
		    	var x = i * temp - 1;

		    	// http://kevincennis.github.io/transfergraph/
		    	curve[i] = (3 + amount) * x * deg / (Math.PI + amount * Math.abs(x));
		    }

		    dist.curve = curve;
		},

		// Connect to output
		// node.connect(context.destination);
		node:output,
		gain:gain.gain,

		// This should be executed by dev to clean memory
		destroy:function(){
			gain.disconnect();
			output.disconnect();
			this.gain = gain = this.node = output = null;
		}
	};
};