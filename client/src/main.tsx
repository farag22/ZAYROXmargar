import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from "@shared/const";
import { LOGIN_PATH } from "./const";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { OfflineStatusBanner } from "./components/OfflineStatusBanner";
import "./index.css";

if (typeof window !== "undefined") {
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
  const launchSlug = localStorage.getItem("zayrox-store-launch-slug");
  if (isStandalone && launchSlug && window.location.pathname === "/") window.location.replace(`/store/${launchSlug}`);
  if ("serviceWorker" in navigator) window.addEventListener("load", () => { navigator.serviceWorker.register("/store-service-worker.js").catch(() => undefined); });
}

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;
  if (error.message !== UNAUTHED_ERR_MSG) return;
  if (window.location.pathname === LOGIN_PATH || window.location.pathname === "/register") return;
  window.location.href = LOGIN_PATH;
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        }).then(async response => {
          const contentType = response.headers.get("content-type") || "";
          if (contentType.includes("application/json")) return response;
          const text = await response.text();
          const message = !text || text.startsWith("<") || text.startsWith("A server") || text.includes("Unexpected")
            ? "تعذر الاتصال بالخادم. راجع DATABASE_URL وJWT_SECRET على Vercel ثم أعد النشر."
            : text.slice(0, 180);
          return new Response(JSON.stringify({
            error: {
              json: {
                message,
                code: -32603,
                data: { code: "INTERNAL_SERVER_ERROR", httpStatus: response.status || 500 },
              },
            },
          }), {
            status: response.status || 500,
            headers: { "content-type": "application/json" },
          });
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
      <OfflineStatusBanner />
    </QueryClientProvider>
  </trpc.Provider>
);
