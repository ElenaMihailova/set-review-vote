# Set review vote

A page where colleagues compare each client's previous Instagram content ("Before") with the new 3×3 set ("After") and answer two questions: can we send it to the client, and is it better than before. Anyone with the link can vote after typing their name. Only the owner sees the results.

- `public/index.html` is the voting page. Client data and image paths are inlined; images are in `public/img/`.
- `public/results.html` is the results page. It asks for `RESULTS_KEY`.
- `api/vote.js`: `GET ?voterId=` returns a voter's own answers, `POST` saves them.
- `api/results.js`: `GET` with header `x-results-key` returns all votes.
- Votes are stored in Upstash Redis, in one hash `set-review:votes`.

## Deploy on Vercel

1. Import this repository in Vercel. No build settings are needed.
2. Storage → connect **Upstash for Redis** (free plan) to the project. This adds `KV_REST_API_URL` and `KV_REST_API_TOKEN`.
3. Settings → Environment Variables → add `RESULTS_KEY` (any password), then redeploy.
4. Voting page: `/`. Results: `/results.html`.

## Local preview

`npm run dev` serves the site at http://127.0.0.1:8792 with an in-memory store; the results key is `local`.
