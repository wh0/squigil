// ~ //
let key = 'public' + innerPath;
if (key.endsWith('/')) {
	key += 'index.html';
}
const entry = await new /** @type {import('fastly:kv-store')} */ (builtinModules.fastlyKVStore).KVStore('stuff').get(key);
if (!entry) return new Response('not found\n', {status: 404});
let contentType;
if (key.endsWith('.html')) {
	contentType = 'text/html; charset=utf-8';
} else {
	contentType = 'application/octet-stream';
}
return new Response(entry.body, {
	headers: {
		'Content-Type': contentType,
		'Access-Control-Allow-Origin': '*',
	},
});
