import { jsxs, jsx } from "react/jsx-runtime";
import { Link } from "@tanstack/react-router";
import { i as Route, f as getGuideBySlug } from "./router-CxY3nyJJ.js";
import "react";
import "@clerk/react/internal";
import "@clerk/shared/getToken";
import "@clerk/react";
import "@clerk/shared/error";
import "@clerk/shared/getEnvVariable";
import "@clerk/shared/underscore";
import "@clerk/shared/htmlSafeJson";
import "../server.js";
import "node:async_hooks";
import "h3-v2";
import "@tanstack/router-core";
import "seroval";
import "@tanstack/history";
import "@tanstack/router-core/ssr/client";
import "@tanstack/router-core/ssr/server";
import "@tanstack/react-router/ssr/server";
import "@neondatabase/serverless";
import "./db-D7cnbd5l.js";
import "stripe";
import "./argumentAccess-Brc0Ql3j.js";
function GuidePage() {
  const {
    slug
  } = Route.useParams();
  const article = getGuideBySlug(slug);
  if (!article) {
    return /* @__PURE__ */ jsxs("main", { className: "min-h-screen bg-navy px-4 py-24 text-center", children: [
      /* @__PURE__ */ jsx("h1", { className: "text-4xl font-extrabold text-white", children: "Guide not found" }),
      /* @__PURE__ */ jsx("p", { className: "mx-auto mt-4 max-w-md text-white/60", children: "This public legal-education guide could not be found or has moved." }),
      /* @__PURE__ */ jsx(Link, { to: "/learn", className: "gold-gradient mx-auto mt-8 inline-block rounded-full px-6 py-3 font-semibold text-navy", children: "Browse all guides" })
    ] });
  }
  return /* @__PURE__ */ jsx("main", { className: "min-h-screen bg-navy", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-3xl px-4 py-12", children: [
    /* @__PURE__ */ jsx(Link, { to: "/learn", className: "mb-6 inline-flex items-center gap-2 text-sm text-white/60 hover:text-gold", children: "← Back to Guides" }),
    /* @__PURE__ */ jsx("span", { className: "inline-block rounded-full bg-white/10 px-3 py-1 text-xs text-white/50", children: article.category }),
    /* @__PURE__ */ jsxs("span", { className: "ml-2 text-xs text-white/40", children: [
      article.readTime,
      " read"
    ] }),
    /* @__PURE__ */ jsx("h1", { className: "mb-8 mt-4 text-4xl font-extrabold text-white sm:text-5xl", children: article.title }),
    /* @__PURE__ */ jsx("div", { className: "space-y-5", children: article.paragraphs.map((p, i) => /* @__PURE__ */ jsx("p", { className: "text-lg leading-relaxed text-white/70", children: p }, i)) }),
    article.takeaways.length > 0 && /* @__PURE__ */ jsxs("div", { className: "mt-10 rounded-2xl border border-gold/20 bg-white/5 p-6 backdrop-blur-sm", children: [
      /* @__PURE__ */ jsx("h2", { className: "mb-4 text-xl font-bold text-gold", children: "Key Takeaways" }),
      /* @__PURE__ */ jsx("ul", { className: "space-y-2", children: article.takeaways.map((t, i) => /* @__PURE__ */ jsxs("li", { className: "flex items-start gap-2 text-white/80", children: [
        /* @__PURE__ */ jsx("span", { className: "mt-1 text-gold", children: "✦" }),
        t
      ] }, i)) })
    ] }),
    article.relatedGuides.length > 0 && /* @__PURE__ */ jsxs("div", { className: "mt-10", children: [
      /* @__PURE__ */ jsx("h2", { className: "mb-4 text-xl font-bold text-white", children: "Related Guides" }),
      /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-2", children: article.relatedGuides.map((id) => {
        const related = getGuideBySlug(id);
        if (!related) return null;
        return /* @__PURE__ */ jsx(Link, { to: "/learn/$slug", params: {
          slug: id
        }, className: "rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/70 hover:border-gold/40 hover:text-white", children: related.title }, id);
      }) })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "mt-8 rounded-lg border border-white/10 bg-white/5 p-4 text-center", children: /* @__PURE__ */ jsx("p", { className: "text-xs text-white/40", children: "For educational purposes only. Fair Fight is not a law firm and does not provide legal advice. Consult a licensed attorney. Public guides are separate from Fair Fight's paid Pro Case Analysis workspace." }) })
  ] }) });
}
export {
  GuidePage as component
};
