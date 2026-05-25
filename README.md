# Edwards Carriers — Equipment Profiles
## Deployment Guide

### What this is
Equipment profile web app for edwardscarriers.com.
- 8 pre-built profiles with custom SVG diagrams
- AI Generate: type any machine name, get a full spec profile instantly
- Photo upload per machine
- Manual entry form as fallback
- Share / Instagram caption builder

---

### Step 1 — Push to GitHub

1. Create a new repo at github.com — name it `ec-equipment-profiles`
2. Upload all these files (drag and drop onto GitHub, or use GitHub Desktop)
3. Commit

---

### Step 2 — Connect to Netlify

1. Go to app.netlify.com
2. Click **Add new site → Import an existing project**
3. Choose GitHub → select `ec-equipment-profiles`
4. Build settings (should auto-detect from netlify.toml):
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Click **Deploy site**

---

### Step 3 — Add your Anthropic API Key

This is what makes AI Generate work.

1. In Netlify dashboard → **Site configuration → Environment variables**
2. Click **Add a variable**
3. Key: `ANTHROPIC_API_KEY`
4. Value: your Anthropic API key (from console.anthropic.com)
5. Click Save
6. Go to **Deploys → Trigger deploy** to rebuild with the key active

---

### Step 4 — Connect to edwardscarriers.com

1. In Netlify → **Domain management → Add custom domain**
2. Add: `equipment.edwardscarriers.com` (subdomain) OR point the full domain
3. Follow Netlify's DNS instructions (update your DNS at your registrar)

---

### How AI Generate works on the site

When you type a machine name and hit AI FILL:
- Your browser calls `/api/generate` on your own site
- Netlify routes that to `netlify/functions/generate.js`
- That function calls Anthropic with your API key (stored securely server-side — never exposed to the browser)
- Full profile returns in ~5 seconds

This is why it works on the site but not in the Claude artifact preview — the sandbox blocks outbound fetch calls.

---

### Adding your Anthropic API key

Get it at: https://console.anthropic.com/settings/keys
Cost: ~$0.01 per AI Generate call (very cheap)

---

### Files overview
```
equipment-profiles/
  netlify/
    functions/
      generate.js      ← server-side API proxy (secure)
  src/
    App.jsx            ← main React app
    main.jsx           ← React entry point
  index.html
  package.json
  vite.config.js
  netlify.toml         ← build + routing config
```
