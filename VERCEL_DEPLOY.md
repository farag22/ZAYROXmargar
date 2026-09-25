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

أضف متغيرات البيئة في **Project Settings → Environment Variables** بدلاً من رفع ملف `.env`. تحتاج الواجهة والخادم إلى قيم قاعدة البيانات والمصادقة التالية: `DATABASE_URL` و`JWT_SECRET` و`OAUTH_SERVER_URL` و`VITE_APP_ID` و`VITE_OAUTH_PORTAL_URL` و`OWNER_OPEN_ID` و`BUILT_IN_FORGE_API_URL` و`BUILT_IN_FORGE_API_KEY` و`VITE_FRONTEND_FORGE_API_URL` و`VITE_FRONTEND_FORGE_API_KEY`. أضف أيضاً متغيرات الهوية والتحليلات والتخزين المعتمدة في بيئة مشروعك مثل `VITE_APP_TITLE` و`VITE_APP_LOGO` و`VITE_ANALYTICS_ENDPOINT` و`VITE_ANALYTICS_WEBSITE_ID` و`VODAFONE_CASH_NUMBER` عند استخدامها.

بعد أول نشر، حدّث عناوين إعادة توجيه OAuth في مزود المصادقة لتشمل نطاق Vercel النهائي ومسار `/api/oauth/callback` إذا كان مزودك يتطلب قائمة عناوين مسموحة. ثم اختبر مسارات `/store/<slug>` و`/track-order` و`/api/trpc` مباشرةً، بالإضافة إلى تسجيل الدخول.

> لا يتضمن الأرشيف أي ملف `.env` أو مفاتيح. لا تُضف الأسرار إلى المستودع أو ملف ZIP.
