'use strict';

const url = require('url');
const htmlparser = require('htmlparser2');
const he = require('he');
const { Markup } = require('razorleaf');
const templateUtilities = require('razorleaf/utilities');

const safeElements = new Set([
	'section', 'nav', 'article', 'aside',
	'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
	'header', 'footer',
	'address',
	'p', 'hr', 'pre', 'blockquote', 'ol', 'ul', 'li', 'dl', 'dt', 'dd',
	'figure', 'figcaption', 'div',
	'a', 'em', 'strong', 'small', 's', 'cite', 'q', 'dfn', 'abbr',
	'data', 'time', 'code', 'var', 'samp', 'kbd', 'sub', 'sup',
	'i', 'b', 'u', 'mark',
	'ruby', 'rt', 'rp', 'bdi', 'bdo',
	'span', 'br', 'wbr',
	'ins', 'del',
	'table', 'caption', 'tbody', 'thead', 'tfoot', 'tr', 'td', 'th',
]);

const globalSafeAttributes = new Set(['title', 'dir', 'lang']);

const elementSafeAttributes = new Map([
	['data', new Set(['value'])],
	['img', new Set(['alt', 'longdesc'])],
	['ol', new Set(['type', 'start'])],
	['ul', new Set(['type'])],
	['time', new Set(['datetime'])],
]);

const emptySet = new Set();

const isSafeAttribute = (element, attribute) =>
	globalSafeAttributes.has(attribute) ||
	(elementSafeAttributes.get(element) || emptySet).has(attribute);

// Adapted from https://www.iana.org/assignments/uri-schemes/uri-schemes.xhtml
const safeProtocols = new Set([
	// Common
	null, 'ftp:', 'http:', 'https:', 'mailto:', 'sftp:', 'shttp:', 'ssh:',
	// SCM
	'git:', 'hg:', 'svn:', 'cvs:',
	// Telephony
	'tel:', 'sms:', 'fax:', 'callto:', 'facetime:', 'skype:',
	// Chat
	'irc:', 'irc6:', 'ircs:', 'jabber:', 'xmpp:',
	// Miscellaneous
	'bitcoin:', 'magnet:', 'maps:', 'news:', 'nntp:', 'rtsp:', 'snews:', 'steam:',
	'telnet:', 'tv:', 'view-source:', 'ymsgr:', 'finger:', 'feed:',
]);

const httpsDomains = new Set([
	'www.tumblr.com',
	'api.tumblr.com',
	'tumblr.com',
	'imgur.com',
	'i.imgur.com',
]);

const TUMBLR_DOMAIN = /^[\w-]+\.tumblr\.com$/i;
const TUMBLR_COMPATIBLE_PATH = /^\/(?:$|post\/\d+(?:\/|$)|tagged\/.)/;
const TUMBLR_MEDIA = /^(?:\d+\.)?media\.tumblr\.com$/;
const TUMBLR_AUDIO = /^\/audio_file\/[^/]+\/\d+\/(tumblr_[a-zA-Z\d]+)$/;
const TUMBLR_SHORTENED = /^\/([a-zA-Z0-9_-]+)$/;

const isSafeUri = uriInfo =>
	safeProtocols.has(uriInfo.protocol);

const stripSuffix = (text, suffix) =>
	suffix !== '' && text.endsWith(suffix) ?
		text.slice(0, -suffix.length) :
		text;

const blogPath = (name, pathname = '/') =>
	'/blog/' + stripSuffix(name, '.tumblr.com') + pathname;

