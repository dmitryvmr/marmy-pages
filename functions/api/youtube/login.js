import {
  GOOGLE_AUTH_URL,
  YOUTUBE_SCOPES,
  RETURN_TO_DESTINATIONS,
  DEFAULT_RETURN_TO,
  randomToken,
  stateCookieHeader,
  returnToCookieHeader,
} from "../../_shared/youtube.js";

// GET /api/youtube/login[?return_to=youtube|composer] - starts the Google
// OAuth flow, redirects to Google's own consent screen (the real
// login/consent UI, never rendered by us). access_type=offline +
// prompt=consent together guarantee a refresh_token comes back even on a
// repeat connect - Google only issues one on the FIRST-ever grant unless
// prompt=consent forces a fresh one. return_to (default "youtube") is
// remembered in a cookie so callback.js knows which page to send the
// browser back to - Google's redirect_uri is fixed to /api/youtube/
// callback and can't carry this per-flow itself, same pattern as the
// TikTok login flow.
export async function onRequestGet(context) {
  const { env, request } = context;

  const requestedReturnTo = new URL(request.url).searchParams.get("return_to");
  const returnTo = RETURN_TO_DESTINATIONS[requestedReturnTo] ? requestedReturnTo : DEFAULT_RETURN_TO;

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
  headers.append("Set-Cookie", returnToCookieHeader(returnTo));
  return new Response(null, { status: 302, headers });
}
