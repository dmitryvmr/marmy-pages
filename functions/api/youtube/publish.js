import {
  YOUTUBE_UPLOAD_URL,
  YOUTUBE_SINGLE_UPLOAD_MAX_BYTES,
  parseCookies,
  jsonResponse,
  getValidAccessToken,
} from "../../_shared/youtube.js";

// POST /api/youtube/publish - resumable upload (init + single PUT, same
// two-step shape as the TikTok composer's publish.js, just against
// YouTube's resumable-upload protocol instead of TikTok's video/init).
// Single-PUT only (no chunking) - fine for short review-demo clips, not a
// replacement for post_to_youtube.py's own upload path for real episodes.
export async function onRequestPost(context) {
  const { request, env } = context;
  const cookies = parseCookies(request);
  const sessionId = cookies.yt_session;
  if (!sessionId) return jsonResponse({ error: "not_connected" }, 401);

  const raw = await env.YOUTUBE_SESSIONS.get(sessionId);
  if (!raw) return jsonResponse({ error: "session_expired" }, 401);
  let session = JSON.parse(raw);

  let accessToken;
  try {
    const result = await getValidAccessToken(session, env);
    accessToken = result.accessToken;
    if (result.refreshed) {
      session = result.session;
      await env.YOUTUBE_SESSIONS.put(sessionId, JSON.stringify(session), {
        expirationTtl: 60 * 60 * 24 * 30,
      });
    }
  } catch (err) {
    return jsonResponse({ error: "token_refresh_failed", message: err.message }, 401);
  }

  const form = await request.formData();
  const title = (form.get("title") || "").toString().slice(0, 100);
  const description = (form.get("description") || "").toString().slice(0, 5000);
  const privacyStatus = (form.get("privacy_status") || "unlisted").toString();
  const consented = form.get("consent") === "true";
  const videoFile = form.get("video");

  if (!videoFile || typeof videoFile === "string") {
    return jsonResponse({ error: "missing_video" }, 400);
  }
  if (!title) {
    return jsonResponse({ error: "missing_title" }, 400);
  }
  if (!consented) {
    return jsonResponse({ error: "consent_required", message: "You must confirm this upload before publishing." }, 400);
  }
  if (videoFile.size > YOUTUBE_SINGLE_UPLOAD_MAX_BYTES) {
    return jsonResponse(
      {
        error: "video_too_large",
        message: `Video is ${(videoFile.size / 1e6).toFixed(1)}MB - this demo page only supports uploads up to 64MB. Use post_to_youtube.py for larger files.`,
      },
      400
    );
  }

  const initRes = await fetch(`${YOUTUBE_UPLOAD_URL}?uploadType=resumable&part=snippet,status`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": videoFile.type || "video/mp4",
      "X-Upload-Content-Length": String(videoFile.size),
    },
    body: JSON.stringify({
      snippet: { title, description, categoryId: "24" }, // 24 = Entertainment, matches config.YOUTUBE_CATEGORY_ID
      status: { privacyStatus, selfDeclaredMadeForKids: false },
    }),
  });

  if (!initRes.ok) {
    const detail = await initRes.text();
    return jsonResponse({ error: "init_failed", detail }, 500); // 500, not 502/504/52x - see root CLAUDE.md's TikTok section for why
  }

  const uploadUrl = initRes.headers.get("Location");
  if (!uploadUrl) {
    return jsonResponse({ error: "init_failed", detail: "No upload URL returned" }, 500);
  }

  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": videoFile.type || "video/mp4",
      "Content-Length": String(videoFile.size),
    },
    body: videoFile,
  });

  if (!uploadRes.ok) {
    const detail = await uploadRes.text();
    return jsonResponse({ error: "upload_failed", status: uploadRes.status, detail }, 500);
  }

  const video = await uploadRes.json();
  return jsonResponse({ video_id: video.id, video_url: `https://youtu.be/${video.id}` });
}
