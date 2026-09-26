export function jsonInternalError(message: string) {
  return {
    error: {
      json: {
        message,
        code: -32603,
        data: {
          code: "INTERNAL_SERVER_ERROR",
          httpStatus: 500,
        },
      },
    },
  };
}

export function humanizePlatformError(text: string): string {
  const body = text.trim();
  if (!body || body.startsWith("<") || body.startsWith("A server") || body.includes("FUNCTION_INVOCATION") || body.includes("DEPLOYMENT_NOT_FOUND")) {
    return "تعذر الاتصال بالخادم. راجع DATABASE_URL وJWT_SECRET على Vercel ثم أعد النشر.";
  }
  if (body.includes("Unexpected") || body.includes("JSON")) {
    return "تعذر قراءة رد الخادم. حاول مرة أخرى بعد التأكد من إعدادات Vercel.";
  }
  return body.slice(0, 180);
}

export function writeJson(res: { headersSent?: boolean; statusCode: number; setHeader(name: string, value: string): void; end(body?: string): void }, status: number, payload: unknown) {
  if (res.headersSent) return;
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}
