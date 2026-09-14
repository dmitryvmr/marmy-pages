import {
  TIKTOK_VIDEO_LIST_URL,
  TIKTOK_USER_INFO_URL,
  parseCookies,
} from "../../_shared/tiktok.js";

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function formatCount(n) {
  if (n == null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

function formatDate(unixSeconds) {
  if (!unixSeconds) return "";
  return new Date(unixSeconds * 1000).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function statCard(label, value) {
  return `<div class="stat"><div class="stat-value">${escapeHtml(formatCount(value))}</div><div class="stat-label">${escapeHtml(label)}</div></div>`;
}

function videoCard(v) {
  const caption = (v.video_description || v.title || "").slice(0, 140);
  return `
  <a class="video-card" href="${escapeHtml(v.share_url || "#")}" target="_blank" rel="noopener">
    ${v.cover_image_url ? `<img src="${escapeHtml(v.cover_image_url)}" alt="Thumbnail for ${escapeHtml(caption || 'this TikTok video')}" loading="lazy">` : `<div class="cover-placeholder"></div>`}
    <div class="video-body">
      <p class="video-caption">${escapeHtml(caption) || "(no caption)"}</p>
      <div class="video-stats">
        <span>▶ ${escapeHtml(formatCount(v.view_count))}</span>
        <span>❤ ${escapeHtml(formatCount(v.like_count))}</span>
        <span>💬 ${escapeHtml(formatCount(v.comment_count))}</span>
        <span>↺ ${escapeHtml(formatCount(v.share_count))}</span>
      </div>
      <div class="video-date">${escapeHtml(formatDate(v.create_time))}</div>
    </div>
  </a>`;
}

function page({ connected, nickname, avatarUrl, user, videos, apiError }) {
  let body;
  if (!connected) {
    body = `
    <p>Connect a TikTok account to see its real videos and stats — views, likes,
    comments, and shares — pulled straight from TikTok and updated every time
    you load this page.</p>
    <a href="/api/tiktok/login?return_to=analytics" class="connect">Connect TikTok account</a>
    `;
  } else if (apiError) {
    body = `
    <div class="account">
      ${avatarUrl ? `<img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(nickname || 'Connected TikTok account')} profile photo" class="avatar">` : ""}
      <div><div class="connected-label">Connected TikTok account</div><div class="nickname">${escapeHtml(nickname || "")}</div></div>
      <a href="/api/tiktok/logout" class="disconnect">Disconnect</a>
    </div>
    <p class="error">Couldn't load analytics from TikTok: ${escapeHtml(apiError)}</p>
    `;
  } else {
    body = `
    <div class="account">
      ${avatarUrl ? `<img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(nickname || 'Connected TikTok account')} profile photo" class="avatar">` : ""}
      <div><div class="connected-label">Connected TikTok account</div><div class="nickname">${escapeHtml(nickname || "")}</div></div>
      <a href="/api/tiktok/logout" class="disconnect">Disconnect</a>
    </div>

    <div class="stats-row">
      ${statCard("Followers", user.follower_count)}
      ${statCard("Total likes", user.likes_count)}
      ${statCard("Videos", user.video_count)}
    </div>

    <h2>Recent videos</h2>
    ${videos.length ? `<div class="video-grid">${videos.map(videoCard).join("")}</div>` : `<p>No videos returned yet.</p>`}
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Analytics - Viamour</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="Real per-video stats - views, likes, comments, and shares - for a connected Viamour channel's TikTok account.">
<link rel="icon" type="image/png" href="/assets/favicon-32.png">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="canonical" href="https://viamour.com/api/tiktok/analytics">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Viamour">
<meta property="og:title" content="Analytics - Viamour">
<meta property="og:description" content="Real per-video stats - views, likes, comments, and shares - for a connected Viamour channel's TikTok account.">
<meta property="og:url" content="https://viamour.com/api/tiktok/analytics">
<meta property="og:image" content="https://viamour.com/assets/marmy-icon-source.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Analytics - Viamour">
<meta name="twitter:description" content="Real per-video stats - views, likes, comments, and shares - for a connected Viamour channel's TikTok account.">
<meta name="twitter:image" content="https://viamour.com/assets/marmy-icon-source.png">
<style>
  :root { --accent: #d9822b; --ink: #222; --muted: #666; --line: #eee; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 760px; margin: 0 auto; padding: 0 1.5rem 4rem; line-height: 1.6; color: var(--ink); }
  header.site { display: flex; align-items: center; gap: 0.75rem; margin: 2.5rem 0 0.5rem; }
  header.site img { width: 36px; height: 36px; border-radius: 50%; }
  header.site span { font-weight: 600; font-size: 1.1rem; color: var(--accent); }
  nav.site { margin-bottom: 1.5rem; display: flex; flex-wrap: wrap; gap: 0.5rem; }
  nav.site a { text-decoration: none; color: #fff; font-size: 0.82rem; font-weight: 600; padding: 0.4rem 0.9rem; border-radius: 999px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); transition: transform 0.15s ease, box-shadow 0.15s ease; }
  nav.site a:hover { transform: translateY(-1px); box-shadow: 0 3px 10px rgba(0,0,0,0.18); }
  nav.site a.nav-home { background: #d9822b; }
  nav.site a.nav-about { background: #3b82c4; }
  nav.site a.nav-channels { background: #2f9e6e; }
  nav.site a.nav-reels { background: #0d9488; }
  nav.site a.nav-analytics { background: #8b5cf6; }
  nav.site a.nav-updates { background: #e0577b; }
  nav.site a.nav-contact { background: #64748b; }
  h1 { font-size: 1.3rem; }
  h2 { font-size: 1.05rem; color: var(--accent); margin-top: 2rem; }
  a.connect { display: inline-block; background: var(--accent); color: #fff; border: none; padding: 0.7rem 1.3rem; border-radius: 8px; font-size: 1rem; text-decoration: none; cursor: pointer; }
  .account { display: flex; align-items: center; gap: 0.75rem; border: 1px solid var(--line); border-radius: 12px; padding: 1rem 1.25rem; margin-bottom: 1.5rem; }
  .account .avatar { width: 40px; height: 40px; border-radius: 50%; }
  .connected-label { font-size: 0.8rem; color: var(--muted); }
  .nickname { font-weight: 600; }
  .disconnect { margin-left: auto; font-size: 0.85rem; color: var(--muted); }
  .error { color: #b3261e; }
  .stats-row { display: flex; gap: 0.75rem; }
  .stat { flex: 1; border: 1px solid var(--line); border-radius: 12px; padding: 0.9rem; text-align: center; }
  .stat-value { font-size: 1.3rem; font-weight: 700; color: var(--accent); }
  .stat-label { font-size: 0.75rem; color: var(--muted); margin-top: 0.15rem; }
  .video-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 1rem; margin-top: 1rem; }
  .video-card { display: block; border: 1px solid var(--line); border-radius: 12px; overflow: hidden; text-decoration: none; color: inherit; }
  .video-card img, .cover-placeholder { width: 100%; aspect-ratio: 9/16; object-fit: cover; background: #f2f2f2; display: block; }
  .video-body { padding: 0.6rem 0.7rem; }
  .video-caption { font-size: 0.8rem; margin: 0 0 0.4rem; color: var(--ink); }
  .video-stats { display: flex; flex-wrap: wrap; gap: 0.5rem; font-size: 0.75rem; color: var(--muted); }
  .video-date { font-size: 0.7rem; color: var(--muted); margin-top: 0.3rem; }
  footer { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid var(--line); font-size: 0.85rem; color: var(--muted); }
  footer a { color: var(--accent); }
</style>
</head>
<body>
<header class="site">
  <img src="/assets/header-icon.png" alt="Viamour icon">
  <span>Viamour</span>
</header>
<nav class="site"><a href="/" class="nav-home">Home</a><a href="/about.html" class="nav-about">About</a><a href="/channels.html" class="nav-channels">Channels</a><a href="/reels.html" class="nav-reels">Reels</a><a href="/api/tiktok/analytics" class="nav-analytics">Analytics</a><a href="/updates.html" class="nav-updates">Updates</a><a href="/contact.html" class="nav-contact">Contact</a></nav>
<h1>Channel Analytics</h1>
<p style="color:var(--muted);font-size:0.9rem;margin-top:-0.5rem">Real numbers from TikTok — views, likes, comments, and shares for every video, refreshed each time you load this page.</p>
${body}
<footer><a href="/">Home</a> &middot; <a href="/terms.html">Terms of Service</a> &middot; <a href="/privacy.html">Privacy Policy</a></footer>
</body>
</html>`;
}

// GET /api/tiktok/analytics - server-rendered: if connected, calls TikTok's
// video/list + user/info live and renders real stats; otherwise shows a
// connect button (return_to=analytics so callback.js sends the browser back
// here, not to the composer - see _shared/tiktok.js).
export async function onRequestGet(context) {
  const { request, env } = context;
  const cookies = parseCookies(request);
  const sessionId = cookies.tt_session;

  let session = null;
  if (sessionId) {
    const raw = await env.TIKTOK_SESSIONS.get(sessionId);
    if (raw) session = JSON.parse(raw);
  }

  if (!session) {
    const html = page({ connected: false });
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  try {
    const [videoRes, userRes] = await Promise.all([
      fetch(`${TIKTOK_VIDEO_LIST_URL}?fields=id,create_time,cover_image_url,share_url,video_description,title,like_count,comment_count,share_count,view_count`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify({ max_count: 20 }),
      }),
      fetch(`${TIKTOK_USER_INFO_URL}?fields=display_name,avatar_url,follower_count,likes_count,video_count`, {
        method: "GET",
        headers: { Authorization: `Bearer ${session.access_token}` },
      }),
    ]);

    const videoData = await videoRes.json();
    const userData = await userRes.json();

    if (videoData.error && videoData.error.code !== "ok") {
      throw new Error(videoData.error.message || videoData.error.code);
    }

    const html = page({
      connected: true,
      nickname: session.creator_nickname || userData?.data?.user?.display_name,
      avatarUrl: session.creator_avatar_url || userData?.data?.user?.avatar_url,
      user: userData?.data?.user || {},
      videos: videoData?.data?.videos || [],
    });
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  } catch (err) {
    const html = page({
      connected: true,
      nickname: session.creator_nickname,
      avatarUrl: session.creator_avatar_url,
      apiError: err.message,
    });
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
}
