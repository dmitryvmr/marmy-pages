import {
  GOOGLE_TOKEN_URL,
  YOUTUBE_API_ROOT,
  parseCookies,
  randomToken,
  sessionCookieHeader,
  clearCookieHeader,
} from "../../_shared/youtube.js";

function errorPage(message) {
  return new Response(
    `<!doctype html><title>Connection failed</title>
     <body style="font-family:sans-serif;max-width:32rem;margin:4rem auto;padding:0 1.5rem">
     <h1>Couldn't connect YouTube</h1><p>${message}</p>
     <p><a href="/api/youtube/login">Try again</a> &middot; <a href="/youtube">Back</a></p></body>`,
    { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

// GET /api/youtube/callback - Google redirects here after the user
// approves (or denies) the consent screen. Exchanges the code for tokens,
// fetches the connected channel's own identity, and starts a session.
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  if (errorParam) {
    return errorPage(`Google returned an error: ${errorParam}`);
  }

  const cookies = parseCookies(request);
  if (!code || !state || state !== cookies.yt_state) {
    return errorPage("The connection request could not be verified. Please try again.");
  }

  const redirectUri = `${url.origin}/api/youtube/callback`;

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.YOUTUBE_CLIENT_ID,
      client_secret: env.YOUTUBE_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });
  const tokenData = await tokenRes.json();

  if (!tokenRes.ok || tokenData.error) {
    return errorPage(
      `Token exchange failed: ${tokenData.error_description || tokenData.error || tokenRes.status}`
    );
  }

  const channelRes = await fetch(
    `${YOUTUBE_API_ROOT}/channels?part=snippet,statistics&mine=true`,
    { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
  );
  const channelData = await channelRes.json();
  const channel = channelData?.items?.[0] || {};

  const sessionId = randomToken(32);
  const session = {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    obtained_at: Date.now(),
    expires_in: tokenData.expires_in,
    channel_id: channel.id || null,
    channel_title: channel.snippet?.title || null,
    channel_thumbnail: channel.snippet?.thumbnails?.default?.url || null,
  };

  if (!session.refresh_token) {
    // Shouldn't happen with access_type=offline&prompt=consent, but if
    // Google ever omits it, refreshing later will break - surface this
    // clearly now rather than failing silently on first token expiry.
    return errorPage(
      "Google didn't return a refresh token for this connection. Please try again - " +
      "if this keeps happening, revoke Viamour's access at " +
      "myaccount.google.com/permissions and reconnect."
    );
  }

  // 30 days - well beyond Google's ~1h access token life, refreshed
  // transparently via getValidAccessToken(); long enough that a channel
  // owner doesn't need to reconnect on every visit.
  await env.YOUTUBE_SESSIONS.put(sessionId, JSON.stringify(session), {
    expirationTtl: 60 * 60 * 24 * 30,
  });

  const headers = new Headers({ Location: "/youtube" });
  headers.append("Set-Cookie", sessionCookieHeader(sessionId, 60 * 60 * 24 * 30));
  headers.append("Set-Cookie", clearCookieHeader("yt_state"));
  return new Response(null, { status: 302, headers });
}
