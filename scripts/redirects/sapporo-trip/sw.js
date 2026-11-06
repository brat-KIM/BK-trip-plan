/* 옛 삿포로 사이트 서비스워커 정리용: 옛 캐시를 지우고 스스로 해제 → 다음 접속부터 새 주소로 리다이렉트 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((c) => { try { c.navigate(c.url); } catch (err) {} });
  })());
});
