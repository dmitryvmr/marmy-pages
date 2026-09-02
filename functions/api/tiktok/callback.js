import {
  TIKTOK_TOKEN_URL,
  TIKTOK_CREATOR_INFO_URL,
  parseCookies,
  randomToken,
  sessionCookieHeader,
  clearCookieHeader,
} from "../../_shared/tiktok.js";

function errorPage(message) {
  return new Response(
    `<!doctype html><title>Connection failed</title>
     <body style="font-family:sans-serif;max-width:32rem;margin:4rem auto;padding:0 1.5rem">
     <h1>Couldn't connect TikTok</h1><p>${message}</p>
     <p><a href="/api/tiktok/login">Try again</a> &middot; <a href="/upload.html">Back</a></p></body>`,
    { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

// GET /api/tiktok/callback - TikTok redirects here after the user approves
// (or denies) the consent screen. Exchanges the code for a token, fetches
// the connected creator's info, and starts a session.
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  if (errorParam) {
    return errorPage(`TikTok returned an error: ${errorParam}`);
  }

  const cookies = parseCookies(request);
  if (!code || !state || state !== cookies.tt_state || !cookies.tt_verifier) {
    return errorPage("The connection request could not be verified. Please try again.");
  }

  const redirectUri = `${url.origin}/api/tiktok/callback`;

  const tokenRes = await fetch(TIKTOK_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cache-Control": "no-cache",
    },
    body: new URLSearchParams({
      client_key: env.TIKTOK_CLIENT_KEY,
      client_secret: env.TIKTOK_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code_verifier: cookies.tt_verifier,
    }),
  });
  const tokenData = await tokenRes.json();

  if (!tokenRes.ok || tokenData.error) {
    return errorPage(
      `Token exchange failed: ${tokenData.error_description || tokenData.error || tokenRes.status}`
    );
  }

  const creatorRes = await fetch(TIKTOK_CREATOR_INFO_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
  });
  const creatorData = await creatorRes.json();
  const creator = creatorData?.data || {};

  const sessionId = randomToken(32);
  const session = {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    open_id: tokenData.open_id,
    obtained_at: Date.now(),
    expires_in: tokenData.expires_in,
    creator_nickname: creator.creator_nickname || null,
    creator_avatar_url: creator.creator_avatar_url || null,
    privacy_level_options: creator.privacy_level_options || [],
    comment_disabled: creator.comment_disabled ?? false,
    duet_disabled: creator.duet_disabled ?? false,
    stitch_disabled: creator.stitch_disabled ?? false,
    max_video_post_duration_sec: creator.max_video_post_duration_sec || null,
  };

  await env.TIKTOK_SESSIONS.put(sessionId, JSON.stringify(session), {
    expirationTtl: Math.max(tokenData.expires_in || 3600, 60),
  });

  const headers = new Headers({ Location: "/api/tiktok/composer" });
  headers.append("Set-Cookie", sessionCookieHeader(sessionId, tokenData.expires_in || 3600));
  headers.append("Set-Cookie", clearCookieHeader("tt_verifier"));
  headers.append("Set-Cookie", clearCookieHeader("tt_state"));

  return new Response(null, { status: 302, headers });
}
