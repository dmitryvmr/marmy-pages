import {
  TIKTOK_AUTH_URL,
  TIKTOK_SCOPES,
  RETURN_TO_DESTINATIONS,
  DEFAULT_RETURN_TO,
  randomToken,
  sha256Hex,
  pkceCookieHeaders,
  returnToCookieHeaders,
} from "../../_shared/tiktok.js";

// GET /api/tiktok/login[?return_to=composer|analytics] - starts the
// OAuth/PKCE flow, redirects to TikTok's own authorize screen (the actual
// login/consent UI - never rendered by us). return_to (default "composer")
// is remembered in a cookie so callback.js knows which page to send the
// browser back to - TikTok's own redirect_uri is fixed to /api/tiktok/
// callback and can't carry this per-flow itself.
export async function onRequestGet(context) {
  const { env, request } = context;

  const requestedReturnTo = new URL(request.url).searchParams.get("return_to");
  const returnTo = RETURN_TO_DESTINATIONS[requestedReturnTo] ? requestedReturnTo : DEFAULT_RETURN_TO;

  const verifier = randomToken(48);
  const challenge = await sha256Hex(verifier); // plain hex, not base64url - see _shared/tiktok.js
  const state = randomToken(24);

  const redirectUri = `${new URL(request.url).origin}/api/tiktok/callback`;

  const authorizeUrl =
    `${TIKTOK_AUTH_URL}?client_key=${encodeURIComponent(env.TIKTOK_CLIENT_KEY)}` +
    `&scope=${TIKTOK_SCOPES}` + // literal comma required, do not encodeURIComponent this
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${state}` +
    `&code_challenge=${challenge}` +
    `&code_challenge_method=S256`;

  const headers = new Headers({ Location: authorizeUrl });
  headers.append("Set-Cookie", pkceCookieHeaders("tt_verifier", verifier));
  headers.append("Set-Cookie", pkceCookieHeaders("tt_state", state));
  headers.append("Set-Cookie", returnToCookieHeaders(returnTo));

  return new Response(null, { status: 302, headers });
}
