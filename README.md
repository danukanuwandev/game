# Mini Clash

## Mobile-to-PC multiplayer

GitHub Pages serves the game as static files, so it cannot safely store TURN API credentials. The Cloudflare Worker in `turn-worker.js` requests short-lived ICE credentials from Metered and keeps the API key on the server.

1. Create a Metered TURN account and note its app domain (for example, `your-app.metered.live`) and API key.
2. Replace `ALLOWED_ORIGIN` in `wrangler.toml` with the site's origin only (for example, `https://your-name.github.io`; do not include `/game`).
3. Replace `METERED_APP_DOMAIN` in `wrangler.toml` with the Metered app domain.
4. Install/login to Wrangler, then run `npx wrangler deploy` from the repository root.
5. Add the Metered API key as a Cloudflare Worker secret:

   ```powershell
   npx wrangler secret put METERED_API_KEY
   ```

6. Copy the deployed Worker URL and set it in the `turn-credentials-url` meta tag in `index.html`, ending with `/turn-credentials`.
7. Publish the updated `index.html` on GitHub Pages.

Keep `METERED_API_KEY` in the Cloudflare Worker secret store. Do not put it in `index.html` or commit it. The game can still try a direct STUN connection when the Worker URL is blank, but some mobile carrier networks require the TURN relay.
