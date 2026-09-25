import React from "react";
import { Wifi, WifiOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function useOnlineStatus() {
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);
  return online;
}

export function OfflineStatusBanner() {
  const online = useOnlineStatus();
  const [showBackOnline, setShowBackOnline] = useState(false);
  const wasOffline = useRef(false);
  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      setShowBackOnline(false);
      return;
    }
    if (!wasOffline.current) return;
    wasOffline.current = false;
    setShowBackOnline(true);
    const timer = window.setTimeout(() => setShowBackOnline(false), 3500);
    return () => window.clearTimeout(timer);
  }, [online]);
  if (online && !showBackOnline) return null;
  return (
    <div className={`fixed inset-x-3 top-3 z-[100] mx-auto flex max-w-md items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold shadow-lg backdrop-blur ${online ? "bg-emerald-700 text-white" : "bg-amber-100 text-amber-950 ring-1 ring-amber-300"}`} role="status" aria-live="polite">
      {online ? <Wifi className="size-4 shrink-0" /> : <WifiOff className="size-4 shrink-0" />}
      <span>{online ? "عاد الاتصال بالإنترنت" : "أنت تعمل دون اتصال — يمكنك تصفح ما تم فتحه سابقاً"}</span>
    </div>
  );
}
