ScarletsMedia.pitchShift = function(sourceNode){
    var context = this.audioContext;
    var output = context.createGain();
    var input = sourceNode === undefined ? context.createGain() : null;
    if(input) sourceNode = input;

    var bufferTime = 0.100;
    var fadeTime = bufferTime / 2;
    var bufferRate = bufferTime * context.sampleRate;

    // Delay amount for changing pitch.
    var modulateGain1 = context.createGain();
    var modulateGain2 = context.createGain();

    var delayNode1 = context.createDelay();
    var delayNode2 = context.createDelay();
    modulateGain1.connect(delayNode1.delayTime);
    modulateGain2.connect(delayNode2.delayTime);

    sourceNode.connect(delayNode1);
    sourceNode.connect(delayNode2);

    var fTime = context.currentTime + fadeTime;
    var bTime = context.currentTime + bufferTime;

    function createPitchBuffer(shiftUp){
        var buffer = context.createBuffer(1, bufferRate, context.sampleRate);
        var pitch = buffer.getChannelData(0);
        
        // Buffer pitch shift
        for (var i = 0; i < bufferRate; i++) {
            if(shiftUp)
              pitch[i] = (bufferRate - i) / bufferRate;
            else
              pitch[i] = i / bufferRate;
        }

        return buffer;
    }
    
    // Delay modulation.
    var bufferSource = [0,0,0,0];
    var bufferGain = [0,0,0,0];
    for (var i = 0; i < bufferSource.length; i++) {
        bufferSource[i] = context.createBufferSource();
        bufferSource[i].loop = true;

        bufferGain[i] = context.createGain();

        if(i < 2)
            bufferSource[i].buffer = createPitchBuffer(false);
        else {
            bufferSource[i].buffer = createPitchBuffer(true);
            bufferGain[i].gain.value = 0;
        }

        if(i % 2){ // Odd
            bufferGain[i].connect(modulateGain2);
	    	bufferSource[i].start(bTime);
        }
        else { // Even
            bufferGain[i].connect(modulateGain1);
	    	bufferSource[i].start(fTime);
        }

        bufferSource[i].connect(bufferGain[i]);
    }

    function createPitchFadeBuffer(){
        var buffer = context.createBuffer(1, bufferRate, context.sampleRate);
        var pitch = buffer.getChannelData(0);
            
        var fadeLength = fadeTime * context.sampleRate;
        var bufferLeft = bufferRate - fadeLength;
        
        // Buffer pitch shift
        for (var i = 0; i < bufferRate; i++) {
            if (i < fadeLength)
                pitch[i] = Math.sqrt(i / fadeLength);
            else
                pitch[i] = Math.sqrt(1 - (i - bufferLeft) / fadeLength);
        }

        return buffer;
    }

    var fadeBuffer = createPitchFadeBuffer();

    // Delay modulation.
    var fadeNode = [0,0];
    var mixNode = [0,0];
    for (var i = 0; i < fadeNode.length; i++) {
        fadeNode[i] = context.createBufferSource();
        fadeNode[i].loop = true;
        fadeNode[i].buffer = fadeBuffer;

        mixNode[i] = context.createGain();
    	mixNode[i].gain.value = 0;
        fadeNode[i].connect(mixNode[i].gain);

        if(i % 2){ // Odd
            bufferGain[i].connect(modulateGain2);
	    	fadeNode[i].start(bTime);
        }
        else { // Even
            bufferGain[i].connect(modulateGain1);
	    	fadeNode[i].start(fTime);
        }

        mixNode[i].connect(output);
    }
    
    delayNode1.connect(mixNode[0]);
    delayNode2.connect(mixNode[1]);

    function pitchGain(value){
	    modulateGain1.gain.value = 
	    modulateGain2.gain.value = 0.5 * bufferTime * Math.abs(value);
    }

    var ret = {
        // Connect to output
        // output.connect(context.destination);
        output:output,
        input:input,

        // pitchNode:[modulateGain1, modulateGain2],

        shift:function(value){ // -3 ~ 3
            if(value === undefined) return;

            var pitchUp = value > 0;
		    bufferGain[0].gain.value = 
		    bufferGain[1].gain.value = pitchUp ? 0 : 1;
		    bufferGain[2].gain.value = 
		    bufferGain[3].gain.value = pitchUp ? 1 : 0;

		    pitchGain(value);
        },

        // This should be executed to clean memory
        destroy:function(){
            if(input) input.disconnect();
            output.disconnect();

            for (var i = 0; i < fadeNode.length; i++) {
            	fadeNode[i].stop();
            	fadeNode[i].disconnect();
            	mixNode[i].disconnect();
            }

            for (var i = 0; i < bufferSource.length; i++) {
            	bufferSource[i].stop();
            	bufferSource[i].disconnect();
            	bufferGain[i].disconnect();
            }

            modulateGain1.disconnect();
			modulateGain2.disconnect();
			delayNode1.disconnect();
			delayNode2.disconnect();
            
            for(var key in this){
                delete this[key];
            }
            output = null;
        }
    };

    pitchGain(0);
    return ret;
}