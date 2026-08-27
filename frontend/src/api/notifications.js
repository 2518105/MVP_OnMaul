import api from "./client";

// VAPID 공개키(base64url) -> pushManager.subscribe가 요구하는 Uint8Array로 변환
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function isPushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function getSubscriptionStatus() {
  if (!isPushSupported()) {
    return { supported: false, permission: "denied", subscribed: false };
  }
  const permission = Notification.permission;
  let subscribed = false;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    subscribed = !!subscription;
  } catch {}
  return { supported: true, permission, subscribed };
}

export async function subscribeToPush() {
  if (!isPushSupported()) {
    throw new Error("이 브라우저는 알림을 지원하지 않아요");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    const err = new Error("알림 권한이 거부되었어요");
    err.permission = permission;
    throw err;
  }

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  const { data } = await api.get("/notifications/vapid-public-key");
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(data.publicKey),
  });

  await api.post("/notifications/subscribe", subscription.toJSON());
  return subscription;
}

export async function unsubscribeFromPush() {
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;

  await api.delete("/notifications/subscribe", { data: { endpoint: subscription.endpoint } });
  await subscription.unsubscribe();
}
