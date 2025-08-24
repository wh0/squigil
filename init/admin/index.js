// ~ //
if (/** @type {FetchEvent} */ (fetchEvent).request.method === 'OPTIONS') {
	return new Response(null, {
		status: 204,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Headers': 'Authorization',
			'Access-Control-Max-Age': '86400',
			'Cache-Control': 'public, max-age=604800',
		},
	});
}
// https://gchq.github.io/CyberChef/#recipe=Pseudo-Random_Number_Generator(32,'Hex')
// https://gchq.github.io/CyberChef/#recipe=SHA2('256',64,160)From_Hex('None')To_Decimal('Comma',false)
const allowedSecretDigests = {
	// '1,2,3': true,
};
const authorizationHeader = '' + /** @type {FetchEvent} */ (fetchEvent).request.headers.get('Authorization');
const secret = '' + authorizationHeader.split(' ')[1];
const secretDigest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret))).toString();
if (!(secretDigest in allowedSecretDigests)) return new Response('unauthorized\n', {status: 401});

if (innerPath === '/eval') {
	if (/** @type {FetchEvent} */ (fetchEvent).request.method !== 'POST') return new Response('method not allowed\n', {status: 405});
	const AsyncFunction = (async function () { }).constructor;
	const url = new URL(/** @type {FetchEvent} */ (fetchEvent).request.url);
	const body = url.searchParams.get('body');
	return await new AsyncFunction('fetchEvent', 'builtinModules', 'searchParams', body)(fetchEvent, builtinModules, url.searchParams);
} else {
	return new Response('not found\n', {status: 404});
}
