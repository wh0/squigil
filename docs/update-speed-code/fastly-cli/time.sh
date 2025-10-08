#!/bin/bash -eux
curl_until () {
	while true; do
		body="$(curl -sSf "$1" || true)"
		case $body in
			"$2") break;;
		esac
		sleep 1
	done
}

update () {
	cat >src/index.js <<EOF
addEventListener('fetch', (e) => {
	e.respondWith(new Response('after-$count\n'));
});
EOF
	curl_until 'http://localhost:7676/' "after-$count"
}

npx fastly version
mkdir -p src

cat >src/index.js <<EOF
addEventListener('fetch', (e) => {
	e.respondWith(new Response('before\n'));
});
EOF
npx fastly compute serve --watch &
serve_pid=$!
curl_until 'http://localhost:7676/' before

for count in $(seq 10); do
	time -p update
done

kill "$serve_pid"
wait
pkill viceroy # ???
sleep 1
