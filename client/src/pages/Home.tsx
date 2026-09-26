import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Home() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // توجيه تلقائي وفوري إلى لوحة التحكم
    setLocation("/dashboard");
  }, [setLocation]);

  return <div className="min-h-screen bg-background flex items-center justify-center">جاري الانتقال إلى لوحة التحكم...</div>;
}
