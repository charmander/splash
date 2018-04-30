'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const addIntegrity = content => {
	const digest =
		crypto.createHash('sha256')
			.update(content)
			.digest('base64')
			.replace('==', '');

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
	stylesheet: readResourceSync('css/blog.css'),
};
