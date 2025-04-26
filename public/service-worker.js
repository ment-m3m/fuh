// キャッシュ名とキャッシュするファイルを定義
const CACHE_NAME = 'talkbox-cache-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

// インストール時にキャッシュする
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

// リクエスト時にキャッシュを返す
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      // キャッシュがあれば返す。なければネットから取得。
      return response || fetch(event.request);
    })
  );
});

// 新しいservice workerが来たら古いキャッシュを削除
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(name => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    })
  );
});
