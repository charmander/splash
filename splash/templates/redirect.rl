extends base

append head
	title "Splash"

	style
		!"#{stylesheet}"

replace body
	do
		const examples = [
			'staff.tumblr.com',
			'staff',
			'https://staff.tumblr.com/post/28221734/dont-laugh-at-us',
			'staff.tumblr.com/tagged/Week In Review',
		];

		const example = examples[Math.floor(Math.random() * examples.length)];

	form id: "form" method: "GET" action: "/" novalidate:
		div id: "input"
			input
				id: "url"
				type: "url"
				name: "u"
				placeholder: "example: #{example}"
				required:
				autofocus:

				if data.query
					value: "#{data.query}"

			" "

			button
				id: "go"
				"Open in Splash"

		if data.query
			p id: "error"
				"Not a supported page. "
				a href: "https://github.com/charmander/splash/issues" "(Report a bug?)"
