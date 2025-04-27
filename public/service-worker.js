// キャッシュ名とキャッシュするファイルを定義
const CACHE_NAME = 'talkbox-cache-v4'; // ★v4に更新！
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  // ↓ Firestoreのレスポンスもキャッシュ対象
  'https://firestore.googleapis.com/v1/projects/i-post-04-fuh/databases/(default)/documents/posts'
];


// インストール時にキャッシュする
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

// リクエスト時にキャッシュ対応（Firestore対応＋エラー処理付き）
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  if (requestUrl.origin.includes('firestore.googleapis.com')) {
    // ★ Firestore通信の場合
    event.respondWith(
      caches.open(CACHE_NAME).then(async cache => {
        try {
          const response = await fetch(event.request);

          const clonedResponse = response.clone();
          const data = await clonedResponse.json();

          if (Array.isArray(data.documents)) {
            const filteredDocuments = data.documents.filter(doc => {
              const updateTime = new Date(doc.updateTime);
              const now = new Date();
              const diffDays = (now - updateTime) / (1000 * 60 * 60 * 24);
              return diffDays <= 50; // 50日以内だけ残す
            });

            if (filteredDocuments.length > 5000) {
              filteredDocuments.length = 5000; // 最大5000件に制限
            }

            const newResponse = new Response(JSON.stringify({ documents: filteredDocuments }), {
              headers: { 'Content-Type': 'application/json' }
            });

            cache.put(event.request, newResponse.clone());
            return newResponse;
          }

          // 通常レスポンスはそのまま保存
          cache.put(event.request, response.clone());
          return response;

        } catch (error) {
          console.error("🔥 Firestore fetch/cacheエラー:", error);
          self.registration.showNotification('通信エラー', {
            body: 'オフライン状態か、通信に失敗しました。',
            icon: 'icons/icon-192.png'
          });
          return cache.match(event.request);
        }
      })
    );
  } else {
    // ★ 通常のファイルリクエスト
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request).catch(error => {
          console.error("🔥 通常リクエストエラー:", error);
          self.registration.showNotification('通信エラー', {
            body: 'オフライン状態か、通信に失敗しました。',
            icon: 'icons/icon-192.png'
          });
        });
      })
    );
  }
});

// 新しいService Workerが来たら古いキャッシュを削除
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
