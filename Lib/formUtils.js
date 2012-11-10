// (c) Infocatcher 2011-2012
// version 0.1.5.2 - 2012-11-10

// Dependencies:
//   eventListener object - eventListener.js

// Usage:
//	new FormUtils(form, {
//		submitOnce: true,
//		ctrlEnter: function(event, form, formUtils) { ... },
//		shiftEnter: function(event, form, formUtils) { ... },
//		required: {
//			fieldName: "Warning text",
//			fieldName2: function(value, form, fieldName) { return !(value > 0) && "Error text"; }
//		}
//	});

function FormUtils(form, options) {
	this.form = form;
	this.options = options;
	this.init();
}
FormUtils.prototype = {
	bypassCheck: "__formUtilsBypassCheck",
	highlightDelay: 5000,
	init: function() {
		var opts = this.options;
		if("ctrlEnter" in opts || "shiftEnter" in opts)
			this.setHotkeys(true);
		if("submitOnce" in opts && opts.submitOnce || "required" in opts)
			this.setSubmitHandler(true);
		if("required" in opts) {
			var form = this.form;
			form._submit = form.submit;
			var _this = this;
			form.submit = function() {
				var opts = _this.options;
				if("required" in opts && !_this.check())
					return;
				try {
					form._submit.apply(this, arguments);
				}
				catch(e) { // Stupid IE6
					form._submit();
				}
			};
		}
		eventListener.add(window, "unload", function() {
			eventListener.remove(window, "unload", arguments.callee);
			this.setHotkeys(false);
			this.setSubmitHandler(false);
		}, this);
	},
	setHotkeys: function(add) {
		var elts = this.form.elements;
		for(var i = 0, l = elts.length; i < l; ++i)
			eventListener[add ? "add" : "remove"](elts[i], "keypress", this.hotkey, this);
	},
	setSubmitHandler: function(add) {
		eventListener[add ? "add" : "remove"](this.form, "submit", this.submitHandler, this);
	},
	hotkey: function(e) {
		if(e.keyCode != 13 && e.keyCode != 10) // Handle only Enter
			return;
		var opts = this.options;
		var handler;
		if(e.ctrlKey && "ctrlEnter" in opts)
			handler = "ctrlEnter";
		if(e.shiftKey && "shiftEnter" in opts)
			handler = "shiftEnter";
		if(!handler)
			return;
		this.stopEvent(e);
		e.target.focus();
		opts[handler](e, this.form, this);
	},
	submitHandler: function(e) {
		if("_forbidSubmit" in this) {
			this.stopEvent(e);
			return;
		}
		var opts = this.options;
		if("required" in opts && !this.check()) {
			this.stopEvent(e);
			return;
		}
		if("submitOnce" in opts && opts.submitOnce)
			this.submitOnce();
	},
	stopEvent: function(e) {
		e.preventDefault();
		e.stopPropagation();
	},
	check: function() {
		var form = this.form;
		var bypassCheck = this.bypassCheck;
		if(bypassCheck in form && form[bypassCheck]) {
			form[bypassCheck] = false;
			return true;
		}
		var errors = [];
		var hlFields = [];
		var required = this.options.required;
		for(var p in required) {
			var field = form[p];
			if(!field)
				continue;
			if(typeof required[p] == "object" && !required[p].check(field.value, form, p)) // Obsolete...
				errors.push(required[p].error), hlFields.push(field);
			else if(typeof required[p] == "function") {
				var err = required[p](field.value, form, p);
				if(err)
					errors.push(err), hlFields.push(field);
			}
			else if(/^\s*$/.test(field.value))
				errors.push(required[p]), hlFields.push(field);
		}
		if(!errors.length)
			return true;
		this.hlNodes(hlFields);
		hlFields[0].focus && hlFields[0].focus();
		alert(errors.join("\n"));
		this.unhlDelay();
		return false;
	},
	hlNodes: function(nodes) {
		this.unhl();
		if("_unhlTimer" in this)
			clearTimeout(this._unhlTimer);
		for(var i = 0, l = nodes.length; i < l; ++i)
			this.hlNode(nodes[i], true);
	},
	hlNode: function(node, hl) {
		var s = node.style;
		if("outline" in s) {
			s.outline = hl ? "2px solid red" : "";
			if("outlineOffset" in s)
				s.outlineOffset = hl ? "-2px" : "";
		}
		else {
			s.border = hl ? "1px solid red" : "";
		}
	},
	unhl: function() {
		var elts = this.form.elements;
		for(var i = 0, l = elts.length; i < l; ++i)
			this.hlNode(elts[i], false);
	},
	unhlDelay: function() {
		var _this = this;
		this._unhlTimer = setTimeout(function() {
			_this.unhl();
		}, this.highlightDelay);
	},
	submitOnce: function() {
		this._forbidSubmit = true;
		var elts = this.form.elements;
		// Without setTimeout() we can't get pressed button from server side
		setTimeout(function() {
			for(var i = 0, l = elts.length; i < l; ++i) {
				var elt = elts[i];
				var type = elt.type.toLowerCase();
				if(type == "submit" || type == "reset")
					elt.disabled = true;
			}
		}, 0);
	}
};