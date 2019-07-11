var MediaBuffer = function(mimeType, chunksDuration, bufferHeader){
	var scope = this;
	scope.source = new MediaSource();
	scope.objectURL = URL.createObjectURL(scope.source);

	var sourceBuffer = null;
	scope.source.onsourceopen = function(){
		sourceBuffer = scope.source.addSourceBuffer(mimeType);
		sourceBuffer.mode = 'sequence';
		sourceBuffer.appendBuffer(bufferHeader);
	};

	var removing = false;
	scope.source.onupdateend = function(){
		if(removing === false) return;

		removing = false;
		sourceBuffer.remove(0, 10);
	};

	scope.source.onerror = console.error;

	var totalTime = 0;
	scope.append = function(arrayBuffer){
		if(sourceBuffer === null) return false;

		sourceBuffer.appendBuffer(arrayBuffer);
		totalTime += chunksDuration;

		if(totalTime >= 20000)
			removing = true;

		return totalTime/1000;
	}

	scope.stop = function(){
		if(sourceBuffer.updating)
			sourceBuffer.abort();

		if(scope.source.readyState === "open")
			scope.source.endOfStream();
	}
}