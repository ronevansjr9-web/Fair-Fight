import { c as createServerRpc } from "./createServerRpc-D_-6bKnO.js";
import { c as createServerFn } from "../server.js";
import { s as sanitizeInput } from "./sanitize-CTUyMlso.js";
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
const COURT_LISTENER_API = "https://www.courtlistener.com/api/rest/v4/search/";
const legalResearch_createServerFn_handler = createServerRpc({
  id: "95dbc344e448a8fada4864873302bc7a0bc7575fd12421adfc387119c87e2cc2",
  name: "legalResearch",
  filename: "src/routes/research.tsx"
}, (opts) => legalResearch.__executeServer(opts));
const legalResearch = createServerFn({
  method: "POST"
}).validator((data) => {
  const d = data;
  return {
    query: d.query || ""
  };
}).handler(legalResearch_createServerFn_handler, async ({
  data
}) => {
  const sanitized = sanitizeInput(data.query);
  if (!sanitized || sanitized.length < 2) {
    return {
      success: false,
      query: sanitized,
      results: [],
      error: "Please enter a longer search query.",
      disclaimer: "Fair Fight provides educational guidance on where to find legal resources. For comprehensive legal research, consult a law librarian or attorney."
    };
  }
  try {
    const url = `${COURT_LISTENER_API}?q=${encodeURIComponent(sanitized)}&type=d&page_size=5`;
    const response = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "FairFight/1.0 (educational legal research platform; https://fairfight.ctonew.app)"
      },
      signal: AbortSignal.timeout(8e3)
    });
    if (!response.ok) {
      throw new Error(`CourtListener returned ${response.status}`);
    }
    const data2 = await response.json();
    const results = (data2.results || []).map((item) => ({
      caseName: item.caseName || "Untitled Opinion",
      court: item.court || "Unknown Court",
      dateFiled: item.dateFiled ? new Date(item.dateFiled).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
      }) : "Date unknown",
      citation: item.citation || "No citation available",
      snippet: item.text ? item.text.replace(/<[^>]*>/g, "").substring(0, 300) + "..." : "No preview available.",
      url: item.absolute_url ? `https://www.courtlistener.com${item.absolute_url}` : `https://www.courtlistener.com/opinion/${item.cluster_id || ""}`
    }));
    return {
      success: true,
      query: sanitized,
      results,
      disclaimer: "Results powered by CourtListener. Fair Fight provides educational guidance — not legal advice. For comprehensive legal research, consult a law librarian or attorney."
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("CourtListener API error:", message);
    return {
      success: false,
      query: sanitized,
      results: [],
      error: "Search is temporarily unavailable. Please try again later.",
      disclaimer: "Fair Fight provides educational guidance on where to find legal resources. For comprehensive legal research, consult a law librarian or attorney."
    };
  }
});
export {
  legalResearch_createServerFn_handler
};
