'use strict';

const assert = require('assert');
const url = require('url');
const { inspect, format } = require('util');
const { Markup } = require('razorleaf');
const DirectoryLoader = require('razorleaf/directory-loader');
const clean = require('../clean');
const { stylesheets } = require('../assets');
const config = require('../../config');

assert(!stylesheets.blog.content.includes('</'));
assert(!stylesheets.notFound.content.includes('</'));
assert(!stylesheets.redirect.content.includes('</'));

const { includeData } = config;

const pluralize = (quantity, singular, plural) =>
	format(quantity === 1 ? singular : plural, quantity);

const update = (obj, changes) =>
	Object.assign({}, obj, changes);

const relativeDate = date => {
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
};

const templateLoader = new DirectoryLoader(__dirname);

exports.blog = templateLoader.load('blog', {
	globals: {
		clean,
		includeData,
		inspect,
		pluralize,
		relativeDate,
		update,
		url,
		stylesheet: Markup.unsafe(stylesheets.blog.content),
	},
});
exports.notFound = templateLoader.load('not-found', {
	globals: {
		stylesheet: Markup.unsafe(stylesheets.notFound.content),
	},
});
exports.redirect = templateLoader.load('redirect', {
	globals: {
		stylesheet: Markup.unsafe(stylesheets.redirect.content),
	},
});
