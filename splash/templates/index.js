'use strict';

var util = require('util');
var url = require('url');
var razorleaf = require('razorleaf');
var clean = require('../clean');

var templateLoader = new razorleaf.DirectoryLoader(__dirname, {
	globals: {
		Buffer: Buffer,
		url: url,
		inspect: util.inspect,
		clean: clean,
		s: function pluralize(quantity, singular, plural) {
			return util.format(quantity === 1 ? singular : plural, quantity);
		},
		relativeDate: function relativeDate(date) {
			var d = new Date() - date;
			var scale;
			var unit;

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

			var count = Math.round(d / scale);

			return count + ' ' + (count === 1 ? unit : unit + 's') + ' ago';
		},
		YOUTUBE_PERMALINK: /^https?:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})$/
	}
});

exports.blog = templateLoader.load('blog');
