// ~ //
const res = await fetch(`https://main.vscode-cdn.net${innerPath}`);
if (!res.ok) throw new Error(`vscode cdn response ${res.status} not ok, body ${await res.text()}`);
const headers = {
	'Content-Type': res.headers.get('Content-Type') || '',
	'Access-Control-Allow-Origin': '*',
	'Cache-Control': 'public, max-age=604800',
	'Content-Security-Policy': 'default-src \'none\'',
	'Cross-Origin-Resource-Policy': 'cross-origin',
};
if (res.headers.has('Content-Encoding')) {
	headers['Content-Encoding'] = res.headers.get('Content-Encoding');
}
return new Response(res.body, {headers});
