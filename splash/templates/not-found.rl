extends base

macro blog-ref()
	span .blog-ref
		img
			src: "https://api.tumblr.com/v2/blog/#{data.name}/avatar/48"
			alt: ""
			width: "48"
			height: "48"

		"#{data.name}"

append html
	lang: "en"

append head
	title "Not found · splash"

	style
		!"#{stylesheet}"

append body
	h1 "Not found"

	if !data.checked
		p "Failed to check the state of the blog."
	elif data.visible
		p
			span .main
				"The requested post couldn’t be found on "
				strong "#{data.domain}"
				"."
			" It might have been deleted, or the blog containing it might have been renamed and the old name taken by a new blog."

		a .action href: "/blog/#{data.name}"
			"Try the main page of "
			blog-ref()
	elif data.exists
		p
			span .main
				"Guest access to "
				strong "#{data.domain}"
				" has been disabled by its owner."

		a .action href: "#{data.original}"
			"Log in and try "
			blog-ref()
			" on Tumblr"
	else
		p
			strong "#{data.domain}"
			" doesn’t exist. It might have been renamed or deleted."
