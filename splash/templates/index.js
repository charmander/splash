'use strict';

const util = require('util');
const url = require('url');
const razorleaf = require('razorleaf');
const clean = require('../clean');

const templateLoader = new razorleaf.DirectoryLoader(__dirname, {
	globals: {
		Buffer: Buffer,
		url: url,
		inspect: util.inspect,
		clean: clean,
		s: function pluralize(quantity, singular, plural) {
			return util.format(quantity === 1 ? singular : plural, quantity);
		},
		relativeDate: function relativeDate(date) {
			const d = new Date() - date;
			let scale;
			let unit;

			if (d >= 1000 * 60 * 60 * 24 * 365) {
				scale = 1000 * 60 * 60 * 24 * 365;
				unit = 'year';
			} else if (d >= 1000 * 60 * 60 * 24 * 30) {
				scale = 1000 * 60 * 60 * 24 * 30;
				unit = 'month';
			} else if (d >= 1000 * 60 * 60 * 24) {
				scale = 1000 * 60 * 60 * 24;
				unit = 'day';
			} else if (d >= 1000 * 60 * 60) {
				scale = 1000 * 60 * 60;
				unit = 'hour';
			} else if (d >= 1000 * 60) {
				scale = 1000 * 60;
				unit = 'minute';
			} else if (d >= 1000) {
				scale = 1000;
				unit = 'second';
			} else {
				scale = 1;
				unit = 'millisecond';
			}

			const count = Math.round(d / scale);

			return count + ' ' + (count === 1 ? unit : unit + 's') + ' ago';
		},
		update: function update(obj, changes) {
			var result = {};

			for (let k of Object.keys(obj)) {
				result[k] = obj[k];
			}

			for (let k of Object.keys(changes)) {
				result[k] = changes[k];
			}

			return result;
		},
		YOUTUBE_PERMALINK: /^https?:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})$/
	}
});

exports.blog = templateLoader.load('blog');
