/* fit-sw.js（20261015pu1・td1 で ToDo に対応）fitアプリのプッシュ通知の受け口
 * - 届いた通知を表示し、タップでアプリ（app.html）の該当の連絡を開く
 * - ページの読み込み（fetch）には一切触らない（キャッシュしない＝更新の仕組みはこれまでどおり）
 */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

// Safari（iPhone・Mac）は、届いた通知を毎回表示しないと通知の許可を外されるので必ず出す
function isSafari() {
  var ua = (self.navigator && self.navigator.userAgent) || '';
  return /Safari/.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR|Android|Firefox|FxiOS/.test(ua);
}

self.addEventListener('push', function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cs) {
    var front = false;
    cs.forEach(function (c) {
      try { c.postMessage({ type: 'fit-push', data: d }); } catch (x) {}
      if (c.visibilityState === 'visible' && c.focused && /\/app\.html/.test(c.url)) front = true;
    });
    // アプリを前面で開いているとき（Safari以外）は、連絡だけ画面の未読表示に任せて通知は出さない（ToDo・テストは出す）
    if (front && !isSafari() && /^fitchat-/.test(d.tag || '')) return;
    return self.registration.showNotification(d.title || 'fitアプリ', {
      body: d.body || '',
      icon: 'fit-icon-192.png',
      tag: d.tag || undefined,
      renotify: !!d.tag,
      data: { url: d.url || 'app.html', room: d.room || null }
    });
  }));
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var data = e.notification.data || {};
  var url = new URL(data.url || 'app.html', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cs) {
    for (var i = 0; i < cs.length; i++) {
      var c = cs[i];
      if (/\/app\.html/.test(c.url) && 'focus' in c) {
        try { c.postMessage({ type: 'fit-open', room: data.room || null, url: data.url || '' }); } catch (x) {}
        return c.focus();
      }
    }
    return self.clients.openWindow(url);
  }));
});
