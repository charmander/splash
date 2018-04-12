% const rewriteHTML = html => clean.rewriteHTML(html, data.domain);
% const rewriteLink = l => clean.rewriteLink(l, data.domain);
% const rewriteLinkString = l => clean.rewriteLinkString(l, data.domain);

doctype

html
	head
		meta charset: "utf-8"

		meta name: "viewport" content: "initial-scale=1"

		title "#{data.blog.title || data.name} · splash"

		link rel: "stylesheet" href: "/stylesheets/blog.css"

		link rel: "index" href: "/blog/#{data.name}/"

	body
		if data.blog.is_nsfw
			div id: "nsfw-indicator"
				span "NSFW"

		header id: "header"
			img id: "avatar"
				src: "https://api.tumblr.com/v2/blog/#{data.name}/avatar/96"
				alt: "#{data.name}’s avatar"
				width: "96"
				height: "96"

			h1 id: "title"
				a href: "/blog/#{data.name}/"
					"#{data.blog.title || data.name}"

			h2 id: "description"
				!"#{rewriteHTML(data.blog.description)}"

		main id: "posts"
			for post of data.posts
				% const date = new Date(post.timestamp * 1000);
				% const type = post.type;

				article class: "post #{type}-post"
					header
						if post.title
							h2 class: "post-title"
								if post.url
									a href: "#{rewriteLinkString(post.url)}" "#{post.title}"
								else
									"#{post.title}"
						elif post.url
							h2 class: "post-title"
								a href: "#{rewriteLinkString(post.url)}" "#{post.url}"

					if type === 'text'
						!"#{rewriteHTML(post.body)}"
					elif type === 'answer'
						blockquote class: "post-question"
							header
								h4
									strong class: "asker"
										if post.asking_url
											a "#{post.asking_name}" href: "#{rewriteLinkString(post.asking_url)}"
										else
											"#{post.asking_name}"

									" asked:"

							p "#{post.question}"

						!"#{rewriteHTML(post.answer)}"
					elif type === 'photo'
						for photo of post.photos
							% const photoUrl = photo.original_size.url;
							% const mediaLink = rewriteLink(url.parse(photoUrl, false, true));
							% const photoInfo = photo.alt_sizes[0];

							if mediaLink.embeddable
								figure class: "post-photo"
									img
										src: "#{url.format(mediaLink)}"
										alt: "#{photo.caption}"
										width: "#{photoInfo.width}"
										height: "#{photoInfo.height}"

									if photo.caption
										figcaption
											"#{photo.caption}"
							else
								a
									href: "#{url.format(mediaLink)}"
									rel: "noreferrer"
									"#{photo.caption || 'View image'}"

						div class: "post-caption"
							!"#{rewriteHTML(post.caption)}"
					elif type === 'video'
						% const thumbnailLink = post.thumbnail_url && rewriteLink(url.parse(post.thumbnail_url, false, true));

						% if (post.video_url)
							figure
								video
									class: "post-video"
									src: "#{post.video_url}"
									type: "video/mp4"
									preload: "none"
									controls:
									poster: "#{post.thumbnail_url}"
						% else if (post.permalink_url)
							a
								href: "#{post.permalink_url}"
								rel: "noreferrer"
								"View video"
						% else
							p class: "error"
								"Video unavailable."

						div class: "post-caption"
							!"#{rewriteHTML(post.caption)}"
					elif type === 'audio'
						figure
							audio
								class: "post-audio"
								src: "#{rewriteLinkString(post.audio_url)}"
								type: "audio/mp3"
								controls:

							figcaption class: "post-caption"
								!"#{rewriteHTML(post.caption)}"
					elif type === 'link'
						div class: "post-caption"
							!"#{rewriteHTML(post.description)}"
					elif type === 'quote'
						blockquote class: "post-quote"
							!"#{rewriteHTML(post.text)}"

							footer
								cite !"— #{rewriteHTML(post.source)}"
					elif type === 'chat'
						dl class: "post-dialogue"
							for retort of post.dialogue
								dt "#{retort.label}"
								dd "#{retort.phrase}"
					else
						p "Type not ready: #{type}"

					footer class: "post-info"
						div
							a href: "#{rewriteLinkString(post.post_url)}"
								time class: "post-date" datetime: "#{date.toISOString()}" title: "#{date.toString()}" pubdate:
									"#{relativeDate(date)}"

							" " span class: "post-alternates"
								"("
								a href: "#{post.post_url}"
									"original"
								", "
								a href: "data:text/plain;charset=utf-8,#{encodeURIComponent(inspect(post, { depth: null }))}"
									"data"
								")"


						ul class: "post-tags"
							for tag of post.tags
								li "##{tag}"

						div class: "post-stats"
							if post.note_count
								span class: "note-count" "#{s(post.note_count, '%d note', '%d notes')}"

						if post.notes
							ul class: "post-notes"
								for note of post.notes
									li
										if note.post_id
											a href: "#{rewriteLinkString(note.blog_url)}/post/#{note.post_id}/" "#{note.type}"
										else
											"#{note.type}"
										" from "
										a href: "#{rewriteLinkString(note.blog_url)}" "#{note.blog_name}"

		% const offset = data.offset;
		% const limit = data.limit;
		% const prev = offset > limit ? offset - limit : offset > 0 ? '' : null;
		% const next = offset + data.posts.length < data.total_posts ? offset + data.posts.length : null;

		footer id: "footer"
			nav id: "page-navigation"
				if prev !== null
					a
						class: "prev"
						rel: "prev"
						href: "#{url.format(update(data.pageUri, { search: null, query: { offset: prev }, hash: '#posts' }))}"
						accesskey: "p" "← Previous page"
					" "
				if next !== null
					a
						class: "next"
						rel: "next"
						href: "#{url.format(update(data.pageUri, { search: null, query: { offset: next }, hash: '#posts' }))}"
						accesskey: "n" "Next page →"
