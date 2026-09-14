import { parseCookies, clearCookieHeader } from "../../_shared/tiktok.js";

// GET /api/tiktok/logout - clears the session both client-side and in KV.
// Redirects back to wherever the disconnect link was clicked (composer or
// analytics) via Referer, falling back to the composer entry page.
export async function onRequestGet(context) {
  const { request, env } = context;
  const cookies = parseCookies(request);
  if (cookies.tt_session) {
    await env.TIKTOK_SESSIONS.delete(cookies.tt_session);
  }

  const referer = request.headers.get("Referer") || "";
  const returnTo = referer.includes("/api/tiktok/analytics") ? "/api/tiktok/analytics" : "/upload";

  const headers = new Headers({ Location: returnTo });
  headers.append("Set-Cookie", clearCookieHeader("tt_session"));
  return new Response(null, { status: 302, headers });
}
