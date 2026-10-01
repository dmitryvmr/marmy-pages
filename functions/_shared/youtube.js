// Shared helpers for the YouTube OAuth + upload/analytics flow.
// Mirrors functions/_shared/tiktok.js's shape - see that file for the
// general pattern this follows. Filenames under _shared/ are not routed
// by Pages Functions - this is a plain module imported by functions/
// youtube.js and functions/api/youtube/*.

export const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";
export const YOUTUBE_API_ROOT = "https://www.googleapis.com/youtube/v3";
export const YOUTUBE_UPLOAD_URL = "https://www.googleapis.com/upload/youtube/v3/videos";
export const YOUTUBE_ANALYTICS_URL = "https://youtubeanalytics.googleapis.com/v2/reports";

// Matches config.py's GOOGLE_OAUTH_SCOPES (the pipeline's Desktop client) -
// same three scopes, requested together so a re-auth never silently drops
// one (same principle as TIKTOK_SCOPES/tiktok_oauth.py's DEFAULT_SCOPE).
// This is a SEPARATE Web application OAuth client from the Desktop one
// post_to_youtube.py/fetch_performance.py use - see root CLAUDE.md
// Section 7 - both coexist under the same marmy-505520 project.
export const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/yt-analytics.readonly",
].join(" ");

// Single-chunk upload cap for this demo page, same reasoning/limit as
// TIKTOK_SINGLE_CHUNK_MAX_BYTES - fine for short review-demo clips, not a
// replacement for post_to_youtube.py's resumable chunked path.
export const YOUTUBE_SINGLE_UPLOAD_MAX_BYTES = 64 * 1024 * 1024;

const COOKIE_PATH = "/"; // site-wide, same reasoning as tiktok.js's COOKIE_PATH
const STATE_COOKIE_MAX_AGE = 600; // 10 min - just long enough for the redirect round trip
const TOKEN_REFRESH_MARGIN_SECONDS = 120;

// Where callback.js sends the browser after a successful connect - same
// return_to pattern as _shared/tiktok.js, needed because Google's
// redirect_uri is fixed to /api/youtube/callback and can't vary per-flow.
// /youtube (the stats/video-list page) and /api/youtube/composer (the
// upload page) each have their own Connect button.
export const RETURN_TO_DESTINATIONS = {
  youtube: "/youtube",
  composer: "/api/youtube/composer",
};
export const DEFAULT_RETURN_TO = "youtube";

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=UTF-8" },
  });
}

export function randomToken(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function parseCookies(request) {
  const header = request.headers.get("Cookie") || "";
  const out = {};
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    out[part.slice(0, eq).trim()] = decodeURIComponent(part.slice(eq + 1).trim());
  }
  return out;
}

export function stateCookieHeader(value) {
  return `yt_state=${encodeURIComponent(value)}; Path=${COOKIE_PATH}; Max-Age=${STATE_COOKIE_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`;
}

export function returnToCookieHeader(value) {
  return `yt_return_to=${encodeURIComponent(value)}; Path=${COOKIE_PATH}; Max-Age=${STATE_COOKIE_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`;
}

export function sessionCookieHeader(sessionId, maxAgeSeconds) {
  return `yt_session=${sessionId}; Path=${COOKIE_PATH}; Max-Age=${maxAgeSeconds}; HttpOnly; Secure; SameSite=Lax`;
}

export function clearCookieHeader(name) {
  return `${name}=; Path=${COOKIE_PATH}; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

// Google access tokens expire ~1h; refresh tokens don't rotate on each use
// (unlike TikTok's) so the original refresh_token is kept as-is. Returns
// {accessToken, refreshed, session} - callers re-save to KV when refreshed
// is true, same pattern as the pipeline's own common.get_google_credentials().
export async function getValidAccessToken(session, env) {
  const expiresAt = session.obtained_at + (session.expires_in || 3600) * 1000;
  if (Date.now() < expiresAt - TOKEN_REFRESH_MARGIN_SECONDS * 1000) {
    return { accessToken: session.access_token, refreshed: false, session };
  }
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.YOUTUBE_CLIENT_ID,
      client_secret: env.YOUTUBE_CLIENT_SECRET,
      refresh_token: session.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`Token refresh failed: ${data.error_description || data.error || res.status}`);
  }
  const updatedSession = {
    ...session,
    access_token: data.access_token,
    expires_in: data.expires_in,
    obtained_at: Date.now(),
  };
  return { accessToken: data.access_token, refreshed: true, session: updatedSession };
}
