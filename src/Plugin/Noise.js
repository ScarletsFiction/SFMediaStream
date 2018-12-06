ScarletsMedia.noise = function(){
	var context = this.audioContext;
	var output = context.createGain();

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
		// node.connect(context.destination);
		node:output,

		// This should be executed by dev to memory leak
		destroy:function(){
			src.loop = false;
			src.buffer = null;
			src = null;
			output.disconnect();
			this.node = output = null;
		}
	};
};