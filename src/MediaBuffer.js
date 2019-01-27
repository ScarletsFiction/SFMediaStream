var MediaBuffer = function(mimeType, chunksDuration, bufferHeader){
	var scope = this;
	scope.source = new MediaSource();
	scope.objectURL = URL.createObjectURL(scope.source);

	var sourceBuffer = null;
	scope.source.addEventListener('sourceopen', function(){
		sourceBuffer = scope.source.addSourceBuffer(mimeType);
		sourceBuffer.mode = 'sequence';
		sourceBuffer.appendBuffer(bufferHeader);
	}, {once:true});

	var removing = false;
	scope.source.addEventListener('updateend', function(){
		if(removing === false) return;

		removing = false;
		sourceBuffer.remove(0, 10);
	});

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