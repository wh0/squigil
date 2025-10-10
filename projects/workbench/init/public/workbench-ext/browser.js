console.log('squigil enter browser.js'); // %%%

const vscode = require('vscode');

/** @typedef {{base: string, secret: string}} AdminSettings */

async function adminEval(/** @type {AdminSettings} */ settings, /** @type {string} */ evalBody, /** @type {{[name: string]: string}} */ searchParams, /** @type {BodyInit | null} */ reqBody) {
	const url = new URL(`${settings.base}/eval`);
	url.searchParams.set('body', evalBody);
	for (const name in searchParams) {
		url.searchParams.set(name, searchParams[name]);
	}
	const res = await fetch(url, {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${settings.secret}`,
		},
		body: reqBody,
	});
	return res;
}

async function adminEvalOk(/** @type {AdminSettings} */ settings, /** @type {string} */ evalBody, /** @type {{[name: string]: string}} */ searchParams, /** @type {BodyInit | null} */ reqBody) {
	const res = await adminEval(settings, evalBody, searchParams, reqBody);
	if (!res.ok) throw new Error(`admin eval response ${res.status} not ok, body ${await res.text()}`);
	return res;
}

async function adminEvalJson(/** @type {AdminSettings} */ settings, /** @type {string} */ evalBody, /** @type {{[name: string]: string}} */ searchParams, /** @type {BodyInit | null} */ reqBody) {
	const res = await adminEvalOk(settings, evalBody, searchParams, reqBody);
	return await res.json();
}

async function adminList(/** @type {AdminSettings} */ settings, /** @type {any} */ options) {
	const evalBody = `
		const stuff = new builtinModules.fastlyKVStore.KVStore('stuff');
		const list = await stuff.list(JSON.parse(searchParams.get('options')));
		return new Response(JSON.stringify(list), {headers: {'Access-Control-Allow-Origin': '*'}});
	`;
	return await adminEvalJson(settings, evalBody, {options: JSON.stringify(options)}, null);
}

async function adminGet(/** @type {AdminSettings} */ settings, /** @type {string} */ key) {
	const evalBody = `
		const stuff = new builtinModules.fastlyKVStore.KVStore('stuff');
		const entry = await stuff.get(searchParams.get('key'));
		return new Response(entry.body, {headers: {'Access-Control-Allow-Origin': '*'}});
	`;
	const res = await adminEvalOk(settings, evalBody, {key}, null);
	return await res.bytes();
}

async function adminPut(/** @type {AdminSettings} */ settings, /** @type {string} */ key, /** @type {Uint8Array} */ value) {
	const evalBody = `
		const stuff = new builtinModules.fastlyKVStore.KVStore('stuff');
		await stuff.put(searchParams.get('key'), fetchEvent.request.body);
		return new Response(null, {headers: {'Access-Control-Allow-Origin': '*'}});
	`;
	// @ts-expect-error `value` backed by shared buffer?
	const /** @type {Uint8Array<ArrayBuffer>} */ valueUnshared = value;
	await adminEvalOk(settings, evalBody, {key}, valueUnshared);
}

async function adminDelete(/** @type {AdminSettings} */ settings, /** @type {string} */ key) {
	const evalBody = `
		const stuff = new builtinModules.fastlyKVStore.KVStore('stuff');
		await stuff.delete(searchParams.get('key'));
		return new Response(null, {headers: {'Access-Control-Allow-Origin': '*'}});
	`;
	await adminEvalOk(settings, evalBody, {key}, null);
}

function pathToKey(/** @type {string} */ path) {
	return path.slice(1);
}

function pathJoin(/** @type {string} */ dirname, /** @type {string} */ basename) {
	if (dirname === '/') return `/${basename}`;
	return `${dirname}/${basename}`;
}

function pathSplit(/** @type {string} */ path) {
	const lastSlashPos = path.lastIndexOf('/');
	if (lastSlashPos === 0) return ['/', path.slice(1)];
	return [path.slice(0, lastSlashPos), path.slice(lastSlashPos + 1)];
}

/** @typedef {{valuePromised: Promise<Uint8Array> | null}} TreeFile */
/** @typedef {{file: TreeFile | null, children: {[name: string]: true}}} TreeNode */
/** @typedef {{[path: string]: TreeNode}} TreeRange */
/** @typedef {{rangePromised: Promise<TreeRange> | null}} Tree */
/** @typedef {{range: TreeRange, parentPath: string, basename: string, path: string}} TreeLink */

function treeInit() {
	return /** @type {Tree} */ ({rangePromised: null});
}

async function treeLoadRange(/** @type {AdminSettings} */ adminSettings) {
	const /** @type {TreeRange} */ range = {'/': {file: null, children: {}}};
	const /** @type {any} */ listOptions = {};
	while (true) {
		const listBody = await adminList(adminSettings, listOptions);
		for (const key of /** @type {string[]} */ (listBody.list)) {
			let nameStartPos = 0;
			let parentDirectoryPath = '/';
			while (true) {
				const slashPos = key.indexOf('/', nameStartPos);
				if (slashPos === -1) break;
				const directoryPath = `/${key.slice(0, slashPos)}`;
				if (!(directoryPath in range)) {
					range[directoryPath] = {file: null, children: {}};
					const directoryBasename = key.slice(nameStartPos, slashPos);
					range[parentDirectoryPath].children[directoryBasename] = true;
				}
				nameStartPos = slashPos + 1;
				parentDirectoryPath = directoryPath;
			}
			const filePath = `/${key}`;
			if (filePath in range) {
				range[filePath].file = {valuePromised: null};
			} else {
				range[filePath] = {file: {valuePromised: null}, children: {}};
				const fileBasename = key.slice(nameStartPos);
				range[parentDirectoryPath].children[fileBasename] = true;
			}
		}
		if (!listBody.cursor) break;
		listOptions.cursor = listBody.cursor;
	}
	return range;
}

function treeRange(/** @type {Tree} */ t, /** @type {AdminSettings} */ adminSettings) {
	if (!t.rangePromised) {
		t.rangePromised = (async () => {
			try {
				return await treeLoadRange(adminSettings);
			} catch (e) {
				t.rangePromised = null;
				throw e;
			}
		})();
	}
	return t.rangePromised;
}

async function treeFileLoadValue(/** @type {AdminSettings} */ adminSettings, /** @type {string} */ path) {
	return await adminGet(adminSettings, pathToKey(path));
}

function treeFileValue(/** @type {TreeFile} */ file, /** @type {AdminSettings} */ adminSettings, /** @type {string} */ path) {
	if (!file.valuePromised) {
		file.valuePromised = (async () => {
			try {
				return await treeFileLoadValue(adminSettings, path);
			} catch (e) {
				file.valuePromised = null;
				throw e;
			}
		})();
	}
	return file.valuePromised;
}

function treeLinkFromSplit(/** @type {TreeRange} */ range, /** @type {string} */ path) {
	const [parentPath, basename] = pathSplit(path);
	if (!(parentPath in range)) throw vscode.FileSystemError.FileNotFound(parentPath);
	if (range[parentPath].file) throw vscode.FileSystemError.FileNotADirectory(parentPath);
	return /** @type {TreeLink} */ ({range, parentPath, basename, path});
}

function treeLinkChild(/** @type {TreeLink} */ link, /** @type {string} */ childName) {
	const childPath = pathJoin(link.path, childName);
	return /** @type {TreeLink} */ ({range: link.range, parentPath: link.path, basename: childName, path: childPath});
}

async function treeLinkCreateFile(/** @type {TreeLink} */ link, /** @type {AdminSettings} */ adminSettings, /** @type {Uint8Array} */ content) {
	await adminPut(adminSettings, pathToKey(link.path), content);
	link.range[link.path] = {file: {valuePromised: Promise.resolve(content)}, children: {}};
	link.range[link.parentPath].children[link.basename] = true;
}

function treeLinkCreateDirectory(/** @type {TreeLink} */ link) {
	link.range[link.path] = {file: null, children: {}};
	link.range[link.parentPath].children[link.basename] = true;
}

async function treeLinkDelete(/** @type {TreeLink} */ link, /** @type {AdminSettings} */ adminSettings) {
	for (const childName in link.range[link.path].children) {
		const childLink = treeLinkChild(link, childName);
		await treeLinkDelete(childLink, adminSettings);
	}
	if (link.range[link.path].file) {
		await adminDelete(adminSettings, pathToKey(link.path));
	}
	delete link.range[link.path];
	delete link.range[link.parentPath].children[link.basename];
}

async function treeLinkCopyFrom(/** @type {TreeLink} */ link, /** @type {AdminSettings} */ adminSettings, /** @type {string} */ sourcePath) {
	if (link.range[sourcePath].file) {
		await treeLinkCreateFile(link, adminSettings, await treeFileValue(link.range[sourcePath].file, adminSettings, sourcePath));
	} else {
		treeLinkCreateDirectory(link);
		for (const childName in link.range[sourcePath].children) {
			const childLink = treeLinkChild(link, childName);
			const sourceChildPath = pathJoin(sourcePath, childName);
			await treeLinkCopyFrom(childLink, adminSettings, sourceChildPath);
		}
	}
}

/** @typedef {{[alias: string]: string}} AdminSecrets */

function authenticationSessionFromAdminSecret(/** @type {string} */ alias, /** @type {string} */ adminSecret) {
	return /** @type {vscode.AuthenticationSession} */ ({
		id: alias,
		accessToken: adminSecret,
		account: {
			id: alias,
			label: alias,
		},
		scopes: [],
	});
}

exports.activate = (/** @type {vscode.ExtensionContext} */ context) => {
	console.log('squigil enter activate'); // %%%

	const sqUnwantedAliases = {
		'node_modules': true,
		'package.json': true,
	};

	async function sqGetAdminSettings(/** @type {string} */ alias) {
		if (Object.hasOwn(sqUnwantedAliases, alias)) {
			throw new Error(`Alias ${alias} unwanted`);
		}
		let adminBase;
		const /** @type {{[alias: string]: string}} */ adminBaseOverrides = vscode.workspace.getConfiguration('squigil').get('adminBaseOverrides', {});
		if (Object.hasOwn(adminBaseOverrides, alias)) {
			adminBase = adminBaseOverrides[alias];
		} else {
			adminBase = `https://${alias}/admin/~`;
		}
		const authenticationSession = await vscode.authentication.getSession('squigil', [], {account: {id: alias, label: alias}});
		if (!authenticationSession) throw new Error(`Not signed in to ${alias}`);
		return /** @type {AdminSettings} */ ({
			base: adminBase,
			secret: authenticationSession.accessToken,
		});
	}

	const /** @type {{[alias: string]: Tree}} */ sqTrees = {};

	function sqGetTree(/** @type {string} */ alias) {
		if (!Object.hasOwn(sqTrees, alias)) {
			sqTrees[alias] = treeInit();
		}
		return sqTrees[alias];
	}

	const /** @type {vscode.EventEmitter<vscode.FileChangeEvent[]>} */ sqFsDidChangeFileEmitter = new vscode.EventEmitter();
	context.subscriptions.push(sqFsDidChangeFileEmitter);

	context.subscriptions.push(vscode.workspace.registerFileSystemProvider('squigil', {
		onDidChangeFile: sqFsDidChangeFileEmitter.event,
		watch(uri, options) {
			console.log('fs watch', uri.toString(), options); // %%%
			return new vscode.Disposable(() => { });
		},
		async stat(uri) {
			console.log('fs stat', uri.toString()); // %%%
			const adminSettings = await sqGetAdminSettings(uri.authority);
			const tree = sqGetTree(uri.authority);
			const range = await treeRange(tree, adminSettings);
			if (!(uri.path in range)) throw vscode.FileSystemError.FileNotFound(uri);
			const node = range[uri.path];
			return {
				type: node.file ? vscode.FileType.File : vscode.FileType.Directory,
				ctime: 0,
				mtime: 0,
				size: node.file ? (await treeFileValue(node.file, adminSettings, uri.path)).length : 0,
			};
		},
		async readDirectory(uri) {
			console.log('fs read directory', uri.toString()); // %%%
			const adminSettings = await sqGetAdminSettings(uri.authority);
			const tree = sqGetTree(uri.authority);
			const range = await treeRange(tree, adminSettings);
			if (!(uri.path in range)) throw vscode.FileSystemError.FileNotFound(uri);
			const node = range[uri.path];
			if (node.file) throw vscode.FileSystemError.FileNotADirectory(uri);
			const /** @type {[string, vscode.FileType][]} */ entries = [];
			for (const childName in node.children) {
				const childPath = pathJoin(uri.path, childName);
				const childNode = range[childPath];
				entries.push([childName, childNode.file ? vscode.FileType.File : vscode.FileType.Directory]);
			}
			return entries;
		},
		async createDirectory(uri) {
			console.log('fs create directory', uri.toString()); // %%%
			const adminSettings = await sqGetAdminSettings(uri.authority);
			const tree = sqGetTree(uri.authority);
			const range = await treeRange(tree, adminSettings);
			if (uri.path in range) throw vscode.FileSystemError.FileExists(uri);
			if (uri.path === '/') throw vscode.FileSystemError.FileExists(uri);
			const link = treeLinkFromSplit(range, uri.path);
			treeLinkCreateDirectory(link);
		},
		async readFile(uri) {
			console.log('fs read file', uri.toString()); // %%%
			if (uri.path === '/') throw vscode.FileSystemError.FileIsADirectory(uri);
			const adminSettings = await sqGetAdminSettings(uri.authority);
			const tree = sqGetTree(uri.authority);
			const range = await treeRange(tree, adminSettings);
			if (!(uri.path in range)) throw vscode.FileSystemError.FileNotFound(uri);
			const node = range[uri.path];
			if (!node.file) throw vscode.FileSystemError.FileIsADirectory(uri);
			return await treeFileValue(node.file, adminSettings, uri.path);
		},
		async writeFile(uri, content, options) {
			console.log('fs write file', uri.toString(), options); // %%%
			const adminSettings = await sqGetAdminSettings(uri.authority);
			const tree = sqGetTree(uri.authority);
			const range = await treeRange(tree, adminSettings);
			if (uri.path in range) {
				if (!options.overwrite) throw vscode.FileSystemError.FileExists(uri);
				const node = range[uri.path];
				if (!node.file) throw vscode.FileSystemError.FileIsADirectory(uri);
				await adminPut(adminSettings, pathToKey(uri.path), content);
				node.file = {valuePromised: Promise.resolve(content)};
			} else {
				if (!options.create) throw vscode.FileSystemError.FileNotFound(uri);
				if (uri.path === '/') throw vscode.FileSystemError.FileIsADirectory(uri);
				const link = treeLinkFromSplit(range, uri.path);
				await treeLinkCreateFile(link, adminSettings, content);
			}
		},
		async delete(uri, options) {
			console.log('fs delete', uri.toString(), options); // %%%
			if (uri.path === '/') throw vscode.FileSystemError.NoPermissions(uri);
			const adminSettings = await sqGetAdminSettings(uri.authority);
			const tree = sqGetTree(uri.authority);
			const range = await treeRange(tree, adminSettings);
			if (!(uri.path in range)) throw vscode.FileSystemError.FileNotFound(uri);
			if (!options.recursive) {
				for (const childName in range[uri.path].children) {
					return;
				}
			}
			const link = treeLinkFromSplit(range, uri.path);
			await treeLinkDelete(link, adminSettings);
		},
		async rename(oldUri, newUri, options) {
			console.log('fs rename', oldUri.toString(), newUri.toString(), options); // %%%
			if (oldUri.authority !== newUri.authority) throw new Error('Cross-admin rename not supported');
			const adminSettings = await sqGetAdminSettings(oldUri.authority);
			const tree = sqGetTree(oldUri.authority);
			const range = await treeRange(tree, adminSettings);
			if (!(oldUri.path in range)) throw vscode.FileSystemError.FileNotFound(oldUri);
			if (oldUri.path === '/') throw vscode.FileSystemError.NoPermissions(oldUri);
			const oldLink = treeLinkFromSplit(range, oldUri.path);
			if (newUri.path === '/') throw vscode.FileSystemError.NoPermissions(newUri);
			const newLink = treeLinkFromSplit(range, newUri.path);
			if (newUri.path in range) {
				if (!options.overwrite) throw vscode.FileSystemError.FileExists(newUri);
				await treeLinkDelete(newLink, adminSettings);
			}
			await treeLinkCopyFrom(newLink, adminSettings, oldUri.path);
			await treeLinkDelete(oldLink, adminSettings);
		}
		// no custom `copy` implementation
	}));

	const /** @type {{[alias: string]: true}} */ sqAuthRequestedAliases = {};
	const /** @type {vscode.EventEmitter<vscode.AuthenticationProviderAuthenticationSessionsChangeEvent>} */ sqAuthDidChangeSessionsEmitter = new vscode.EventEmitter();
	context.subscriptions.push(sqAuthDidChangeSessionsEmitter);

	context.subscriptions.push(vscode.authentication.registerAuthenticationProvider('squigil', 'Squigil\'s House', {
		onDidChangeSessions: sqAuthDidChangeSessionsEmitter.event,
		async getSessions(/** @type {string[]} */ scopes, /** @type {vscode.AuthenticationProviderSessionOptions} */ options) {
			console.log('auth get sessions', scopes, options); // %%%
			if (options.account) {
				sqAuthRequestedAliases[options.account.id] = true;
			}
			const adminSecretsJson = await context.secrets.get('admin_secrets');
			if (!adminSecretsJson) return [];
			const /** @type {AdminSecrets} */ adminSecrets = JSON.parse(adminSecretsJson);
			const /** @type {vscode.AuthenticationSession[]} */ sessions = [];
			for (const alias in adminSecrets) {
				if (!options.account || alias === options.account.id) {
					sessions.push(authenticationSessionFromAdminSecret(alias, adminSecrets[alias]));
				}
			}
			return sessions;
		},
		async createSession(/** @type {string[]} */ scopes, /** @type {vscode.AuthenticationProviderSessionOptions} */ options) {
			console.log('auth create session', scopes, options); // %%%
			const adminSecretsJson = await context.secrets.get('admin_secrets');
			let /** @type {AdminSecrets} */ adminSecrets;
			if (adminSecretsJson) {
				adminSecrets = JSON.parse(adminSecretsJson);
			} else {
				adminSecrets = {};
			}
			const otherItem = {label: 'Other...', alwaysShow: true};
			const /** @type {vscode.QuickPickItem[]} */ items = [];
			if (options.account) {
				items.push({label: options.account.id, description: 'Requested'});
			} else {
				const /** @type {{[alias: string]: true}} */ visitedAliases = {};
				for (const alias in adminSecrets) {
					visitedAliases[alias] = true;
				}
				for (const alias in sqAuthRequestedAliases) {
					if (Object.hasOwn(visitedAliases, alias)) continue;
					visitedAliases[alias] = true;
					items.push({label: alias, description: 'Requested'});
				}
				const /** @type {{[alias: string]: string}} */ adminBaseOverrides = vscode.workspace.getConfiguration('squigil').get('adminBaseOverrides', {});
				for (const alias in adminBaseOverrides) {
					if (Object.hasOwn(visitedAliases, alias)) continue;
					visitedAliases[alias] = true;
					items.push({label: alias, description: 'Has configuration'});
				}
				const /** @type {{[alias: string]: string}} */ previewBaseOverrides = vscode.workspace.getConfiguration('squigil').get('previewBaseOverrides', {});
				for (const alias in previewBaseOverrides) {
					if (Object.hasOwn(visitedAliases, alias)) continue;
					visitedAliases[alias] = true;
					items.push({label: alias, description: 'Has configuration'});
				}
				items.push(otherItem);
			}
			const aliasPicked = await vscode.window.showQuickPick(items, {
				title: 'Sign In to Squigil\'s House',
				placeHolder: 'Installation Alias',
				ignoreFocusOut: true,
			});
			if (!aliasPicked) throw new Error('Cancelled');
			let alias;
			if (aliasPicked === otherItem) {
				const aliasPrompted = await vscode.window.showInputBox({
					title: 'Sign In to Squigil\'s House',
					prompt: 'e.g. squigil.edgecompute.app or 127.0.0.1:7676',
					placeHolder: 'Installation Alias',
					ignoreFocusOut: true,
				});
				if (!aliasPrompted) throw new Error('Cancelled');
				alias = aliasPrompted;
			} else {
				alias = aliasPicked.label;
			}
			const adminSecretPrompted = await vscode.window.showInputBox({
				title: 'Sign In to Squigil\'s House',
				prompt: `For ${alias}`,
				placeHolder: 'Admin Secret',
				password: true,
				ignoreFocusOut: true,
			});
			if (!adminSecretPrompted) throw new Error('Cancelled');
			adminSecrets[alias] = adminSecretPrompted;
			await context.secrets.store('admin_secrets', JSON.stringify(adminSecrets));
			const session = authenticationSessionFromAdminSecret(alias, adminSecretPrompted);
			sqAuthDidChangeSessionsEmitter.fire({added: [session], removed: undefined, changed: undefined});
			return session;
		},
		async removeSession(/** @type {string} */ sessionId) {
			console.log('auth remove session', sessionId); // %%%
			const adminSecretsJson = await context.secrets.get('admin_secrets');
			if (!adminSecretsJson) return;
			const adminSecrets = JSON.parse(adminSecretsJson);
			if (!Object.hasOwn(adminSecrets, sessionId)) return;
			const adminSecret = adminSecrets[sessionId]
			delete adminSecrets[sessionId];
			await context.secrets.store('admin_secrets', JSON.stringify(adminSecrets));
			const session = authenticationSessionFromAdminSecret(sessionId, adminSecret)
			sqAuthDidChangeSessionsEmitter.fire({added: undefined, removed: [session], changed: undefined});
		},
	}, {supportsMultipleAccounts: true}));

	context.subscriptions.push(vscode.commands.registerCommand('wh0.squigil.open_installation', async () => {
		console.log('squigil command open installation'); // %%%
		const session = await vscode.authentication.getSession('squigil', [], {clearSessionPreference: true, createIfNone: true});
		let end = 0;
		if (vscode.workspace.workspaceFolders) {
			end = vscode.workspace.workspaceFolders.length;
		}
		vscode.workspace.updateWorkspaceFolders(end, 0, {uri: vscode.Uri.from({scheme: 'squigil', authority: session.account.id, path: '/'})});
	}));

	context.subscriptions.push(vscode.commands.registerCommand('wh0.squigil.preview', async (/** @type {vscode.Uri} */ uri) => {
		console.log('squigil command preview', uri.toString()); // %%%
		const /** @type {{[alias: string]: string}} */ previewBaseOverrides = vscode.workspace.getConfiguration('squigil').get('previewBaseOverrides', {});
		let previewBase;
		if (Object.hasOwn(previewBaseOverrides, uri.authority)) {
			previewBase = previewBaseOverrides[uri.authority];
		} else {
			previewBase = `https://${uri.authority}`;
		}
		let path = uri.path;
		if (path.startsWith('/public/')) {
			path = path.replace(/^\/public\//, '/');
			if (path.endsWith('/index.html')) {
				path = path.replace(/\/index\.html/, '/');
			}
		} else if (path.endsWith('/index.js')) {
			path = path.replace(/\/index\.js$/, '/~/');
		}
		const previewUri = vscode.Uri.parse(`${previewBase}${path}`);
		const ok = await vscode.env.openExternal(previewUri);
		if (!ok) throw new Error(`Environment didn't open preview URI ${previewUri}`);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('wh0.squigil.asdf', async () => {
		console.log('squigil command asdf'); // %%%
		for (const alias in sqTrees) {
			delete sqTrees[alias];
		}
		vscode.window.showInformationMessage('Beep beep boop!');
	}));
};
