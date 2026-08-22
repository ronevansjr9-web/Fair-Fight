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
 * Public legal education, legal research, statutes/case law/court rules,
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
  shouldTrackCheckoutSuccess,
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
  test("landing page presents the honest paid product and no free-analysis or upload promise", () => {
    const source = read("../routes/index.tsx");
    // The public site may explain the paid product (one-time $99 per case),
    // but must never promise the analysis flow works, never offer free
    // analyses, and never promise uploads.
    expect(source).toContain("$99");
    expect(source).toContain("one-time $99 purchase per case");
    expect(source).not.toContain("free for your first 3 analyses");
    expect(source).not.toContain("Free for your first 3 analyses");
    expect(source).not.toContain("analyzeCase");
    expect(source).not.toContain("Try the AI Case Analyzer");
    expect(source).not.toMatch(/Upload, organize, and tag evidence/);
  });

  test("profile billing copy is gate-driven: $99 price only behind the pay-gate-open branch, no upgrade/upload-tier claims", () => {
    const source = read("../routes/profile.tsx");
    // No upgrade CTA or upload-tier claim anywhere on the profile.
    expect(source).not.toContain("Upgrade to Pro");
    expect(source).not.toContain("5 file uploads");
    // Truthfulness while the checkout gate is ON (today): users must NOT be
    // pitched a $99 / payment offer yet. The $99 price copy is legitimate and
    // named only inside the `paymentsAccepted` (gate-open) branch, and
    // `paymentsAccepted` is derived from the gate flag so it is false today —
    // users see the honest "temporarily unavailable / no payments accepted"
    // fallback instead. (Revisit this branch keyed off `paymentsAccepted` when
    // the gate opens for real payments; see the TODO(gate-open) in profile.tsx.)
    expect(source).toContain("const paymentsAccepted = !RESTRICTED_FEATURES.checkoutProActivation");
    expect(source).toContain("Paid Pro activation is temporarily unavailable");
    expect(source).toContain("no Pro Case Analysis payments are being accepted right now");
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

  test("structured data describes paid Pro Case Analysis without document-upload promises", () => {
    const source = read("../routes/__root.tsx");
    expect(source).toContain("$99");
    expect(source).toMatch(/paid Pro Case Analysis/i);
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

/* ────────────────────────────────────────────
   Independent-review regression tests
   (fix/restrict-unverified-flows review pass)
   ──────────────────────────────────────────── */

describe("review fix: profile shows honest temporary-unavailable state, not fabricated claims", () => {
  test("profile page no longer shows fabricated 0 B storage or 'No payments yet'", () => {
    const source = read("../routes/profile.tsx");
    // No fabricated numbers or empty-history claims.
    expect(source).not.toContain("No payments yet");
    expect(source).not.toContain("0 B");
    expect(source).not.toContain("formatStorage");
    expect(source).not.toContain("storageUsed");
    // Honest temporary-unavailable state is shown for both sections.
    expect(source).toMatch(/Storage Used[\s\S]*?Temporarily unavailable/);
    expect(source.toLowerCase()).toContain("payment history is temporarily unavailable");
  });

  test("profile server fn reports unavailable instead of fabricated zeros", () => {
    const source = read("../routes/profile.tsx");
    const body = handlerBody(source, "getProfileData");
    expect(body).toContain("unavailable");
    expect(body).not.toMatch(/storageUsed:\s*0/);
  });
});

describe("review fix: evidence copy matches the whole-manager restriction", () => {
  test("landing page does not claim evidence organization remains available", () => {
    const source = read("../routes/index.tsx");
    expect(source).not.toContain("File uploads are temporarily unavailable");
    expect(source).not.toMatch(/Organize case evidence and prepare/);
    expect(source).toMatch(/Evidence Manager[\s\S]*?temporarily unavailable/);
  });

  test("case workspace does not claim evidence organization remains available", () => {
    const source = read("../routes/cases/$caseId.tsx");
    expect(source).not.toContain("uploads temporarily unavailable");
    expect(source).not.toMatch(/tools for organizing evidence/);
    expect(source).toContain("Temporarily unavailable — organizing and uploading case evidence");
  });

  test("evidence route meta and body describe the whole-manager restriction", () => {
    const source = read("../routes/evidence.tsx");
    expect(source).not.toMatch(/Organize case evidence and prepare/);
    expect(source.toLowerCase()).toContain("the evidence manager");
    expect(source.toLowerCase()).toContain("temporarily unavailable");
  });

  test("dashboard meta no longer claims evidence management", () => {
    const source = read("../routes/dashboard.tsx");
    expect(source).not.toContain("manage cases, evidence");
  });
});

describe("review fix: gate docs and code do not claim a flag flip restores removed implementations", () => {
  test("restriction docs say clearing a flag alone does not restore flows", () => {
    const source = read("./restrictedFeatures.ts");
    // No leftover "flip the flag to re-enable" oversimplification.
    expect(source).not.toMatch(/flip a flag/i);
    expect(source).toContain("does NOT restore");
    expect(source).toContain("must be rebuilt");
  });

  test("data-request handlers stay fail-closed even after the gate (implementations removed)", () => {
    const source = read("../routes/data-request.tsx");
    const exportBody = handlerBody(source, "exportUserData");
    expect(exportBody).toContain("tempUnavailableError");
    expect(exportBody).not.toContain("success: true");
    const deleteBody = handlerBody(source, "deleteUserData");
    expect(deleteBody).toContain("tempUnavailableError");
    expect(deleteBody).not.toContain("success: true");
  });

  test("evidence manager UI was removed, not left half-working behind the flag", () => {
    const source = read("../routes/evidence.tsx");
    // No working upload form / file list surface remains in the page.
    expect(source).not.toContain("Upload a File");
    expect(source).not.toContain("Files are stored securely");
  });
});

describe("review fix: checkout-success analytics are disabled while checkout is restricted", () => {
  test("shouldTrackCheckoutSuccess is false while the checkout gate is on", () => {
    expect(RESTRICTED_FEATURES.checkoutProActivation).toBe(true);
    expect(shouldTrackCheckoutSuccess()).toBe(false);
  });

  test("dashboard guards the client-controlled checkout-success event with the gate", () => {
    const source = read("../routes/dashboard.tsx");
    expect(source).toContain("shouldTrackCheckoutSuccess");
    const callSite =
      /if \(search\.checkout === "success" && shouldTrackCheckoutSuccess\(\)\)\s*\{\s*trackEvent\(AnalyticsEvents\.CHECKOUT_COMPLETED\)/;
    expect(source).toMatch(callSite);
  });
});

describe("review fix: privacy policy last-amended date", () => {
  test("privacy policy is dated August 12, 2026", () => {
    const source = read("../routes/privacy.tsx");
    expect(source).toContain("Last Updated: August 12, 2026");
    expect(source).not.toContain("Last Updated: January 2026");
  });
});

/* ────────────────────────────────────────────
   Final re-review regression tests (PR #16):
   webhook gate payload/ordering, entitlement
   comment truthfulness, evidence heading
   ──────────────────────────────────────────── */

describe("final re-review regression: webhook 503 feature_restricted gate", () => {
  test("webhook restricted payload carries the feature_restricted code", () => {
    const source = read("../routes/api/stripe/webhook.ts");
    expect(source).toContain('code: "feature_restricted"');
    expect(source).not.toContain('code: "temporarily_unavailable"');
  });

  test("webhook gate stays the handler's first check (fail-closed not weakened)", () => {
    const source = read("../routes/api/stripe/webhook.ts");
    const gate = source.indexOf("RESTRICTED_FEATURES.checkoutProActivation");
    expect(gate).toBeGreaterThanOrEqual(0);
    // The gate must precede the Stripe env guard, Stripe client
    // construction, and signature verification inside the handler.
    expect(gate).toBeLessThan(source.indexOf("if (!STRIPE_SECRET_KEY"));
    expect(gate).toBeLessThan(source.indexOf("new Stripe("));
    expect(gate).toBeLessThan(source.indexOf("stripe-signature"));
  });
});

describe("final re-review regression: entitlement comment truthfulness", () => {
  test("checkProAccess comment states records are preserved but access is intentionally denied", () => {
    const source = read("../components/ProGate.tsx");
    // No claim that pre-existing entitlements keep working while gated.
    expect(source).not.toMatch(/pre-existing paid entitlements/i);
    expect(source).not.toMatch(/keep working/i);
    // Truthful statement: preserved records, intentionally denied access.
    expect(source).toMatch(/intentionally denied/i);
    expect(source).toMatch(/preserved/i);
  });
});

describe("final re-review regression: evidence unavailable heading", () => {
  test("primary evidence heading states the whole manager is unavailable", () => {
    const source = read("../routes/evidence.tsx");
    expect(source).toContain("The Evidence Manager is temporarily unavailable");
    expect(source).not.toContain("Evidence uploads are temporarily unavailable");
  });
});

describe("final review: case-creation copy and root structured data make no disabled-flow promises", () => {
  test("new case page meta and body no longer promise evidence organization", () => {
    const source = read("../routes/cases/new.tsx");
    // Creating a case must not promise the gated Evidence Manager, in either
    // the route metadata or the visible page copy.
    expect(source).not.toMatch(/organi[sz][a-z]* evidence/i);
    expect(source).not.toMatch(/start (to )?organi[sz][a-z]*/i);
    // Case creation and the durable timeline/calendar intent are preserved.
    expect(source).toContain('createFileRoute("/cases/new")');
    expect(source).toContain("Create New Case");
    expect(source).toMatch(/track important dates and court deadlines/i);
    expect(source.toLowerCase()).toContain("ai-powered legal education");
  });

  test("root structured data no longer advertises legal-argument generation", () => {
    const source = read("../routes/__root.tsx");
    // The enabled-looking HowTo legal-argument workflow is gone: no argument
    // generation, AI case-law/argument analysis, citations, or strategy
    // outlines in any metadata or structured data.
    expect(source).not.toContain("HowTo");
    expect(source).not.toMatch(/Prepare a Legal Argument/i);
    expect(source).not.toMatch(/legal argument/i);
    expect(source).not.toMatch(/case citations/i);
    expect(source).not.toMatch(/strategy outline/i);
    expect(source).not.toMatch(/AI Analyzes Your Case/i);
    // Truthful general legal-education metadata is retained.
    expect(source.toLowerCase()).toContain("legal education");
    expect(source).toContain("FAQPage");
    expect(source).toContain("not a law firm");
    expect(source).not.toMatch(/never paywalled/i);
    expect(source).toMatch(/paid Pro Case Analysis/i);
  });
});

/* ────────────────────────────────────────────
   Preservation guards: ungated free and core
   flows must remain available
   ──────────────────────────────────────────── */

describe("ungated flows are NOT gated (preservation)", () => {
  const ungatedRoutes: Record<string, string> = {
    "../routes/learn.tsx": "createFileRoute(\"/learn\")",
    "../routes/research.tsx": "createFileRoute(\"/research\")",
    "../routes/timeline.tsx": "createFileRoute(\"/timeline\")",
    "../routes/calendar.tsx": "createFileRoute(\"/calendar\")",
    "../routes/cases/new.tsx": "createFileRoute(\"/cases/new\")",
    "../routes/cases/$caseId.tsx": "createFileRoute(\"/cases/$caseId\")",
  };

  for (const [file, routeDecl] of Object.entries(ungatedRoutes)) {
    test(`${file} keeps its route and does not import the restriction gate`, () => {
      const source = read(file);
      expect(source).toContain(routeDecl);
      expect(source).not.toContain("RESTRICTED_FEATURES");
      expect(source).not.toContain("TEMP_UNAVAILABLE_STATUS");
    });
  }

  test("sign-in and free education entry points remain in the header", () => {
    const source = read("../routes/__root.tsx");
    expect(source).toContain("<SignInButton");
    expect(source).toContain('<Link to="/learn"');
    expect(source).not.toContain("RESTRICTED_FEATURES");
  });

  test("the restriction doc lists free education/research and core case flows as not gated", () => {
    const source = read("./restrictedFeatures.ts").toLowerCase();
    expect(source).toContain("not gated");
    expect(source).toContain("public legal education");
    // "the durable case / timeline / calendar surfaces" may wrap across lines.
    expect(source).toMatch(/case \/ timeline \/\s*\*?\s*calendar/);
  });
});
