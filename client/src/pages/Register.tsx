import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Store } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";

export default function Register() {
  const { isAuthenticated, loading, refresh } = useAuth();
  const [, setLocation] = useLocation();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: async () => {
      try {
        await refresh();
        setLocation("/dashboard");
      } catch {
        setError("تم إنشاء الحساب، ولكن تعذر تسجيل الدخول تلقائيًا.");
      }
    },

    onError: (err) => {
      console.error("REGISTER ERROR:", err);

      const message = err?.message || "";

      if (
        message.includes("Unexpected token") ||
        message.includes("JSON") ||
        message.includes("server error") ||
        message.includes("Server Error")
      ) {
        setError(
          "حدث خطأ في الخادم أثناء إنشاء الحساب. يرجى المحاولة مرة أخرى."
        );
      } else {
        setError(message || "تعذر إنشاء الحساب.");
      }
    },
  });

  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, setLocation]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      setError("من فضلك أدخل الاسم.");
      return;
    }

    if (!cleanEmail) {
      setError("من فضلك أدخل البريد الإلكتروني.");
      return;
    }

    if (password.length < 8) {
      setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل.");
      return;
    }

    registerMutation.mutate({
      name: cleanName,
      email: cleanEmail,
      password,
    });
  };

  if (loading || isAuthenticated) {
    return (
      <div className="min-h-screen bg-background grid place-items-center">
        <div className="text-muted-foreground">
          جاري التحميل...
        </div>
      </div>
    );
  }

  return (
    <main
      className="grid min-h-screen place-items-center bg-background p-6"
      dir="rtl"
    >
      <section className="w-full max-w-md rounded-[2rem] border border-border/70 bg-card p-8 shadow-xl shadow-primary/10">

        {/* Logo */}
        <div className="mb-7 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <Store size={22} />
          </span>

          <span>
            <b className="block tracking-tight">
              ZAYROX
            </b>

            <small className="text-[10px] tracking-[.18em] text-muted-foreground">
              SHOP MANAGER
            </small>
          </span>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-extrabold">
          إنشاء حساب
        </h1>

        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          سجّل بحسابك الخاص لإدارة محلك ومنتجاتك ومبيعاتك.
        </p>

        {/* Form */}
        <form
          className="mt-7 grid gap-4"
          onSubmit={handleSubmit}
        >

          {/* Name */}
          <div className="grid gap-2">
            <Label htmlFor="name">
              الاسم
            </Label>

            <Input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="أدخل اسمك"
            />
          </div>

          {/* Email */}
          <div className="grid gap-2">
            <Label htmlFor="email">
              البريد الإلكتروني
            </Label>

            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@gmail.com"
              dir="ltr"
            />
          </div>

          {/* Password */}
          <div className="grid gap-2">
            <Label htmlFor="password">
              كلمة المرور
            </Label>

            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8 أحرف على الأقل"
              dir="ltr"
            />
          </div>

          {/* Error */}
          {error && (
            <div
              className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* Submit */}
          <Button
            type="submit"
            size="lg"
            className="mt-2 w-full"
            disabled={registerMutation.isPending}
          >
            {registerMutation.isPending
              ? "جاري إنشاء الحساب..."
              : "إنشاء الحساب"}
          </Button>

        </form>

        {/* Login */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          لديك حساب بالفعل؟{" "}
          <Link
            href="/login"
            className="font-bold text-primary hover:underline"
          >
            تسجيل الدخول
          </Link>
        </p>

      </section>
    </main>
  );
        }
