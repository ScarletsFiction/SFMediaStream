ScarletsMedia.fade = function(sourceNode){
	var context = this.audioContext;

	var fadeNode = context.createGain();
	fadeNode.gain.value = 0;
	sourceNode.connect(fadeNode);
	
	return {
		// Connect to output
		// node.connect(context.destination);
		node:fadeNode,

		in:function(value, time){ // value: 0~1, time: in seconds
			fadeNode.gain.cancelScheduledValues(context.currentTime);

			var remainingTime = (1 - fadeNode.gain.value) * value;
			fadeNode.gain.setTargetAtTime(1.0, context.currentTime, remainingTime * time);
		},
		out:function(value, time, callback){ // value: 0~1, time: in seconds
			fadeNode.gain.cancelScheduledValues(context.currentTime);

			var remainingTime = fadeNode.gain.value * value;
			fadeNode.gain.setTargetAtTime(0.00001, context.currentTime, remainingTime / time);

			setTimeout(function(){
				if(sourceNode.stop) sourceNode.stop(0);
				if(callback) callback();
			}, time * 1000);
		},

		// This should be executed by dev to memory leak
		destroy:function(){
			fadeNode.disconnect();
			this.node = output = null;
		}
	};
};