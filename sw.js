// Perquè el mòbil la deixi instal·lar com una app i s'obri sense connexió: primer la xarxa (així sempre surt l'última
// edició) i, si no n'hi ha, el que es va veure l'últim cop.
const CAIXA = 'reshi-v9';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
	const url = new URL(e.request.url);
	if (e.request.method !== 'GET' || url.origin !== location.origin) return; // les fotos de les fonts van directes
	e.respondWith(
		fetch(e.request, {cache: 'no-cache'}) // sempre la versió de GitHub (que si no, en guarda 10 minuts)
			.then((r) => {
				const copia = r.clone();
				caches.open(CAIXA).then((c) => c.put(e.request, copia));
				return r;
			})
			.catch(() => caches.match(e.request)),
	);
});
