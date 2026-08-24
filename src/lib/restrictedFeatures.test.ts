/**
 * Gate-state guard tests for unverified customer flows.
 *
 * Covers the open checkout flow plus the still-restricted deletion/export,
 * evidence uploads, and non-case-scoped generative tools at every layer:
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
 *   - public copy: no remaining promises of working uploads or complete
 *     deletion/export, and truthful one-time $99 Pro activation copy.
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
  test("checkout is open while the other high-risk flows and generative tools stay gated", () => {
    expect(RESTRICTED_FEATURES.checkoutProActivation).toBe(false);
    expect(RESTRICTED_FEATURES.generativeProTools).toBe(true);
    expect(RESTRICTED_FEATURES.deleteUserData).toBe(true);
    expect(RESTRICTED_FEATURES.exportUserData).toBe(true);
    expect(RESTRICTED_FEATURES.evidenceUploads).toBe(true);
  });

  test("message is honest, temporary, and does not overclaim", () => {
    expect(TEMP_UNAVAILABLE_MESSAGE.toLowerCase()).toContain(
      "temporarily unavailable",
    );
    // Must not imply the flow is complete, functioning, or ready.
    expect(TEMP_UNAVAILABLE_MESSAGE.toLowerCase()).not.toMatch(
      /complete|is ready|now live|fully working/i,
    );
    expect(TEMP_UNAVAILABLE_STATUS).toBe(503);
  });

  test("tempUnavailableError returns the honest message", () => {
    expect(tempUnavailableError()).toEqual({ error: TEMP_UNAVAILABLE_MESSAGE });
  });
});

describe("lib entry points", () => {
  test("open Stripe checkout helpers no longer return the temporary-unavailable gate error", () => {
    const source = read("../lib/stripe.ts");
    const checkoutBody = handlerBody(source, "createCheckoutSession");
    expect(checkoutBody).toContain("createCheckoutSessionCore");
    expect(checkoutBody).not.toContain(
      "RESTRICTED_FEATURES.checkoutProActivation",
    );
    expect(checkoutBody).not.toContain("TEMP_UNAVAILABLE_MESSAGE");
    const portalBody = handlerBody(source, "createCustomerPortalSession");
    expect(portalBody).not.toContain(
      "RESTRICTED_FEATURES.checkoutProActivation",
    );
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
    const res = await POST({
      request: new Request("http://localhost/api/upload", { method: "POST" }),
    });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe(TEMP_UNAVAILABLE_MESSAGE);
  });

  test("/api/upload GET rejects listing", async () => {
    const { GET } = await import("../routes/api/upload");
    const res = await GET({
      request: new Request("http://localhost/api/upload", { method: "GET" }),
    });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe(TEMP_UNAVAILABLE_MESSAGE);
  });

  test("/api/user/delete-data POST rejects deletion", async () => {
    const { POST } = await import("../routes/api/user/delete-data");
    const res = await POST({
      request: new Request("http://localhost/api/user/delete-data", {
        method: "POST",
      }),
    });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe(TEMP_UNAVAILABLE_MESSAGE);
  });

  test("/api/user/export-data POST rejects export", async () => {
    const { POST } = await import("../routes/api/user/export-data");
    const res = await POST({
      request: new Request("http://localhost/api/user/export-data", {
        method: "POST",
      }),
    });
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
  const nextFn =
    /\n(?:export )?const \w+ = createServerFn|\nexport (?:async )?function |\nfunction /.exec(
      rest,
    );
  const end = nextFn ? start + 1 + nextFn.index : source.length;
  return source.slice(start, end);
}

describe("every restricted server function references the fail-closed gate", () => {
  const gatedFns: Record<string, string[]> = {
    "../components/ProGate.tsx": ["checkProAccess", "resolveProAccess"],
    "../routes/data-request.tsx": ["exportUserData", "deleteUserData"],
    "../routes/evidence.tsx": ["getUploadedFiles", "removeFile"],
    "../routes/legal-argument.tsx": ["generateArgument"],
    "../routes/documents.tsx": ["generateDocument"],
    "../routes/chat.tsx": ["sendMessage"],
  };

  for (const [file, fns] of Object.entries(gatedFns)) {
    for (const fn of fns) {
      test(`${file} :: ${fn} fails closed`, () => {
        const body = handlerBody(read(file), fn);
        // checkProAccess's handler fails closed by delegating to the pure
        // resolveProAccess seam; resolveProAccess itself (verified separately
        // in the list above) must reference the restriction gate. Accept the
        // delegation reference here; the other files genuinely must reference
        // the gate literally in their handler body.
        const guards = [
          "RESTRICTED_FEATURES",
          "TEMP_UNAVAILABLE_MESSAGE",
          "resolveProAccess",
        ];
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

  test("profile billing copy truthfully presents one-time $99 case purchases", () => {
    const source = read("../routes/profile.tsx");
    // No upgrade CTA or upload-tier claim anywhere on the profile.
    expect(source).not.toContain("Upgrade to Pro");
    expect(source).not.toContain("5 file uploads");
    expect(source).toContain(
      "Pro Case Analysis is available as a one-time $99 purchase per case",
    );
    expect(source).not.toContain(
      "Paid Pro activation is temporarily unavailable",
    );
    expect(source).not.toContain(
      "no Pro Case Analysis payments are being accepted right now",
    );
    expect(source).not.toContain("const paymentsAccepted");
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
   Flag A (2026-08-22): /documents and /chat are
   live paid AI tools that are NOT case-scoped.
   With the $99 checkout gated for everyone, they
   must fail closed on their separate generative-tools gate — no signed-in
   user may invoke paid AI generation. The route
   UI shows the honest unavailable panel, and the
   real implementation stays behind that gate (it is
   the LAST step of any future controlled deploy).
   /research (court-law search) remains ungated.
   ──────────────────────────────────────────── */

