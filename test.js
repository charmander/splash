'use strict';

const assert = require('assert');
const describe = require('@charmander/test/describe')(module);

const clean = require('./splash/clean');

const rewriteHTML = html =>
	clean.rewriteHTML(html, 'staff')._html;

describe('HTML rewriter', it => {
	it('retains safe HTML', () => {
		const attempt = html => {
			assert.strictEqual(rewriteHTML(html), html);
		};

		attempt('Plain text.');
		attempt('<em>Basic</em> formatting.');
		attempt('<a href="https://charmander.me/">Valid links.</a>');

		assert.strictEqual(rewriteHTML('<B>Uppercase.</B>'), '<b>Uppercase.</b>');
	});

	it('cleans all JavaScript', () => {
		assert.strictEqual(rewriteHTML('<script>alert(1);</script>'), 'alert(1);');
		assert.strictEqual(rewriteHTML('<a href="javascript:alert(1)">link</a>'), '<a>link</a>');
		assert.strictEqual(rewriteHTML('<a href="#" onclick="alert(1)">link</a>'), '<a href="#">link</a>');
	});

	it('always produces valid, consistent HTML', () => {
		assert.strictEqual(rewriteHTML('>>> <<< & <blockquote><b>1 <i>2</b> 3</i> 4</u>'), '>>> &lt;&lt;&lt; &amp; <blockquote><b>1 <i>2</i></b> 3 4</blockquote>');
		assert.strictEqual(rewriteHTML('<b title=\'title\'></b> <i title=title></i>'), '<b title="title"></b> <i title="title"></i>');
		assert.strictEqual(rewriteHTML('<b title=\'title\'></b> <i title=title></i>'), '<b title="title"></b> <i title="title"></i>');
	});

	it('secures embedded, recognized content when possible', () => {
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

	it('doesn’t double-encode, and decodes when possible', () => {
		const attempt = (entities, expected) => {
			assert.strictEqual(
				rewriteHTML('<span title="' + entities + '">' + entities + '</span>'),
				'<span title="' + expected + '">' + expected + '</span>');
		};

		attempt('&amp;', '&amp;');
		attempt('&mdash;&#x2019;', '—’');
		attempt('&#x1f60a;', '😊');
	});

	it('converts insecure or unrecognized embedded content to links', () => {
		assert.strictEqual(rewriteHTML('<img src="http://idioticimages.com/foo.gif">'), '<a href="http://idioticimages.com/foo.gif">[http://idioticimages.com/foo.gif]</a>');
	});

	it('secures recognized links when possible', () => {
		assert.strictEqual(rewriteHTML('<a href="http://imgur.com/">Image hosting</a>'), '<a href="https://imgur.com/">Image hosting</a>');
	});

	it('rewrites Tumblr blog links to Splash links', () => {
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

	it('rewrites unrecognized internal links to the original blog', () => {
		assert.strictEqual(
			rewriteHTML('<a href="/page">Internal link</a>'),
			'<a href="https://staff.tumblr.com/page">Internal link</a>');
	});
});
