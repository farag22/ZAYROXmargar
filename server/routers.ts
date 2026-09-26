    register: publicProcedure
      .input(
        z.object({
          name: text(80),
          email: z.string().trim().email().max(320),
          password: z.string().min(8).max(72),
        })
      )
      .mutation(async ({ ctx, input }) => {
        console.log("1. Starting registration for:", input.email);

        if (ctx.user) {
          throw new TRpcError({ code: "BAD_REQUEST", message: "أنت مسجّل الدخول بالفعل." });
        }

        const email = input.email.trim().toLowerCase();
        const name = input.name.trim();

        try {
          console.log("2. Calling db.createLocalUser...");
          const user = await db.createLocalUser({
            name,
            email,
            password: input.password,
          });
          console.log("3. User created successfully:", user?.id);

          console.log("4. Creating session token...");
          const sessionToken = await sdk.createSessionToken(user.openId, {
            name: user.name || name,
            expiresInMs: ONE_YEAR_MS,
          });
          console.log("5. Session token created.");

          console.log("6. Setting cookie...");
          ctx.res.cookie(COOKIE_NAME, sessionToken, {
            ...getSessionCookieOptions(ctx.req),
            maxAge: ONE_YEAR_MS,
          });
          console.log("7. Cookie set. Returning success.");

          return { success: true } as const;
        } catch (error) {
          console.error("8. CAUGHT ERROR IN REGISTER:", error);
          if (error instanceof TRPCError) throw error;
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error instanceof Error ? error.message : "حدث خطأ غير معروف",
          });
        }
      }),
