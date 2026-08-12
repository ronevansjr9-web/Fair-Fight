/**
 * P0 fail-closed guard tests for unverified customer flows.
 *
 * Covers the three restricted flows (Checkout/Pro activation, deletion/export,
 * evidence uploads) at every layer:
 *   - lib gate constants (src/lib/restrictedFeatures.ts)
 *   - lib entry points: createCheckoutSession / createCustomerPortalSession
 *     (src/lib/stripe.ts) and uploadFile (src/lib/storage.ts)
 *   - reachable API routes: /api/upload POST+GET, /api/user/delete-data POST,
 *     /api/user/export-data POST, /api/stripe/webhook POST (see also
 *     src/routes/api/stripe/webhook.test.ts)
 *   - server functions embedded in route/component files (static scan, the
 *     same pattern as getAuthRequestContext.test.ts): every gated server fn
 *     must reference the restriction gate so it can never silently run the
 *     unverified flow again.
 *   - public copy: no remaining promises of working uploads, complete
 *     deletion/export, a subscription model, or functioning $99 Pro
 *     activation.
 *
 * Free legal education, legal research, statutes/case law/court rules,
 * sign-in, and the durable case/timeline/calendar surfaces are deliberately
 * NOT gated and are not asserted here.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  RESTRICTED_FEATURES,
  TEMP_UNAVAILABLE_MESSAGE,
  TEMP_UNAVAILABLE_STATUS,
  tempUnavailableError,
} from "./restrictedFeatures";

describe("restricted feature gate constants", () => {
  test("all three high-risk flows are gated closed", () => {
    expect(RESTRICTED_FEATURES.checkoutProActivation).toBe(true);
    expect(RESTRICTED_FEATURES.deleteUserData).toBe(true);
    expect(RESTRICTED_FEATURES.exportUserData).toBe(true);
    expect(RESTRICTED_FEATURES.evidenceUploads).toBe(true);
  });

  test("message is honest, temporary, and does not overclaim", () => {
    expect(TEMP_UNAVAILABLE_MESSAGE.toLowerCase()).toContain("temporarily unavailable");
    // Must not imply the flow is complete, functioning, or ready.
    expect(TEMP_UNAVAILABLE_MESSAGE.toLowerCase()).not.toMatch(/complete|is ready|now live|fully working/i);
    expect(TEMP_UNAVAILABLE_STATUS).toBe(503);
  });

  test("tempUnavailableError returns the honest message", () => {
    expect(tempUnavailableError()).toEqual({ error: TEMP_UNAVAILABLE_MESSAGE });
  });
});

describe("lib entry points fail closed", () => {
  test("stripe checkout helpers reference the gate before any Stripe call", () => {
    const source = read("../lib/stripe.ts");
    const checkoutBody = handlerBody(source, "createCheckoutSession");
    expect(checkoutBody).toContain("RESTRICTED_FEATURES.checkoutProActivation");
    expect(checkoutBody).toContain("TEMP_UNAVAILABLE_MESSAGE");
    const portalBody = handlerBody(source, "createCustomerPortalSession");
    expect(portalBody).toContain("RESTRICTED_FEATURES.checkoutProActivation");
  });

  test("uploadFile fails closed before any DB access", async () => {
    const { uploadFile } = await import("./storage");
    const result = await uploadFile({
      userId: "user_1",
      caseId: "case_1",
      filename: "evidence.pdf",
      mimeType: "application/pdf",
      dataBase64: "aGVsbG8=",
      sizeBytes: 5,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe(TEMP_UNAVAILABLE_MESSAGE);
  });
});

describe("API routes fail closed with 503", () => {
  test("/api/upload POST rejects uploads", async () => {
    const { POST } = await import("../routes/api/upload");
    const res = await POST({ request: new Request("http://localhost/api/upload", { method: "POST" }) });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe(TEMP_UNAVAILABLE_MESSAGE);
  });

  test("/api/upload GET rejects listing", async () => {
    const { GET } = await import("../routes/api/upload");
    const res = await GET({ request: new Request("http://localhost/api/upload", { method: "GET" }) });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe(TEMP_UNAVAILABLE_MESSAGE);
  });

  test("/api/user/delete-data POST rejects deletion", async () => {
    const { POST } = await import("../routes/api/user/delete-data");
    const res = await POST({ request: new Request("http://localhost/api/user/delete-data", { method: "POST" }) });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe(TEMP_UNAVAILABLE_MESSAGE);
  });

  test("/api/user/export-data POST rejects export", async () => {
    const { POST } = await import("../routes/api/user/export-data");
    const res = await POST({ request: new Request("http://localhost/api/user/export-data", { method: "POST" }) });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe(TEMP_UNAVAILABLE_MESSAGE);
  });
});

/* ────────────────────────────────────────────
   Static regression scans (mirror the
   getAuthRequestContext.test.ts pattern)
   ──────────────────────────────────────────── */
