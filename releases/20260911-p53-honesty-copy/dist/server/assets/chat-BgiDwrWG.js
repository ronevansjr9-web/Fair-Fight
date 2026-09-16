import { c as createServerRpc } from "./createServerRpc-D_-6bKnO.js";
import { c as createServerFn } from "../server.js";
import { g as getCurrentAuth } from "./auth-FTkvfrUA.js";
import "./ai-Cw0dwDfh.js";
import "@neondatabase/serverless";
import { t as tempUnavailableError } from "./restrictedFeatures-Dp1tXKpY.js";
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
const rateLimitMap = /* @__PURE__ */ new Map();
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1e3);
const sendMessage_createServerFn_handler = createServerRpc({
  id: "68f0f484a7119a0a7b73495a98afa96fe708537a4dc73e316d918f3f8116d908",
  name: "sendMessage",
  filename: "src/routes/chat.tsx"
}, (opts) => sendMessage.__executeServer(opts));
const sendMessage = createServerFn({
  method: "POST"
}).validator((data) => {
  const d = data;
  if (typeof d.message !== "string" || !d.message.trim()) throw new Error("Message is required");
  return {
    message: d.message,
    history: d.history || []
  };
}).handler(sendMessage_createServerFn_handler, async ({
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
  sendMessage_createServerFn_handler
};
