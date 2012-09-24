// (c) Infocatcher 2009, 2011-2012
// version 0.2.1 - 2012-09-24

// Usage:
// var ajax = new Ajax(maxActiveRequests);
// ajax.post(uri, data, callback, callbackContext);

/*@cc_on
if(!window.XMLHttpRequest) window.XMLHttpRequest = function() {
	try {
		return new ActiveXObject("Microsoft.XMLHTTP");
	}
	catch(e) {
	}
	return null;
}
@*/

function Ajax(maxActiveRequests) {
	this.maxActiveRequests = maxActiveRequests || 4;
	this.activeRequests = 0;
	this.queue = [];
	this.requests = [];
}
Ajax.prototype = {
	post: function(uri, data, callback, callbackContext, args) {
		return this.requestArgs("POST", arguments);
	},
	get: function(uri, data, callback, callbackContext, args) {
		return this.requestArgs("GET", arguments);
	},
	head: function(uri, data, callback, callbackContext, args) {
		return this.requestArgs("HEAD", arguments);
	},
	abort: function() {
		var requests = this.requests;
		for(var i = 0, l = requests.length; i < l; ++i)
			if(i in requests)
				requests[i].abort();
	},
	NO_XMLHTTP:    -2,
	REQUEST_ERROR: -1,
	OK:             0,
	ADDED_TO_QUEUE: 1,
	isSuccessCode: function(state) {
		return state >= 0;
	},
	request: function(method, uri, data, callback, callbackContext, args) {
		// callback: function(request, ok) { ... }
		// data:     "key=value"
		if(this.activeRequests >= this.maxActiveRequests) {
			this.queue.push(arguments);
			this.state = this.ADDED_TO_QUEUE;
			return true;
		}
		var request = new XMLHttpRequest();
		if(!request) {
			setTimeout(function() { throw new Error("Can't create XMLHttpRequest object"); }, 0);
			this.state = this.NO_XMLHTTP;
			return false;
		}
		var uid = this.requests.push(request) - 1;
		var _this = this;
		request.onreadystatechange = function() {
			if(request.readyState != 4)
				return;
			var cnt = --_this.activeRequests;
			while(cnt++ < _this.maxActiveRequests && _this.hasQueue())
				_this.nextRequest();
			var ok = request.status == (/^https?:/.test(/^\w+:/.test(uri) ? uri : location.href) ? 200 : 0);
			var callbackArgs = [request, ok];
			if(args)
				callbackArgs.push.apply(callbackArgs, args);
			callback.apply(callbackContext || window, callbackArgs);
			delete _this.requests[uid];
			// Madness? No. Memory leaks in stupid IE.
			request = method = uri = callback = callbackContext = _this = null;
		}
		if(method != "POST" && data)
			uri += uri.indexOf("?") == -1 ? "?" : "&" + data;
		try {
			request.open(method, uri, true);
			if(method == "POST") try {
				request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
				request.setRequestHeader("Content-length", data ? data.length : 0);
				request.setRequestHeader("Connection", "close");
			}
			catch(e2) {
			}
			request.send(data || null);
			++this.activeRequests;
		}
		catch(e) {
			setTimeout(function() { throw e; }, 0);
			this.state = this.REQUEST_ERROR;
			return false;
		}
		this.state = this.OK;
		return request;
	},
	requestArgs: function(method, args) {
		args = Array.prototype.slice.call(args);
		args.unshift(method);
		return this.request.apply(this, args);
	},
	hasQueue: function() {
		return this.queue.length > 0;
	},
	nextRequest: function() {
		this.request.apply(this, this.queue.shift());
	}
};