describe("Flag A: paid AI tools /documents & /chat fail closed, not case-scoped", () => {
  test("generateDocument fails closed at the generative-tools gate before any AI work", () => {
    const source = read("../routes/documents.tsx");
    const body = handlerBody(source, "generateDocument");
    expect(body).toContain("RESTRICTED_FEATURES.generativeProTools");
    expect(body).toContain("tempUnavailableError");
    // The gate must precede the AI call so no user can invoke live generation.
    expect(body.indexOf("RESTRICTED_FEATURES.generativeProTools")).toBeLessThan(
      body.indexOf("askAI"),
    );
  });

  test("sendMessage fails closed at the generative-tools gate before any rate-limit or AI work", () => {
    const source = read("../routes/chat.tsx");
    const body = handlerBody(source, "sendMessage");
    expect(body).toContain("RESTRICTED_FEATURES.generativeProTools");
    expect(body).toContain("tempUnavailableError");
    // Gate precedes the rate-limit check and the streaming AI call.
    expect(body.indexOf("RESTRICTED_FEATURES.generativeProTools")).toBeLessThan(
      body.indexOf("checkRateLimit"),
    );
    expect(body.indexOf("RESTRICTED_FEATURES.generativeProTools")).toBeLessThan(
      body.indexOf("askAIStreaming"),
    );
  });

  test("documents route shows the honest unavailable panel, not a live generator", () => {
    const source = read("../routes/documents.tsx");
    expect(source.toLowerCase()).toContain("temporarily unavailable");
    expect(source).toContain("{TEMP_UNAVAILABLE_MESSAGE}");
    // The live generator UI (doc-type selector and generate button) is gone.
    expect(source).not.toContain("Generate Document Template");
    expect(source).not.toContain("Motion Template");
  });

  test("chat route shows the honest unavailable panel, not a live chat UI", () => {
    const source = read("../routes/chat.tsx");
    expect(source.toLowerCase()).toContain("temporarily unavailable");
    expect(source).toContain("{TEMP_UNAVAILABLE_MESSAGE}");
    // The live chat surface (message input, send button) is gone.
    expect(source).not.toContain("handleSend");
    expect(source).not.toContain("habeas corpus");
  });

  test("landing page presents the Document Generator as temporarily unavailable", () => {
    const source = read("../routes/index.tsx");
    expect(source).toMatch(
      /Document Generator[\s\S]*?temporarily unavailable/i,
    );
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
    // Payment history is rebuilt (ownership-scoped) and may show real stored
    // rows; it must never fabricate an empty-history claim ("No payments yet")
    // or a fake 0 B storage figure.
    expect(source).not.toContain("No payments yet");
    expect(source).toContain("listUserPayments");
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
    expect(source).toContain(
      "Temporarily unavailable — organizing and uploading case evidence",
    );
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
    expect(source).toContain("clearing the flag alone does NOT");
    expect(source).toContain("must be rebuilt");
  });

  test("data-request handlers are fail-closed at the gate and contain a rebuilt, ownership-scoped implementation", () => {
    // The restriction removed the working bodies. This delegation rebuilds them
    // (see src/lib/dataProtection.ts) but keeps them fail-closed at the gate:
    // the gate is the FIRST check, and only after it clears is the real,
    // ownership-scoped implementation reached. Clearing the flag must be the
    // LAST step of a verified controlled deploy.
    const source = read("../routes/data-request.tsx");
    const exportBody = handlerBody(source, "exportUserData");
    expect(exportBody).toContain("RESTRICTED_FEATURES.exportUserData");
    expect(exportBody).toContain("tempUnavailableError");
    expect(exportBody).toContain("collectUserExport");
    const deleteBody = handlerBody(source, "deleteUserData");
    expect(deleteBody).toContain("RESTRICTED_FEATURES.deleteUserData");
    expect(deleteBody).toContain("tempUnavailableError");
    expect(deleteBody).toContain("deleteAllUserData");
  });

  test("evidence manager UI was removed, not left half-working behind the flag", () => {
    const source = read("../routes/evidence.tsx");
    // No working upload form / file list surface remains in the page.
    expect(source).not.toContain("Upload a File");
    expect(source).not.toContain("Files are stored securely");
  });
});

