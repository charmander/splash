'use strict';

const Bluebird = require('bluebird');
const assert = require('assert');

const clean = require('./splash/clean');
const descriptions = [];

const rewriteHTML = html =>
	clean.rewriteHTML(html, 'staff')._html;

describe('HTML rewriter', function (it) {
	it('retains safe HTML', function () {
		function attempt(html) {
			assert.strictEqual(rewriteHTML(html), html);
		}

		attempt('Plain text.');
		attempt('<em>Basic</em> formatting.');
		attempt('<a href="https://charmander.me/">Valid links.</a>');

		assert.strictEqual(rewriteHTML('<B>Uppercase.</B>'), '<b>Uppercase.</b>');
	});

	it('cleans all JavaScript', function () {
		assert.strictEqual(rewriteHTML('<script>alert(1);</script>'), 'alert(1);');
		assert.strictEqual(rewriteHTML('<a href="javascript:alert(1)">link</a>'), '<a>link</a>');
		assert.strictEqual(rewriteHTML('<a href="#" onclick="alert(1)">link</a>'), '<a href="#">link</a>');
	});

	it('always produces valid, consistent HTML', function () {
		assert.strictEqual(rewriteHTML('>>> <<< & <blockquote><b>1 <i>2</b> 3</i> 4</u>'), '>>> &lt;&lt;&lt; &amp; <blockquote><b>1 <i>2</i></b> 3 4</blockquote>');
		assert.strictEqual(rewriteHTML('<b title=\'title\'></b> <i title=title></i>'), '<b title="title"></b> <i title="title"></i>');
		assert.strictEqual(rewriteHTML('<b title=\'title\'></b> <i title=title></i>'), '<b title="title"></b> <i title="title"></i>');
	});

	it('secures embedded, recognized content when possible', function () {
		assert.strictEqual(
			rewriteHTML('<img src="http://37.media.tumblr.com/foo.png" alt="Interesting photo">'),
			'<img src="https://37.media.tumblr.com/foo.png" alt="Interesting photo">');
		assert.strictEqual(
			rewriteHTML('<img src="http://media.tumblr.com/foo.png" alt="Interesting photo">'),
			'<img src="https://media.tumblr.com/foo.png" alt="Interesting photo">');
		assert.strictEqual(
			rewriteHTML('<img src="https://41.media.tumblr.com/foo.png" alt="Interesting photo">'),
			'<img src="https://41.media.tumblr.com/foo.png" alt="Interesting photo">');
	});

	it('doesn’t double-encode, and decodes when possible', function () {
		function attempt(entities, expected) {
			assert.strictEqual(rewriteHTML('<span title="' + entities + '">' + entities + '</span>'), '<span title="' + expected + '">' + expected + '</span>');
		}

		attempt('&amp;', '&amp;');
		attempt('&mdash;&#x2019;', '—’');
		attempt('&#x1f60a;', '😊');
	});

	it('converts insecure or unrecognized embedded content to links', function () {
		assert.strictEqual(rewriteHTML('<img src="http://idioticimages.com/foo.gif">'), '<a href="http://idioticimages.com/foo.gif">[http://idioticimages.com/foo.gif]</a>');
	});

	it('secures recognized links when possible', function () {
		assert.strictEqual(rewriteHTML('<a href="http://imgur.com/">Image hosting</a>'), '<a href="https://imgur.com/">Image hosting</a>');
	});

	it('rewrites Tumblr blog links to Splash links', function () {
		assert.strictEqual(
			rewriteHTML('<a href="http://staff.tumblr.com/">External blog link</a>'),
			'<a href="/blog/staff/">External blog link</a>');
		assert.strictEqual(
			rewriteHTML('<a href="http://staff.tumblr.com/post/69608789310">External post link</a>'),
			'<a href="/blog/staff/post/69608789310">External post link</a>');
		assert.strictEqual(
			rewriteHTML('<a href="http://staff.tumblr.com/post/69608789310/love-the-new-search-but-wish-it-looked-more-like">External post link with slug</a>'),
			'<a href="/blog/staff/post/69608789310/love-the-new-search-but-wish-it-looked-more-like">External post link with slug</a>');
		assert.strictEqual(
			rewriteHTML('<a href="http://www.tumblr.com/">Tumblr link</a>'),
			'<a href="https://www.tumblr.com/">Tumblr link</a>');
		assert.strictEqual(
			rewriteHTML('<a href="http://api.tumblr.com/">Tumblr API link</a>'),
			'<a href="https://api.tumblr.com/">Tumblr API link</a>');
		assert.strictEqual(
			rewriteHTML('<a href="/tagged/example">Internal link</a>'),
			'<a href="/blog/staff/tagged/example">Internal link</a>');
	});

	it('rewrites unrecognized internal links to the original blog', function () {
		assert.strictEqual(
			rewriteHTML('<a href="/page">Internal link</a>'),
			'<a href="https://staff.tumblr.com/page">Internal link</a>');
	});
});

function id(x) {
	return x;
}

function describe(described, description) {
	descriptions.push(function () {
		const promises = [];

		description(function it(behaviour, test) {
			const p = new Bluebird(function (resolve) {
				resolve(test());
			}).catch(id);

			p.name = behaviour;
			promises.push(p);
		});

		return Bluebird.all(promises).then(function (results) {
			return results.reduce(function (allPassing, result, i) {
				const p = promises[i];

				if (result instanceof Error) {
					console.log('\x1b[31m✘\x1b[0m \x1b[1m%s %s\x1b[0m failed\n%s', described, p.name, result.stack);
					return false;
				}

				console.log('\x1b[32m✔\x1b[0m \x1b[1m%s %s\x1b[0m passed', described, p.name);
				return allPassing;
			}, true);
		});
	});
}

descriptions.reduce(function (first, second) {
	return first.then(function (allPassed) {
		return second().then(function (passed) {
			return allPassed && passed;
		});
	});
}, Bluebird.resolve(true)).done(function (allPassed) {
	process.exit(!allPassed);
});
