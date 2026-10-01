import { GOOGLE_REVOKE_URL, parseCookies, clearCookieHeader } from "../../_shared/youtube.js";

// GET /api/youtube/logout - clears the session in KV and, unlike the
// TikTok disconnect flow, also actually revokes the token with Google
// (oauth2.googleapis.com/revoke) rather than just forgetting it locally -
// this means "Disconnect" here really does force a fresh consent screen on
// reconnect, sidestepping the whole "Google remembers the grant server-side
// regardless of our own cookies" problem documented in root CLAUDE.md for
// the CLI pipeline's own token (had to call the same revoke endpoint by
// hand there since there was no in-app Disconnect button to do it).
export async function onRequestGet(context) {
  const { request, env } = context;
  const cookies = parseCookies(request);

  if (cookies.yt_session) {
    const raw = await env.YOUTUBE_SESSIONS.get(cookies.yt_session);
    if (raw) {
      const session = JSON.parse(raw);
      if (session.refresh_token) {
        try {
          await fetch(GOOGLE_REVOKE_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ token: session.refresh_token }),
          });
        } catch (err) {
          // Revoke failing shouldn't block disconnecting locally - log and
          // continue; worst case Google's own grant lingers until the user
          // revokes it manually, same as before this endpoint existed.
          console.log("YouTube token revoke failed:", err.message);
        }
      }
    }
    await env.YOUTUBE_SESSIONS.delete(cookies.yt_session);
  }

  const referer = request.headers.get("Referer") || "";
  const returnTo = referer.includes("/api/youtube/composer") ? "/api/youtube/composer" : "/youtube";

  const headers = new Headers({ Location: returnTo });
  headers.append("Set-Cookie", clearCookieHeader("yt_session"));
  return new Response(null, { status: 302, headers });
}
