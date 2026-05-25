// Edwards Carriers — Transport Requirements Calculator
// Real-world DOT formulas

const CHAIN_WLL = 6600; // lbs — standard chain Working Load Limit

export function calcTransport({ weightLbs, widthStr, heightStr, trailerType }) {
  const weight = parseFloat(String(weightLbs).replace(/,/g, "")) || 0;
  const width  = parseFtIn(widthStr);
  const height = parseFtIn(heightStr);

  const permits  = [];
  const escorts  = [];
  const notes    = [];

  // ── PERMITS ────────────────────────────────────────────────────────────────
  // Overheight — double drop RGN, machinery deck ~18 in off ground
  // anything above 12'4" on a double drop needs overheight permit
  const isDoubleDropRGN = /double.?drop|rgn/i.test(trailerType || "");
  if (isDoubleDropRGN && height > 12.33) {
    permits.push("Overheight Permit (height exceeds 12'4\" on double drop RGN)");
  }

  // Overwidth
  if (width > 8.5 && width <= 11.92) {
    permits.push("Overwidth Permit (width 8'6\" – 11'11\")");
  } else if (width > 11.92) {
    permits.push("Overwidth Permit (width exceeds 11'11\")");
  }

  // Overweight
  if (weight > 44000) {
    permits.push("Overweight Permit (weight exceeds 44,000 lbs)");
  }

  // ── ESCORTS ────────────────────────────────────────────────────────────────
  if (height > 13) {
    escorts.push("Escort Required — height exceeds 13'");
  }
  if (width > 12) {
    escorts.push("Escort Required — width exceeds 12'");
  }
  if (weight >= 120000) {
    escorts.push("Escort Required — weight 120,000+ lbs");
  }

  // ── CHAINS & BINDERS ───────────────────────────────────────────────────────
  let chainCount = 0;
  let chainNote  = "No chains required (under 10,000 lbs)";

  if (weight > 10000) {
    const minWLL    = weight * 0.5;           // 50% of cargo weight
    const byWLL     = Math.ceil(minWLL / CHAIN_WLL); // chains needed to meet WLL
    chainCount      = Math.max(4, byWLL);     // minimum 4 per DOT
    const totalWLL  = chainCount * CHAIN_WLL;
    chainNote = `${chainCount} chains @ ${CHAIN_WLL.toLocaleString()} lbs WLL each = ${totalWLL.toLocaleString()} lbs total WLL (50% of ${weight.toLocaleString()} lbs = ${minWLL.toLocaleString()} lbs required)`;
  }

  // ── OVERHANG ───────────────────────────────────────────────────────────────
  notes.push("Allowable rear overhang: 2–4 ft");

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  return {
    permits:    permits.length  ? permits  : ["No permits required"],
    escorts:    escorts.length  ? escorts  : ["No escort required"],
    chainCount,
    chainNote,
    chainWLL:   CHAIN_WLL,
    notes,
  };
}

// Parse "13 ft 6 in" or "13'6\"" or "13.5" → decimal feet
function parseFtIn(str) {
  if (!str) return 0;
  str = String(str).trim();

  // decimal feet already
  if (/^\d+(\.\d+)?$/.test(str)) return parseFloat(str);

  // "13 ft 6 in" or "13 ft" or "6 in"
  const ftIn = str.match(/(\d+)\s*ft\s*(\d+)?\s*in?/i);
  if (ftIn) {
    return parseInt(ftIn[1]) + (parseInt(ftIn[2]) || 0) / 12;
  }

  // "13'6\"" or "13'"
  const apos = str.match(/(\d+)'(\d+)?/);
  if (apos) {
    return parseInt(apos[1]) + (parseInt(apos[2]) || 0) / 12;
  }

  return parseFloat(str) || 0;
}
