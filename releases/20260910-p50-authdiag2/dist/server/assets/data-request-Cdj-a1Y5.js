import { c as createServerRpc } from "./createServerRpc-D_-6bKnO.js";
import { c as createServerFn } from "../server.js";
import { g as getCurrentAuth } from "./auth-Ds7eJc8W.js";
import { t as tempUnavailableError } from "./restrictedFeatures-CtcRJvVh.js";
import "@neondatabase/serverless";
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
const exportUserData_createServerFn_handler = createServerRpc({
  id: "865ac5bd38925b2b146058c111a614ba29350d00232b0d1bccba5878f384fbaf",
  name: "exportUserData",
  filename: "src/routes/data-request.tsx"
}, (opts) => exportUserData.__executeServer(opts));
const exportUserData = createServerFn({
  method: "POST"
}).handler(exportUserData_createServerFn_handler, async () => {
  const auth = await getCurrentAuth();
  if (!auth.userId) return {
    error: "Sign in required"
  };
  {
    return tempUnavailableError();
  }
});
const REQUIRED_CONFIRMATION = "DELETE MY DATA";
const deleteUserData_createServerFn_handler = createServerRpc({
  id: "5a09bd8d0667f845cdadf6ee5c33d97df989dbbe7d080ed21ddb4c4781727f0b",
  name: "deleteUserData",
  filename: "src/routes/data-request.tsx"
}, (opts) => deleteUserData.__executeServer(opts));
const deleteUserData = createServerFn({
  method: "POST"
}).validator((value) => {
  const d = value;
  if (typeof d.confirm !== "string" || d.confirm.trim().toUpperCase() !== REQUIRED_CONFIRMATION) {
    throw new Error("Confirmation is required to delete your data.");
  }
  return {};
}).handler(deleteUserData_createServerFn_handler, async () => {
  const auth = await getCurrentAuth();
  if (!auth.userId) return {
    error: "Sign in required"
  };
  {
    return tempUnavailableError();
  }
});
export {
  deleteUserData_createServerFn_handler,
  exportUserData_createServerFn_handler
};
