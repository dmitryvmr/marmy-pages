import { parseCookies } from "../../_shared/youtube.js";

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function page({ connected, channelTitle, channelThumbnail }) {
  const body = connected
    ? `
    <div class="account">
      ${channelThumbnail ? `<img src="${escapeHtml(channelThumbnail)}" alt="${escapeHtml(channelTitle || 'Connected YouTube channel')} profile photo" class="avatar">` : ""}
      <div>
        <div class="connected-label">Connected YouTube channel</div>
        <div class="nickname">${escapeHtml(channelTitle || "(no title returned)")}</div>
      </div>
      <a href="/api/youtube/logout" class="disconnect">Disconnect</a>
    </div>

    <form class="composer" id="upload-form">
      <label for="title">Title</label>
      <input type="text" id="title" name="title" maxlength="100" required>

      <label for="description">Description</label>
      <textarea id="description" name="description" rows="4" placeholder="Write a description for this video&hellip;"></textarea>

      <label for="privacy">Privacy status</label>
      <select id="privacy" name="privacy_status">
        <option value="unlisted" selected>Unlisted</option>
        <option value="private">Private</option>
        <option value="public">Public</option>
      </select>

      <label for="video">Video file</label>
      <input type="file" id="video" name="video" accept="video/*" required>
      <p class="hint">Single-upload only, up to 64MB.</p>
      <video id="video-preview" class="preview" controls playsinline></video>

      <label class="checkbox-row consent-row">
        <input type="checkbox" id="consent" name="consent" value="true">
        I've reviewed this video and confirm it should be published to the connected channel.
      </label>

      <button type="submit" class="publish" id="publish-btn" disabled>Publish</button>
      <p class="status" id="publish-status" aria-live="polite"></p>
    </form>
    <script>
      const form = document.getElementById("upload-form");
      const btn = document.getElementById("publish-btn");
      const statusEl = document.getElementById("publish-status");
      const videoInput = document.getElementById("video");
      const videoPreview = document.getElementById("video-preview");
      const consent = document.getElementById("consent");

      function setStatus(text, isError) {
        statusEl.textContent = text;
        statusEl.style.color = isError ? "#b3261e" : "var(--muted)";
      }

      videoInput.addEventListener("change", () => {
        const file = videoInput.files && videoInput.files[0];
        if (file) {
          videoPreview.src = URL.createObjectURL(file);
          videoPreview.style.display = "block";
        } else {
          videoPreview.removeAttribute("src");
          videoPreview.style.display = "none";
        }
        updatePublishState();
      });
      consent.addEventListener("change", updatePublishState);

      function updatePublishState() {
        const hasVideo = !!(videoInput.files && videoInput.files[0]);
        const hasTitle = !!document.getElementById("title").value.trim();
        btn.disabled = !(hasVideo && hasTitle && consent.checked);
      }
      document.getElementById("title").addEventListener("input", updatePublishState);
      updatePublishState();

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        btn.disabled = true;
        setStatus("Uploading...", false);
        try {
          const res = await fetch("/api/youtube/publish", { method: "POST", body: new FormData(form) });
          const data = await res.json();
          if (!res.ok || data.error) {
            setStatus("Failed: " + (data.message || data.error || res.status), true);
            updatePublishState();
            return;
          }
          setStatus("Published: " + data.video_url, false);
        } catch (err) {
          setStatus("Failed: " + err.message, true);
        }
        updatePublishState();
      });
    </script>
    `
    : `
    <p>No YouTube channel connected yet.</p>
    <a href="/api/youtube/login?return_to=composer" class="connect">Connect YouTube channel</a>
    `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Upload Video to YouTube - Viamour - AI Content Made with Love</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="Connect a YouTube channel to review and publish a Viamour channel's video, the same steps a channel owner goes through to sign in and publish.">
<link rel="icon" type="image/png" href="/assets/favicon-32.png">
<link rel="canonical" href="https://viamour.com/api/youtube/composer">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Viamour">
<meta property="og:title" content="Upload Video to YouTube - Viamour - AI Content Made with Love">
<meta property="og:description" content="Connect a YouTube channel to review and publish a Viamour channel's video, the same steps a channel owner goes through to sign in and publish.">
<meta property="og:url" content="https://viamour.com/api/youtube/composer">
<meta property="og:image" content="https://viamour.com/assets/marmy-icon-source.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Upload Video to YouTube - Viamour - AI Content Made with Love">
<meta name="twitter:description" content="Connect a YouTube channel to review and publish a Viamour channel's video, the same steps a channel owner goes through to sign in and publish.">
<meta name="twitter:image" content="https://viamour.com/assets/marmy-icon-source.png">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<style>
  :root { --accent: #d9822b; --ink: #222; --muted: #666; --line: #eee; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 0 1.5rem 4rem; line-height: 1.6; color: var(--ink); }
  header.site { display: flex; align-items: center; gap: 0.75rem; margin: 2.5rem 0 1.5rem; }
  header.site img { width: 36px; height: 36px; border-radius: 50%; }
  header.site span { font-weight: 600; font-size: 1.1rem; color: var(--accent); }
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
  a.connect, button.publish { display: inline-block; background: var(--accent); color: #fff; border: none; padding: 0.7rem 1.3rem; border-radius: 8px; font-size: 1rem; text-decoration: none; cursor: pointer; }
  button.publish[disabled] { background: #ccc; cursor: not-allowed; opacity: 0.6; }
  .account { display: flex; align-items: center; gap: 0.75rem; border: 1px solid var(--line); border-radius: 12px; padding: 1rem 1.25rem; margin-bottom: 1.5rem; }
  .account .avatar { width: 40px; height: 40px; border-radius: 50%; }
  .connected-label { font-size: 0.8rem; color: var(--muted); }
  .nickname { font-weight: 600; }
  .disconnect { margin-left: auto; font-size: 0.85rem; color: var(--muted); }
  .composer label { display: block; font-weight: 600; margin: 1rem 0 0.35rem; font-size: 0.9rem; }
  .composer input[type=text], .composer textarea, .composer select, .composer input[type=file] { width: 100%; box-sizing: border-box; padding: 0.6rem; border: 1px solid var(--line); border-radius: 8px; font: inherit; }
  .hint { font-size: 0.8rem; color: var(--muted); margin-top: 0.4rem; }
  .composer video.preview { display: none; width: 100%; margin-top: 0.75rem; border-radius: 8px; background: #000; max-height: 420px; }
  .composer .checkbox-row { display: flex; align-items: flex-start; gap: 0.5rem; font-weight: 400; font-size: 0.9rem; margin: 1rem 0; }
  .composer .checkbox-row input[type=checkbox] { width: auto; margin-top: 0.2rem; flex: none; }
  .composer button.publish { margin-top: 1.25rem; }
  .composer .status { min-height: 1.2em; word-break: break-word; }
  footer { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid var(--line); font-size: 0.85rem; color: var(--muted); }
  footer a { color: var(--accent); }
</style>
</head>
<body>
<header class="site">
  <img src="/assets/header-icon.png" alt="Viamour icon">
  <span>Viamour - AI Content Made with Love</span>
</header>
<nav class="site"><a href="/" class="nav-home">Home</a><a href="/about" class="nav-about">About</a><a href="/channels" class="nav-channels">Channels</a><a href="/reels" class="nav-reels">Reels</a><a href="/tiktok" class="nav-tiktok">TikTok</a><a href="/youtube" class="nav-youtube">YouTube</a><a href="/updates" class="nav-updates">Updates</a><a href="/contact" class="nav-contact">Contact</a></nav>
<h1>Upload Video to YouTube</h1>
${body}
<footer><a href="/">Home</a> &middot; <a href="/terms">Terms of Service</a> &middot; <a href="/privacy">Privacy Policy</a> &middot; <a href="/sitemap.xml">Sitemap</a></footer>
</body>
</html>`;
}

// GET /api/youtube/composer - renders the connect/upload screen. Reads the
// session cookie set by callback.js; nothing here calls Google itself.
export async function onRequestGet(context) {
  const { request, env } = context;
  const cookies = parseCookies(request);
  const sessionId = cookies.yt_session;

  let session = null;
  if (sessionId) {
    const raw = await env.YOUTUBE_SESSIONS.get(sessionId);
    if (raw) session = JSON.parse(raw);
  }

  const html = page({
    connected: !!session,
    channelTitle: session?.channel_title,
    channelThumbnail: session?.channel_thumbnail,
  });

  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
