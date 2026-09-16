import { parseCookies } from "../../_shared/tiktok.js";

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function page({ connected, nickname, avatarUrl, privacyOptions }) {
  const body = connected
    ? `
    <div class="account">
      ${avatarUrl ? `<img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(nickname || 'Connected TikTok account')} profile photo" class="avatar">` : ""}
      <div>
        <div class="connected-label">Connected TikTok account</div>
        <div class="nickname">${escapeHtml(nickname || "(no nickname returned)")}</div>
      </div>
      <a href="/api/tiktok/logout" class="disconnect">Disconnect</a>
    </div>

    <form class="composer" id="composer-form">
      <label for="caption">Caption</label>
      <textarea id="caption" name="caption" rows="4" placeholder="Write a caption for this post&hellip;"></textarea>

      <label for="privacy">Privacy level</label>
      <select id="privacy" name="privacy_level">
        ${(privacyOptions.length ? privacyOptions : ["SELF_ONLY"])
          .map((p) => `<option value="${escapeHtml(p)}">${escapeHtml(p.replace(/_/g, " "))}</option>`)
          .join("")}
      </select>
      <p class="hint">Unaudited apps are restricted to SELF_ONLY by TikTok regardless of what's selected here.</p>

      <label for="video">Video file</label>
      <input type="file" id="video" name="video" accept="video/*" required>
      <p class="hint">Single-chunk upload only, up to 64MB.</p>

      <button type="submit" class="publish" id="publish-btn">Publish</button>
      <p class="status" id="publish-status" aria-live="polite"></p>
    </form>
    <script>
      const form = document.getElementById("composer-form");
      const btn = document.getElementById("publish-btn");
      const statusEl = document.getElementById("publish-status");

      function setStatus(text, isError) {
        statusEl.textContent = text;
        statusEl.style.color = isError ? "#b3261e" : "var(--muted)";
      }

      async function pollStatus(publishId) {
        for (let i = 0; i < 40; i++) {
          await new Promise((r) => setTimeout(r, 3000));
          const res = await fetch("/api/tiktok/publish-status?publish_id=" + encodeURIComponent(publishId));
          const data = await res.json();
          const status = data && data.data && data.data.status;
          if (status === "PUBLISH_COMPLETE") {
            setStatus("Posted to TikTok.", false);
            return;
          }
          if (status === "FAILED") {
            setStatus("TikTok reported the post failed: " + (data.data.fail_reason || "unknown reason"), true);
            return;
          }
          setStatus("Publishing... (" + (status || "processing") + ")", false);
        }
        setStatus("Still processing on TikTok's side - check back later.", false);
      }

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        btn.disabled = true;
        setStatus("Uploading...", false);
        try {
          const res = await fetch("/api/tiktok/publish", { method: "POST", body: new FormData(form) });
          const data = await res.json();
          if (!res.ok || data.error) {
            setStatus("Failed: " + (data.message || data.error || res.status), true);
            btn.disabled = false;
            return;
          }
          setStatus("Uploaded, waiting for TikTok to process...", false);
          await pollStatus(data.publish_id);
        } catch (err) {
          setStatus("Failed: " + err.message, true);
        }
        btn.disabled = false;
      });
    </script>
    `
    : `
    <p>No TikTok account connected yet.</p>
    <a href="/api/tiktok/login?return_to=composer" class="connect">Connect TikTok account</a>
    `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Composer - Viamour - AI Content Made with Love</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="Connect a TikTok account to review and publish a Viamour channel's video, the same way a channel owner does.">
<link rel="icon" type="image/png" href="/assets/favicon-32.png">
<link rel="canonical" href="https://viamour.com/api/tiktok/composer">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Viamour">
<meta property="og:title" content="Composer - Viamour - AI Content Made with Love">
<meta property="og:description" content="Connect a TikTok account to review and publish a Viamour channel's video, the same way a channel owner does.">
<meta property="og:url" content="https://viamour.com/api/tiktok/composer">
<meta property="og:image" content="https://viamour.com/assets/marmy-icon-source.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Composer - Viamour - AI Content Made with Love">
<meta name="twitter:description" content="Connect a TikTok account to review and publish a Viamour channel's video, the same way a channel owner does.">
<meta name="twitter:image" content="https://viamour.com/assets/marmy-icon-source.png">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<style>
  :root { --accent: #d9822b; --ink: #222; --muted: #666; --line: #eee; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 0 1.5rem 4rem; line-height: 1.6; color: var(--ink); }
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
  a.connect, button.publish { display: inline-block; background: var(--accent); color: #fff; border: none; padding: 0.7rem 1.3rem; border-radius: 8px; font-size: 1rem; text-decoration: none; cursor: pointer; }
  button.publish[disabled] { background: #ccc; cursor: not-allowed; }
  .account { display: flex; align-items: center; gap: 0.75rem; border: 1px solid var(--line); border-radius: 12px; padding: 1rem 1.25rem; margin-bottom: 1.5rem; }
  .account .avatar { width: 40px; height: 40px; border-radius: 50%; }
  .connected-label { font-size: 0.8rem; color: var(--muted); }
  .nickname { font-weight: 600; }
  .disconnect { margin-left: auto; font-size: 0.85rem; color: var(--muted); }
  .composer label { display: block; font-weight: 600; margin: 1rem 0 0.35rem; font-size: 0.9rem; }
  .composer textarea, .composer select, .composer input[type=file] { width: 100%; box-sizing: border-box; padding: 0.6rem; border: 1px solid var(--line); border-radius: 8px; font: inherit; }
  .hint { font-size: 0.8rem; color: var(--muted); margin-top: 0.4rem; }
  .composer button.publish { margin-top: 1.25rem; }
  .composer .status { min-height: 1.2em; }
  footer { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid var(--line); font-size: 0.85rem; color: var(--muted); }
  footer a { color: var(--accent); }
</style>
</head>
<body>
<header class="site">
  <img src="/assets/header-icon.png" alt="Viamour icon">
  <span>Viamour</span>
</header>
<nav class="site"><a href="/" class="nav-home">Home</a><a href="/about" class="nav-about">About</a><a href="/channels" class="nav-channels">Channels</a><a href="/reels" class="nav-reels">Reels</a><a href="/api/tiktok/analytics" class="nav-analytics">Analytics</a><a href="/updates" class="nav-updates">Updates</a><a href="/contact" class="nav-contact">Contact</a></nav>
<h1>Composer</h1>
${body}
<footer><a href="/">Home</a> &middot; <a href="/terms">Terms of Service</a> &middot; <a href="/privacy">Privacy Policy</a></footer>
</body>
</html>`;
}

// GET /api/tiktok/composer - renders the connect/compose screen. Reads the
// session cookie set by callback.js; nothing here calls TikTok itself.
export async function onRequestGet(context) {
  const { request, env } = context;
  const cookies = parseCookies(request);
  const sessionId = cookies.tt_session;

  let session = null;
  if (sessionId) {
    const raw = await env.TIKTOK_SESSIONS.get(sessionId);
    if (raw) session = JSON.parse(raw);
  }

  const html = page({
    connected: !!session,
    nickname: session?.creator_nickname,
    avatarUrl: session?.creator_avatar_url,
    privacyOptions: session?.privacy_level_options || [],
  });

  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
