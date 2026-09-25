import { Button } from "@/components/ui/button";
import { Download, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export function StoreInstallButton({ slug, inverse = false }: { slug: string; inverse?: boolean }) {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(display-mode: standalone)");
    const ios = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    setInstalled(media.matches || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone));
    setIsIos(ios);
    const onPrompt = (event: Event) => { event.preventDefault(); setDeferred(event as InstallPromptEvent); };
    const onInstalled = () => { setInstalled(true); setDeferred(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);
  const install = async () => {
    localStorage.setItem("zayrox-store-launch-slug", slug);
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") toast.success("تمت إضافة المتجر إلى شاشة هاتفك.");
      return;
    }
    if (isIos) toast.message("من Safari اضغط مشاركة ثم «إضافة إلى الشاشة الرئيسية» لتثبيت المتجر.");
    else toast.message("يمكنك تثبيت المتجر من قائمة المتصفح «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».");
  };
  return <Button type="button" onClick={install} size="sm" variant={inverse ? "ghost" : "outline"} className={inverse ? "rounded-xl text-white hover:bg-white/15 hover:text-white" : "rounded-xl bg-white text-primary hover:bg-secondary"}>{installed ? <Smartphone className="ml-1.5 size-4"/> : <Download className="ml-1.5 size-4"/>}{installed ? "المتجر مثبّت" : "ثبّت المتجر"}</Button>;
}
