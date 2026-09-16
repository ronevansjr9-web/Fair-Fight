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
