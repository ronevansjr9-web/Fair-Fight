import { c as createServerRpc } from "./createServerRpc-D_-6bKnO.js";
import { c as createServerFn } from "../server.js";
import { g as getCurrentAuth } from "./auth-ZI2Sw1yb.js";
import { R as RESTRICTED_FEATURES } from "./restrictedFeatures-CtcRJvVh.js";
import { b as hasOwnedCaseEntitlement } from "./argumentAccess-Brc0Ql3j.js";
import "node:async_hooks";
import "h3-v2";
import "@tanstack/router-core";
import "seroval";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core/ssr/server";
import "react";
import "@tanstack/react-router";
import "react/jsx-runtime";
import "@tanstack/react-router/ssr/server";
import "./db-D7cnbd5l.js";
import "@neondatabase/serverless";
import "stripe";
async function resolveProAccess(userId, caseId) {
  try {
    if (!userId) return {
      hasAccess: false,
      isAuthenticated: false
    };
    if (RESTRICTED_FEATURES.checkoutProActivation) ;
    try {
      const hasAccess = await hasOwnedCaseEntitlement(userId, caseId);
      return {
        hasAccess,
        isAuthenticated: true
      };
    } catch {
      return {
        hasAccess: false,
        isAuthenticated: true
      };
    }
  } catch {
    return {
      hasAccess: false,
      isAuthenticated: false
    };
  }
}
const checkProAccess_createServerFn_handler = createServerRpc({
  id: "5abc238fbfe99f9bd10a57986d6a948d7367ef87030a802c8f51b05d4769e6d7",
  name: "checkProAccess",
  filename: "src/components/ProGate.tsx"
}, (opts) => checkProAccess.__executeServer(opts));
const checkProAccess = createServerFn({
  method: "POST"
}).validator((v) => {
  const caseId = v?.caseId;
  if (typeof caseId !== "string" || !/^[A-Za-z0-9_-]+$/.test(caseId)) throw new Error("A case is required");
  return {
    caseId
  };
}).handler(checkProAccess_createServerFn_handler, async ({
  data
}) => {
  try {
    const auth = await getCurrentAuth();
    return resolveProAccess(auth.userId, data.caseId);
  } catch {
    return {
      hasAccess: false,
      isAuthenticated: false
    };
  }
});
export {
  checkProAccess_createServerFn_handler
};
