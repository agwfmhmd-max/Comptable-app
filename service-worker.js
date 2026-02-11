const CACHE_NAME = 'teyssir-erp-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './logo.png',
  './manifest.json',
  
  // مكتبات Firebase
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js',
  
  // مكتبات التصميم والخطوط
  'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.js',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  
  // الخط العربي (مهم للـ PDF)
  'https://raw.githubusercontent.com/google/fonts/main/ofl/tajawal/Tajawal-Regular.ttf'
];

// 1. تثبيت التطبيق وتخزين الملفات
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching assets...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. تفعيل الكاش وحذف القديم
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

// 3. جلب الملفات (استخدام الكاش عند انقطاع النت)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // إذا وجد الملف في الكاش، استخدمه (Offline Mode)
      if (cachedResponse) {
        return cachedResponse;
      }
      // إذا لم يوجد، حاول جلبه من الإنترنت
      return fetch(event.request).catch(() => {
        // إذا فشل النت أيضاً، يمكن إرجاع صفحة خطأ مخصصة هنا (اختياري)
      });
    })
  );
});