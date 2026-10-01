import { GOOGLE_AUTH_URL, YOUTUBE_SCOPES, randomToken, stateCookieHeader } from "../../_shared/youtube.js";

// GET /api/youtube/login - starts the Google OAuth flow, redirects to
// Google's own consent screen (the real login/consent UI, never rendered
// by us). access_type=offline + prompt=consent together guarantee a
// refresh_token comes back even on a repeat connect - Google only issues
// one on the FIRST-ever grant unless prompt=consent forces a fresh one.
export async function onRequestGet(context) {
  const { env, request } = context;

  const state = randomToken(24);
  const redirectUri = `${new URL(request.url).origin}/api/youtube/callback`;

  const authorizeUrl =
    `${GOOGLE_AUTH_URL}?client_id=${encodeURIComponent(env.YOUTUBE_CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(YOUTUBE_SCOPES)}` +
    `&access_type=offline` +
    `&prompt=consent` +
    `&state=${state}`;

  const headers = new Headers({ Location: authorizeUrl });
  headers.append("Set-Cookie", stateCookieHeader(state));
  return new Response(null, { status: 302, headers });
}
