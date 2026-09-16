import { jsx, jsxs } from "react/jsx-runtime";
import { c as createSsrRpc } from "./router-CxY3nyJJ.js";
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
  method: "GET"
}).handler(createSsrRpc("5a5678ee0491151d13035b86aa536914eff61e34819832bdaf35d2c3a926b42f"));
createServerFn({
  method: "POST"
}).validator((data) => {
  const d = data;
  if (typeof d.fileId !== "string") throw new Error("fileId required");
  return {
    fileId: d.fileId
  };
}).handler(createSsrRpc("1ee8c0504a6a323d3984209488f46c731e701bd2453aa81b058c908b2740b269"));
function EvidencePage() {
  return /* @__PURE__ */ jsx(AuthenticatedGuard, { children: /* @__PURE__ */ jsx("main", { className: "min-h-screen bg-navy px-4 py-12", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-3xl", children: [
    /* @__PURE__ */ jsx("h1", { className: "mb-2 text-3xl font-extrabold text-white", children: "Evidence Manager" }),
    /* @__PURE__ */ jsx("p", { className: "mb-8 text-white/70", children: "The Evidence Manager — organizing and uploading case evidence — is temporarily unavailable while we verify durable file storage." }),
    /* @__PURE__ */ jsxs("div", { className: "rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-8", children: [
      /* @__PURE__ */ jsx("div", { className: "mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold/10", children: /* @__PURE__ */ jsx("svg", { className: "h-8 w-8 text-gold", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" }) }) }),
      /* @__PURE__ */ jsx("h2", { className: "mb-2 text-center text-xl font-bold text-white", children: "The Evidence Manager is temporarily unavailable" }),
      /* @__PURE__ */ jsx("p", { className: "mx-auto mb-6 max-w-xl text-center text-sm text-white/70", children: TEMP_UNAVAILABLE_MESSAGE }),
      /* @__PURE__ */ jsx("p", { className: "mx-auto max-w-xl text-center text-sm text-white/60", children: "We are verifying that uploaded files are stored durably and can be included in export and deletion before we re-enable uploads. Your cases, timeline, and court calendar continue to work." })
    ] })
  ] }) }) });
}
export {
  EvidencePage as component
};
