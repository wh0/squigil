#!/bin/bash -eux
upload () {
	curl \
		--variable %SQUIGIL_ADMIN_SECRET \
		--variable 'body=const stuff = new builtinModules.fastlyKVStore.KVStore('"'"'stuff'"'"');
await stuff.put(searchParams.get('"'"'key'"'"'), fetchEvent.request.body);
return new Response(null);' \
		--variable "key=$1" \
		-X POST \
		--data-binary @- \
		--expand-header 'Authorization: Bearer {{SQUIGIL_ADMIN_SECRET}}' \
		--expand-url "https://$SQUIGIL_DOMAIN/admin/~/eval?body={{body:url}}&key={{key:url}}"
}

curl_until () {
	while true; do
		body="$(curl -sSf "$1" || true)"
		case $body in
			"$2") break;;
		esac
	done
}

update () {
	upload update-speed/index.js <<EOF
// ~ //
return new Response('after-$count\n');
EOF
	curl_until "https://$SQUIGIL_DOMAIN/update-speed/~/" "after-$count"
}

upload update-speed/index.js <<EOF
// ~ //
return new Response('before\n');
EOF
curl_until "https://$SQUIGIL_DOMAIN/update-speed/~/" before

for count in $(seq 10); do
	time -p update
done
