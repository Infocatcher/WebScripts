// (c) Infocatcher 2011-2012
// version 0.3.5 - 2012-09-15

// Usage:
// new ListFilter("inpitId", "listId");
// new ListFilter(input, list);

function ListFilter(input, list, rowTag) {
	this.input = this.$(input);
	this.inputId = this.input.id;
	this.list = this.$(list);
	this.rowTag = rowTag || "li";
	this._lastFilter = "";
	this._lastTime = 0;
	this._filterTimeout = 0;
	this.hl = highlighter;
	this.initInput();
}
ListFilter.prototype = {
	filterDelay: 80,
	setHashDelay: 300,
	$: function(id) {
		if(typeof id == "object")
			return id;
		return document.getElementById(id);
	},
	initInput: function() {
		var inp = this.input;
		inp.__listFilter = this;
		// Note: ondrop is only for Firefox 4
		inp.onkeypress = inp.onkeydown = inp.onpaste = inp.ondrop = function(e) {
			e = e || window.event;
			if((e.type == "keypress" || e.type == "keydown") && e.keyCode == 27) { // Escape
				e.preventDefault && e.preventDefault();
				e.returnValue = false;
				var lf = this.__listFilter;
				setTimeout(function() { // For Firefox
					lf.reset();
				}, 0);
			}
			else
				this.__listFilter.doFilterEvent();
		};
		this.restoreFilter();
		this.watchHash();
	},
	restoreFilter: function() {
		var filter = this.getFilter();
		if(filter)
			this.input.value = filter;
		this.doFilter(!!filter);
		if(filter)
			return;
		// Browser can remember input value
		var _this = this;
		this.setHandler(
			window,
			"load",
			function() {
				_this.setHandler(window, "load", arguments.callee);
				_this.doFilter();
			},
			true
		);
	},
	watchHash: function() {
		var _this = this;
		var handler = function() {
			var filter = _this.getFilter();
			if(filter == _this._lastFilter)
				return;
			_this.input.value = filter;
			_this.doFilter();
		};
		if("onhashchange" in window)
			this.setHandler(window, "hashchange", handler, true);
		else
			setInterval(handler, 150);
	},
	setHandler: function(target, type, func, add) {
		this.setHandler = window.addEventListener
			? function(target, type, func, add) {
				target[add ? "addEventListener" : "removeEventListener"](type, func, false);
			}
			: function(target, type, func, add) {
				target[add ? "attachEvent" : "detachEvent"]("on" + type, func);
			};
		this.setHandler(target, type, func, add);
	},
	getFilter: function() {
		var inpId = this.inputId;
		if(!inpId)
			return "";
		if(new RegExp("#" + this.escapeRegExp(inpId) + "=([^#]*)").test(location.hash))
			return this.decode(RegExp.$1);
		return "";
	},
	setHash: function() {
		if(!("onhashchange" in window)) {
			this._setHash();
			return;
		}
		clearTimeout(this._setHashTimeout);
		var _this = this;
		this._setHashTimeout = setTimeout(function() {
			_this._setHash();
		}, this.setHashDelay);
	},
	_setHashTimeout: 0,
	_setHash: function() {
		var inpId = this.inputId;
		if(!inpId)
			return;
		var filter = this._lastFilter;
		var add = "#" + inpId + "=" + this.encode(filter);
		var hash = location.hash;
		if(!/#[^#=]+=[^#]*/.test(hash)) {
			if(!filter)
				return;
			hash = add;
		}
		else {
			var pattern = new RegExp("#" + this.escapeRegExp(inpId) + "=[^#]*");
			if(pattern.test(hash))
				hash = hash.replace(pattern, add);
			else {
				if(!filter)
					return;
				hash += add;
			}
		}
		location.hash = hash.replace(/^#/, "");
	},
	encode: function(s) {
		return s
			.replace(/&/g, "&26;")
			.replace(/#/g, "&23;")
			.replace(/=/g, "&3d;")
			.replace(/\\/g, "&5c;")
			.replace(/ /g, "&20;");
	},
	decode: function(s) {
		try {
			s = decodeURIComponent(s);
		}
		catch(e) {
		}
		return s
			.replace(/&23;/g, "#")
			.replace(/&3d;/g, "=")
			.replace(/&5c;/g, "\\")
			.replace(/&20;/g, " ")
			.replace(/&26;/g, "&");
	},
	escapeRegExp: function(s) {
		return s.replace(/[\\\/.^$+*?|()\[\]{}]/g, "\\$&");
	},
	allowWildcards: function(s) { // Allow only *, ? and allow escape them: \*, \?
		s = s.replace(/[\\\/.^$+|()\[\]{}]/g, "\\$&");
		s = s.replace(/(\\*)([*?])/g, function(s, bs, chr) {
			var l = bs.length;
			if(l % 4) // escaped
				return bs.substr(0, (l - 2)/2) + "\\" + chr;
			return bs.substr(0, l/2) + (chr == "*" ? "[\\s\\S]*?" : "[\\s\\S]");
		});
		return s;
	},
	doFilterEvent: function() {
		if(this._filterTimeout) // Already scheduled
			return;
		var remTime = this._lastTime + this.filterDelay - new Date().getTime();
		if(remTime <= 0) {
			this.doFilterDelay();
			return;
		}
		var _this = this;
		this._filterTimeout = setTimeout(function() {
			_this._filterTimeout = 0;
			_this.doFilterDelay();
		}, remTime);
	},
	doFilterDelay: function() { // Wait for input changes
		var _this = this;
		setTimeout(function() {
			_this.doFilter();
		}, 0);
	},
	doFilter: function(restoreFlag) {
		var term = this.input.value;
		if(term == this._lastFilter)
			return;
		this._lastFilter = term;
		!restoreFlag && this.setHash();
		var flags = "i";
		var globalMatch = true;
		if(/^\/(.+)\/([img]{0,3})$/.test(term)) {
			term = RegExp.$1;
			flags = RegExp.$2;
			var newFlags = flags.replace(/g/g, "");
			globalMatch = newFlags != flags;
			flags = newFlags;
		}
		else {
			term = this.escapeRegExp(term);
		}
		var termPattern = new RegExp(
			term.replace(/ /g, "[ \\t\\xa0\\u2002\\u2003\\u2009]"),
			flags
		);
		var items = this.list.getElementsByTagName(this.rowTag);
		for(var i = 0, l = items.length; i < l; ++i) {
			var item = items[i];
			this.hl.unhighlight(item); // Something may break in IE6 after previous highlight()
			var text = this.hl.getNodeText(item);
			//var show = !term || text.indexOf(term) != -1;
			var show = !term || termPattern.test(text);
			this.toggle(item, show);
			if(!show)
				continue;
			term && this.hl.highlight(item, termPattern, globalMatch);
		}
		this._lastTime = new Date().getTime();
	},

	focus: function() {
		this.input.focus();
	},
	reset: function() {
		this.input.value = "";
		this.doFilterDelay();
		this.focus();
	},
	toggle: function(node, show) {
		node.style.display = show ? "" : "none";
	}
};

var highlighter = {
	hlClass: "filterHighlight",
	hlId: "filterHighlight-",
	id: 0,
	highlight: function(node, pattern, globalMatch, addIds) {
		if(/*@cc_on @_jscript_version < 5.8 ||@*/ false)
			if(!("__origHTML" in node) || node.__origHTML == null)
				node.__origHTML = node.innerHTML;

		var highlighted = false;
		var textNodes = this.getTextNodes(node);
		var nodesCount = textNodes.length;
		var nodesText = this.getNodeText(textNodes);

		var textOffset = 0;
		var nodeIndx = 0;
		var nodeStart = 0;
		for(;;) {
			if(!nodesText || !pattern.test(nodesText))
				break;
			var matched = typeof RegExp.lastMatch == "string"
				? RegExp.lastMatch.length
				: nodesText.match(pattern)[0].length; // For Opera 10.10
			if(!matched) { // Matched empty string
				if(!globalMatch)
					break;
				nodesText = nodesText.substr(1);
				++textOffset;
				continue;
			}
			var start = RegExp.leftContext.length;
			var end = start + matched;

			var _firstNode = false;
			for(var i = nodeIndx; i < nodesCount; ++i) {
				var nodeData = textNodes[i];
				var nodeEnd = nodeStart + nodeData.length;
				if(
					textOffset + start >= nodeEnd   // [node] [matched]
					|| textOffset + end < nodeStart // [matched] [node]
				) {
					++nodeIndx;
					nodeStart = nodeEnd;
					continue;
				}

				var textNode = nodeData.node;
				var text = nodeData.text;

				var matchStart = Math.max(0, textOffset + start - nodeStart);
				var matchEnd = Math.min(nodeEnd, textOffset + end - nodeStart);

				highlighted = true;
				var addId = "";
				if(addIds && !_firstNode) {
					_firstNode = true;
					addId = ' id="' + (this.hlId + this.id++) + '"';
				}

				//~ todo: textNode.splitText(offset) ?
				var tmp = document.createElement("div");
				tmp.innerHTML = this.encodeHTML(text.substring(0, matchStart))
					+ '<span' + addId + ' class="' + this.hlClass + '">'
					+ this.encodeHTML(text.substring(matchStart, matchEnd))
					+ '</span>'
					+ this.encodeHTML(text.substring(matchEnd));
				var lastTextNode = this.replaceWithChilds(textNode, tmp);

				if(textOffset + end > nodeEnd) {
					nodeStart = nodeEnd;
					++nodeIndx;
					continue;
				}

				if(lastTextNode) {
					text = this._getNodeText(lastTextNode);
					nodeStart = nodeEnd - text.length;
					textNodes[i--] = {
						node: lastTextNode,
						text: text,
						length: text.length
					};
				}
				break;
			}

			if(!globalMatch)
				break;

			nodesText = nodesText.substr(end);
			textOffset += end;
		}
		return highlighted;
	},
	unhighlight: function(node) {
		var unhighlighted = false;
		if("__origHTML" in node && node.__origHTML != null) {
			if(node.innerHTML != node.__origHTML) {
				unhighlighted = true;
				node.innerHTML = node.__origHTML;
			}
			//delete node.__origHTML; // Doesn't work in IE6
			node.__origHTML = null;
			return unhighlighted;
		}
		var hlNodes = this.toArray(node.getElementsByTagName("span"));
		for(var i = 0, l = hlNodes.length; i < l; ++i) {
			var hlNode = hlNodes[i];
			if(hlNode.className != this.hlClass)
				continue;
			unhighlighted = true;
			var parent = hlNode.parentNode;
			var clilds = this.toArray(hlNode.childNodes);
			for(var j = 0, cl = clilds.length; j < cl; ++j)
				parent.insertBefore(clilds[j], hlNode);
			parent.removeChild(hlNode);
		}
		/*@cc_on if(@_jscript_version >= 9) @*/ // IE9
		node.normalize && node.normalize();
		return unhighlighted;
	},
	reset: function() {
		this.id = 0;
	},
	getTextNodes: function(node, _childs) {
		if(!_childs)
			_childs = [];
		var childs = node.childNodes;
		for(var i = 0, l = childs.length; i < l; ++i) {
			var child = childs[i];
			if(child.nodeType == 3) {
				var text = this._getNodeText(child);
				_childs.push({
					node: child,
					text: text,
					length: text.length
				});
				continue;
			}
			var nn = child.nodeName.toLowerCase();
			if(nn != "script" && nn != "style")
				this.getTextNodes(child, _childs);
		}
		return _childs;
	},
	_getNodeText: function(node) {
		return node.textContent || node.innerText || node.nodeValue || "";
	},
	getNodeText: function(node) {
		var textNodes = node.childNodes
			? this.getTextNodes(node)
			: node;
		var nodesText = "";
		for(var i = 0, nodesCount = textNodes.length; i < nodesCount; ++i)
			nodesText += textNodes[i].text;
		return nodesText;
	},
	replaceWithChilds: function(node, newNode) {
		var parent = node.parentNode;
		var lastTextChild = null;
		var childs = this.toArray(newNode.childNodes);
		for(var i = 0, l = childs.length; i < l; ++i) {
			var child = childs[i];
			parent.insertBefore(child, node);
			if(child.nodeType == 3)
				lastTextChild = child;
		}
		parent.removeChild(node);
		return lastTextChild;
	},
	toArray: function(nodes) {
		var arr = [];
		for(var i = 0, l = nodes.length; i < l; ++i)
			arr.push(nodes[i]);
		return arr;
	},
	encodeHTML: function(s) {
		return s
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;");
	}
};