import { c as createServerRpc } from "./createServerRpc-D_-6bKnO.js";
import { c as createServerFn } from "../server.js";
import { g as getCurrentAuth } from "./auth-Ds7eJc8W.js";
import "@neondatabase/serverless";
import { T as TEMP_UNAVAILABLE_MESSAGE } from "./restrictedFeatures-CtcRJvVh.js";
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
const getUploadedFiles_createServerFn_handler = createServerRpc({
  id: "5a5678ee0491151d13035b86aa536914eff61e34819832bdaf35d2c3a926b42f",
  name: "getUploadedFiles",
  filename: "src/routes/evidence.tsx"
}, (opts) => getUploadedFiles.__executeServer(opts));
const getUploadedFiles = createServerFn({
  method: "GET"
}).handler(getUploadedFiles_createServerFn_handler, async () => {
  const auth = await getCurrentAuth();
  if (!auth.userId) return {
    files: [],
    unavailable: true
  };
  {
    return {
      files: [],
      unavailable: true
    };
  }
});
const removeFile_createServerFn_handler = createServerRpc({
  id: "1ee8c0504a6a323d3984209488f46c731e701bd2453aa81b058c908b2740b269",
  name: "removeFile",
  filename: "src/routes/evidence.tsx"
}, (opts) => removeFile.__executeServer(opts));
const removeFile = createServerFn({
  method: "POST"
}).validator((data) => {
  const d = data;
  if (typeof d.fileId !== "string") throw new Error("fileId required");
  return {
    fileId: d.fileId
  };
}).handler(removeFile_createServerFn_handler, async ({
  data
}) => {
  const auth = await getCurrentAuth();
  if (!auth.userId) return {
    success: false,
    error: "Unauthorized"
  };
  {
    return {
      success: false,
      error: TEMP_UNAVAILABLE_MESSAGE
    };
  }
});
export {
  getUploadedFiles_createServerFn_handler,
  removeFile_createServerFn_handler
};
