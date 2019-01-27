ScarletsMediaEffect.vibrato = function(sourceNode){
	var context = ScarletsMedia.audioContext;
	var output = context.createGain();
	var input = sourceNode === undefined ? context.createGain() : null;
	if(input) sourceNode = input;

	console.log("Vibrato was not finished yet");

    var delayNode = context.createDelay();
	var wetGainNode = context.createGain();
	var dryGainNode = context.createGain();
    var lfoNode = context.createOscillator();
    //var depthNode = context.createGain();

	sourceNode.connect(dryGainNode);
	dryGainNode.connect(output);
	wetGainNode.connect(output);

    delayNode.delayTime.value = 1;
    //depthNode.gain.value = 1;
    lfoNode.frequency.value = 3;
    lfoNode.type = 'sine';
    lfoNode.start(0);

    lfoNode.connect(delayNode.delayTime);
    //depthNode.connect(delayNode.delayTime);
    sourceNode.connect(delayNode);
    delayNode.connect(wetGainNode);

	return {
		// Connect to output
		// output.connect(context.destination);
		output:output,
		input:input,
		
		mix:function(value){ // value: 0 ~ 1
			if(value === undefined) return wetGainNode.gain.value;
			dryGainNode.gain.value = 1 - value;
			wetGainNode.gain.value = value;
		},
		
		delay:function(value){
			if(value === undefined) return delayNode.delayTime.value;
			delayNode.delayTime.value = value;
		},
		
		depth:function(value){
			if(value === undefined) return depthNode.gain.value;
			depthNode.gain.value = value;
		},
		
		speed:function(value){
			if(value === undefined) return lfoNode.frequency.value;
			lfoNode.frequency.value = value;
		},

		// This should be executed to clean memory
		destroy:function(){
			if(input) input.disconnect();
			output.disconnect();

    		sourceNode.disconnect(delayNode);
    		sourceNode.disconnect(dryGainNode);

			lfoNode.stop();
			lfoNode.disconnect();
			depthNode.disconnect();
			
			for(var key in this){
				delete this[key];
			}
			output = null;
		}
	};
};