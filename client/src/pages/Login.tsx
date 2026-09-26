import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, Loader2 } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      window.location.href = "/";
    },
    onError: (error) => {
      setErrorMessage(error.message || "حدث خطأ أثناء تسجيل الدخول.");
    },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      window.location.href = "/";
    },
    onError: (error) => {
      setErrorMessage(error.message || "حدث خطأ أثناء إنشاء الحساب.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    if (isRegistering) {
      if (!name.trim()) {
        setErrorMessage("يرجى إدخال الاسم.");
        return;
      }
      registerMutation.mutate({ name, email, password });
    } else {
      loginMutation.mutate({ email, password });
    }
  };

  const isLoading = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <Card className="w-full max-w-md shadow-lg border-gray-200 dark:border-gray-800">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-1">
            <Store className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            {isRegistering ? "إنشاء حساب في ZAYROX" : "مرحباً بك في ZAYROX"}
          </CardTitle>
          <CardDescription>
            {isRegistering
              ? "سجل حسابك الخاص لإدارة محلك ومنتجاتك ومبيعاتك."
              : "سجل الدخول للوصول الآمن إلى بيانات محلك ومبيعاتك."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegistering && (
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
            )}
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
              {isRegistering ? "إنشاء الحساب" : "تسجيل الدخول"}
            </Button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setErrorMessage("");
                }}
                className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                {isRegistering ? "لديك حساب بالفعل؟ تسجيل الدخول" : "ليس لديك حساب؟ إنشاء حساب جديد"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
