'use strict';

const Bluebird = require('bluebird');
const dns = require('dns');
const fs = require('fs');
const http = require('http');
const https = require('https');
const {match, bind} = require('./match');
const path = require('path');
const { parse: urlParse, format: urlFormat } = require('url');
const util = require('util');
const qs = require('querystring');

const { stylesheets } = require('./assets');
const clean = require('./clean');
const templates = require('./templates');
const config = require('../config');
const consumerKey = config.api.consumer_key;

const openSearchXML =
	fs.readFileSync(path.join(__dirname, 'opensearch.xml'), 'utf8')
		.replace(/##prefix##/g, config.prefix);

const getAsync = url =>
	new Bluebird((resolve, reject) => {
		https.get(url, resolve)
			.on('error', reject);
	});

const FRONTING_BLOG = 'staff.tumblr.com';

const lookupTumblr = (hostname, options, callback) => {
	dns.lookup(FRONTING_BLOG, options, callback);
};

const getDomain = name =>
	name.includes('.') ?
		name :
		name + '.tumblr.com';

/**
 * Determine whether a blog with a given domain exists, even if it’s hidden from guests, without making a DNS request for the domain or exposing it in SNI.
 */
const blogExists = name =>
	new Bluebird((resolve, reject) => {
		https.request({
			hostname: getDomain(name),
			method: 'HEAD',
			servername: FRONTING_BLOG,
			lookup: lookupTumblr,
		}, response => {
			switch (response.statusCode) {
			case 404:
				resolve(false);
				break;

			case 302:
			case 200:
				resolve(true);
				break;

			default:
				reject(new Error(`Unexpected status code ${response.statusCode} while checking blog existence`));
			}
		})
			.once('error', reject)
			.end();
	});

const blogVisible = name =>
	new Bluebird((resolve, reject) => {
		https.request({
			hostname: 'api.tumblr.com',
			method: 'HEAD',
			path: `/v2/blog/${name}/info?api_key=${consumerKey}`,
		}, response => {
			switch (response.statusCode) {
			case 404:
				resolve(false);
				break;

			case 200:
				resolve(true);
				break;

			default:
				reject(new Error(`Unexpected status code ${response.statusCode} while checking blog visibility`));
			}
		})
			.on('error', reject)
			.end();
	});

const getJSON = url =>
	getAsync(url).then(response => {
		if (![200, 404].includes(response.statusCode)) {
			return Bluebird.reject(new Error(`Unexpected status code: ${response.statusCode}`));
		}

		const bodyParts = [];

		response.on('data', part => {
			bodyParts.push(part);
		});

		return new Bluebird((resolve, reject) => {
			response.on('end', () => {
				const body = Buffer.concat(bodyParts).toString('utf8');
				const data = JSON.parse(body);

				if (!data.meta || data.meta.status !== 200) {
					reject(data);
				} else {
					resolve(data);
				}
			});

			response.on('error', reject);
		});
	});

const notFound = (request, response, name, isPost, original) => {
	const infoP =
		(isPost ? blogVisible(name) : Bluebird.resolve(false))
			.then(visible => {
				if (visible) {
					return { checked: true, exists: true, visible: true };
				}

				return blogExists(name).then(exists =>
					({ checked: true, exists, visible: false })
				);
			})
			.catch(() => ({ checked: false }));

	infoP.done(info => {
		info = Object.assign({
			name,
			domain: getDomain(name),
			original,
		}, info);

		response.statusCode = 404;
		setHtml(response);
		response.end(templates.notFound(info));
	});
};

const isNotFound = error =>
	'meta' in error && error.meta.status === 404;

const setHtml = response => {
	response.setHeader('Content-Type', 'text/html; charset=utf-8');
};

const setText = response => {
	response.setHeader('Content-Type', 'text/plain; charset=utf-8');
};

const viewPost = (params, request, response) => {
	const url = util.format(
		'https://api.tumblr.com/v2/blog/%s/posts?id=%s&reblog_info=true&notes_info=true&api_key=%s',
		params.name, params.id, consumerKey
	);

	const success = data => {
		const apiResponse = data.response;
		apiResponse.name = params.name;
		apiResponse.domain = urlParse(apiResponse.blog.url).hostname;
		apiResponse.pageUri = request.uri;

		setHtml(response);
		response.end(templates.blog(apiResponse));
	};

	const failure = error => {
		console.error(error);

		response.statusCode = 500;
		setText(response);
		response.end('The Tumblr API request failed.');
	};

	getJSON(url)
		.then(success)
		.catch(isNotFound, () => {
			let original = `https://${getDomain(params.name)}/posts/${params.id}`;

			if (params.slug) {
				original += '/' + encodeURIComponent(params.slug);
			}

			return notFound(request, response, params.name, true, original);
		})
		.catch(failure)
		.done();
};

const viewBlog = (params, request, response) => {
	const offset = request.query.offset | 0;

	const query = {
		offset: offset,
		api_key: consumerKey,
		reblog_info: true,
	};

	if (params.tag) {
		query.tag = params.tag;
	}

	const url = util.format(
		'https://api.tumblr.com/v2/blog/%s/posts?%s',
		params.name, qs.stringify(query)
	);

	const success = data => {
		const apiResponse = data.response;
		apiResponse.limit = 20;
		apiResponse.offset = offset;
		apiResponse.name = params.name;
		apiResponse.domain = urlParse(apiResponse.blog.url).hostname;
		apiResponse.tag = params.tag;
		apiResponse.pageUri = request.uri;

		setHtml(response);
		response.end(templates.blog(apiResponse));
	};

	const failure = error => {
		console.error(error);

		response.statusCode = 500;
		setText(response);
		response.end('The Tumblr API request failed.');
	};

	getJSON(url)
		.then(success)
		.catch(isNotFound, () => {
			const original = `https://${getDomain(params.name)}/`;

			return notFound(request, response, params.name, false, original);
		})
		.catch(failure)
		.done();
};

const viewShortened = (params, request, response) => {
	const code = encodeURIComponent(params.code);

	const fallback = () => {
		response.writeHead(303, { 'Location': 'https://tmblr.co/' + code });
		response.end();
	};

	https.request({
		method: 'HEAD',
		hostname: 'tmblr.co',
		path: '/' + code,
	}, tumblrResponse => {
		if (tumblrResponse.statusCode !== 302 || !('location' in tumblrResponse.headers)) {
			console.error('Unexpected HTTP %i with headers %O from tmblr.co', tumblrResponse.statusCode, tumblrResponse.headers);
			fallback();
			return;
		}

		response.writeHead(301, { 'Location': clean.rewriteLinkString(tumblrResponse.headers.location, 'tmblr.co') });
		response.end();
	})
		.on('error', error => {
			console.error(error);
			fallback();
		})
		.end();
};

const getOpenSearch = (params, request, response) => {
	response.writeHead(200, { 'Content-Type': 'application/opensearchdescription+xml' });
	response.end(openSearchXML);
};

const getRedirectForm = (params, request, response) => {
	const query =
		typeof request.query.u === 'string' ?
			request.query.u.trim() || null :
			null;

	if (query !== null) {
		const url = urlParse(
			/^https?:/.test(query) ?
				query :
				'https://' + query,
			false,
			true
		);

		if (url.hostname !== null && !url.hostname.includes('.')) {
			url.hostname = url.hostname + '.tumblr.com';
		}

		const rewritten = clean.rewriteLink(url, url.hostname);

		if (rewritten.hostname === null && rewritten.pathname !== null) {
			response.writeHead(303, { 'Location': urlFormat(rewritten) });
			response.end();
			return;
		}
	}

	setHtml(response);
	response.end(templates.redirect({ query }));
};

const routes = [
	match(['GET'], getRedirectForm),
	match(['GET', 'blog', bind('name')], viewBlog),
	match(['GET', 'blog', bind('name'), 'tagged', bind('tag')], viewBlog),
	match(['GET', 'blog', bind('name'), 'post', bind('id'), bind('slug')], viewPost),
	match(['GET', 'blog', bind('name'), 'post', bind('id')], viewPost),
	match(['GET', 'tmblr', bind('code')], viewShortened),
	match(['GET', 'opensearch.xml'], getOpenSearch),
];

const styleSrc =
	// TODO: Object.values after support for Node 6 ends
	Object.keys(stylesheets)
		.map(key => stylesheets[key])
		.map(resource => "'" + resource.integrity + "'")
		.join(' ');

const serve = (request, response) => {
	let requestHost = request.headers.host;

	if (requestHost !== undefined) {
		const i = requestHost.lastIndexOf(':');

		if (i !== -1 && /^\d{1,5}$/.test(requestHost.substring(i + 1))) {
			requestHost = requestHost.substring(0, i);
		}
	}

	response.setHeader(
		'Content-Security-Policy',
		`default-src 'none'; style-src ${styleSrc}; img-src https://api.tumblr.com https://*.media.tumblr.com; media-src https://a.tumblr.com https://ve.media.tumblr.com https://vtt.tumblr.com; form-action 'self'; frame-ancestors 'none'`
	);
	response.setHeader('Referrer-Policy', 'no-referrer');
	response.setHeader('X-Content-Type-Options', 'nosniff');

	if (requestHost !== config.host) {
		response.statusCode = 400;
		setText(response);
		response.end('Unexpected Host header');
		return;
	}

	const uri = urlParse(request.url, true);
	const parts = [request.method].concat(uri.pathname.split('/').slice(1).map(decodeURIComponent));

	if (parts[parts.length - 1] === '') {
		parts.pop();
	}

	request.uri = uri;
	request.query = uri.query;

	for (const route of routes) {
		const handler = route(parts);

		if (handler) {
			handler(request, response);
			return;
		}
	}

	response.statusCode = 404;
	setText(response);
	response.end('Not found.');
};

{
	const server = http.createServer(serve);

	server.listen(process.env.PORT, '::1');

	server.once('listening', () => {
		const address = server.address();
		const where =
			typeof address === 'string' ?
				`${address} (as ${config.host})` :
				`http://${config.host}:${address.port}/ (${address.address})`;

		console.error(`ready at ${where}`);
	});

	process.once('SIGINT', () => {
		console.error('Shutting down…');
		server.close();
	});
}
