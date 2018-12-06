ScarletsMedia.convert = {
	// Converts a MIDI pitch number to frequency.
	// midi = 0 ~ 127
	midiToFreq:function (midi) {
	    if(midi <= -1500) return 0;
	    else if(midi > 1499) return 3.282417553401589e+38;
	    else return 440.0 * Math.pow(2, (Math.floor(midi) - 69) / 12.0);
	},

	// Converts frequency to MIDI pitch.
	freqToMidi:function(freq){
		if(freq > 0)
			return Math.floor(Math.log(freq/440.0) / Math.LN2 * 12 + 69);
		else return -1500;
	},

    // Converts power to decibel. Note that it is off by 100dB to make it
	powerToDb:function(power){
	    if (power <= 0)
	    	return 0;
	    else {
	        var db = 100 + 10.0 / Math.LN10 * Math.log(power);
	        if(db < 0) return 0;
	        return db;
	    }
	},

    // Converts decibel to power
	dbToPower:function(db){
	    if (db <= 0) return 0;
	    else {
  	        if (db > 870) db = 870;
  	        return Math.exp(Math.LN10 * 0.1 * (db - 100.0));
	    }
	},

	// Converts amplitude to decibel.
	ampToDb:function(lin){
	    return 20.0 * (lin > 0.00001 ? (Math.log(lin) / Math.LN10) : -5.0);
	},

	// Converts decibel to amplitude
	dbToAmp:function(db) {
	    return Math.pow(10.0, db / 20.0);
	},

	// Converts MIDI velocity to amplitude
	velToAmp:function (velocity) {
	    return velocity / 127;
	},
}