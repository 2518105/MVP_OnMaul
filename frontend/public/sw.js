// 웹 푸시 전용 최소 서비스워커 (오프라인 캐싱 등은 다루지 않음)

// 새 버전이 배포되면 탭을 다 닫을 때까지 기다리지 않고 즉시 활성화
self.addEventListener("install", () => {
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener("push", (event) => {
  let data = { title: "온마을", body: "", url: "/" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      data: { url: data.url },
      requireInteraction: true, // 클릭하거나 직접 닫기 전까지 사라지지 않게
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  const absoluteUrl = new URL(url, self.location.origin).href;

  event.waitUntil(
    (async () => {
      try {
        const clientList = await clients.matchAll({ type: "window", includeUncontrolled: true });

        for (const client of clientList) {
          const clientUrl = new URL(client.url);
          if (clientUrl.pathname + clientUrl.search === url && "focus" in client) {
            return client.focus();
          }
        }

        // 열려있는 탭이 있으면 그 탭에서 이동, 없으면 새 창을 연다
        if (clientList.length > 0 && "navigate" in clientList[0]) {
          await clientList[0].focus();
          return clientList[0].navigate(absoluteUrl);
        }
        if (clients.openWindow) {
          return await clients.openWindow(absoluteUrl);
        }
      } catch (err) {
        console.error("알림 클릭 처리 중 오류:", err);
      }
    })()
  );
});
