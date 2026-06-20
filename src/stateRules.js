// Edwards Carriers — State OS/OW Rules Database
// Source: State DOT regulations 2025-2026
// Update every 6 months — verify before hauling

export const STATE_RULES = {
  AL: {"name":"Alabama","maxW":8.5,"maxH":13.5,"maxWt":80000,"escortW1":12,"escortW2":14,"sunday":false,"night":false,"notes":"2 escorts for 12'+ wide. No Sunday travel. No loads over 16' wide on interstates."},
  AK: {"name":"Alaska","maxW":8.5,"maxH":14,"maxWt":80000,"escortW1":12,"escortW2":14,"sunday":true,"night":false,"notes":"Verify with AK DOT for specific routes. Extreme weather restrictions common."},
  AZ: {"name":"Arizona","maxW":8.5,"maxH":14,"maxWt":80000,"escortW1":14,"escortW2":16,"sunday":true,"night":false,"notes":"Daylight travel only. Relatively permissive western state. 7-day travel allowed for moderate oversize."},
  AR: {"name":"Arkansas","maxW":8.5,"maxH":13.5,"maxWt":80000,"escortW1":12,"escortW2":14,"sunday":false,"night":false,"notes":"No Sunday travel. Daylight only. Escort for 12'+ wide."},
  CA: {"name":"California","maxW":8.5,"maxH":14,"maxWt":80000,"escortW1":14,"escortW2":15,"sunday":true,"night":false,"notes":"Very strict. Caltrans controls routing. LA/SF metro curfews. Permits valid 7 days. Loads 15'+ wide need Caltrans special approval."},
  CO: {"name":"Colorado","maxW":8.5,"maxH":14.5,"maxWt":80000,"escortW1":12,"escortW2":14,"sunday":true,"night":true,"notes":"Allows night travel for loads up to 12' wide with proper lights. 14'6 legal height. Mountain routes may restrict large loads."},
  CT: {"name":"Connecticut","maxW":8.5,"maxH":13.5,"maxWt":80000,"escortW1":12,"escortW2":14,"sunday":false,"night":false,"notes":"No weekend travel at all (Sat or Sun). Permits valid only 3 days. Rush hour curfews."},
  DE: {"name":"Delaware","maxW":8.5,"maxH":13.5,"maxWt":80000,"escortW1":10,"escortW2":12,"sunday":false,"night":false,"notes":"Escort for 10'+ on two-lane roads. No Sunday travel. Strict enforcement."},
  FL: {"name":"Florida","maxW":8.5,"maxH":13.5,"maxWt":80000,"escortW1":12,"escortW2":14,"sunday":false,"night":false,"notes":"No Sunday travel over 10' wide. No travel after noon on Saturdays before holidays. Miami corridor restrictions. Permits valid 10 days."},
  GA: {"name":"Georgia","maxW":8.5,"maxH":13.5,"maxWt":80000,"escortW1":12,"escortW2":14,"sunday":true,"night":false,"notes":"7-day daylight travel allowed. Atlanta rush-hour curfews. Permits valid 10 days."},
  HI: {"name":"Hawaii","maxW":8.5,"maxH":14,"maxWt":80000,"escortW1":12,"escortW2":14,"sunday":true,"night":false,"notes":"Island-specific routing. Verify with county DOT. Limited interstate travel."},
  ID: {"name":"Idaho","maxW":8.5,"maxH":14,"maxWt":80000,"escortW1":12,"escortW2":14,"sunday":true,"night":false,"notes":"Western state — generally more permissive. Daylight travel. Mountainous routes may restrict large loads."},
  IL: {"name":"Illinois","maxW":8.5,"maxH":13.5,"maxWt":80000,"escortW1":12,"escortW2":14,"sunday":false,"night":false,"notes":"No Sunday travel. Chicago metro has severe restrictions. No oversize on Chicago city streets without city permit. Permits valid 5 days."},
  IN: {"name":"Indiana","maxW":8.5,"maxH":13.5,"maxWt":80000,"escortW1":12,"escortW2":14,"sunday":false,"night":false,"notes":"Permits valid 15 days — one of the longest. Sunday by exception only. Over 134,000 lbs needs bridge analysis."},
  IA: {"name":"Iowa","maxW":8.5,"maxH":13.5,"maxWt":80000,"escortW1":12,"escortW2":14,"sunday":false,"night":false,"notes":"No Sunday travel for oversize. Spring weight restrictions Mar-May on secondary roads. Daylight only."},
  KS: {"name":"Kansas","maxW":8.5,"maxH":14,"maxWt":80000,"escortW1":12,"escortW2":14,"sunday":true,"night":false,"notes":"7-day travel allowed. Relatively flat and permissive. Daylight hours. Permits valid 10 days."},
  KY: {"name":"Kentucky","maxW":8.5,"maxH":13.5,"maxWt":80000,"escortW1":12,"escortW2":14,"sunday":true,"night":true,"notes":"One of few states allowing 24/7 travel for many loads. 10-day permits. Generally lenient."},
  LA: {"name":"Louisiana","maxW":8.5,"maxH":13.5,"maxWt":80000,"escortW1":12,"escortW2":14,"sunday":false,"night":false,"notes":"No Sunday travel. Permits charged per day (1-3 days max). Many low bridges on secondary routes."},
  ME: {"name":"Maine","maxW":8.5,"maxH":14,"maxWt":80000,"escortW1":12,"escortW2":14,"sunday":false,"night":false,"notes":"Height 13'6 on Maine Turnpike only. No Sunday oversize travel. Permits valid 7 days."},
  MD: {"name":"Maryland","maxW":8.5,"maxH":13.5,"maxWt":80000,"escortW1":13,"escortW2":14,"sunday":false,"night":false,"notes":"No Sunday over 12' wide. Rush-hour curfews Baltimore/DC. 2 escorts over 14'. Police escort for superloads. Permits valid 5 days."},
  MA: {"name":"Massachusetts","maxW":8.5,"maxH":13.5,"maxWt":80000,"escortW1":12,"escortW2":14,"sunday":false,"night":false,"notes":"No Sunday over 12' wide. Boston metro rush-hour curfews. State Police escort often required for large loads. Mass Pike has separate rules."},
  MI: {"name":"Michigan","maxW":8.5,"maxH":13.5,"maxWt":80000,"escortW1":12,"escortW2":14,"sunday":false,"night":false,"notes":"Unique weight system — axle-count based, can legally gross 164,000+ lbs with enough axles. No Sunday oversize travel. Winter storm halts."},
  MN: {"name":"Minnesota","maxW":8.5,"maxH":13.5,"maxWt":80000,"escortW1":12,"escortW2":14,"sunday":false,"night":false,"notes":"No Sunday travel for most oversize. Spring thaw restrictions Mar-May. Daylight only. Permits valid 5 days."},
  MS: {"name":"Mississippi","maxW":8.5,"maxH":13.5,"maxWt":80000,"escortW1":12,"escortW2":14,"sunday":false,"night":false,"notes":"No Sunday travel. Short 3-day permit window. Daylight only Mon-Sat."},
  MO: {"name":"Missouri","maxW":8.5,"maxH":13.5,"maxWt":80000,"escortW1":12,"escortW2":14,"sunday":true,"night":false,"notes":"Updated 2025 rules — allows loads up to 16' wide on weekends. Night travel up to 12'6 wide. 7-day daylight general. Permits via MoDOT Carrier Express."},
  MT: {"name":"Montana","maxW":8.5,"maxH":14,"maxWt":80000,"escortW1":12,"escortW2":14,"sunday":true,"night":false,"notes":"Western state, more permissive. Large open corridors. 7-day travel generally allowed. Permits valid 10 days."},
  NE: {"name":"Nebraska","maxW":8.5,"maxH":14,"maxWt":80000,"escortW1":12,"escortW2":14,"sunday":true,"night":false,"notes":"7-day travel for most loads. Flat terrain. Generally straightforward permitting. Permits valid 10 days."},
  NV: {"name":"Nevada","maxW":8.5,"maxH":14,"maxWt":80000,"escortW1":14,"escortW2":16,"sunday":true,"night":false,"notes":"Western state. High legal height (14'). Generally permissive. Las Vegas metro may have additional restrictions."},
  NH: {"name":"New Hampshire","maxW":8.5,"maxH":13.5,"maxWt":80000,"escortW1":12,"escortW2":14,"sunday":true,"night":false,"notes":"7-day travel no Sunday restriction for moderate loads. Many low bridges. Permits valid 5 days."},
  NJ: {"name":"New Jersey","maxW":8.5,"maxH":13.5,"maxWt":80000,"escortW1":10,"escortW2":14,"sunday":true,"night":false,"notes":"7-day if under 14' wide. Dense state — escort requirements lower threshold in some counties. NJ Turnpike and Garden State Parkway have restrictions. No holiday travel."},
  NM: {"name":"New Mexico","maxW":8.5,"maxH":14,"maxWt":80000,"escortW1":12,"escortW2":14,"sunday":true,"night":false,"notes":"Western state, permissive. High legal height (14'). 7-day daylight travel generally. Permits valid 5 days."},
  NY: {"name":"New York","maxW":8.5,"maxH":13.5,"maxWt":80000,"escortW1":12,"escortW2":14,"sunday":false,"night":false,"notes":"NYC has own permit system — often requires overnight moves with police escort. NY State: no Sunday over 14' wide. Upstate more lenient. Permits valid 5 days."},
  NC: {"name":"North Carolina","maxW":8.5,"maxH":13.5,"maxWt":80000,"escortW1":12,"escortW2":14,"sunday":true,"night":false,"notes":"Sunday allowed if under 10' wide. 10-day permits. Generally permissive for eastern routes. Mountain routes restrict large loads."},
  ND: {"name":"North Dakota","maxW":8.5,"maxH":14,"maxWt":80000,"escortW1":12,"escortW2":14,"sunday":true,"night":false,"notes":"Permissive western state. 7-day travel. Flat terrain. Spring thaw restrictions possible. Permits valid 10 days."},
  OH: {"name":"Ohio","maxW":8.5,"maxH":13.5,"maxWt":80000,"escortW1":13,"escortW2":14,"sunday":false,"night":false,"notes":"No Sunday over 10' wide or overweight. Rush-hour curfews in major metros. Many low overpasses on older routes. Permits valid 5 days."},
  OK: {"name":"Oklahoma","maxW":8.5,"maxH":13.5,"maxWt":80000,"escortW1":12,"escortW2":14,"sunday":true,"night":false,"notes":"7-day travel generally allowed. Permits valid 5 days. Escort for 12'+."},
  OR: {"name":"Oregon","maxW":8.5,"maxH":14,"maxWt":80000,"escortW1":12,"escortW2":14,"sunday":true,"night":false,"notes":"Western state. OSOW permits through ODOT. 7-day travel. Mountain routes may restrict. High legal height (14')."},
  PA: {"name":"Pennsylvania","maxW":8.5,"maxH":13.5,"maxWt":80000,"escortW1":13,"escortW2":14,"sunday":false,"night":false,"notes":"No Sunday travel over 10' wide or 85'+ long. PA Turnpike requires separate notification. Philadelphia/Pittsburgh rush-hour restrictions. Permits valid 5 days."},
  RI: {"name":"Rhode Island","maxW":8.5,"maxH":13.5,"maxWt":80000,"escortW1":12,"escortW2":14,"sunday":false,"night":false,"notes":"No Sunday, no travel after noon Saturday. Small state but strict. No holiday travel. Permits valid 5 days."},
  SC: {"name":"South Carolina","maxW":8.5,"maxH":13.5,"maxWt":80000,"escortW1":12,"escortW2":14,"sunday":false,"night":false,"notes":"No Sunday travel. Coastal route restrictions during peak summer. Permits valid 7 days."},
  SD: {"name":"South Dakota","maxW":8.5,"maxH":14,"maxWt":80000,"escortW1":12,"escortW2":14,"sunday":true,"night":false,"notes":"Permissive. 7-day travel. Flat terrain. High legal height (14'). Permits valid 10 days."},
  TN: {"name":"Tennessee","maxW":8.5,"maxH":13.5,"maxWt":80000,"escortW1":12.5,"escortW2":14,"sunday":false,"night":false,"notes":"No Sunday travel. Rush-hour curfews in city areas. On 2-lane roads escort at 10' wide. Height 15'+ needs front escort with height pole. Won't permit over 16' wide. Permits valid 6 days."},
  TX: {"name":"Texas","maxW":8.5,"maxH":14,"maxWt":80000,"escortW1":12,"escortW2":14,"sunday":true,"night":false,"notes":"Relatively permissive. TxPROS online permit system. Loads up to 18' wide with standard permit. 7-day travel. Permits valid 5 days. County road restrictions may apply."},
  UT: {"name":"Utah","maxW":8.5,"maxH":14,"maxWt":80000,"escortW1":12,"escortW2":14,"sunday":true,"night":false,"notes":"Western state. High legal height (14'). 7-day travel. Mountain routes may restrict. Permits valid 5 days."},
  VT: {"name":"Vermont","maxW":8.5,"maxH":13.5,"maxWt":80000,"escortW1":12,"escortW2":14,"sunday":true,"night":false,"notes":"10-day permits. Weekend travel if under 10' wide. Many two-lane rural roads. Seasonal winter restrictions. Mon-Fri only for large loads."},
  VA: {"name":"Virginia","maxW":8.5,"maxH":13.5,"maxWt":80000,"escortW1":12,"escortW2":14,"sunday":false,"night":false,"notes":"No Sunday oversize travel. 13-day permits — among the longest. Mountain highway restrictions. Low bridges in eastern VA for 14'4+ high loads."},
  WA: {"name":"Washington","maxW":8.5,"maxH":14,"maxWt":80000,"escortW1":12,"escortW2":14,"sunday":true,"night":false,"notes":"Western state. High legal height (14'). 7-day travel. WSDOT online permits. Mountain passes may restrict large loads seasonally."},
  WV: {"name":"West Virginia","maxW":8.5,"maxH":13.5,"maxWt":80000,"escortW1":12,"escortW2":14,"sunday":false,"night":false,"notes":"No Sunday travel. Mountainous — loads often restricted to interstates. Narrow local routes off-limits for large loads. Permits valid 5-10 days."},
  WI: {"name":"Wisconsin","maxW":8.5,"maxH":13.5,"maxWt":80000,"escortW1":12,"escortW2":14,"sunday":false,"night":false,"notes":"No Sunday travel for oversize. Spring thaw restrictions. Permits valid 5 days. Escort for 12'+ wide."},
  WY: {"name":"Wyoming","maxW":8.5,"maxH":14,"maxWt":80000,"escortW1":12,"escortW2":14,"sunday":true,"night":false,"notes":"Very permissive western state. High legal height (14'). 7-day travel. Large open corridors. Wind restrictions possible. Permits valid 5 days."},
};

