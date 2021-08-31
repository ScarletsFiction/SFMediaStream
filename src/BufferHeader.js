var BufferHeader = {
	"audio/webm;codecs=opus": "GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOAZwH/////////FUmpZpkq17GDD0JATYCGQ2hyb21lV0GGQ2hyb21lFlSua7+uvdeBAXPFh7o5nyc1kHqDgQKGhkFfT1BVU2Oik09wdXNIZWFkAQIAAIC7AAAAAADhjbWERzuAAJ+BAmJkgSAfQ7Z1Af/////////ngQCjjIEAAID/A//+//7//qM="
};

function getBufferHeader(type) {
	if (!window.chrome && type === "audio/webm;codecs=opus" ) {
		// this header is only for chrome based brosers
		return false;
	}

	var buff = BufferHeader[type];
	if(buff === void 0) return false;

	if(buff.constructor === Blob)
		return buff;

	buff = atob(buff);

	var UInt = new Uint8Array(buff.length);
	for (var i = 0; i < buff.length; i++)
		UInt[i] = buff.charCodeAt(i);

	return BufferHeader[type] = new Blob([UInt]);
}