![/~/](projects/workbench/init/public/workbench-ext/icon.svg)

☝️ This is Squigil.

And 👇 this is the repo for ...

# Squigil's house

... which is a framework (?) for hosting and live editing pages and scripts on Fastly Compute.

The house follows a few simple rules:

1. The **stuff rule**: the house's pages, scripts, and other files are, collectively, its "stuff."
   The house keeps its stuff in a KV store under a path-like key, which looks like `a/a/index.js`.
1. The **separator rule**: the string `/~/` is a special "separator" in the request URL path.
   To serve a request with the URL path `/a/a/~/b/b`, the house runs the entrance script `a/a/index.js` from its stuff with `/b/b` as the "inner path" argument.
1. The **implicit separator rule**: a request URL path without the separator in it implicitly has it at the beginning.
   The request URL path `/b/b` is equivalent to `/~/b/b`, which runs the entrance script `index.js` with `/b/b` as the inner path argument.
1. The **entrance rule**: an "entrance" script starts with the string `// ~ //`.
1. The **root rule**: the entrance script `index.js` is the "root" entrance script, which acts like a static file server.
   When the house runs it with the inner path argument `/b/b`, it returns the file `public/b/b` from the house's stuff.
1. The **root index rule**: the root entrance script serves an `index.html` page when the inner path has a trailing `/`.
   When the house runs it with the inner path argument `/b/c/`, it returns the page `public/b/c/index.html` from the house's stuff.
1. The **admin rule**: the entrance script `admin/index.js` is the "admin" entrance script, which runs arbitrary code for an authorized user.

## Running Squigil's house

To build and run Squigil's house in the local development environment, type the following command:

```shell
npm run start
```

To build and deploy Squigil's house to your Fastly account, type the following command.
The first time you deploy the application, you will be prompted to create a new service in your account.

```shell
npm run deploy
```
