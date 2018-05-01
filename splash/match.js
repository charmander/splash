'use strict';

class Binding {
	constructor(name) {
		this.name = name;
	}
}

const match = (pattern, handler) => {
	if (Array.isArray(pattern)) {
		const matcher = value => {
			if (value.length !== pattern.length) {
				return false;
			}

			const bound = {};

			for (let i = 0; i < pattern.length; i++) {
				if (i >= value.length) {
					return false;
				}

				const part = pattern[i];

				if (part instanceof Binding) {
					bound[part.name] = value[i];
				} else if (value[i] !== part) {
					return false;
				}
			}

			return (...args) => handler(bound, ...args);
		};

		return matcher;
	}

	throw new TypeError('Cannot match against this pattern type.');
};

const bind = name => new Binding(name);

module.exports = {
	match,
	bind,
};
