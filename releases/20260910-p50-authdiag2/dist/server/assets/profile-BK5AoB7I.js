import { jsx, jsxs } from "react/jsx-runtime";
import { c as createSsrRpc } from "./router-CKJnu5wL.js";
import { useState, useEffect } from "react";
import { c as createServerFn } from "../server.js";
import { A as AuthenticatedGuard } from "./AuthenticatedGuard-BRF14A_z.js";
import { useUser } from "@clerk/react";
import "@tanstack/react-router";
import "@clerk/react/internal";
import "@clerk/shared/getToken";
import "@clerk/shared/error";
import "@clerk/shared/getEnvVariable";
import "@clerk/shared/underscore";
import "@clerk/shared/htmlSafeJson";
import "@neondatabase/serverless";
import "./db-D7cnbd5l.js";
import "@tanstack/router-core/ssr/client";
import "stripe";
import "./argumentAccess-Brc0Ql3j.js";
import "node:async_hooks";
import "h3-v2";
import "@tanstack/router-core";
import "seroval";
import "@tanstack/history";
import "@tanstack/router-core/ssr/server";
import "@tanstack/react-router/ssr/server";
const getProfileData = createServerFn({
  method: "GET"
}).handler(createSsrRpc("b2906cd4df1b598a24f03442f38f3bfc72ecd9110c99d7761f9c0352c7ff6124"));
const getPaymentHistory = createServerFn({
  method: "POST"
}).handler(createSsrRpc("4f6bcfea931059717cf568dcfc92c9a796645cfde2fb650bd2ab94c211eb9d9f"));
function ProfilePage() {
  const {
    user,
    isLoaded: userLoaded
  } = useUser();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState(null);
  useEffect(() => {
    getProfileData().then(() => setLoading(false)).catch(() => setLoading(false));
    getPaymentHistory().then((res) => setPayments(res.payments ?? [])).catch(() => setPayments([]));
  }, []);
  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
      });
    } catch {
      return iso;
    }
  }
  if (!userLoaded) {
    return /* @__PURE__ */ jsx(AuthenticatedGuard, { children: /* @__PURE__ */ jsx("div", { className: "flex min-h-screen items-center justify-center bg-navy", children: /* @__PURE__ */ jsx("div", { className: "h-10 w-10 animate-spin rounded-full border-4 border-gold border-t-transparent" }) }) });
  }
  return /* @__PURE__ */ jsx(AuthenticatedGuard, { children: /* @__PURE__ */ jsx("main", { className: "min-h-screen bg-navy px-4 py-8", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-3xl", children: [
    /* @__PURE__ */ jsx("h1", { className: "mb-8 text-3xl font-extrabold text-white", children: "Your Profile" }),
    /* @__PURE__ */ jsxs("div", { className: "mb-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-8", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-6", children: [
        user?.imageUrl ? /* @__PURE__ */ jsx("img", { src: user.imageUrl, alt: user.fullName || "Profile photo", className: "h-20 w-20 rounded-full border-4 border-gold/30 object-cover" }) : /* @__PURE__ */ jsx("div", { className: "flex h-20 w-20 items-center justify-center rounded-full bg-navy text-2xl font-bold text-white", children: (user?.firstName?.[0] || user?.fullName?.[0] || "?").toUpperCase() }),
        /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
          /* @__PURE__ */ jsx("h2", { className: "text-2xl font-bold text-white", children: user?.fullName || user?.firstName || "User" }),
          /* @__PURE__ */ jsx("p", { className: "mt-1 text-white/60", children: user?.primaryEmailAddress?.emailAddress || "" }),
          user?.username && /* @__PURE__ */ jsxs("p", { className: "text-sm text-white/40", children: [
            "@",
            user.username
          ] }),
          /* @__PURE__ */ jsx("div", { className: "mt-3", children: /* @__PURE__ */ jsx("span", { className: "inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-3 py-1 text-sm font-semibold text-gold", children: "Pro Case Analysis — $99 one-time per case" }) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-8 grid gap-4 border-t border-white/10 pt-6 sm:grid-cols-2", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs font-medium uppercase tracking-wider text-white/40", children: "User ID" }),
          /* @__PURE__ */ jsx("p", { className: "mt-1 font-mono text-sm text-white/80", children: user?.id || "—" })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs font-medium uppercase tracking-wider text-white/40", children: "Member Since" }),
          /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-white/80", children: user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric"
          }) : "—" })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs font-medium uppercase tracking-wider text-white/40", children: "Storage Used" }),
          /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-white/80", children: loading ? "..." : "Temporarily unavailable" })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-xs font-medium uppercase tracking-wider text-white/40", children: "Last Sign In" }),
          /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-white/80", children: user?.lastSignInAt ? new Date(user.lastSignInAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric"
          }) : "—" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mb-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-8", children: [
      /* @__PURE__ */ jsx("h2", { className: "mb-1 text-xl font-bold text-white", children: "Membership & Billing" }),
      /* @__PURE__ */ jsx("p", { className: "mb-6 text-sm text-white/60", children: "Pro Case Analysis is available as a one-time $99 purchase per case" }),
      /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-white/10 bg-white/5 p-6 text-center", children: [
        /* @__PURE__ */ jsx("div", { className: "mx-auto mb-3 text-3xl", children: "📋" }),
        /* @__PURE__ */ jsx("p", { className: "text-sm text-white/70", children: "Pro Case Analysis is available as a one-time $99 purchase per case: a plain-English summary, possible issues, candidate arguments, and traceable public sources — educational only, not legal advice. Legal education and your core case tools remain available in your workspace." })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "mb-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-8", children: [
      /* @__PURE__ */ jsx("h2", { className: "mb-1 text-xl font-bold text-white", children: "Payment History" }),
      /* @__PURE__ */ jsx("p", { className: "mb-6 text-sm text-white/60", children: "Pro Case Analysis purchases recorded on your account." }),
      payments === null ? /* @__PURE__ */ jsx("p", { className: "text-sm text-white/60", children: "Loading…" }) : payments.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-white/10 bg-white/5 p-6 text-center", children: [
        /* @__PURE__ */ jsx("div", { className: "mx-auto mb-3 text-3xl", children: "🧾" }),
        /* @__PURE__ */ jsx("p", { className: "text-sm text-white/60", children: "No payment records found for this account." })
      ] }) : /* @__PURE__ */ jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxs("table", { className: "w-full text-left text-sm", children: [
        /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "border-b border-white/10 text-xs uppercase tracking-wider text-white/40", children: [
          /* @__PURE__ */ jsx("th", { className: "pb-2 pr-4 font-medium", children: "Date" }),
          /* @__PURE__ */ jsx("th", { className: "pb-2 pr-4 font-medium", children: "Case" }),
          /* @__PURE__ */ jsx("th", { className: "pb-2 pr-4 font-medium", children: "Amount" }),
          /* @__PURE__ */ jsx("th", { className: "pb-2 font-medium", children: "Status" })
        ] }) }),
        /* @__PURE__ */ jsx("tbody", { children: payments.map((p) => /* @__PURE__ */ jsxs("tr", { className: "border-b border-white/5", children: [
          /* @__PURE__ */ jsx("td", { className: "py-3 pr-4 text-white/80", children: formatDate(p.createdAt) }),
          /* @__PURE__ */ jsx("td", { className: "py-3 pr-4 font-mono text-xs text-white/60", children: p.caseId }),
          /* @__PURE__ */ jsxs("td", { className: "py-3 pr-4 text-white/80", children: [
            "$",
            (p.amountCents / 100).toFixed(2),
            " ",
            p.currency.toUpperCase()
          ] }),
          /* @__PURE__ */ jsx("td", { className: "py-3 capitalize text-white/80", children: p.status })
        ] }, p.id)) })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 p-8", children: [
      /* @__PURE__ */ jsx("h2", { className: "mb-1 text-xl font-bold text-white", children: "Account Actions" }),
      /* @__PURE__ */ jsx("p", { className: "mb-6 text-sm text-white/60", children: "Manage your account and data" }),
      /* @__PURE__ */ jsx("a", { href: "/data-request", className: "inline-flex rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-white transition-all hover:border-navy hover:bg-navy hover:text-white", children: "Data Request (export / deletion)" })
    ] })
  ] }) }) });
}
export {
  ProfilePage as component
};
