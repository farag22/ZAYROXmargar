import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, Loader2 } from "lucide-react";

function formatAuthError(message: string) {
  const text = message || "";
  if (!text || text.startsWith("A server") || text.includes("JSON") || text.includes("Unexpected") || text.startsWith("<")) {
    return "تعذر الاتصال بالخادم. راجع DATABASE_URL وJWT_SECRET على Vercel ثم أعد النشر.";
  }
  return text;
}

export default function Register() {
  const [, _setLocation] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      window.location.href = "/";
    },
    onError: (error) => {
      setErrorMessage(formatAuthError(error.message || "حدث خطأ أثناء إنشاء الحساب."));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    if (!name.trim()) {
      setErrorMessage("يرجى إدخال الاسم.");
      return;
    }
    registerMutation.mutate({ name, email, password });
  };

  const isLoading = registerMutation.isPending;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <Card className="w-full max-w-md shadow-lg border-gray-200 dark:border-gray-800">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-1">
            <Store className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">إنشاء حساب في ZAYROX</CardTitle>
          <CardDescription>سجل حسابك الخاص لإدارة محلك ومنتجاتك ومبيعاتك.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2 text-right">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">الاسم</label>
              <Input
                type="text"
                placeholder="الاسم الكامل"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            <div className="space-y-2 text-right">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">البريد الإلكتروني</label>
              <Input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            <div className="space-y-2 text-right">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">كلمة المرور</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            {errorMessage && (
              <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-950/50 dark:text-red-400 rounded-md text-right">
                {errorMessage}
              </div>
            )}

            <Button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800 text-white" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              إنشاء الحساب
            </Button>

            <div className="text-center pt-2">
              <a
                href="/login"
                className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                لديك حساب بالفعل؟ تسجيل الدخول
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
