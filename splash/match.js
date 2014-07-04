'use strict';

var slice = Array.prototype.slice;

function cons(head, tail) {
	var result = slice.call(tail);
	result.unshift(head);
	return result;
}

function Binding(name) {
	this.name = name;
}

function match(pattern, handler) {
	if (Array.isArray(pattern)) {
		return function matcher(value) {
			if (value.length !== pattern.length) {
				return false;
			}

			var bound = {};

			for (var i = 0; i < pattern.length; i++) {
				if (i >= value.length) {
					return false;
				}

				var part = pattern[i];

				if (part instanceof Binding) {
					bound[part.name] = value[i];
				} else if (value[i] !== part) {
					return false;
				}
			}

			return function () {
				return handler.apply(this, cons(bound, arguments));
			};
		};
	}

	throw new TypeError('Cannot match against this pattern type.');
}

function bind(name) {
	return new Binding(name);
}

exports.match = match;
exports.bind = bind;
