// ~ //
const stuff = new /** @type {import('fastly:kv-store')} */ (builtinModules.fastlyKVStore).KVStore('stuff');
switch (innerPath) {
	case '/':
		const entry = await stuff.get('workbench/index.html');
		return new Response(entry.body, {headers: {
			'Content-Type': 'text/html; charset=utf-8',
			'Access-Control-Allow-Origin': '*',
			'Cross-Origin-Resource-Policy': 'cross-origin',
			'Cross-Origin-Embedder-Policy': 'credentialless',
			'Cross-Origin-Opener-Policy': 'same-origin',
		}});
	default:
		return new Response('not found\n', {status: 404});
}
