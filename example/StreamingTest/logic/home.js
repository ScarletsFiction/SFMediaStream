var scope = null;
var allScope = null;
var fs = require('fs');

function response(req, res, closeConnection){
    res.writeHead(200);
	closeConnection(fs.readFileSync('page/home.html'));
}

module.exports = {
	path: '/',
	response:response,
	scope:function(ref, allRef){
		scope = ref;
		allScope = allRef;
		// initialize();
	}
}