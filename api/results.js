import { timingSafeEqual } from "node:crypto";
import { allVotes, json } from "./_store.js";

function keyMatches(given) {
  const expected = process.env.RESULTS_KEY || "";
  if (!expected) return false;
  const a = Buffer.from(String(given));
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// GET /api/results with header "x-results-key" — every voter's answers, for the page owner only.
export async function GET(request) {
  if (!process.env.RESULTS_KEY) return json({ error: "RESULTS_KEY is not set in Vercel." }, 503);
  if (!keyMatches(request.headers.get("x-results-key") || "")) return json({ error: "Wrong key." }, 401);
  try {
    return json({ votes: await allVotes() });
  } catch (e) {
    return json({ error: e.message }, 503);
  }
}