export function calcRouteRequirements(states, widthFt, heightFt, weightLbs) {
  const w = parseFloat(String(widthFt).replace(/[^0-9.]/g,''))||0;
  const h = parseFloat(String(heightFt).replace(/[^0-9.]/g,''))||0;
  const wt = parseFloat(String(weightLbs).replace(/[,]/g,''))||0;

  return states.map(abbr => {
    const s = STATE_RULES[abbr];
    if(!s) return null;

    const permits = [];
    if(w > s.maxW) permits.push("Overwidth");
    if(h > s.maxH) permits.push("Overheight");
    if(wt > s.maxWt) permits.push("Overweight");

    let escort = "None";
    if(w >= s.escortW2) escort = "2 Pilot Cars";
    else if(w >= s.escortW1) escort = "1 Pilot Car";

    const restrictions = [];
    if(!s.sunday) restrictions.push("No Sunday travel");
    if(!s.night) restrictions.push("Daylight only");

    return {
      state: s.name,
      abbr,
      permits: permits.length ? permits : ["None"],
      permitsRequired: permits.length > 0,
      escort,
      restrictions,
      notes: s.notes,
      oversize_url: "https://oversize.io"
    };
  }).filter(Boolean);
}

// Parse "13 ft 6 in" or "13'6" or "13.5" to decimal feet
export function parseFeet(str) {
  if(!str) return 0;
  str = String(str).trim();
  if(/^\d+(\.\d+)?$/.test(str)) return parseFloat(str);
  const ftIn = str.match(/(\d+)\s*ft\s*(\d+)?\s*in?/i);
  if(ftIn) return parseInt(ftIn[1]) + (parseInt(ftIn[2])||0)/12;
  const apos = str.match(/(\d+)'(\d+)?/);
  if(apos) return parseInt(apos[1]) + (parseInt(apos[2])||0)/12;
  return parseFloat(str)||0;
}
