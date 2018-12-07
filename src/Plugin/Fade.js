ScarletsMedia.fade = function(sourceNode){
	var context = this.audioContext;
	var output = context.createGain();
	var input = sourceNode === undefined ? context.createGain() : null;
	if(input) sourceNode = input;

	output.gain.value = 0;
	sourceNode.connect(output);
	
	return {
		// Connect to output
		// output.connect(context.destination);
		output:output,
		input:input,

		in:function(value, time){ // value: 0~1, time: in seconds
			output.gain.cancelScheduledValues(context.currentTime);

			var remainingTime = (1 - output.gain.value) * value;
			output.gain.setTargetAtTime(1.0, context.currentTime, remainingTime * time);
		},
		out:function(value, time, callback){ // value: 0~1, time: in seconds
			output.gain.cancelScheduledValues(context.currentTime);

			var remainingTime = output.gain.value * value;
			output.gain.setTargetAtTime(0.00001, context.currentTime, remainingTime / time);

			setTimeout(function(){
				if(sourceNode.stop) sourceNode.stop(0);
				if(callback) callback();
			}, time * 1000);
		},

		// This should be executed to clean memory
		destroy:function(){
			output.disconnect();
			this.node = output = null;
		}
	};
};