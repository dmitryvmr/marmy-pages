import { parseCookies, clearCookieHeader } from "../../_shared/tiktok.js";

// GET /api/tiktok/logout - clears the session both client-side and in KV.
// Redirects back to wherever the disconnect link was clicked (composer or
// the /tiktok stats page) via Referer, falling back to the composer entry page.
export async function onRequestGet(context) {
  const { request, env } = context;
  const cookies = parseCookies(request);
  if (cookies.tt_session) {
    await env.TIKTOK_SESSIONS.delete(cookies.tt_session);
  }

  // Exact-path check, not a substring match - "/tiktok" (unlike the old
  // "/analytics") is also a substring of /api/tiktok/composer and friends,
  // so includes() would misfire on a composer-page referer.
  const referer = request.headers.get("Referer") || "";
  let refererPath = "";
  try { refererPath = new URL(referer).pathname; } catch { /* no/invalid referer */ }
  const returnTo = refererPath === "/tiktok" ? "/tiktok" : "/upload";

  const headers = new Headers({ Location: returnTo });
  headers.append("Set-Cookie", clearCookieHeader("tt_session"));
  return new Response(null, { status: 302, headers });
}
