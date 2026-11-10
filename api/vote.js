import { getVote, saveVote, json } from "./_store.js";
import { CLIENT_IDS } from "./_clients.js";

const SEND = new Set(["yes", "edits", "no"]);
const BETTER = new Set(["better", "same", "worse"]);
const VOTER_ID = /^[A-Za-z0-9-]{8,64}$/;

// GET /api/vote?voterId=... — a voter's own saved answers, so they can continue later.
export async function GET(request) {
  const voterId = new URL(request.url).searchParams.get("voterId") || "";
  if (!VOTER_ID.test(voterId)) return json({ error: "Invalid voter id." }, 400);
  try {
    const vote = await getVote(voterId);
    return json({ name: vote?.name || "", answers: vote?.answers || {} });
  } catch (e) {
    return json({ error: e.message }, 503);
  }
}

// POST /api/vote { voterId, name, answers } — replaces this voter's answers.
export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "Body must be JSON." }, 400); }
  const voterId = String(body?.voterId || "");
  const name = String(body?.name || "").trim().slice(0, 60);
  if (!VOTER_ID.test(voterId)) return json({ error: "Invalid voter id." }, 400);
  if (!name) return json({ error: "Name is required." }, 400);

  const answers = {};
  for (const [cid, a] of Object.entries(body?.answers || {})) {
    if (!CLIENT_IDS.has(cid) || !a || typeof a !== "object") continue;
    answers[cid] = {
      send: SEND.has(a.send) ? a.send : null,
      better: BETTER.has(a.better) ? a.better : null,
      comment: String(a.comment || "").trim().slice(0, 2000),
    };
  }
  try {
    await saveVote(voterId, { name, answers, updatedAt: new Date().toISOString() });
    return json({ ok: true });
  } catch (e) {
    return json({ error: e.message }, 503);
  }
}
