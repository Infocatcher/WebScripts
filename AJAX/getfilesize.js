// Some code based on code of Get File Size Firefox extension
// https://addons.mozilla.org/firefox/addon/6656
// (c) Infocatcher 2008-2010, 2012
// version 0.1.6 - 2012-09-24

// Required: ajax.js 0.2.1+ http://infocatcher.ucoz.net/js/ajax.js

// Important!
// This script must be placed on bottom of page (just before </body>).
// Or you can use getFileSize.init(); + run getFileSize.run(); after "DOMContentLoaded" or "load" event.

var getFileSize = {
	//=== Settings begin
	maskURLsAllowed: /:\/+[^\/]+\/.+\.[^.?=&#]+$/i,
	maskURLsExclusions: /\.([sx]?html?|php|apsx?)(\?[^?#]*)?(#[^#]*)?$/i,
	strings: {
		bytes: { en: "bytes", ru: "байт" },
		kb: { en: "KiB", ru: "Кбайт" },
		mb: { en: "MiB", ru: "Мбайт" },
		timeComment: { en: "Loading time: ", ru: "Время загрузки: " },
		warnComment: { en: "The file is probably missing on the server", ru: "Возможно, файл отсутствует на сервере" }
	},
	showTime: 1, // 0 - no, 1 - in title tag, 2 - after size
	infoClass: "fileInfo",
	warnClass: "fileWarn",
	styles: "span.%infoClass% { color: gray; }\n"
		+ "a:hover + span.%infoClass% { color: #00b; }\n"
		+ "span.%warnClass% { color: #800; }\n"
		+ "a:hover + span.%warnClass% { color: #b00; }",
	//=== Settings end
	init: function(canRun) {
		this.addStyles();
		if(canRun)
			this.run();
	},
	run: function() {
		var ajax = new Ajax();
		var links = document.getElementsByTagName("a"), a, h;
		var domain = this.getDomain(location.href);
		for(var i = 0, len = links.length; i < len; i++) {
			a = links[i], h = a.href;
			if(
				h
				&& this.getDomain(h) == domain
				&& this.maskURLsAllowed.test(h) && !this.maskURLsExclusions.test(h)
			)
				ajax.head(h, null, this.callback, this, [a]);
		}
	},
	addStyles: function() {
		var s = document.createElement("style");
		s.type = "text/css";
		var css = this.styles
			.replace(/%infoClass%/g, this.infoClass)
			.replace(/%warnClass%/g, this.warnClass);
		if(s.styleSheet) // IE
			s.styleSheet.cssText = css;
		else
			s.appendChild(document.createTextNode(css));
		(document.getElementsByTagName("head")[0] || document.documentElement).appendChild(s);
	},
	getDomain: function(uri) {
		var host = /^\w+:\/+([^\/:]+)/.test(uri) && RegExp.$1;
		return host && host.split(".").slice(-2).join(".");
	},
	callback: function(request, ok, a) {
		this[ok ? "addInfo" : "addWarn"](a, request);
	},
	addInfo: function(a, request) {
		var size = request.getResponseHeader("Content-Length");
		var lastMod = this.showTime ? request.getResponseHeader("Last-Modified") : null;
		if(size || lastMod) {
			if(size || (this.showTime == 2 && lastMod)) {
				var text = this.convertInfo(size, this.showTime == 2 ? lastMod : null);
				var s = this.addSpan(a, text, this.infoClass);
			}
			if(this.showTime == 1 && lastMod)
				a.title = this.getStr("timeComment") + this.toLocaleDate(lastMod);
		}
		else
			this._log("Size of " + a.href + " is " + size);
	},
	addWarn: function(a, request) {
		a.title = this.getStr("warnComment");
		this.addSpan(a, " [x]", this.warnClass);
	},
	addSpan: function(a, text, sClass) {
		var s = document.createElement("span");
		s.className = sClass;
		s.appendChild(document.createTextNode(text));
		var ns = a.nextSibling, pn = a.parentNode;
		if(ns) pn.insertBefore(s, ns);
		else   pn.appendChild(s);
		return s;
	},
	convertInfo: function(size, lastMod) {
		var res = "";
		if(size) {
			var res = this.formatNum(size) + " " + this.getStr("bytes");
			if(size >= 1024)
				res += ", " + this.formatNum((size/1024).toFixed(2)) + " " + this.getStr("kb");
			if(size >= 1024*1024)
				res += ", " + this.formatNum((size/1024/1024).toFixed(2)) + " " + this.getStr("mb");
		}
		if(lastMod)
			res += (size ? " \u2013 " : "") + this.toLocaleDate(lastMod);
		return " [" + res + "]";
	},
	formatNum: function(n) {
		return n.toString().replace(/(\d)(?=(\d{3})+(\D|$))/g, "$1 ");
	},
	toLocaleDate: function(dStr) { // http://wdh.suncloud.ru/js11.htm#mparse
		return new Date(dStr).toLocaleString();
	},
	isRussian: function() {
		return /^ru/i.test(navigator.language || navigator.browserLanguage || "") // browser language
			|| /[а-яё]{3,}/i.test(new Date().toLocaleString()); // or russian letters in date
	},
	getStr: function(sName) {
		if(!this._lang)
			this._lang = this.isRussian() ? "ru" : "en";
		return this.strings[sName][this._lang];
	},
	_log: function(msg) {
		if("console" in window)
			console.log("[getFileSize]: " + msg);
	}
};
getFileSize.init(true);