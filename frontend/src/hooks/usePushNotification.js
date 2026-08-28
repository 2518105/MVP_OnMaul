import { useState, useEffect, useCallback } from "react";
import { getSubscriptionStatus, subscribeToPush, unsubscribeFromPush } from "../api/notifications";

// 페이지(홈/마이페이지 등)에 상관없이 재사용하는 푸시 구독 on/off 상태 관리 훅
export function usePushNotification() {
  const [status, setStatus] = useState({ supported: false, permission: "default", subscribed: false });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getSubscriptionStatus().then(setStatus);
  }, []);

  const toggle = useCallback(async () => {
    if (!status.supported) {
      throw new Error("이 브라우저는 알림을 지원하지 않아요");
    }
    if (status.permission === "denied") {
      throw new Error("브라우저 설정에서 알림 권한을 허용해주세요");
    }

    setLoading(true);
    try {
      if (status.subscribed) {
        await unsubscribeFromPush();
        setStatus(s => ({ ...s, subscribed: false }));
        return false;
      }
      await subscribeToPush();
      setStatus(s => ({ ...s, subscribed: true, permission: "granted" }));
      return true;
    } finally {
      setLoading(false);
    }
  }, [status]);

  return { status, loading, toggle };
}
