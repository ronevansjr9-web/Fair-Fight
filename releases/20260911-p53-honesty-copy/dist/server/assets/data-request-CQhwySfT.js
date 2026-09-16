import { jsx, jsxs } from "react/jsx-runtime";
import { c as createSsrRpc } from "./router-CPaV_2AK.js";
import "react";
import { c as createServerFn } from "../server.js";
import { T as TEMP_UNAVAILABLE_MESSAGE } from "./restrictedFeatures-Dp1tXKpY.js";
import { A as AuthenticatedGuard } from "./AuthenticatedGuard-BRF14A_z.js";
import "@tanstack/react-router";
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
}).handler(createSsrRpc("865ac5bd38925b2b146058c111a614ba29350d00232b0d1bccba5878f384fbaf"));
const REQUIRED_CONFIRMATION = "DELETE MY DATA";
createServerFn({
  method: "POST"
}).validator((value) => {
  const d = value;
  if (typeof d.confirm !== "string" || d.confirm.trim().toUpperCase() !== REQUIRED_CONFIRMATION) {
    throw new Error("Confirmation is required to delete your data.");
  }
  return {};
}).handler(createSsrRpc("5a09bd8d0667f845cdadf6ee5c33d97df989dbbe7d080ed21ddb4c4781727f0b"));
function DataRequestPage() {
  return /* @__PURE__ */ jsx(AuthenticatedGuard, { children: /* @__PURE__ */ jsx("main", { className: "min-h-screen bg-navy px-4 py-12", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-3xl", children: [
    /* @__PURE__ */ jsx("h1", { className: "mb-2 text-3xl font-extrabold text-white", children: "Data Request" }),
    /* @__PURE__ */ jsx("p", { className: "mb-8 text-white/70", children: "We're committed to protecting your data and your right to access, export, and delete it." }),
    /* @__PURE__ */ jsxs("div", { className: "rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-8", children: [
      /* @__PURE__ */ jsx("div", { className: "mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold/10", children: /* @__PURE__ */ jsx("svg", { className: "h-8 w-8 text-gold", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" }) }) }),
      /* @__PURE__ */ jsx("h2", { className: "mb-2 text-center text-xl font-bold text-white", children: "Export and deletion are temporarily unavailable" }),
      /* @__PURE__ */ jsx("p", { className: "mx-auto mb-6 max-w-xl text-center text-sm text-white/70", children: TEMP_UNAVAILABLE_MESSAGE }),
      /* @__PURE__ */ jsxs("p", { className: "mx-auto max-w-xl text-center text-sm text-white/60", children: [
        "We are verifying that export and deletion cover every category of data we hold — including payment records and any future uploaded files — before we re-enable them. In the meantime you can contact us directly at",
        " ",
        /* @__PURE__ */ jsx("a", { href: "mailto:privacy@fairfight.ctonew.app", className: "font-semibold text-gold underline hover:text-gold-dark", children: "privacy@fairfight.ctonew.app" }),
        " ",
        "and we will assist with access, export, or deletion requests."
      ] }),
      /* @__PURE__ */ jsxs("p", { className: "mx-auto mt-6 max-w-xl text-center text-xs text-white/40", children: [
        "For details on how we handle your data, see our",
        " ",
        /* @__PURE__ */ jsx("a", { href: "/privacy", className: "text-gold underline hover:text-gold-dark", children: "Privacy Policy" }),
        "."
      ] })
    ] })
  ] }) }) });
}
export {
  DataRequestPage as component
};
