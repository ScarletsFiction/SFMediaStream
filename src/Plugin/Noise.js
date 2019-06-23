ScarletsMediaEffect.noise = function(sourceNode){
	var context = ScarletsMedia.audioContext;
	var output = context.createGain();
	var input = sourceNode === undefined ? context.createGain() : null;
	if(input) sourceNode = input;

	var length = Math.floor(context.sampleRate * 9.73);
	var noiseFloat32 = new Float32Array(length);

	for (var i = 0; i < length; i++) {
		noiseFloat32[i] = Math.sqrt(-2.0 * Math.log(Math.random())) * Math.cos(2.0 * Math.PI * Math.random()) * 0.5;
	}

	var noiseBuffer = context.createBuffer(2, length, context.sampleRate);
	noiseBuffer.getChannelData(0).set(noiseFloat32, 0);
	noiseBuffer.getChannelData(1).set(noiseFloat32, 0);

    var src = context.createBufferSource();
    src.to(output);
    src.loop = true;
    src.start(0);
    src.buffer = noiseBuffer;
    src.loopStart = Math.random() * 9.73;
	
	return {
		// Connect to output
		// output.connect(context.destination);
		output:output,
		input:input,

		// This should be executed to clean memory
		destroy:function(){
			src.loop = false;
			src.buffer = null;
    		src.stop(0);
			src.disconnect();
			src = null;

			if(input) input.disconnect();
			output.disconnect();
			
			for(var key in this){
				delete this[key];
			}
			output = null;
		}
	};
};
