ScarletsMediaEffect.conReverb = function(sourceNode){
	var context = this.audioContext;
	var output = context.createGain();
	var input = sourceNode === undefined ? context.createGain() : null;
	if(input) sourceNode = input;

    var reverbNode = context.createConvolver();
	var wetGainNode = context.createGain();
	var dryGainNode = context.createGain();

	sourceNode.connect(dryGainNode);
	sourceNode.connect(reverbNode);

    reverbNode.connect(wetGainNode);
    dryGainNode.connect(output);
    wetGainNode.connect(output);

    function setBuffer(buffer){
    	if(reverbNode.buffer !== null){
    		reverbNode.disconnect();
    		reverbNode = context.createConvolver();

			sourceNode.connect(reverbNode);
		    reverbNode.connect(wetGainNode);
    	}
    	reverbNode.buffer = buffer;
    }

	return {
		// Connect to output
		// output.connect(context.destination);
		output:output,
		input:input,

		// This must be set
		setBuffer:setBuffer,

		// Load audio buffer from url
		loadBuffer:function(url){
			var ajaxRequest = new XMLHttpRequest();
			ajaxRequest.open('GET', url, true);
			ajaxRequest.responseType = 'arraybuffer';

			ajaxRequest.onload = function(){
			  var audioData = ajaxRequest.response;
			  context.decodeAudioData(audioData, function(buffer) {
			      setBuffer(buffer);
			  }, function(e){"Error with decoding audio data" + e.err});
			}

			ajaxRequest.send();
		},

		mix: function(value){ // value: 0 ~ 1
			if(value === undefined) return wetGainNode.gain.value;
			dryGainNode.gain.value = 1 - value;
			wetGainNode.gain.value = value;
		},

		// This should be executed to clean memory
		destroy:function(){
			if(input) input.disconnect();
			dryGainNode.disconnect();
			output.disconnect();
			reverbNode.disconnect();
			
			for(var key in this){
				delete this[key];
			}
			output = null;
		}
	};
};