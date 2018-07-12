'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const addIntegrity = content => {
	const digest =
		crypto.createHash('sha256')
			.update(content, 'utf8')
			.digest('base64');

	return {
		content,
		integrity: 'sha256-' + digest,
	};
};

const readResourceSync = (resourcePath, encoding) =>
	addIntegrity(
		fs.readFileSync(
			path.join(__dirname, resourcePath),
			encoding
		)
	);

module.exports = {
	stylesheets: {
		blog: readResourceSync('css/blog.css', 'utf8'),
		notFound: readResourceSync('css/not-found.css', 'utf8'),
	},
};
