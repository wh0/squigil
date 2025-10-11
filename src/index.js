/// <reference types="@fastly/js-compute" />

import * as fastlyAcl from 'fastly:acl';
import * as fastlyBackend from 'fastly:backend';
import * as fastlyCache from 'fastly:cache';
import * as fastlyCacheOverride from 'fastly:cache-override';
import * as fastlyCompute from 'fastly:compute';
import * as fastlyConfigStore from 'fastly:config-store';
import * as fastlyDevice from 'fastly:device';
import * as fastlyDictionary from 'fastly:dictionary';
import * as fastlyEdgeRateLimiter from 'fastly:edge-rate-limiter';
import * as fastlyEnv from 'fastly:env';
import * as fastlyExperimental from 'fastly:experimental';
import * as fastlyFanout from 'fastly:fanout';
import * as fastlyGeolocation from 'fastly:geolocation';
import * as fastlyHTMLRewriter from 'fastly:html-rewriter';
import * as fastlyKVStore from 'fastly:kv-store';
import * as fastlyLogger from 'fastly:logger';
import * as fastlySecretStore from 'fastly:secret-store';
import * as fastlyWebsocket from 'fastly:websocket';

const builtinModules = {
	fastlyAcl,
	fastlyBackend,
	fastlyCache,
	fastlyCacheOverride,
	fastlyCompute,
	fastlyConfigStore,
	fastlyDevice,
	fastlyDictionary,
	fastlyEdgeRateLimiter,
	fastlyEnv,
	fastlyExperimental,
	fastlyFanout,
	fastlyGeolocation,
	fastlyHTMLRewriter,
	fastlyKVStore,
	fastlyLogger,
	fastlySecretStore,
	fastlyWebsocket,
};

const ENTRANCE_SIGIL = '// ~ //';

const AsyncFunction = (async function () { }).constructor;

addEventListener('fetch', (e) => {
	e.respondWith((async () => {
		try {
			const url = new URL(e.request.url);
			const separatorIndex = url.pathname.indexOf('/~/');
			let key;
			let innerPath;
			if (separatorIndex === -1) {
				key = 'index.js';
				innerPath = url.pathname;
			} else {
				key = url.pathname.slice(1, separatorIndex + 1) + 'index.js';
				innerPath = url.pathname.slice(separatorIndex + 2);
			}
			const entry = await new builtinModules.fastlyKVStore.KVStore('stuff').get(key);
			if (!entry) return new Response('entrance not found\n', {status: 404});
			const body = await entry.text();
			if (!body.startsWith(ENTRANCE_SIGIL)) return new Response('missing entrance sigil\n', {status: 403});
			return await new AsyncFunction('fetchEvent', 'entranceKey', 'innerPath', 'builtinModules', body)(e, key, innerPath, builtinModules);
		} catch (e) {
			return new Response(`${e}\n${e.stack}\n`, {status: 500});
		}
	})());
});
