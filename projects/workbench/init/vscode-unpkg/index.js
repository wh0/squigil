// ~ //
const slashPos = innerPath.indexOf('/', 1);
if (slashPos === -1) return new Response('no path\n', {status: 404});
const subdomain = innerPath.slice(1, slashPos);
if (!/^[0-9a-z-]+$/i.test(subdomain)) return new Response('subdomain too weird\n', {status: 404})
const path = innerPath.slice(slashPos);
const res = await fetch(`https://${subdomain}.vscode-unpkg.net${path}`);
if (!res.ok) throw new Error(`vscode unpkg response ${res.status} not ok, body ${await res.text()}`);
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
