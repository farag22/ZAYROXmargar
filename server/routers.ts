register: publicProcedure
  .input(
    z.object({
      name: text(80),
      email: z.string().trim().email().max(320),
      password: z.string().min(8).max(72),
    })
  )
  .mutation(async ({ ctx, input }) => {
    if (ctx.user) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "أنت مسجّل الدخول بالفعل.",
      });
    }

    const email = input.email.trim().toLowerCase();
    const name = input.name.trim();

    try {
      // إنشاء المستخدم
      const user = await db.createLocalUser({
        name,
        email,
        password: input.password,
      });

      if (!user || !user.openId) {
        console.error("REGISTER ERROR: User was not created correctly");

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "تعذر إنشاء الحساب.",
        });
      }

      // إنشاء جلسة تسجيل الدخول
      const sessionToken = await sdk.createSessionToken(user.openId, {
        name: user.name || name,
        expiresInMs: ONE_YEAR_MS,
      });

      if (!sessionToken) {
        console.error("REGISTER ERROR: Session token was not created");

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "تم إنشاء الحساب ولكن تعذر تسجيل الدخول.",
        });
      }

      // حفظ الجلسة
      ctx.res.cookie(COOKIE_NAME, sessionToken, {
        ...getSessionCookieOptions(ctx.req),
        maxAge: ONE_YEAR_MS,
      });

      return {
        success: true,
      } as const;
    } catch (error) {
      // البريد مستخدم بالفعل
      if (
        error instanceof Error &&
        error.message === "EMAIL_TAKEN"
      ) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "هذا البريد الإلكتروني مستخدم بالفعل.",
        });
      }

      // إذا كان الخطأ أصلاً TRPCError نعيده كما هو
      if (error instanceof TRPCError) {
        throw error;
      }

      // تسجيل الخطأ الحقيقي في Server Logs
      console.error("REGISTER SERVER ERROR:", error);

      // لا نعيد الخطأ الخام للواجهة
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "حدث خطأ في الخادم أثناء إنشاء الحساب.",
      });
    }
  }),
