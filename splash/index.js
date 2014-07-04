'use strict';

var URL = require('url');
var util = require('util');
var http = require('http');
var https = require('https');
var match_ = require('./match');
var templates = require('./templates');

var match = match_.match;
var bind = match_.bind;

var config = require('../config');
var consumerKey = config.api.consumer_key;

function viewPost(params, request, response) {
	https.get(
		util.format('https://api.tumblr.com/v2/blog/%s/posts?id=%s&notes_info=true&api_key=%s', params.name, params.id, consumerKey),
		function (apiResponse) {
			var bodyParts = [];
			var bodySize = 0;

			apiResponse.on('data', function (part) {
				bodyParts.push(part);
				bodySize += part.length;
			});

			apiResponse.on('end', function () {
				var body = Buffer.concat(bodyParts, bodySize).toString('utf8');
				var data;

				try {
					data = JSON.parse(body);
				} catch (e) {
					response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
					response.end('Failed to decode response.\n\n' + body);
					console.error(e.stack);
					return;
				}

				if (!data.meta || data.meta.status !== 200) {
					response.writeHead(502, { 'Content-Type': 'text/plain' });
					response.end('The Tumblr API returned an error.');
					console.error(data);
					return;
				}

				var apiResponse = data.response;
				apiResponse.name = params.name;

				response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
				response.end(templates.blog(apiResponse));
			});
		}
	);
}

function viewBlog(params, request, response) {
	var offset = request.query.offset | 0;

	https.get(
		util.format('https://api.tumblr.com/v2/blog/%s/posts?offset=%d&api_key=%s', params.name, offset, consumerKey),
		function (apiResponse) {
			var bodyParts = [];
			var bodySize = 0;

			apiResponse.on('data', function (part) {
				bodyParts.push(part);
				bodySize += part.length;
			});

			apiResponse.on('end', function () {
				var body = Buffer.concat(bodyParts, bodySize).toString('utf8');
				var data;

				try {
					data = JSON.parse(body);
				} catch (e) {
					response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
					response.end('Failed to decode response.\n\n' + body);
					console.error(e.stack);
					return;
				}

				if (!data.meta || data.meta.status !== 200) {
					response.writeHead(502, { 'Content-Type': 'text/plain' });
					response.end('The Tumblr API returned an error.');
					console.error(data);
					return;
				}

				var apiResponse = data.response;
				apiResponse.limit = 20;
				apiResponse.offset = offset;
				apiResponse.name = params.name;

				response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
				response.end(templates.blog(apiResponse));
			});
		}
	);
}

var routes = [
	match(['GET', 'blog', bind('name')], viewBlog),
	match(['GET', 'blog', bind('name'), ''], viewBlog),
	match(['GET', 'blog', bind('name'), 'post', bind('id'), bind('slug')], viewPost),
	match(['GET', 'blog', bind('name'), 'post', bind('id')], viewPost),
	match(['GET', 'video', bind('id')], function proxyVideo(params, request, response) {
		response.writeHead(501, { 'Content-Type': 'text/plain' });
		response.end('Video proxying has been temporarily removed.');
	})
];

function serve(request, response) {
	var uri = URL.parse(request.url, true);
	var parts = [request.method].concat(uri.pathname.split('/').slice(1));

	request.query = uri.query;

	for (var i = 0; i < routes.length; i++) {
		var route = routes[i];
		var handler = route(parts);

		if (handler) {
			handler(request, response);
			return;
		}
	}

	response.writeHead(404, { 'Content-Type': 'text/plain' });
	response.end('Not found.');
}

var server = http.createServer(serve);
server.listen('/tmp/splash.sock');

process.once('SIGINT', function () {
	server.close(function () {
		process.exit(0);
	});
});
