'use strict';

var url = require('url');
var htmlparser = require('htmlparser2');
var he = require('he');
var templateUtilities = require('razorleaf/utilities');

var safeElements = [
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
	'table', 'caption', 'tbody', 'thead', 'tfoot', 'tr', 'td', 'th'
];

var safeAttributes = {
	_global: ['title', 'dir', 'lang'],
	data: ['value'],
	img: ['alt', 'longdesc'],
	ol: ['type', 'start'],
	ul: ['type'],
	time: ['datetime']
};

// Adapted from https://www.iana.org/assignments/uri-schemes/uri-schemes.xhtml
var safeProtocols = [
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
	'telnet:', 'tv:', 'view-source:', 'ymsgr:', 'finger:', 'feed:'
];

var httpsDomains = [
	'www.tumblr.com',
	'api.tumblr.com',
	'tumblr.com',
	'imgur.com',
	'i.imgur.com'
];

var TUMBLR_DOMAIN = /^[\w-]+\.tumblr\.com$/i;
var TUMBLR_COMPATIBLE_PATH = /^\/(?:post\/\d+(?:\/|$))?/;
var TUMBLR_MEDIA = /^(?:\d+\.)?media\.tumblr\.com$/;
var TUMBLR_AUDIO = /^\/audio_file\/[^\/]+\/\d+\/(tumblr_[a-zA-Z\d]+)$/;
var YOUTUBE_THUMBNAIL_DOMAIN = /^[\w-]+\.ytimg\.com$/i;

function isSafeUri(uriInfo) {
	return safeProtocols.indexOf(uriInfo.protocol) !== -1;
}

function rewriteLink(uriInfo) {
	if (uriInfo.port !== null) {
		return uriInfo;
	}

	var hostname = uriInfo.hostname;
	var pathname = uriInfo.pathname;
	var match;

	if (hostname === 'www.tumblr.com' && (match = TUMBLR_AUDIO.exec(pathname))) {
		uriInfo.protocol = 'https:';
		uriInfo.hostname = 'a.tumblr.com';
		uriInfo.host = null;
		uriInfo.pathname = '/' + match[1] + 'o1.mp3';
		uriInfo.path = null;

		return uriInfo;
	}

	if (uriInfo.protocol === 'https:') {
		if (TUMBLR_MEDIA.test(hostname) || YOUTUBE_THUMBNAIL_DOMAIN.test(hostname)) {
			uriInfo.embeddable = true;
		}

		// TODO: blog-relative paths where uriInfo.protocol is null
		return uriInfo;
	}

	if (uriInfo.protocol !== 'http:') {
		return uriInfo;
	}

	if (httpsDomains.indexOf(hostname) !== -1) {
		uriInfo.protocol = 'https:';
	} else if (TUMBLR_MEDIA.test(hostname)) {
		uriInfo.protocol = 'https:';

		// Some servers (37, for example) don’t have a proper certificate yet
		uriInfo.hostname = '1.media.tumblr.com';
		uriInfo.host = null;

		uriInfo.embeddable = true;
	} else if (TUMBLR_DOMAIN.test(hostname) && TUMBLR_COMPATIBLE_PATH.test(pathname)) {
		uriInfo.pathname = '/blog/' + hostname + pathname;
		uriInfo.protocol = null;
		uriInfo.hostname = null;
		uriInfo.host = null;
		uriInfo.slashes = false;
	} else if (YOUTUBE_THUMBNAIL_DOMAIN.test(hostname)) {
		uriInfo.protocol = 'https:';
		uriInfo.embeddable = true;
	}

	return uriInfo;
}

function rewriteLinkString(uri) {
	return url.format(rewriteLink(url.parse(uri, false, true)));
}

function cleanAttributes(name, attributes) {
	return Object.keys(attributes).map(function (attribute) {
		var value = attributes[attribute];

		if (name === 'a' && attribute === 'href') {
			var uriInfo = url.parse(value, false, true);

			if (!isSafeUri(uriInfo)) {
				return;
			}

			return ' href="' + templateUtilities.escapeAttributeValue(url.format(rewriteLink(uriInfo))) + '"';
		}

		var safeElementAttributes = safeAttributes[name];

		if (safeAttributes._global.indexOf(attribute) === -1 && (!safeElementAttributes || safeElementAttributes.indexOf(attribute) === -1)) {
			return;
		}

		return ' ' + attribute + '="' + templateUtilities.escapeAttributeValue(value) + '"';
	}).join('');
}

function rewriteHTML(html) {
	var output = '';
	var open = [];

	var parser = new htmlparser.Parser({
		onopentag: function (name, attributes) {
			Object.keys(attributes).forEach(function (key) {
				var value = attributes[key];

				if (value) {
					attributes[key] = he.decode(value);
				}
			});

			// TODO: srcset
			if (name === 'img' && attributes.src) {
				var uriInfo = url.parse(attributes.src, false, true);

				if (isSafeUri(uriInfo)) {
					var rewrittenUri = rewriteLink(uriInfo);

					if (rewrittenUri.embeddable) {
						output += '<img src="' + templateUtilities.escapeAttributeValue(url.format(rewrittenUri)) + '"' + cleanAttributes('img', attributes) + '>';
					} else {
						var linkable = open.indexOf('a') === -1;

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

			if (safeElements.indexOf(name) === -1) {
				return;
			}

			output += '<' + name + cleanAttributes(name, attributes) + '>';

			if (templateUtilities.voidTags.indexOf(name) === -1) {
				open.push(name);
			}
		},
		ontext: function (text) {
			output += templateUtilities.escapeContent(he.decode(text));
		},
		onclosetag: function (name) {
			if (open[open.length - 1] === name) {
				output += '</' + name + '>';
				open.pop();
			}
		}
	});

	parser.end(html);

	return output;
}

exports.rewriteLink = rewriteLink;
exports.rewriteLinkString = rewriteLinkString;
exports.rewriteHTML = rewriteHTML;
