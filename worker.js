// Cloudflare Workers entry point
// wrangler.toml で main = "worker.js" と設定してください

import html from './public/index.html';
import css from './public/style.css';
import js from './public/app.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Serve CSS
    if (url.pathname === '/style.css') {
      return new Response(css, {
        headers: { 'Content-Type': 'text/css; charset=utf-8' }
      });
    }

    // Serve JS
    if (url.pathname === '/app.js') {
      return new Response(js, {
        headers: { 'Content-Type': 'application/javascript; charset=utf-8' }
      });
    }

    // SPA fallback - serve index.html for all routes
    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
};