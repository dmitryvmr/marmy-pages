// Shared helpers for the TikTok OAuth + composer flow.
// Filenames under _shared/ are not routed by Pages Functions - this is a
// plain module imported by the files under functions/api/tiktok/.

export const TIKTOK_AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/";
export const TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
export const TIKTOK_CREATOR_INFO_URL =
  "https://open.tiktokapis.com/v2/post/publish/creator_info/query/";
export const TIKTOK_VIDEO_INIT_URL =
  "https://open.tiktokapis.com/v2/post/publish/video/init/";
export const TIKTOK_STATUS_URL =
  "https://open.tiktokapis.com/v2/post/publish/status/fetch/";

// Literal comma required - percent-encoding it (%2C) gets rejected by TikTok.
export const TIKTOK_SCOPES = "user.info.basic,video.publish";

// Matches config.py's TIKTOK_SINGLE_CHUNK_MAX_BYTES. This demo composer only
// implements a single-PUT upload (no chunking) - fine for short review-demo
// clips, not meant to replace post_to_tiktok.py's chunked path for real use.
export const TIKTOK_SINGLE_CHUNK_MAX_BYTES = 64 * 1024 * 1024;

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=UTF-8" },
  });
}

const COOKIE_PATH = "/api/tiktok";
const PKCE_COOKIE_MAX_AGE = 600; // 10 min - just long enough to complete the redirect round trip

export function randomToken(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

function base64url(bytes) {
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// TikTok requires the PKCE code_challenge as a plain hex SHA-256 digest of
// the verifier - NOT the RFC 7636 base64url encoding most providers expect.
// Base64url is silently accepted at /authorize/ but fails token exchange.
export async function sha256Hex(input) {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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

export function pkceCookieHeaders(name, value) {
  return `${name}=${encodeURIComponent(value)}; Path=${COOKIE_PATH}; Max-Age=${PKCE_COOKIE_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`;
}

export function sessionCookieHeader(sessionId, maxAgeSeconds) {
  return `tt_session=${sessionId}; Path=${COOKIE_PATH}; Max-Age=${maxAgeSeconds}; HttpOnly; Secure; SameSite=Lax`;
}

export function clearCookieHeader(name) {
  return `${name}=; Path=${COOKIE_PATH}; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}
