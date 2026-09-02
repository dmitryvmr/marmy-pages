import { TIKTOK_STATUS_URL, parseCookies, jsonResponse } from "../../_shared/tiktok.js";

// GET /api/tiktok/publish-status?publish_id=... - polled by the composer
// page until TikTok reports PUBLISH_COMPLETE or FAILED.
export async function onRequestGet(context) {
  const { request, env } = context;
  const publishId = new URL(request.url).searchParams.get("publish_id");
  if (!publishId) return jsonResponse({ error: "missing_publish_id" }, 400);

  const cookies = parseCookies(request);
  const sessionId = cookies.tt_session;
  if (!sessionId) return jsonResponse({ error: "not_connected" }, 401);

  const raw = await env.TIKTOK_SESSIONS.get(sessionId);
  if (!raw) return jsonResponse({ error: "session_expired" }, 401);
  const session = JSON.parse(raw);

  const res = await fetch(TIKTOK_STATUS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({ publish_id: publishId }),
  });
  const data = await res.json();
  return jsonResponse(data, res.status);
}
