/* Teyssir ERP — Service Worker (offline-first)
   Strategy:
   - Shell (HTML/CSS/JS/icons): cache-first with background revalidation.
   - CDN libs (fonts, font-awesome, chart.js, pdfmake, firebase SDK): cache-first.
   - Navigation requests (HTML): network-first, fallback to cached index.
   - Firestore / Firebase APIs / EmailJS: bypass SW entirely (Firebase handles
     its own offline persistence & sync via IndexedDB).
*/
const VERSION       = 'teyssir-v4-2026-06-11';
const SHELL_CACHE   = `shell-${VERSION}`;
const RUNTIME_CACHE = `runtime-${VERSION}`;
const SCOPE_PREFIX  = '/erp/';

const SHELL = [
  '/erp/',
  '/erp/index.html',
  '/erp/style.css',
  '/erp/modern.css',
  '/erp/script.js',
  '/erp/manifest.json',
  '/erp/logo.png',
  '/erp/icon-192.png',
  '/erp/icon-512.png',
];

const CDN_HOSTS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdnjs.cloudflare.com',
  'cdn.jsdelivr.net',
  'www.gstatic.com',
];

// Hosts the SW must NEVER intercept (Firebase handles its own offline + sync).
const BYPASS_HOSTS = [
  'firestore.googleapis.com',
  'firebase.googleapis.com',
  'firebaseinstallations.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'api.emailjs.com',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (e) => {
  const data = e.data;
  if (data === 'SKIP_WAITING' || (data && data.type === 'SKIP_WAITING')) self.skipWaiting();
});

function isBypass(url) {
  return BYPASS_HOSTS.some((h) => url.hostname.endsWith(h));
}
function isCdn(url) {
  return CDN_HOSTS.some((h) => url.hostname === h);
}
function isShellPath(url) {
  return url.origin === self.location.origin && url.pathname.startsWith(SCOPE_PREFIX);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch { return; }

  if (isBypass(url)) return; // let Firebase / EmailJS go to network directly

  // Navigation → network-first, fallback to cached index
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(SHELL_CACHE);
          cache.put('/erp/index.html', fresh.clone()).catch(() => {});
          return fresh;
        } catch {
          const cache = await caches.open(SHELL_CACHE);
          return (await cache.match(req)) || (await cache.match('/erp/index.html')) || Response.error();
        }
      })()
    );
    return;
  }

  // Shell + CDN assets → cache-first w/ background revalidation
  if (isShellPath(url) || isCdn(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(isShellPath(url) ? SHELL_CACHE : RUNTIME_CACHE);
        const cached = await cache.match(req);
        const network = fetch(req).then((res) => {
          if (res && res.status === 200 && (res.type === 'basic' || res.type === 'cors')) {
            cache.put(req, res.clone()).catch(() => {});
          }
          return res;
        }).catch(() => null);
        return cached || (await network) || Response.error();
      })()
    );
  }
});
