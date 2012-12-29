// (c) Infocatcher 2011-2012
// version 0.1.4 - 2012-05-15

// Dependencies:
//   eventListener object - eventListener.js

// Usage (in PHP):
//	<span class="time"><?php echo getDateFromDB(); ?></span>
//	...
//	<script type="text/javascript">
//		elapsedTime.init("<?php echo date('Y-m-d H:i:s P'); ?>");
//	</script>

var elapsedTime = {
	timeClass: "time",
	tolerance: 15*60*1000, // Joke from Nepal :)
	_offset: 0,
	_tz: "",
	init: function(serverTime) {
		this.timeClassPattern = new RegExp("(^|\\s)" + this.timeClass + "(\\s|$)");
		if(serverTime && /^http/i.test(location.protocol)) {
			if(/ ([+-]\d\d:[0-5]\d)$/.test(serverTime)) {
				this._tz = ", UTC" + RegExp.$1;
				serverTime = RegExp.leftContext;
			}
			serverTime = this.parseDateString(serverTime);
			if(serverTime) {
				var offset = Math.round((new Date() - serverTime)/this.tolerance)*this.tolerance;
				if(Math.abs(offset) <= 24*60*60*1000)
					this._offset = offset;
			}
		}
		if(this._offset)
			this.recalc();
		else
			this.recalcDelay(1000);

		eventListener.add(document, "mouseover", this.mouseHandler,     this);
		eventListener.add(document, "mouseout",  this.mouseHandler,     this);
		eventListener.add(document, "mousemove", this.mousemoveHandler, this);
		eventListener.add(window, "unload", function() {
			eventListener.remove(window, "unload", arguments.callee);
			eventListener.remove(document, "mouseover", this.mouseHandler);
			eventListener.remove(document, "mouseout",  this.mouseHandler);
			eventListener.remove(document, "mousemove", this.mousemoveHandler);
		}, this);
	},
	recalcDelay: function(delay) {
		var _this = this;
		setTimeout(function() {
			_this.recalc();
		}, delay || 60*1000);
	},
	recalc: function() {
		var nodes = this.getNodes();
		for(var i = 0, l = nodes.length; i < l; i++)
			this.updateNode(nodes[i]);
		this.recalcDelay();
	},
	getNodes: function() {
		if(document.getElementsByClassName)
			return document.getElementsByClassName(this.timeClass);
		var ret = [];
		var nodes = document.getElementsByTagName("*");
		for(var i = 0, l = nodes.length; i < l; i++) {
			var node = nodes[i];
			if(this.timeClassPattern.test(node.className))
				ret.push(node);
		}
		return ret;
	},
	updateNode: function(node) {
		var time = this.getNodeTime(node);
		if(!time)
			return false;
		var elapsedTime = Math.round((new Date().getTime() - time)/1000);
		this.setNodeElapsedTime(node, elapsedTime);
		return true;
	},
	getNodeTime: function(node) {
		if("__time" in node)
			return node.__time;
		var text = node.textContent || node.innerText;
		node.__origTime = " \n(" + (
			this._offset
				? "московское время: " + text + this._tz
				: "время московское" + this._tz
		) + ")";
		var time = this.parseDateString(text);
		if(time && this._offset) {
			time.setMilliseconds(time.getMilliseconds() + this._offset);
			this.setNodeTime(node, time);
		}
		return node.__time = time && time.getTime();
	},
	setNodeTime: function(node, time) {
		node.innerHTML = time.getFullYear() + "-" + this.padLeft(time.getMonth() + 1) + "-" + this.padLeft(time.getDate()) + " "
			+ this.padLeft(time.getHours()) + ":" + this.padLeft(time.getMinutes()) + ":" + this.padLeft(time.getSeconds());
	},
	setNodeElapsedTime: function(node, time) {
		var s = this.getElapsedTime(time) + node.__origTime;
		if(node.title != s)
			node.title = s;
	},
	parseDateString: function(s) {
		if(/^(\d{4})\D([01]?\d)\D([0-3]?\d)(\s+([0-2]?\d)\D([0-5]?\d)(\D([0-5]?\d))?)?$/.test(s))// yyyy.MM.dd[ HH:mm[:ss]]
			with(RegExp)
				return new Date($1, $2 - 1, $3, $5, $6, $8);
		return null;
	},
	padLeft: function(n) {
		var chr = "0";
		var cnt = 2;
		n = String(n);
		var l = n.length;
		return l < cnt
			? new Array(cnt - n.length + 1).join(chr) + n
			: n;
	},
	getElapsedTime: function(dt) { // time delta in seconds
		if(dt < 0)
			return "0 секунд назад";

		var time = "";

		var years = Math.floor(dt/31536000);
		dt -= years*31536000;
		var months = Math.floor(dt/2592000);
		if(years)
			time += this.pluralNum(years, "год", "года", "лет");
		if(months)
			time += (time ? " " : "") + this.pluralNum(months, "месяц", "месяца", "месяцев");
		if(!years) {
			dt -= months*2592000;
			var days = Math.floor(dt/86400);
			if(days)
				time += (time ? " " : "") + this.pluralNum(days, "день", "дня", "дней");
			if(!months && days <= 3) {
				dt -= days*86400;
				var hours = Math.floor(dt/3600);
				if(hours)
					time += (time ? " " : "") + this.pluralNum(hours, "час", "часа", "часов");
				if(!days && hours <= 10) {
					dt -= hours*3600;
					var minutes = Math.floor(dt/60);
					if(minutes)
						time += (time ? " " : "") + this.pluralNum(minutes, "минута", "минуты", "минут");
					if(!hours && minutes <= 10) {
						dt -= minutes*60;
						var seconds = dt;
						if(seconds || !minutes)
							time += (time ? " " : "") + this.pluralNum(seconds, "секунда", "секунды", "секунд");
					}
				}
			}
		}
		return time + " назад";
	},
	pluralNum: function(n, p1, p2, p3) {
		return n + " " + this.plural(n, p1, p2, p3);
	},
	plural: function(n, p1, p2, p3) {
		// https://developer.mozilla.org/en/Localization_and_Plurals#List_of_Plural_Rules
		var last = n % 10;
		var last2 = n % 100;
		if(last == 1 && last2 != 11) // 1 год, 101 год
			return p1;
		if(last >= 2 && last <= 4 && (last2 < 12 || last2 > 14)) // 2 года, 102 года
			return p2;
		return p3; // 5 лет
	},
	hoveredNode: null,
	updateNodeTwice: function(node) {
		var ok = this.updateNode(node);
		if(ok) {
			var _this = this;
			setTimeout(function() {
				_this.updateNode(node);
			}, 400);
		}
		return ok;
	},
	mouseHandler: function(e) {
		var node = e.target;
		if(!this.timeClassPattern.test(node.className))
			return;
		if(e.type == "mouseover" && !this.updateNodeTwice(node))
			return;
		this.hoveredNode = e.type == "mouseover" && node;
	},
	mousemoveHandler: function(e) {
		this.hoveredNode && this.updateNodeTwice(this.hoveredNode);
	}
};