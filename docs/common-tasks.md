## Making a web page

1. Right-click the `public` directory.
1. Click "New File..."
1. Type in a filename and press enter.
1. Literally type out HTML code.
   ```diff
   --- /dev/null
   +++ b/public/note.html
   +<!doctype html>
   +<meta name="viewport" content="width=device-width,initial-scale=1">
   +<p>
   +	ay
   +</p>
   ```
1. Open that file on your site without the `public/` part, e.g. at `https://???.edgecompute.app/note.html`.

## Adding resources

1. Create a new file similar to above, or right-click the `public` directory and click "Upload."
   ```diff
   --- /dev/null
   +++ b/public/note.css
   +body {
   +	font-family: sans-serif;
   +}
   ```
1. Open `index.js` and add logic to serve it with the right content type.
   ```diff
   --- a/index.js
   +++ b/index.js
    if (key.endsWith('.html')) {
    	contentType = 'text/html';
   +} else if (key.endsWith('.css')) {
   +	contentType = 'text/css';
    } else {
    	contentType = 'application/octet-stream';
    }
   ```
1. Have the web page use it.
   ```diff
   --- a/public/note.html
   +++ b/public/note.html
    <meta name="viewport" content="width=device-width,initial-scale=1">
   +<link rel="stylesheet" href="note.css">
   ```
1. Check the page, e.g. at `https://???.edgecompute.app/note.html`, and it should be using the external stylesheet.

## Making a dynamic page

1. Click the "New File..." button.
1. Type a directory name followed by `/index.js`.
   I found out that VS Code makes the parent directories for you this way.
1. Type `// ~ //` followed by code... see below.
   ```diff
   --- /dev/null
   +++ b/info/index.js
   +// ~ //
   +const info = {
   +	userAgent: fetchEvent.request.headers.get('User-Agent'),
   +	entranceKey,
   +	innerPath,
   +	pop: builtinModules.fastlyEnv.env('FASTLY_POP'),
   +};
   +return new Response(JSON.stringify(info), {headers: {'Content-Type': 'application/json'}});
   ```
   Basically the content of this file gets used as the body of an async function with some arguments given, and it should return a `Response`.
   Currently the arguments are:
   ```ts
   fetchEvent: FetchEvent
   entranceKey: string // e.g. `a/a/index.js` for request URL path `/a/a/~/b/b`
   innerPath: string // e.g. `/b/b` for request URL path `/a/a/~/b/b`
   builtinModules: {
   	// see docs https://js-compute-reference-docs.edgecompute.app/docs/
   	fastlyAcl: import('fastly:acl'),
   	...,
   }
   ```
   See the code https://github.com/wh0/squigil/blob/05e163985725701ab9a5a982adc390dbe4412d91/src/index.js#L63 in case this gets out of date.
1. Now you should be able to go to e.g. `https://???.edgecompute.app/info/~/` and see some JSON.

## Running some code as the admin

1. You make a POST request to `/admin/~/eval` like this:
   ```sh
   SQUIGIL_ADMIN_SECRET=your_admin_secret \
   curl \
   	--variable %SQUIGIL_ADMIN_SECRET \
   	--variable 'body=return new Response('"'"'hi\n'"'"');' \
   	-X POST \
   	--expand-header 'Authorization: Bearer {{SQUIGIL_ADMIN_SECRET}}' \
   	--expand-url 'https://???.edgecompute.app/admin/~/eval?body={{body:url}}'
   ```
   That, similar to the dynamic page, runs some code as the body of an async function with some arguments given, and it should return a `Response`.
   Currently the arguments are:
   ```ts
   fetchEvent: FetchEvent
   builtinModules: {
   	// see docs https://js-compute-reference-docs.edgecompute.app/docs/
   	fastlyAcl: import('fastly:acl'),
   	...,
   }
   searchParams: URLSearchParams
   ```
   See the code https://github.com/wh0/squigil/blob/05e163985725701ab9a5a982adc390dbe4412d91/init/admin/index.js#L28 in case this gets out of date.
1. That should give the response constructed by the code, which is the message `hi`.
