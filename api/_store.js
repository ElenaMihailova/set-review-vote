// Votes live in one Redis hash: field = voter id, value = JSON { name, answers, updatedAt }.
// Vercel's Upstash Redis integration provides KV_REST_API_URL / KV_REST_API_TOKEN
// (older setups use UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN).
const KEY = "set-review:votes";

function config() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Vote storage is not connected (missing Redis REST URL/token).");
  return { url, token };
}

async function redis(command) {
  const { url, token } = config();
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) throw new Error(body.error || `Redis HTTP ${res.status}`);
  return body.result;
}

export async function getVote(voterId) {
  const raw = await redis(["HGET", KEY, voterId]);
  return raw ? JSON.parse(raw) : null;
}

export async function saveVote(voterId, vote) {
  await redis(["HSET", KEY, voterId, JSON.stringify(vote)]);
}

export async function allVotes() {
  const flat = (await redis(["HGETALL", KEY])) || [];
  const out = [];
  for (let i = 0; i < flat.length; i += 2) {
    try { out.push({ voterId: flat[i], ...JSON.parse(flat[i + 1]) }); } catch {}
  }
  return out;
}

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
