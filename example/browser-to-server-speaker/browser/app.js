// You can try it from browser's console
var app = sf.model('the-app');

// Scope for <sf-m name="the-app">
sf.model('the-app', function(self, root){
	self.presenter = root('presenter');

	self.id = '';

	self.debugText = '';
	self.debug = function(){
		for (var i = 0; i < arguments.length; i++)
			self.debugText += arguments[i] + " ";

		self.debugText += "\n";
		console.log.apply(null, arguments);

		var textarea = self.$el('textarea')[0];
		textarea.scrollTop = textarea.scrollHeight;
	}
});