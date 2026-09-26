import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Store } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";

export default function Login() {
  const { isAuthenticated, loading, refresh } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const login = trpc.auth.login.useMutation({
    onSuccess: async () => {
      await refresh();
      setLocation("/dashboard");
    },
    onError: err => setError(err.message),
  });

  useEffect(() => {
    if (isAuthenticated) setLocation("/dashboard");
  }, [isAuthenticated, setLocation]);

  if (loading || isAuthenticated) return <div className="min-h-screen bg-background" />;

  return (
    <main className="grid min-h-screen place-items-center bg-background p-6" dir="rtl">
      <section className="w-full max-w-md rounded-[2rem] border border-border/70 bg-card p-8 shadow-xl shadow-primary/10">
        <div className="mb-7 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <Store />
          </span>
          <span>
            <b className="block tracking-tight">ZAYROX</b>
            <small className="text-[10px] tracking-[.18em] text-muted-foreground">SHOP MANAGER</small>
          </span>
        </div>
        <h1 className="text-2xl font-extrabold">تسجيل الدخول</h1>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">ادخل ببريدك الإلكتروني وكلمة المرور للوصول إلى محلك.</p>
        <form
          className="mt-7 grid gap-4"
          onSubmit={event => {
            event.preventDefault();
            setError("");
            login.mutate({ email, password });
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} dir="ltr" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">كلمة المرور</Label>
            <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} dir="ltr" />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" size="lg" className="mt-2 w-full" disabled={login.isPending}>
            {login.isPending ? "جاري الدخول..." : "دخول"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          ليس لديك حساب؟ <Link href="/register" className="font-bold text-primary">إنشاء حساب جديد</Link>
        </p>
      </section>
    </main>
  );
}
