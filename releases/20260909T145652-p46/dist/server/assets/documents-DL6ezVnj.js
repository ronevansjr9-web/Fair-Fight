import { c as createServerRpc } from "./createServerRpc-D_-6bKnO.js";
import { c as createServerFn } from "../server.js";
import { g as getCurrentAuth } from "./auth-ZI2Sw1yb.js";
import "./ai-Cw0dwDfh.js";
import "@neondatabase/serverless";
import { t as tempUnavailableError } from "./restrictedFeatures-CtcRJvVh.js";
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
import "@google/generative-ai";
const generateDocument_createServerFn_handler = createServerRpc({
  id: "65957c43ca2e4fdd5072672cc4223904e65c2478d2112cdd779215e0089558b0",
  name: "generateDocument",
  filename: "src/routes/documents.tsx"
}, (opts) => generateDocument.__executeServer(opts));
const generateDocument = createServerFn({
  method: "POST"
}).validator((data) => {
  const d = data;
  if (typeof d.docType !== "string") throw new Error("Document type required");
  return {
    docType: d.docType,
    context: d.context || "",
    jurisdiction: d.jurisdiction || ""
  };
}).handler(generateDocument_createServerFn_handler, async ({
  data
}) => {
  const auth = await getCurrentAuth();
  if (!auth.userId) return {
    error: "Sign in required"
  };
  {
    return tempUnavailableError();
  }
});
export {
  generateDocument_createServerFn_handler
};
