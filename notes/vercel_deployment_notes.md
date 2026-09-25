# ملاحظات نشر Vercel

تدعم Vercel تصدير تطبيق Express كـ default export لتشغيله كدالة Serverless. لا يخدم `express.static()` الملفات الثابتة على Vercel، لذلك يجب أن تُنشر ملفات Vite الناتجة من `dist/public` كأصول ثابتة، بينما يستقبل `api/index.ts` مسارات tRPC وOAuth والتخزين.

يجب أن يبقى rewrite الواجهة `/(.*) -> /index.html` لمسارات تطبيق SPA. يتطلب النشر ضبط Build Command إلى `pnpm build` وOutput Directory إلى `dist/public`، وإدخال متغيرات البيئة الآمنة في إعدادات مشروع Vercel بدلاً من رفع ملف `.env`.
