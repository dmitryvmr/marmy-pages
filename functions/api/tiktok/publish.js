import {
  TIKTOK_VIDEO_INIT_URL,
  TIKTOK_SINGLE_CHUNK_MAX_BYTES,
  parseCookies,
  jsonResponse,
} from "../../_shared/tiktok.js";

// POST /api/tiktok/publish - starts a real TikTok post: video/init, then a
// single PUT of the video bytes to the returned upload_url. Single-chunk
// only (see _shared/tiktok.js) - fine for short review-demo clips.
export async function onRequestPost(context) {
  const { request, env } = context;
  const cookies = parseCookies(request);
  const sessionId = cookies.tt_session;
  if (!sessionId) return jsonResponse({ error: "not_connected" }, 401);

  const raw = await env.TIKTOK_SESSIONS.get(sessionId);
  if (!raw) return jsonResponse({ error: "session_expired" }, 401);
  const session = JSON.parse(raw);

  const form = await request.formData();
  const caption = (form.get("caption") || "").toString().slice(0, 2200);
  const privacyLevel = (form.get("privacy_level") || "SELF_ONLY").toString();
  const videoFile = form.get("video");

  if (!videoFile || typeof videoFile === "string") {
    return jsonResponse({ error: "missing_video" }, 400);
  }
  if (videoFile.size > TIKTOK_SINGLE_CHUNK_MAX_BYTES) {
    return jsonResponse(
      {
        error: "video_too_large",
        message: `Video is ${(videoFile.size / 1e6).toFixed(1)}MB - this demo composer only supports single-chunk uploads up to 64MB. Use post_to_tiktok.py for larger files.`,
      },
      400
    );
  }

  const initRes = await fetch(TIKTOK_VIDEO_INIT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      post_info: {
        title: caption,
        privacy_level: privacyLevel,
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
      },
      source_info: {
        source: "FILE_UPLOAD",
        video_size: videoFile.size,
        chunk_size: videoFile.size,
        total_chunk_count: 1,
      },
    }),
  });
  const initData = await initRes.json();

  if (!initRes.ok || (initData.error && initData.error.code !== "ok")) {
    return jsonResponse({ error: "init_failed", detail: initData }, 502);
  }

  const { publish_id, upload_url } = initData.data;

  const uploadRes = await fetch(upload_url, {
    method: "PUT",
    headers: {
      "Content-Type": videoFile.type || "video/mp4",
      "Content-Range": `bytes 0-${videoFile.size - 1}/${videoFile.size}`,
    },
    body: videoFile,
  });

  if (!uploadRes.ok) {
    return jsonResponse(
      { error: "upload_failed", status: uploadRes.status, publish_id },
      502
    );
  }

  return jsonResponse({ publish_id });
}
