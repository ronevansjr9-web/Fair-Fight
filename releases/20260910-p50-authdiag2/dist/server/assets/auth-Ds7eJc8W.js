import { b as getRequest } from "../server.js";
function loadEnv() {
  return {
    secretKey: process.env.CLERK_SECRET_KEY,
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY || process.env.VITE_CLERK_PUBLISHABLE_KEY,
    apiUrl: process.env.CLERK_API_URL,
    jwtKey: process.env.CLERK_JWT_KEY,
    proxyUrl: process.env.CLERK_PROXY_URL,
    isSatellite: process.env.CLERK_IS_SATELLITE === "true",
    domain: process.env.CLERK_DOMAIN
  };
}
async function getCurrentAuth(request) {
  const { createClerkClient } = await import("@clerk/backend");
  const { AuthStatus, stripPrivateDataFromObject } = await import("@clerk/backend/internal");
  const req = getRequest();
  const env = loadEnv();
  const requestState = await createClerkClient(env).authenticateRequest(req, {
    signInUrl: process.env.CLERK_SIGN_IN_URL,
    signUpUrl: process.env.CLERK_SIGN_UP_URL,
    afterSignInUrl: process.env.CLERK_AFTER_SIGN_IN_URL,
    afterSignUpUrl: process.env.CLERK_AFTER_SIGN_UP_URL
  });
  if (process.env.FF_AUTH_DEBUG === "1") {
    try {
      const cookieHeader = req.headers.get("cookie") ?? "";
      const names = new Set(
        cookieHeader.split(";").map((c) => c.trim().split("=")[0]).filter(Boolean)
      );
      const flags = ["__session", "__client_uat", "__clerk_db_jwt", "__clerk_redirect_count"].map((n) => `${n}:${names.has(n) ? "1" : "0"}`).join(",");
      const url = new URL(req.url);
      const claims = (() => {
        try {
          const m = cookieHeader.match(/(?:^|;\s*)__session=([^;]+)/);
          if (!m) return "no-session";
          const [, payloadB64] = m[1].split(".");
          const payload = JSON.parse(
            Buffer.from(payloadB64.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")
          );
          const serverNow = Math.floor(Date.now() / 1e3);
          return JSON.stringify({
            iat: payload.iat,
            nbf: payload.nbf,
            exp: payload.exp,
            serverNow,
            nbfAheadOfServer: (payload.nbf ?? 0) - serverNow
          });
        } catch {
          return "decode-failed";
        }
      })();
      console.error(
        `[auth-debug] ${req.method} ${url.pathname} status=${requestState.status} reason=${String(requestState.reason)} cookies=${flags} claims=${claims} location=${requestState.headers.get("location") ? "1" : "0"}`
      );
    } catch (e) {
      console.error(`[auth-debug] logging failed: ${String(e)}`);
    }
  }
  const hasLocationHeader = requestState.headers.get("location");
  if (hasLocationHeader) {
    throw new Response(null, { status: 307, headers: requestState.headers });
  }
  if (requestState.status === AuthStatus.Handshake) {
    throw new Error("Clerk: unexpected handshake without redirect");
  }
  return stripPrivateDataFromObject(requestState.toAuth());
}
export {
  getCurrentAuth as g
};
