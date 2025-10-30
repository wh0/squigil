# Gradual start

1. Have a proper enough development computer, one with npm etc. for running the Fastly CLI. This is only for this setup, and you don't need to be at this computer to develop stuff later. I am interested whether this is possible to do without a full development environment, but I have not looked into it.
2. Get the source code https://github.com/wh0/squigil.
3. Go to https://squigil.edgecompute.app/admin-setup.html, click generate.
4. Save the secret somewhere.
5. Copy the `'...': true,` line, add it to `init/admin/index.js` https://github.com/wh0/squigil/blob/master/init/admin/index.js in the `allowedSecretDigests` dictionary.
6. Run `npm run deploy` and follow interactive instructions. It'll ask you about several files to use in the KV store, but they should already be set, so just press enter on those.
7. When it's deployed, it'll be at a domain. If you didn't set up a custom domain, it'll be `(something).edgecompute.app`. Remember this or save it.
8. Go to https://vscode.dev/ or get Visual Studio Code or a compatible editor.
9. Install this extension https://marketplace.visualstudio.com/items?itemName=wh0.squigil.
10. Press F1 or Ctrl+Shift+P or similar and use "Drop by Squigil's House."
11. Select Allow. In the Installation Alias chooser, select "Other" and then enter your installation's domain from the deployment earlier. In the Admin Secret input, enter your secret from the admin setup earlier.
