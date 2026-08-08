// Production server for one immutable release. publish.sh builds and swaps releases
// before restarting this process; RELEASE_DIR is resolved once so a running process
// never observes a symlink pointing at a different release.
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
// RELEASE_DIR is always the immutable release root containing dist/, RELEASE_ID, and this launcher.
// The copied launcher therefore has the same contract as the normal and legacy launchers.
const releaseDir = await Bun.$`realpath ${process.env.RELEASE_DIR || import.meta.dir}`.text();
const root = releaseDir.trim();
const { default: handler } = await import(`${root}/dist/server/server.js`);
const CLIENT_DIR = `${root}/dist/client`;
const RELEASE_ID = (await Bun.file(`${root}/RELEASE_ID`).text()).trim();
const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": ["default-src 'self'", "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://challenges.cloudflare.com", "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", "font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com", "img-src 'self' data: https: blob:", "connect-src 'self' https://*.clerk.accounts.dev https://api.clerk.com https://*.stripe.com https://api.openai.com https://api.groq.com https://generativelanguage.googleapis.com https://vitals.vercel-analytics.com", "frame-src 'self' https://*.stripe.com https://challenges.cloudflare.com", "media-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self' https://*.stripe.com"].join("; "),
  "X-Frame-Options": "DENY", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "strict-origin-when-cross-origin", "Strict-Transport-Security": "max-age=31536000; includeSubDomains", "Permissions-Policy": "camera=(), microphone=(), geolocation=(self), interest-cohort=()",
};
function secure(response: Response) { const headers = new Headers(response.headers); for (const [k,v] of Object.entries(SECURITY_HEADERS)) if (!headers.has(k)) headers.set(k,v); headers.set("X-Release-ID", RELEASE_ID); return new Response(response.body, {status: response.status, statusText: response.statusText, headers}); }
const freePort = `for _ in $(seq 1 25); do pids=$(lsof -t -iTCP:${PORT} -sTCP:LISTEN 2>/dev/null || true); if [ -z "$pids" ]; then exit 0; fi; kill $pids 2>/dev/null || true; sleep 0.2; done`;
for (let attempt = 1;; attempt++) { await Bun.$`sudo sh -c ${freePort}`.quiet().nothrow(); try { Bun.serve({ port: PORT, hostname: HOST, async fetch(req) { const {pathname} = new URL(req.url); if (pathname !== "/") { const file = Bun.file(CLIENT_DIR + pathname); if (await file.exists()) return secure(new Response(file)); } return secure(await (handler as {fetch:(r:Request)=>Response|Promise<Response>}).fetch(req)); }}); break; } catch (e) { if (attempt >= 10) throw e; await Bun.sleep(200); } }
console.log(`team-site serving release ${root} on http://${HOST}:${PORT}`);
