import { parseCookies, clearCookieHeader } from "../../_shared/tiktok.js";

// GET /api/tiktok/logout - clears the session both client-side and in KV.
export async function onRequestGet(context) {
  const { request, env } = context;
  const cookies = parseCookies(request);
  if (cookies.tt_session) {
    await env.TIKTOK_SESSIONS.delete(cookies.tt_session);
  }

  const headers = new Headers({ Location: "/upload.html" });
  headers.append("Set-Cookie", clearCookieHeader("tt_session"));
  return new Response(null, { status: 302, headers });
}