function read(relative: string): string {
  return readFileSync(new URL(relative, import.meta.url), "utf8");
}

function handlerBody(source: string, exportName: string): string {
  const patterns = [
    `export const ${exportName} =`,
    `const ${exportName} =`,
    `export async function ${exportName}(`,
    `export function ${exportName}(`,
  ];
  const starts = patterns.map((p) => source.indexOf(p)).filter((n) => n !== -1);
  if (starts.length === 0) throw new Error(`${exportName} not found in source`);
  const start = Math.min(...starts);
  // End at the next top-level server-fn or function declaration. Inner
  // `const x = ...` lines inside handlers never match the createServerFn
  // pattern, so the slice reliably covers the whole handler.
  const rest = source.slice(start + 1);
  const nextFn = /\n(?:export )?const \w+ = createServerFn|\nexport (?:async )?function |\nfunction /.exec(rest);
  const end = nextFn ? start + 1 + nextFn.index : source.length;
  return source.slice(start, end);
}

describe("every restricted server function references the fail-closed gate", () => {
  const gatedFns: Record<string, string[]> = {
    "../components/ProGate.tsx": ["checkProAccess"],
    "../routes/data-request.tsx": ["exportUserData", "deleteUserData"],
    "../routes/evidence.tsx": ["getUploadedFiles", "removeFile"],
    "../routes/legal-argument.tsx": ["generateArgument"],
    "../routes/profile.tsx": ["getProfileData"],
  };

  for (const [file, fns] of Object.entries(gatedFns)) {
    for (const fn of fns) {
      test(`${file} :: ${fn} fails closed`, () => {
        const body = handlerBody(read(file), fn);
        const guards = ["RESTRICTED_FEATURES", "TEMP_UNAVAILABLE_MESSAGE"];
        expect(
          guards.some((g) => body.includes(g)),
          `${fn} handler must reference the restriction gate`,
        ).toBe(true);
      });
    }
  }
});

describe("public copy no longer promises restricted flows", () => {
  test("landing page has no $99 or upgrade CTA and no upload promise", () => {
    const source = read("../routes/index.tsx");
    expect(source).not.toContain("$99");
    expect(source).not.toContain("Upgrade to Pro");
    expect(source).not.toMatch(/Upload, organize, and tag evidence/);
  });

  test("profile page has no $99, upgrade CTA, or upload-tier claim", () => {
    const source = read("../routes/profile.tsx");
    expect(source).not.toContain("$99");
    expect(source).not.toContain("Upgrade to Pro");
    expect(source).not.toContain("5 file uploads");
  });

  test("ProGate has no purchase funnel copy", () => {
    const source = read("../components/ProGate.tsx");
    expect(source).not.toContain("$99");
    expect(source).not.toContain("Upgrade to Pro");
    expect(source).toContain("TEMP_UNAVAILABLE_MESSAGE");
  });

  test("evidence page shows the honest unavailable panel, not a working uploader", () => {
    const source = read("../routes/evidence.tsx");
    expect(source.toLowerCase()).toContain("temporarily unavailable");
    expect(source).not.toContain("Files are stored securely");
    expect(source).not.toContain("Upload a File");
  });

  test("data request page shows the honest unavailable panel, not working export/delete", () => {
    const source = read("../routes/data-request.tsx");
    expect(source.toLowerCase()).toContain("temporarily unavailable");
    expect(source).not.toContain("All your data has been deleted");
  });

  test("structured data no longer promises $99 Pro or document uploads", () => {
    const source = read("../routes/__root.tsx");
    expect(source).not.toContain("$99");
    expect(source).not.toMatch(/Upload any documents, evidence/);
  });

  test("privacy policy no longer promises a subscription model or complete in-app deletion", () => {
    const source = read("../routes/privacy.tsx");
    expect(source).not.toContain("Fair Fight Pro subscriptions");
    expect(source.toLowerCase()).toContain("temporarily unavailable");
  });

  test("legal argument route describes the temporary unavailability", () => {
    const source = read("../routes/legal-argument.tsx");
    expect(source).toContain("Temporarily unavailable");
  });
});
