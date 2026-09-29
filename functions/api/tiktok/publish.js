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
  // Commercial content disclosure (TikTok's Content Sharing Guidelines,
  // required for the Direct Post audit) - the toggle itself isn't sent to
  // TikTok, only the two underlying booleans it reveals. The composer's own
  // client-side JS already blocks submission unless consent is checked and,
  // when disclosure is on, at least one of these is true - re-checked here
  // too since a client can't be trusted to enforce this on its own.
  const brandOrganic = form.get("brand_organic_toggle") === "true";
  const brandContent = form.get("brand_content_toggle") === "true";
  const disclosureOn = form.get("disclosure_enabled") === "true";
  const consented = form.get("consent") === "true";

  if (!videoFile || typeof videoFile === "string") {
    return jsonResponse({ error: "missing_video" }, 400);
  }
  if (!consented) {
    return jsonResponse({ error: "consent_required", message: "You must agree to TikTok's Music Usage Confirmation before posting." }, 400);
  }
  if (disclosureOn && !brandOrganic && !brandContent) {
    return jsonResponse({ error: "disclosure_incomplete", message: "Select at least one commercial content option (Your Brand or Branded Content)." }, 400);
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
        brand_content_toggle: brandContent,
        brand_organic_toggle: brandOrganic,
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
    // 500, not 502/504/52x - Cloudflare's edge reserves those specific codes
    // for its own "Bad Gateway"-style branded HTML error page and silently
    // discards the real response body (even a Worker/Pages Function's own
    // deliberate JSON), which is what actually produced the confusing
    // "Unexpected token '<', <!DOCTYPE...'" client-side error. Found 2026-09-24
    // during TikTok demo recording.
    return jsonResponse({ error: "init_failed", detail: initData }, 500);
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
      500 // see init_failed's comment above - not 502
    );
  }

  return jsonResponse({ publish_id });
}
