import { jsx, jsxs } from "react/jsx-runtime";
import { c as createSsrRpc } from "./router-COlvaXvL.js";
import { c as createServerFn } from "../server.js";
import { A as AuthenticatedGuard } from "./AuthenticatedGuard-BRF14A_z.js";
import { T as TEMP_UNAVAILABLE_MESSAGE } from "./restrictedFeatures-Dp1tXKpY.js";
import "@tanstack/react-router";
import "react";
import "@clerk/react/internal";
import "@clerk/shared/getToken";
import "@clerk/react";
import "@clerk/shared/error";
import "@clerk/shared/getEnvVariable";
import "@clerk/shared/underscore";
import "@clerk/shared/htmlSafeJson";
import "@neondatabase/serverless";
import "./db-D7cnbd5l.js";
import "@tanstack/router-core/ssr/client";
import "stripe";
import "./argumentAccess-Brc0Ql3j.js";
import "node:async_hooks";
import "h3-v2";
import "@tanstack/router-core";
import "seroval";
import "@tanstack/history";
import "@tanstack/router-core/ssr/server";
import "@tanstack/react-router/ssr/server";
createServerFn({
  method: "POST"
}).validator((data) => {
  const d = data;
  if (typeof d.message !== "string" || !d.message.trim()) throw new Error("Message is required");
  return {
    message: d.message,
    history: d.history || []
  };
}).handler(createSsrRpc("68f0f484a7119a0a7b73495a98afa96fe708537a4dc73e316d918f3f8116d908"));
function ChatPage() {
  return /* @__PURE__ */ jsx(AuthenticatedGuard, { children: /* @__PURE__ */ jsx("main", { className: "min-h-screen bg-navy px-4 py-12", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-3xl", children: [
    /* @__PURE__ */ jsx("h1", { className: "mb-2 text-3xl font-extrabold text-white", children: "AI Legal Education Chat" }),
    /* @__PURE__ */ jsx("p", { className: "mb-8 text-white/70", children: "The AI legal-education chat is temporarily unavailable while we verify Pro activation." }),
    /* @__PURE__ */ jsxs("div", { className: "rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-8", children: [
      /* @__PURE__ */ jsx("div", { className: "mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold/10", children: /* @__PURE__ */ jsx("svg", { className: "h-8 w-8 text-gold", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" }) }) }),
      /* @__PURE__ */ jsx("h2", { className: "mb-2 text-center text-xl font-bold text-white", children: "The AI Legal Education Chat is temporarily unavailable" }),
      /* @__PURE__ */ jsx("p", { className: "mx-auto mb-6 max-w-xl text-center text-sm text-white/70", children: TEMP_UNAVAILABLE_MESSAGE }),
      /* @__PURE__ */ jsx("p", { className: "mx-auto max-w-xl text-center text-sm text-white/60", children: "AI chat is a paid tool. We are verifying Pro activation before making it available. When it is restored, answers will be educational only — never legal advice. Your legal education, legal research, and core case tools continue to work." })
    ] })
  ] }) }) });
}
export {
  ChatPage as component
};
