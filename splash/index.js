#!/usr/bin/env iojs

'use strict';

const Bluebird = require('bluebird');
const http = require('http');
const https = require('https');
const match_ = require('./match'), match = match_.match, bind = match_.bind;
const URL = require('url');
const util = require('util');
const qs = require('querystring');

const templates = require('./templates');
const config = require('../config');
const consumerKey = config.api.consumer_key;

function getAsync(url) {
	return new Bluebird(function (resolve) {
		https.get(url, resolve);
	});
}

function getJSON(url) {
	return getAsync(url).then(function (response) {
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
		'https://api.tumblr.com/v2/blog/%s/posts?id=%s&notes_info=true&api_key=%s',
		params.name, params.id, consumerKey
	);

	function success(data) {
		const apiResponse = data.response;
		apiResponse.name = params.name;
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
		api_key: consumerKey
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

function proxyVideo(params, request, response) {
	response.writeHead(500, { 'Content-Type': 'text/plain' });
	response.end('Video proxying has been temporarily removed.');
}

const routes = [
	match(['GET', 'blog', bind('name')], viewBlog),
	match(['GET', 'blog', bind('name'), ''], viewBlog),
	match(['GET', 'blog', bind('name'), 'tagged', bind('tag')], viewBlog),
	match(['GET', 'blog', bind('name'), 'post', bind('id'), bind('slug')], viewPost),
	match(['GET', 'blog', bind('name'), 'post', bind('id')], viewPost),
	match(['GET', 'video', bind('id')], proxyVideo),
];

function serve(request, response) {
	const uri = URL.parse(request.url, true);
	const parts = [request.method].concat(uri.pathname.split('/').slice(1).map(decodeURIComponent));

	request.uri = uri;
	request.query = uri.query;

	for (let route of routes) {
		const handler = route(parts);

		if (handler) {
			handler(request, response);
			return;
		}
	}

	response.writeHead(404, { 'Content-Type': 'text/plain' });
	response.end('Not found.');
}

const server = http.createServer(serve);
server.listen('/tmp/splash.sock');

process.once('SIGINT', function () {
	server.close(function () {
		process.exit(0);
	});
});
