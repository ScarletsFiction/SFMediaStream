var scope = null;
var allScope = null;
var fs = require('fs');

function response(req, res, closeConnection){
    res.writeHead(200);
	closeConnection(fs.readFileSync('page/video.html'));
}

module.exports = {
	path: '/video',
	response:response,
	scope:function(ref, allRef){
		scope = ref;
		allScope = allRef;
		// initialize();
	}
}