const rewriteLink = (uriInfo, baseDomain) => {
	if (baseDomain == null) {
		throw new Error('Base domain is required');
	}

	if (uriInfo.protocol === null) {
		if (uriInfo.hostname !== null) {
			uriInfo.protocol = 'https:';
		}
	} else if (uriInfo.protocol !== 'http:' && uriInfo.protocol !== 'https:' || uriInfo.port !== null) {
		return uriInfo;
	}

	const pathname = uriInfo.pathname;

	{
		let match;

		if (uriInfo.hostname === 'www.tumblr.com' && (match = TUMBLR_AUDIO.exec(pathname))) {
			uriInfo.protocol = 'https:';
			uriInfo.hostname = 'a.tumblr.com';
			uriInfo.host = null;
			uriInfo.pathname = '/' + match[1] + 'o1.mp3';
			uriInfo.path = null;

			return uriInfo;
		}
	}

	if (uriInfo.protocol === null && uriInfo.pathname !== null) {
		uriInfo.protocol = 'https:';
		uriInfo.hostname =
			baseDomain.includes('.') ?
				baseDomain :
				baseDomain + '.tumblr.com';
		uriInfo.host = null;
	}

	if (uriInfo.hostname === 'tmblr.co') {
		let match;

		if ((match = TUMBLR_SHORTENED.exec(pathname))) {
			return url.parse('/tmblr/' + match[1]);
		}

		uriInfo.protocol = 'https:';
		return uriInfo;
	}

	const hostname = uriInfo.hostname;

	if (httpsDomains.has(hostname)) {
		uriInfo.protocol = 'https:';
	} else if (TUMBLR_MEDIA.test(hostname)) {
		uriInfo.protocol = 'https:';
		uriInfo.embeddable = true;
	} else {
		const isTumblrDomain =
			TUMBLR_DOMAIN.test(hostname) ||
			baseDomain === hostname;

		if (isTumblrDomain && TUMBLR_COMPATIBLE_PATH.test(pathname)) {
			uriInfo.pathname = blogPath(hostname, pathname);
			uriInfo.protocol = null;
			uriInfo.hostname = null;
			uriInfo.host = null;
			uriInfo.slashes = false;
		}
	}

	return uriInfo;
};

const rewriteLinkString = (uri, baseDomain) =>
	url.format(rewriteLink(url.parse(uri, false, true), baseDomain));

const getSafeValue = (element, attribute, value, baseDomain) => {
	if (element === 'a' && attribute === 'href') {
		const uriInfo = url.parse(value, false, true);

		if (isSafeUri(uriInfo)) {
			return url.format(rewriteLink(uriInfo, baseDomain));
		}
	} else if (isSafeAttribute(element, attribute)) {
		return value;
	}

	return null;
};

const cleanAttributes = (name, attributes, baseDomain) =>
	Object.keys(attributes).map(attribute => {
		const value = attributes[attribute];
		const safeValue = getSafeValue(name, attribute, value, baseDomain);

		return safeValue === null ?
			'' :
			' ' + attribute + '="' + templateUtilities.escapeAttributeValue(safeValue) + '"';
	}).join('');

const rewriteHTML = (html, baseDomain) => {
	let output = '';
	const open = [];

	const parser = new htmlparser.Parser({
		onopentag: (name, attributes) => {
			Object.keys(attributes).forEach(key => {
				const value = attributes[key];

				if (value) {
					attributes[key] = he.decode(value);
				}
			});

			// TODO: srcset
			if (name === 'img' && attributes.src) {
				const uriInfo = url.parse(attributes.src, false, true);

				if (isSafeUri(uriInfo)) {
					const rewrittenUri = rewriteLink(uriInfo, baseDomain);

					if (rewrittenUri.embeddable) {
						output += '<img src="' + templateUtilities.escapeAttributeValue(url.format(rewrittenUri)) + '"' + cleanAttributes('img', attributes, baseDomain) + '>';
					} else {
						const linkable = !open.includes('a');

						if (linkable) {
							output += '<a href="' + templateUtilities.escapeAttributeValue(url.format(rewrittenUri)) + '">';

							if (attributes.alt) {
								output += '[' + templateUtilities.escapeContent(attributes.alt) + ']';
							} else {
								output += '[' + templateUtilities.escapeContent(attributes.src) + ']';
							}

							output += '</a>';
						} else if (attributes.alt) {
							output += '[Image “' + templateUtilities.escapeContent(attributes.alt) + '” at ' + templateUtilities.escapeContent(attributes.src) + ']';
						} else {
							output += '[Image at ' + templateUtilities.escapeContent(attributes.src) + ']';
						}
					}
				}

				return;
			}

			if (!safeElements.has(name)) {
				return;
			}

			output += '<' + name + cleanAttributes(name, attributes, baseDomain) + '>';

			if (templateUtilities.voidTags.indexOf(name) === -1) {
				open.push(name);
			}
		},
		ontext: text => {
			output += templateUtilities.escapeContent(he.decode(text));
		},
		onclosetag: name => {
			if (open[open.length - 1] === name) {
				output += '</' + name + '>';
				open.pop();
			}
		},
	});

	parser.end(html);

	return Markup.unsafe(output);
};

module.exports = {
	blogPath,
	rewriteLink,
	rewriteLinkString,
	rewriteHTML,
};