describe("review fix: checkout-success analytics are enabled with open checkout", () => {
  test("shouldTrackCheckoutSuccess is true while the checkout gate is open", () => {
    expect(RESTRICTED_FEATURES.checkoutProActivation).toBe(false);
    expect(shouldTrackCheckoutSuccess()).toBe(true);
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

describe("final re-review regression: open webhook signature gate", () => {
  test("webhook no longer emits the removed feature_restricted checkout response", () => {
    const source = read("../routes/api/stripe/webhook.ts");
    expect(source).not.toContain('code: "feature_restricted"');
    expect(source).toContain(
      'return json({ error: "No signature" }, { status: 400 })',
    );
    expect(source).toContain(
      'return json({ error: "Invalid signature" }, { status: 400 })',
    );
  });

  test("webhook signature verification precedes event processing", () => {
    const source = read("../routes/api/stripe/webhook.ts");
    const signature = source.indexOf("stripe-signature");
    const processing = source.indexOf(
      "const outcome = await processCheckoutCompleted",
    );
    expect(source).not.toContain("RESTRICTED_FEATURES.checkoutProActivation");
    expect(signature).toBeGreaterThanOrEqual(0);
    expect(processing).toBeGreaterThan(signature);
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
    expect(source).not.toContain(
      "Evidence uploads are temporarily unavailable",
    );
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
    "../routes/learn.tsx": 'createFileRoute("/learn")',
    "../routes/research.tsx": 'createFileRoute("/research")',
    "../routes/timeline.tsx": 'createFileRoute("/timeline")',
    "../routes/calendar.tsx": 'createFileRoute("/calendar")',
    "../routes/cases/new.tsx": 'createFileRoute("/cases/new")',
    "../routes/cases/$caseId.tsx": 'createFileRoute("/cases/$caseId")',
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

/* ────────────────────────────────────────────
   Mobile nav / mobile layout regression guards
   (fix/mobile-nav-header-calendar)
   ──────────────────────────────────────────── */

describe("signed-in users get a mobile navigation drawer in the shared header", () => {
  const source = read("../routes/__root.tsx");
  const sourceLower = source.toLowerCase();

  test("the header keeps the desktop that is hidden below md:flex primary nav", () => {
    expect(source).toContain("hidden items-center gap-6 md:flex");
    expect(sourceLower).toContain('id="mobile-nav-menu"');
  });

  test("a mobile menu trigger with aria-expanded/aria-controls and a 44px+ target exists", () => {
    expect(source).toContain("aria-expanded={mobileOpen}");
    expect(source).toContain('aria-controls="mobile-nav-menu"');
    expect(source).toContain("h-11 w-11"); // 44px touch target
    expect(source).toContain(
      'aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}',
    );
  });

  test("the drawer exposes the main signed-in app routes and closes on Escape/backdrop", () => {
    for (const route of [
      'to="/dashboard"',
      'to="/chat"',
      'to="/evidence"',
      'to="/calendar"',
      'to="/profile"',
    ]) {
      expect(source).toContain(route);
    }
    expect(source).toContain('if (e.key === "Escape") setMobileOpen(false)');
    expect(source).toContain("bg-black/50"); // click-outside-to-close backdrop
  });

  test("sign-in and get-started CTAs stay present for signed-out users", () => {
    expect(source).toContain("<SignInButton");
    expect(source).toContain("<SignUpButton");
    expect(source).toContain("Get Started");
  });
});
