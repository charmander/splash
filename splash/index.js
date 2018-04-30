'use strict';

const Bluebird = require('bluebird');
const http = require('http');
const https = require('https');
const {match, bind} = require('./match');
const URL = require('url');
const util = require('util');
const qs = require('querystring');

const {stylesheet} = require('./assets');
const templates = require('./templates');
const config = require('../config');
const consumerKey = config.api.consumer_key;

function getAsync(url) {
	return new Bluebird(function (resolve, reject) {
		https.get(url, resolve)
			.on('error', reject);
	});
}

function getJSON(url) {
	return getAsync(url).then(function (response) {
		if (response.statusCode !== 200) {
			return Bluebird.reject(new Error(`Unexpected status code: ${response.statusCode}`));
		}

		const bodyParts = [];

		response.on('data', function (part) {
			bodyParts.push(part);
		});

		return new Bluebird(function (resolve, reject) {
			response.on('end', function () {
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
}

function viewPost(params, request, response) {
	const url = util.format(
		'https://api.tumblr.com/v2/blog/%s/posts?id=%s&reblog_info=true&notes_info=true&api_key=%s',
		params.name, params.id, consumerKey
	);

	function success(data) {
		const apiResponse = data.response;
		apiResponse.name = params.name;
		apiResponse.domain = URL.parse(apiResponse.blog.url).hostname;
		apiResponse.pageUri = request.uri;

		response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
		response.end(templates.blog(apiResponse));
	}

	function failure(error) {
		response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
		response.end('The Tumblr API request failed.');
		console.error(error);
	}

	getJSON(url).done(success, failure);
}

function viewBlog(params, request, response) {
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

	function success(data) {
		const apiResponse = data.response;
		apiResponse.limit = 20;
		apiResponse.offset = offset;
		apiResponse.name = params.name;
		apiResponse.domain = URL.parse(apiResponse.blog.url).hostname;
		apiResponse.pageUri = request.uri;

		response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
		response.end(templates.blog(apiResponse));
	}

	function failure(error) {
		response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
		response.end('The Tumblr API request failed.');
		console.error(error);
	}

	getJSON(url).done(success, failure);
}

const routes = [
	match(['GET', 'blog', bind('name')], viewBlog),
	match(['GET', 'blog', bind('name'), ''], viewBlog),
	match(['GET', 'blog', bind('name'), 'tagged', bind('tag')], viewBlog),
	match(['GET', 'blog', bind('name'), 'post', bind('id'), bind('slug')], viewPost),
	match(['GET', 'blog', bind('name'), 'post', bind('id')], viewPost),
];

function serve(request, response) {
	let requestHost = request.headers.host;

	if (requestHost !== undefined) {
		const i = requestHost.lastIndexOf(':');

		if (i !== -1 && /^\d{1,5}$/.test(requestHost.substring(i + 1))) {
			requestHost = requestHost.substring(0, i);
		}
	}

	response.setHeader(
		'Content-Security-Policy',
		`default-src 'none'; style-src '${stylesheet.integrity}'; img-src https://api.tumblr.com https://*.media.tumblr.com; media-src https://vtt.tumblr.com; form-action 'none'; frame-ancestors 'none'`
	);
	response.setHeader('Referrer-Policy', 'no-referrer');
	response.setHeader('X-Content-Type-Options', 'nosniff');

	if (requestHost !== config.host) {
		response.writeHead(400, { 'Content-Type': 'text/plain' });
		response.end('Unexpected Host header');
		return;
	}

	const uri = URL.parse(request.url, true);
	const parts = [request.method].concat(uri.pathname.split('/').slice(1).map(decodeURIComponent));

	request.uri = uri;
	request.query = uri.query;

	for (const route of routes) {
		const handler = route(parts);

		if (handler) {
			handler(request, response);
			return;
		}
	}

	response.writeHead(404, { 'Content-Type': 'text/plain' });
	response.end('Not found.');
}

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

	process.once('SIGINT', function () {
		console.error('Shutting down…');
		server.close();
	});
}
