import {
  YOUTUBE_API_ROOT,
  YOUTUBE_ANALYTICS_URL,
  parseCookies,
  getValidAccessToken,
} from "./_shared/youtube.js";

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function formatCount(n) {
  if (n == null) return "—";
  const num = Number(n);
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(num);
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function statCard(label, value) {
  return `<div class="stat"><div class="stat-value">${escapeHtml(formatCount(value))}</div><div class="stat-label">${escapeHtml(label)}</div></div>`;
}

function videoCard(v) {
  const id = v.snippet?.resourceId?.videoId;
  const title = v.snippet?.title || "(untitled)";
  const thumb = v.snippet?.thumbnails?.medium?.url || v.snippet?.thumbnails?.default?.url;
  return `
  <a class="video-card" href="https://youtu.be/${escapeHtml(id)}" target="_blank" rel="noopener">
    ${thumb ? `<img src="${escapeHtml(thumb)}" alt="Thumbnail for ${escapeHtml(title)}" loading="lazy">` : `<div class="cover-placeholder"></div>`}
    <div class="video-body">
      <p class="video-caption">${escapeHtml(title)}</p>
      <div class="video-date">${escapeHtml(formatDate(v.snippet?.publishedAt))}</div>
    </div>
  </a>`;
}

function page({ connected, channelTitle, channelThumbnail, stats, analytics, videos, apiError }) {
  let body;
  if (!connected) {
    body = `
    <a href="/api/youtube/login" class="connect">Connect YouTube channel</a>
    `;
  } else {
    body = `
    <div class="account">
      ${channelThumbnail ? `<img src="${escapeHtml(channelThumbnail)}" alt="${escapeHtml(channelTitle || 'Connected YouTube channel')} profile photo" class="avatar">` : ""}
      <div><div class="connected-label">Connected YouTube channel</div><div class="nickname">${escapeHtml(channelTitle || "")}</div></div>
      <a href="/api/youtube/logout" class="disconnect">Disconnect</a>
    </div>
    ${apiError ? `<p class="error">Couldn't load some data from YouTube: ${escapeHtml(apiError)}</p>` : ""}
    `;

    if (stats) {
      body += `
      <div class="stats-row">
        ${statCard("Subscribers", stats.subscriberCount)}
        ${statCard("Total views", stats.viewCount)}
        ${statCard("Videos", stats.videoCount)}
      </div>`;
    }

    if (analytics) {
      body += `
      <h2>Channel analytics &mdash; last 28 days</h2>
      <div class="stats-row">
        ${statCard("Views", analytics.views)}
        ${statCard("Watch time (min)", analytics.estimatedMinutesWatched)}
        ${statCard("Avg view duration (s)", analytics.averageViewDuration)}
        ${statCard("Subscribers gained", analytics.subscribersGained)}
      </div>`;
    }

    if (videos) {
      body += `
      <h2>Recent videos</h2>
      ${videos.length ? `<div class="video-grid">${videos.map(videoCard).join("")}</div>` : `<p>No videos found yet.</p>`}`;
    }

    body += `
    <p class="composer-pointer">Want to publish a new video? <a href="/api/youtube/composer">Click here &rarr;</a></p>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>YouTube - Viamour - AI Content Made with Love</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="Connect a YouTube channel to review its real videos and analytics, the same way a channel owner does.">
<link rel="icon" type="image/png" href="/assets/favicon-32.png">
<link rel="canonical" href="https://viamour.com/youtube">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Viamour">
<meta property="og:title" content="YouTube - Viamour - AI Content Made with Love">
<meta property="og:description" content="Connect a YouTube channel to review its real videos and analytics, the same way a channel owner does.">
<meta property="og:url" content="https://viamour.com/youtube">
<meta property="og:image" content="https://viamour.com/assets/marmy-icon-source.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="YouTube - Viamour - AI Content Made with Love">
<meta name="twitter:description" content="Connect a YouTube channel to review its real videos and analytics, the same way a channel owner does.">
<meta name="twitter:image" content="https://viamour.com/assets/marmy-icon-source.png">
<style>
  :root { --accent: #d9822b; --ink: #222; --muted: #666; --line: #eee; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 760px; margin: 0 auto; padding: 0 1.5rem 4rem; line-height: 1.6; color: var(--ink); }
  header.site { display: flex; align-items: center; gap: 0.75rem; margin: 2.5rem 0 1.5rem; }
  header.site img { width: 44px; height: 44px; border-radius: 50%; }
  header.site .brand { margin: 0; font-size: 1.6rem; font-weight: 700; color: var(--ink); }
  nav.site { margin-bottom: 1.5rem; display: flex; flex-wrap: wrap; gap: 0.5rem; }
  nav.site a { text-decoration: none; color: #fff; font-size: 0.82rem; font-weight: 600; padding: 0.4rem 0.9rem; border-radius: 999px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); transition: transform 0.15s ease, box-shadow 0.15s ease; }
  nav.site a:hover { transform: translateY(-1px); box-shadow: 0 3px 10px rgba(0,0,0,0.18); }
  nav.site a.nav-home { background: #d9822b; }
  nav.site a.nav-about { background: #3b82c4; }
  nav.site a.nav-channels { background: #2f9e6e; }
  nav.site a.nav-reels { background: #0d9488; }
  nav.site a.nav-tiktok { background: #000; }
  nav.site a.nav-youtube { background: #c4302b; }
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
  .stats-row { display: flex; gap: 0.75rem; flex-wrap: wrap; }
  .stat { flex: 1; min-width: 110px; border: 1px solid var(--line); border-radius: 12px; padding: 0.9rem; text-align: center; }
  .stat-value { font-size: 1.3rem; font-weight: 700; color: var(--accent); }
  .stat-label { font-size: 0.75rem; color: var(--muted); margin-top: 0.15rem; }
  .video-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 1rem; margin-top: 1rem; }
  .video-card { display: block; border: 1px solid var(--line); border-radius: 12px; overflow: hidden; text-decoration: none; color: inherit; }
  .video-card img, .cover-placeholder { width: 100%; aspect-ratio: 16/9; object-fit: cover; background: #f2f2f2; display: block; }
  .video-body { padding: 0.6rem 0.7rem; }
  .video-caption { font-size: 0.8rem; margin: 0 0 0.4rem; color: var(--ink); }
  .video-date { font-size: 0.7rem; color: var(--muted); }
  .composer-pointer { margin-top: 2rem; }
  footer { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid var(--line); font-size: 0.85rem; color: var(--muted); }
  footer a { color: var(--accent); }
</style>
</head>
<body>
<header class="site">
  <img src="/assets/header-icon.png" alt="Viamour icon">
  <p class="brand">Viamour - AI Content Made with Love</p>
</header>
<nav class="site"><a href="/" class="nav-home">Home</a><a href="/about" class="nav-about">About</a><a href="/channels" class="nav-channels">Channels</a><a href="/reels" class="nav-reels">Reels</a><a href="/tiktok" class="nav-tiktok">TikTok</a><a href="/youtube" class="nav-youtube">YouTube</a><a href="/updates" class="nav-updates">Updates</a><a href="/contact" class="nav-contact">Contact</a></nav>
<h1>YouTube</h1>
<p style="color:var(--muted);font-size:0.9rem;margin-top:-0.5rem">Real numbers from YouTube — views, watch time, subscribers, and analytics for your channel, refreshed each time you load this page.</p>
${body}
<footer><p>&copy; 2026 Dead Serious LLC</p><a href="/">Home</a> &middot; <a href="/terms">Terms of Service</a> &middot; <a href="/privacy">Privacy Policy</a> &middot; <a href="/sitemap.xml">Sitemap</a></footer>
</body>
</html>`;
}

// GET /youtube - server-rendered: if connected, calls the YouTube Data API
// (channel info + recent videos) and the YouTube Analytics API (28-day
// channel performance) live, and offers a real upload form. Reads the
// session cookie set by callback.js; nothing here calls Google itself
// beyond what's needed to render this page or handle a publish POST.
export async function onRequestGet(context) {
  const { request, env } = context;
  const cookies = parseCookies(request);
  const sessionId = cookies.yt_session;

  let session = null;
  if (sessionId) {
    const raw = await env.YOUTUBE_SESSIONS.get(sessionId);
    if (raw) session = JSON.parse(raw);
  }

  if (!session) {
    return new Response(page({ connected: false }), { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  try {
    const { accessToken, refreshed, session: updatedSession } = await getValidAccessToken(session, env);
    if (refreshed) {
      session = updatedSession;
      await env.YOUTUBE_SESSIONS.put(sessionId, JSON.stringify(session), { expirationTtl: 60 * 60 * 24 * 30 });
    }

    const channelRes = await fetch(
      `${YOUTUBE_API_ROOT}/channels?part=snippet,contentDetails,statistics&mine=true`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const channelData = await channelRes.json();
    const channel = channelData?.items?.[0];
    if (!channel) throw new Error(channelData?.error?.message || "No channel found for this account");

    const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;
    let videos = [];
    if (uploadsPlaylistId) {
      // part=status (not just snippet) so each item's privacyStatus is
      // available to filter on - maxResults=25 to still have 10 public
      // ones left after private/unlisted uploads are filtered out below.
      const videosRes = await fetch(
        `${YOUTUBE_API_ROOT}/playlistItems?part=snippet,status&playlistId=${uploadsPlaylistId}&maxResults=25`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const videosData = await videosRes.json();
      videos = (videosData?.items || [])
        .filter((v) => v.status?.privacyStatus === "public")
        .slice(0, 10);
    }

    const endDate = new Date().toISOString().slice(0, 10);
    const startDate = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const analyticsRes = await fetch(
      `${YOUTUBE_ANALYTICS_URL}?ids=channel==MINE&startDate=${startDate}&endDate=${endDate}` +
      `&metrics=views,estimatedMinutesWatched,averageViewDuration,subscribersGained`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const analyticsData = await analyticsRes.json();
    let analytics = null;
    if (analyticsData?.rows?.[0]) {
      const headers = (analyticsData.columnHeaders || []).map((h) => h.name);
      const row = analyticsData.rows[0];
      analytics = Object.fromEntries(headers.map((name, i) => [name, row[i]]));
    }

    const html = page({
      connected: true,
      channelTitle: channel.snippet?.title,
      channelThumbnail: channel.snippet?.thumbnails?.default?.url,
      stats: channel.statistics,
      analytics,
      videos,
    });
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  } catch (err) {
    const html = page({
      connected: true,
      channelTitle: session.channel_title,
      channelThumbnail: session.channel_thumbnail,
      apiError: err.message,
    });
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
}
