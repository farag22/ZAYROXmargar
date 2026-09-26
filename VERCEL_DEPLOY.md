# النشر على Vercel

هذا المشروع يضم واجهة Vite وواجهة API مبنية على Express وtRPC. يوفّر الملف `api/[...path].ts` تطبيق Express كدالة Vercel Serverless لجميع المسارات التي تبدأ بـ`/api/`، فيما يتولى `vercel.json` إعادة توجيه مسارات الواجهة العامة إلى `index.html` حتى تعمل روابط المتجر والتتبع وواجهة الإدارة مباشرةً من المتصفح.

## إعدادات المشروع في Vercel

| الإعداد | القيمة |
| --- | --- |
| Framework Preset | Other |
| Install Command | `pnpm install --frozen-lockfile` |
| Build Command | `pnpm build` |
| Output Directory | `dist/public` |
| Node.js | 22.x |

أضف متغيرات البيئة في **Project Settings → Environment Variables** بدلاً من رفع ملف `.env`. المتغيرات التي يقرأها الكود فعليًا:

- `DATABASE_URL` (مطلوب) رابط Transaction pooler من Supabase على المنفذ `6543`. إذا كانت كلمة المرور تبدأ بـ `@` اكتبها `%40`.
- `JWT_SECRET` (مطلوب على Vercel) سر طويل لتوقيع جلسة الدخول.
- `OWNER_OPEN_ID` و`VODAFONE_CASH_NUMBER` اختياريان.

`SUPABASE_URL` و`SUPABASE_PUBLISHABLE_KEY` لا يستخدمان في الكود.

بعد أول نشر، حدّث عناوين إعادة توجيه OAuth في مزود المصادقة لتشمل نطاق Vercel النهائي ومسار `/api/oauth/callback` إذا كان مزودك يتطلب قائمة عناوين مسموحة. ثم اختبر مسارات `/store/<slug>` و`/track-order` و`/api/trpc` مباشرةً، بالإضافة إلى تسجيل الدخول.

> لا يتضمن الأرشيف أي ملف `.env` أو مفاتيح. لا تُضف الأسرار إلى المستودع أو ملف ZIP.
