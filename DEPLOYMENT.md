# MyScore Deployment Notes

## Goal

Use the same GitHub repository on both Netlify and Zebur without changing the Netlify environment variable setup.

## Unified API Path

The project now reserves a unified backend path:

- `/api/comment`

Platform mapping:

- Netlify: `/api/comment` is rewritten to `/.netlify/functions/comment`
- Zebur: `/api/comment` is handled directly by `server.js`

## Netlify

Keep the existing environment variables unchanged:

- `AI_API_KEY`

Optional:

- `AI_BASE_URL`
- `AI_MODEL`

Netlify uses [netlify.toml](/f:/Vibe%20Coding/MyScore/netlify.toml) to rewrite:

- `/api/comment` -> `/.netlify/functions/comment`

So the existing Netlify function and env var names remain valid.

## Zebur

Use the same environment variable names:

- `AI_API_KEY`

Optional:

- `AI_BASE_URL`
- `AI_MODEL`
- `PORT`
- `HOST`

Recommended start command:

```bash
npm start
```

Zebur will run [server.js](/f:/Vibe%20Coding/MyScore/server.js), which provides:

- `POST /api/comment`
- static file serving for the current single-page app

To reduce auto-detection failures on Zeabur, the repo now includes [zbpack.json](/f:/Vibe%20Coding/MyScore/zbpack.json), which explicitly sets:

- root app directory
- start command: `npm start`

## Current State

Right now the frontend has not been switched to `/api/comment` yet.

That means:

- your existing Netlify site keeps working as before
- the backend path unification is already prepared
- we can switch the frontend in the next step when you are ready
