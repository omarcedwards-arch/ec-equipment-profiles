import React, { useState, useEffect } from "react";
import { calcTransport } from "./transport.js";
import { STATE_RULES, calcRouteRequirements, parseFeet, RULES_LAST_UPDATED } from "./stateRules.js";

const SUPABASE_URL = "https://ugjyeuievnhrzbofmlyi.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnanlldWlldm5ocnpib2ZtbHlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NDk1OTEsImV4cCI6MjA5NjUyNTU5MX0.E5IyRVLBwy2Z1AK0v7o5mo30o1dtoOqIUigGwic3QIA";
const H = { "apikey": SUPABASE_KEY, "Authorization": "Bearer "+SUPABASE_KEY };

// Admin authentication
const auth = {
  getToken(){ return localStorage.getItem("ec_admin_token"); },
  getRefresh(){ return localStorage.getItem("ec_admin_refresh"); },
  isLoggedIn(){ return !!auth.getToken(); },
  async login(email, password){
    const res = await fetch(SUPABASE_URL+"/auth/v1/token?grant_type=password", {
      method:"POST",
      headers:{"apikey":SUPABASE_KEY,"Content-Type":"application/json"},
      body: JSON.stringify({email,password})
    });
    const data = await res.json();
    if(data.access_token){
      localStorage.setItem("ec_admin_token", data.access_token);
      localStorage.setItem("ec_admin_refresh", data.refresh_token);
      return true;
    }
    return false;
  },
  async refresh(){
    const refresh_token = auth.getRefresh();
    if(!refresh_token) return false;
    try{
      const res = await fetch(SUPABASE_URL+"/auth/v1/token?grant_type=refresh_token", {
        method:"POST",
        headers:{"apikey":SUPABASE_KEY,"Content-Type":"application/json"},
        body: JSON.stringify({refresh_token})
      });
      const data = await res.json();
      if(data.access_token){
        localStorage.setItem("ec_admin_token", data.access_token);
        localStorage.setItem("ec_admin_refresh", data.refresh_token);
        return true;
      }
    }catch{}
    auth.logout();
    return false;
  },
  logout(){
    localStorage.removeItem("ec_admin_token");
    localStorage.removeItem("ec_admin_refresh");
  }
};

// Headers for write operations - uses admin token if logged in, falls back to anon key
function AH(){
  const token = auth.getToken();
  return { "apikey": SUPABASE_KEY, "Authorization": "Bearer "+(token||SUPABASE_KEY) };
}

const db = {
  async getAll() {
    try {
      const res = await fetch(SUPABASE_URL+"/rest/v1/equipment_profiles?order=created_at.desc", { headers: H });
      return res.ok ? res.json() : [];
    } catch { return []; }
  },
  async insert(eq) {
    const res = await fetch(SUPABASE_URL+"/rest/v1/equipment_profiles", {
      method:"POST", headers:{...AH(),"Content-Type":"application/json","Prefer":"return=representation"},
      body: JSON.stringify(eq)
    });
    const data = await res.json();
    return Array.isArray(data) ? data[0] : data;
  },
  async update(id, fields) {
    const res = await fetch(SUPABASE_URL+"/rest/v1/equipment_profiles?id=eq."+id, {
      method:"PATCH", headers:{...AH(),"Content-Type":"application/json","Prefer":"return=representation"},
      body: JSON.stringify(fields)
    });
    return res.ok;
  },
  async remove(id) {
    const res = await fetch(SUPABASE_URL+"/rest/v1/equipment_profiles?id=eq."+id, {
      method:"DELETE", headers: AH()
    });
    return res.ok;
  },
  async uploadPhoto(file, equipmentId) {
    const ext = (file.name||"photo.jpg").split(".").pop();
    const path = equipmentId+"/"+Date.now()+"."+ext;
    const res = await fetch(SUPABASE_URL+"/storage/v1/object/Equipment-Photos/"+path, {
      method:"POST", headers:{...AH(),"Content-Type":file.type||"image/jpeg"},
      body: file
    });
    if(!res.ok) return null;
    return SUPABASE_URL+"/storage/v1/object/public/Equipment-Photos/"+path;
  },
  async getPhotos(equipmentId) {
    try {
      const res = await fetch(SUPABASE_URL+"/rest/v1/equipment_photos?equipment_id=eq."+equipmentId+"&order=created_at.desc", { headers: H });
      return res.ok ? res.json() : [];
    } catch { return []; }
  },
  async insertPhoto(equipmentId, url, isPrimary) {
    try {
      const res = await fetch(SUPABASE_URL+"/rest/v1/equipment_photos", {
        method:"POST", headers:{...AH(),"Content-Type":"application/json","Prefer":"return=representation"},
        body: JSON.stringify({ equipment_id: equipmentId, url, is_primary: isPrimary })
      });
      if(!res.ok){
        const err = await res.text();
        console.error("insertPhoto error:", err);
        return false;
      }
      return true;
    } catch(e){ console.error(e); return false; }
  },
  async deletePhoto(photoId) {
    const res = await fetch(SUPABASE_URL+"/rest/v1/equipment_photos?id=eq."+photoId, {
      method:"DELETE", headers: AH()
    });
    return res.ok;
  },
  async getLogs(equipmentId) {
    try {
      const res = await fetch(SUPABASE_URL+"/rest/v1/load_logs?equipment_id=eq."+equipmentId+"&order=haul_date.desc,created_at.desc", { headers: H });
      return res.ok ? res.json() : [];
    } catch { return []; }
  },
  async insertLog(log) {
    const res = await fetch(SUPABASE_URL+"/rest/v1/load_logs", {
      method:"POST", headers:{...AH(),"Content-Type":"application/json","Prefer":"return=representation"},
      body: JSON.stringify(log)
    });
    return res.ok;
  },
  async deleteLog(id) {
    const res = await fetch(SUPABASE_URL+"/rest/v1/load_logs?id=eq."+id, {
      method:"DELETE", headers: AH()
    });
    return res.ok;
  },
  async updateNotes(id, notes) {
    const res = await fetch(SUPABASE_URL+"/rest/v1/equipment_profiles?id=eq."+id, {
      method:"PATCH", headers:{...AH(),"Content-Type":"application/json"},
      body: JSON.stringify({notes})
    });
    return res.ok;
  }
};



const AI_SYSTEM = `You are a heavy haul trucking and construction equipment expert with 20 years of experience. Generate a COMPLETE, DETAILED, ACCURATE equipment profile. Return ONLY raw JSON, no markdown, no backticks, no extra text.

Schema exactly:
{"name":"","manufacturer":"","category":"","year":"","tagline":"","diagramType":"excavator|telehandler|crane|dozer|generic","keySpecs":[{"label":"","value":"","icon":""}],"dimensions":{},"transportInfo":{},"haulerNote":"","history":"","tags":[]}

CRITICAL RULES:
- Use lbs and ft/in only. Be precise to the exact model.
- keySpecs: include ALL of these if applicable: Operating Weight, Engine Power, Max Dig Depth, Boom Length, Bucket Capacity, Max Lift Capacity, Max Lift Height, Overall Length, Overall Width, Overall Height, Ground Clearance, Travel Speed, Blade Capacity, Max Tip Height. Use real manufacturer specs.
- dimensions: use EXACTLY these key names where applicable: "Equipment Length", "Equipment Width", "Equipment Height", "Equipment Weight", "Ground Clearance", "Track Width", "Track Gauge", "Turning Radius", "Tire Size". Always use full labels — never abbreviate to just "Length" or "Width". Use "Equipment" not "Transport" for machine dimensions since transport height varies by trailer.
- transportInfo: include ALL of these fields:
  "Trailer Type": most appropriate from [RGN / Lowboy, Multi-Axle Lowboy, Flatbed, Step Deck, Double Drop, Extendable RGN, Multi-Trailer Convoy],
  "Lowboy Tonnage": most appropriate from [35 Ton Lowboy, 40 Ton Lowboy, 50-55 Ton Lowboy] or "N/A",
  "Permits Required": accurate assessment from [None, Overheight, Overwidth, Overweight, Overheight + Overwidth, Overheight + Overweight, Overwidth + Overweight, All Permits],
  "Escort Required": accurate from [None, 1 Pilot Car, 2 Pilot Cars, Police Escort, Police + Pilot Cars],
  "Chains Required": calculate exactly — minimum 4 chains DOT required over 10,000 lbs, total WLL must equal 50% of cargo weight at 6600 lbs WLL per chain. Show the math e.g. "6 chains @ 6,600 lbs WLL = 39,600 lbs (50% of 78,000 lbs = 39,000 lbs required)",
  "Recommended Axles": specific axle configuration,
  "Exhaust Bag Required": "Yes" or "No",
  "Boom Securement": "Yes" if machine has a boom, arm, or mast that requires securing for transport, otherwise "No",
  "Rear Overhang": allowable rear overhang note
- haulerNote: write 2-3 sentences of REAL practical advice a heavy haul dispatcher would give — what to watch out for, what needs to be removed or secured, bridge or route considerations.
- history: write 3-4 sentences of genuine manufacturer and model history — when it was introduced, what it replaced, what it is known for, who uses it.
- tagline: one punchy descriptive line about what makes this machine notable.
- tags: 5 relevant industry tags.`;


// Storage helpers using localStorage
const store = {
  async set(key, value) { try { localStorage.setItem(key, value); } catch(e) { console.error(e); } },
  async get(key) { const v = localStorage.getItem(key); return v ? { value: v } : null; },
  async delete(key) { localStorage.removeItem(key); },
  async list(prefix) {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) keys.push(k);
    }
    return { keys };
  }
};

const slug = n => n.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");

function resizeToBase64(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        // Cap longest side at 1600px, preserve aspect ratio, high quality
        const maxDim = 1600;
        const scale = Math.min(maxDim/img.width, maxDim/img.height, 1);
        const c = document.createElement("canvas");
        c.width = Math.round(img.width*scale); c.height = Math.round(img.height*scale);
        const ctx = c.getContext("2d");
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img,0,0,c.width,c.height);
        resolve(c.toDataURL("image/jpeg",0.9));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function buildFeedCaption(eq) {
  const w = eq.keySpecs?.find(s=>s.label==="Operating Weight")?.value||"";
  const p = eq.keySpecs?.find(s=>s.label==="Engine Power")?.value||"";
  const trailer = eq.transportInfo?.["Trailer Type"]||"Lowboy / RGN";
  const permits = eq.transportInfo?.["Permits Required"]||"";
  const escort = eq.transportInfo?.["Escort Required"]||"";
  const tags = (eq.tags||[]).map(t=>"#"+t.replace(/\s+/g,"")).join(" ");
  const lines = [
    "EQUIPMENT SPOTLIGHT",
    eq.name.toUpperCase(),
    "",
    eq.tagline,
    "",
    "⚖️  " + w,
    "⚙️  " + p,
    "🚛  " + trailer,
  ];
  if(permits && permits !== "None") lines.push("📋  Permits: " + permits);
  if(escort && escort !== "None") lines.push("🚨  Escort: " + escort);
  lines.push("");
  lines.push("Edwards Carriers — Open Deck · Heavy Haul · Specialized");
  lines.push("48 States · edwardscarriers.com");
  lines.push("");
  const topTags = (eq.tags||[]).slice(0,2).map(t=>"#"+t.replace(/\s+/g,""));
  lines.push([...topTags,"#HeavyHaul","#EdwardsCarriers","#OpenDeck"].slice(0,5).join(" "));
  return lines.join("\n");
}

function getMfgHandle(manufacturer) {
  const handles = {
    "Caterpillar": "@caterpillar",
    "Komatsu": "@komatsu_global",
    "Liebherr": "@liebherr_group",
    "John Deere": "@johndeere",
    "Volvo": "@volvoce",
    "Hitachi": "@hitachicm_global",
    "Manitou": "@manitougroup",
    "Grove": "@manitowoccranes",
    "Manitowoc": "@manitowoccranes",
    "Terex": "@terex_corporation",
    "Link-Belt": "@linkbeltcranes",
    "Tadano": "@tadano_global",
    "Liebherr Group": "@liebherr_group",
    "Caterpillar Inc.": "@caterpillar",
    "Komatsu Ltd.": "@komatsu_global",
    "Manitowoc Grove": "@manitowoccranes",
  };
  if(!manufacturer) return "";
  for(const [key, handle] of Object.entries(handles)) {
    if(manufacturer.toLowerCase().includes(key.toLowerCase())) return handle;
  }
  return "";
}

function buildStoryCaption(eq) {
  const w = eq.keySpecs?.find(s=>s.label==="Operating Weight")?.value||"";
  const trailer = eq.transportInfo?.["Trailer Type"]||"Lowboy / RGN";
  const handle = getMfgHandle(eq.manufacturer);
  const lines = [
    "Just picked up a " + eq.name + " 🔥",
    "",
    "⚖️ " + w,
    "🚛 " + trailer,
    "📍 48 States",
    "",
    "Need it moved? Link in bio 👇",
    "edwardscarriers.com",
  ];
  if(handle) lines.push("", handle);
  return lines.join("\n");
}


const PREBUILT = [
  { name:"Manitou MRT 3060", manufacturer:"Manitou Group", category:"Rotating Telehandler", year:"2021-Present", tagline:"3 Machines in 1 — Telescopic Handler · Winch · Aerial Work Platform", diagramType:"telehandler", keySpecs:[{label:"Max Lift Capacity",value:"13,228 lbs",icon:"🏗️"},{label:"Max Lift Height",value:"98 ft",icon:"📏"},{label:"Max Horizontal Reach",value:"85 ft",icon:"↔️"},{label:"Operating Weight",value:"48,061 lbs",icon:"⚖️"},{label:"Engine Power",value:"173 HP",icon:"⚙️"},{label:"Overall Width",value:"8 ft 2 in",icon:"📐"},{label:"Ground Clearance",value:"14 in",icon:"🛞"},{label:"Rotation",value:"360°",icon:"🔄"}], dimensions:{"Equipment Length":"~39 ft","Equipment Width":"8 ft 2 in","Equipment Height":"~12 ft","Ground Clearance":"14 in","Turning Radius":"14 ft 4 in"}, transportInfo:{"Trailer Type":"RGN - 3 Axle","Lowboy Tonnage":"40 Ton Lowboy","Permits Required":"Overweight","Escort Required":"None","Chains Required":"4 chains minimum","Recommended Axles":"3-4 Axle"}, haulerNote:"At 48,061 lbs requires lowboy or RGN. Confirm boom retracted and stabilizers secured. Permits required all 48 states.", history:"The Manitou MRT 3060 is part of Manitou Group's flagship rotating telehandler lineup. Founded in 1958 in France, Manitou pioneered the all-terrain telescopic handler.\n\nThe MRT 3060 is built for heavy construction, wind energy, and industrial applications. Its 360 degree cabin rotation means the operator never has to reposition the machine.", tags:["Telescopic Handler","Wind Energy","Heavy Construction","Industrial Lifting","360 Rotation"] },
  { name:"Caterpillar 390F Excavator", manufacturer:"Caterpillar Inc.", category:"Large Hydraulic Excavator", year:"2013-2019", tagline:"CAT flagship large excavator — built for mass excavation and heavy digging", diagramType:"excavator", keySpecs:[{label:"Operating Weight",value:"194,230 lbs",icon:"⚖️"},{label:"Engine Power",value:"513 HP",icon:"⚙️"},{label:"Max Dig Depth",value:"27 ft 10 in",icon:"📏"},{label:"Boom Length",value:"23 ft 3 in",icon:"🦾"},{label:"Overall Length",value:"47 ft 2 in",icon:"📐"},{label:"Overall Width",value:"13 ft 2 in",icon:"↔️"},{label:"Overall Height",value:"15 ft 9 in",icon:"⬆️"},{label:"Bucket Capacity",value:"6.5 cu yd",icon:"🪣"}], dimensions:{"Equipment Length":"47 ft 2 in","Equipment Width":"13 ft 2 in","Equipment Height":"15 ft 9 in","Ground Clearance":"22 in","Track Width":"31.5 in"}, transportInfo:{"Trailer Type":"RGN - 4 Axle","Lowboy Tonnage":"50-55 Ton Lowboy","Permits Required":"Overwidth + Overweight","Escort Required":"1 Pilot Car","Chains Required":"15 chains (50% of 194,230 lbs)","Recommended Axles":"5-7 Axle"}, haulerNote:"At 97 tons boom and arm must be removed for transport. Counterweight typically removed separately. Verify bridge postings on route.", history:"The Caterpillar 390F is one of CAT's largest production excavators, part of a lineage from the 1970s. It has been the machine of choice for major infrastructure, mining, and mass grading projects worldwide.\n\nThe 390F introduced enhanced fuel efficiency through CAT's ACERT engine technology. A regular sight on highway construction, dam projects, and large commercial developments.", tags:["Mass Excavation","Highway Construction","Infrastructure","Mining Support","Heavy Earthmoving"] },
  { name:"Caterpillar D11 Dozer", manufacturer:"Caterpillar Inc.", category:"Large Track-Type Tractor", year:"1986-Present", tagline:"The world's largest production dozer — built to move mountains", diagramType:"dozer", keySpecs:[{label:"Operating Weight",value:"230,000 lbs",icon:"⚖️"},{label:"Engine Power",value:"935 HP",icon:"⚙️"},{label:"Blade Capacity",value:"45 cu yd",icon:"🪣"},{label:"Overall Length",value:"37 ft 2 in",icon:"📐"},{label:"Overall Width",value:"20 ft 1 in",icon:"↔️"},{label:"Overall Height",value:"13 ft 9 in",icon:"⬆️"},{label:"Ground Clearance",value:"26 in",icon:"🛞"},{label:"Travel Speed",value:"6.5 mph",icon:"🚀"}], dimensions:{"Equipment Length":"37 ft 2 in","Equipment Width":"20 ft 1 in","Equipment Height":"13 ft 9 in","Ground Clearance":"26 in","Track Gauge":"10 ft 11 in"}, transportInfo:{"Trailer Type":"RGN - 4 Axle","Lowboy Tonnage":"50-55 Ton Lowboy","Permits Required":"All Permits","Escort Required":"2 Pilot Cars","Chains Required":"18 chains (50% of 230,000 lbs)","Recommended Axles":"7-9 Axle"}, haulerNote:"At 115 tons blade ships as a separate load. Track shoes may need removal for width restrictions. Almost always requires a route survey.", history:"The Caterpillar D11 is the largest production dozer in the world in continuous production since 1986. Designed for mining and large-scale earthmoving it pushes more dirt per hour than any other machine in its class.\n\nOperators in coal mines oil sands and large quarry operations rely on the D11 as the backbone of their push-and-load cycles.", tags:["Mining","Coal Operations","Mass Earthmoving","Oil Sands","Quarry Operations"] },
  { name:"Liebherr LTM 1500 Crane", manufacturer:"Liebherr Group", category:"All-Terrain Mobile Crane", year:"2010-Present", tagline:"500-ton all-terrain crane — maximum reach minimum setup time", diagramType:"crane", keySpecs:[{label:"Max Lift Capacity",value:"1,102,311 lbs",icon:"🏗️"},{label:"Main Boom Length",value:"295 ft",icon:"📏"},{label:"Max Tip Height",value:"394 ft",icon:"⬆️"},{label:"Operating Weight",value:"264,555 lbs",icon:"⚖️"},{label:"Engine Power",value:"680 HP",icon:"⚙️"},{label:"Transport Width",value:"10 ft 4 in",icon:"↔️"},{label:"Drive Config",value:"8x8x8",icon:"🛞"},{label:"Travel Speed",value:"50 mph",icon:"🚀"}], dimensions:{"Carrier Length":"65 ft 7 in","Equipment Width":"10 ft 4 in","Equipment Height":"13 ft 3 in","Ground Clearance":"18 in","Turning Radius":"46 ft"}, transportInfo:{"Trailer Type":"RGN - 4 Axle","Lowboy Tonnage":"50-55 Ton Lowboy","Permits Required":"All Permits","Escort Required":"Police + Pilot Cars","Chains Required":"Multi-trailer convoy — verify per load","Recommended Axles":"Multi-trailer convoy"}, haulerNote:"An LTM 1500 convoy typically involves 8-12 loads. Carrier self-drives but boom sections require dedicated lowboys.", history:"The Liebherr LTM 1500-8.1 is an 8-axle all-terrain crane capable of lifting 500 metric tons while remaining road-mobile. Liebherr founded in 1949 in Germany.\n\nPrized in wind energy for turbine erection at remote sites. Its VarioBase outrigger system allows asymmetric rigging for tight jobsite conditions.", tags:["Wind Energy","Bridge Construction","Industrial","500-Ton Capacity","All-Terrain"] },
  { name:"Komatsu PC800 Excavator", manufacturer:"Komatsu Ltd.", category:"Large Hydraulic Excavator", year:"2005-Present", tagline:"Komatsu's heavy hitter — built for production mining and mass excavation", diagramType:"excavator", keySpecs:[{label:"Operating Weight",value:"183,424 lbs",icon:"⚖️"},{label:"Engine Power",value:"565 HP",icon:"⚙️"},{label:"Max Dig Depth",value:"25 ft 2 in",icon:"📏"},{label:"Boom Length",value:"22 ft 11 in",icon:"🦾"},{label:"Overall Length",value:"44 ft 7 in",icon:"📐"},{label:"Overall Width",value:"13 ft 1 in",icon:"↔️"},{label:"Overall Height",value:"15 ft 5 in",icon:"⬆️"},{label:"Bucket Capacity",value:"5.9 cu yd",icon:"🪣"}], dimensions:{"Equipment Length":"44 ft 7 in","Equipment Width":"13 ft 1 in","Equipment Height":"15 ft 5 in","Ground Clearance":"21 in","Track Width":"29.5 in"}, transportInfo:{"Trailer Type":"RGN - 4 Axle","Lowboy Tonnage":"50-55 Ton Lowboy","Permits Required":"Overwidth + Overweight","Escort Required":"1 Pilot Car","Chains Required":"15 chains (50% of 194,230 lbs)","Recommended Axles":"5-7 Axle"}, haulerNote:"At 91 tons boom and arm removal recommended for transport height restrictions. Counterweight removal recommended for weight distribution.", history:"The Komatsu PC800 is part of Komatsu's large excavator lineup refined since the 1970s. Komatsu founded in Japan in 1921 is the world's second-largest construction equipment manufacturer.\n\nEngineered for high-production mining support and large infrastructure projects.", tags:["Mining Support","Mass Excavation","Infrastructure","Production Mining","Large Earthmoving"] },
  { name:"Grove GMK6300L Crane", manufacturer:"Manitowoc Grove", category:"All-Terrain Mobile Crane", year:"2014-Present", tagline:"300-ton capacity on 6 axles — the ultimate job-site-ready crane", diagramType:"crane", keySpecs:[{label:"Max Lift Capacity",value:"661,387 lbs",icon:"🏗️"},{label:"Main Boom Length",value:"246 ft",icon:"📏"},{label:"Max Tip Height",value:"341 ft",icon:"⬆️"},{label:"Operating Weight",value:"183,865 lbs",icon:"⚖️"},{label:"Engine Power",value:"503 HP",icon:"⚙️"},{label:"Transport Width",value:"9 ft 10 in",icon:"↔️"},{label:"Drive Config",value:"6x6x6",icon:"🛞"},{label:"Travel Speed",value:"50 mph",icon:"🚀"}], dimensions:{"Carrier Length":"52 ft 6 in","Equipment Width":"9 ft 10 in","Equipment Height":"13 ft 1 in","Ground Clearance":"16 in","Turning Radius":"42 ft"}, transportInfo:{"Trailer Type":"RGN - 4 Axle","Lowboy Tonnage":"50-55 Ton Lowboy","Permits Required":"All Permits","Escort Required":"Police + Pilot Cars","Chains Required":"Multi-trailer convoy — verify per load","Recommended Axles":"Multi-load convoy"}, haulerNote:"The GMK6300L convoy typically runs 6-8 loads. Carrier is self-propelled. Boom sections and counterweights each require dedicated trailers.", history:"The Grove GMK6300L combines 300 metric tons of lifting capacity with a 6-axle carrier for excellent on-highway mobility. Grove has been manufacturing cranes since 1947.\n\nEarned its reputation in wind energy and petrochemical turnaround projects.", tags:["Wind Energy","Petrochemical","Industrial Lifting","300-Ton Capacity","All-Terrain"] },
  { name:"John Deere 850P Dozer", manufacturer:"John Deere", category:"Large Track-Type Dozer", year:"2010-Present", tagline:"Deere's largest production dozer — green muscle for big earthmoving", diagramType:"dozer", keySpecs:[{label:"Operating Weight",value:"117,000 lbs",icon:"⚖️"},{label:"Engine Power",value:"605 HP",icon:"⚙️"},{label:"Blade Capacity",value:"23.5 cu yd",icon:"🪣"},{label:"Overall Length",value:"28 ft 6 in",icon:"📐"},{label:"Overall Width",value:"16 ft 11 in",icon:"↔️"},{label:"Overall Height",value:"12 ft 8 in",icon:"⬆️"},{label:"Ground Clearance",value:"22 in",icon:"🛞"},{label:"Travel Speed",value:"7.5 mph",icon:"🚀"}], dimensions:{"Equipment Length":"28 ft 6 in","Equipment Width":"16 ft 11 in","Equipment Height":"12 ft 8 in","Ground Clearance":"22 in","Track Gauge":"9 ft 7 in"}, transportInfo:{"Trailer Type":"RGN - 3 Axle","Lowboy Tonnage":"50-55 Ton Lowboy","Permits Required":"Overwidth + Overweight","Escort Required":"1 Pilot Car","Chains Required":"9 chains (50% of 117,000 lbs)","Recommended Axles":"5-7 Axle"}, haulerNote:"Blade typically ships separately. Width at 16 ft 11 in requires oversize permits all states. Confirm track tension and lock blade before loading.", history:"The John Deere 850P represents the pinnacle of Deere's large crawler dozer lineup.\n\nWidely used in road construction and large residential development. SmartGrade GPS option makes it one of the most technologically advanced production dozers available.", tags:["Road Construction","Land Clearing","Large Earthmoving","SmartGrade GPS","Production Dozing"] },
  { name:"Liebherr R 9400 Excavator", manufacturer:"Liebherr Group", category:"Mining Excavator", year:"2011-Present", tagline:"Mining-grade backhoe built to load 150-ton haul trucks all day long", diagramType:"excavator", keySpecs:[{label:"Operating Weight",value:"880,000 lbs",icon:"⚖️"},{label:"Engine Power",value:"2,700 HP",icon:"⚙️"},{label:"Bucket Capacity",value:"26 cu yd",icon:"🪣"},{label:"Max Dig Depth",value:"28 ft 10 in",icon:"📏"},{label:"Overall Length",value:"68 ft",icon:"📐"},{label:"Overall Width",value:"26 ft 3 in",icon:"↔️"},{label:"Overall Height",value:"26 ft 3 in",icon:"⬆️"},{label:"Slew Speed",value:"3.7 rpm",icon:"🔄"}], dimensions:{"Equipment Length":"68 ft disassembled","Equipment Width":"26 ft 3 in","Equipment Height":"26 ft 3 in","Ground Clearance":"32 in","Track Width":"63 in"}, transportInfo:{"Trailer Type":"RGN - 4 Axle","Lowboy Tonnage":"50-55 Ton Lowboy","Permits Required":"All Permits","Escort Required":"Police + Pilot Cars","Chains Required":"Superload — verify per section","Recommended Axles":"Full disassembly required"}, haulerNote:"At 440 tons this is a superload and does NOT move intact. Full disassembly required. Multi-week multi-trailer project requiring detailed route survey.", history:"The Liebherr R 9400 is purpose-built for coal copper iron ore and oil sands operations where downtime costs tens of thousands per hour.\n\nLiebherr's mining excavator line has been at the forefront of large-scale extraction since the 1970s.", tags:["Mining","Coal Extraction","Oil Sands","Copper Mining","Superload"] },
];

function MRT3060Svg() {
  return (
    <svg viewBox="0 0 700 340" xmlns="http://www.w3.org/2000/svg" style={{width:"100%",height:"100%"}}>
      <rect width="700" height="340" fill="#f8f9fa"/>
      <line x1="20" y1="310" x2="680" y2="310" stroke="#c9a227" strokeWidth="1.5" strokeDasharray="8,5" opacity="0.5"/>
      <rect x="50" y="283" width="48" height="7" rx="2" fill="#e9ecef" stroke="#c9a227" strokeWidth="1.5"/>
      <line x1="74" y1="260" x2="74" y2="283" stroke="#c9a227" strokeWidth="4" strokeLinecap="round"/>
      <line x1="62" y1="246" x2="74" y2="260" stroke="#c9a227" strokeWidth="3" strokeLinecap="round"/>
      <rect x="590" y="283" width="48" height="7" rx="2" fill="#e9ecef" stroke="#c9a227" strokeWidth="1.5"/>
      <line x1="614" y1="260" x2="614" y2="283" stroke="#c9a227" strokeWidth="4" strokeLinecap="round"/>
      <line x1="626" y1="246" x2="614" y2="260" stroke="#c9a227" strokeWidth="3" strokeLinecap="round"/>
      <circle cx="165" cy="280" r="28" fill="#dee2e6" stroke="#c9a227" strokeWidth="2"/>
      <circle cx="165" cy="280" r="13" fill="#e9ecef" stroke="#1a3a5c" strokeWidth="1.5"/>
      <circle cx="165" cy="280" r="5" fill="#c9a227"/>
      <circle cx="470" cy="280" r="28" fill="#dee2e6" stroke="#c9a227" strokeWidth="2"/>
      <circle cx="470" cy="280" r="13" fill="#e9ecef" stroke="#1a3a5c" strokeWidth="1.5"/>
      <circle cx="470" cy="280" r="5" fill="#c9a227"/>
      <rect x="108" y="218" width="400" height="55" rx="7" fill="#e9ecef" stroke="#c9a227" strokeWidth="1.8"/>
      <rect x="118" y="228" width="380" height="35" rx="4" fill="#f1f3f5"/>
      <rect x="132" y="233" width="72" height="25" rx="3" fill="#dee2e6" stroke="#1a3a5c" strokeWidth="1"/>
      <rect x="416" y="233" width="72" height="25" rx="3" fill="#dee2e6" stroke="#1a3a5c" strokeWidth="1"/>
      <ellipse cx="318" cy="218" rx="76" ry="15" fill="#dee2e6" stroke="#c9a227" strokeWidth="1.5"/>
      <ellipse cx="318" cy="218" rx="48" ry="8" fill="#e9ecef" stroke="#c9a227" strokeWidth="1"/>
      <rect x="246" y="160" width="138" height="60" rx="6" fill="#e9ecef" stroke="#c9a227" strokeWidth="1.8"/>
      <rect x="254" y="168" width="122" height="44" rx="4" fill="#f1f3f5"/>
      <rect x="345" y="140" width="56" height="50" rx="5" fill="#dee2e6" stroke="#c9a227" strokeWidth="1.8"/>
      <rect x="352" y="147" width="42" height="27" rx="3" fill="#f8f9fa" stroke="#c9a227" strokeWidth="1.2"/>
      <line x1="373" y1="147" x2="373" y2="174" stroke="#c9a227" strokeWidth="0.8" opacity="0.5"/>
      <line x1="296" y1="170" x2="582" y2="58" stroke="#c9a227" strokeWidth="9" strokeLinecap="round"/>
      <line x1="296" y1="170" x2="582" y2="58" stroke="#c9a227" strokeWidth="5" strokeLinecap="round" opacity="0.4"/>
      <line x1="292" y1="177" x2="578" y2="65" stroke="#efefef" strokeWidth="3"/>
      <rect x="574" y="51" width="18" height="30" rx="2" fill="#c9a227" stroke="#c9a227" strokeWidth="1.5"/>
      <line x1="592" y1="59" x2="616" y2="59" stroke="#c9a227" strokeWidth="4" strokeLinecap="round"/>
      <line x1="592" y1="70" x2="616" y2="70" stroke="#c9a227" strokeWidth="4" strokeLinecap="round"/>
      <line x1="310" y1="190" x2="428" y2="142" stroke="#6c757d" strokeWidth="4" strokeLinecap="round" opacity="0.7"/>
      <circle cx="314" cy="188" r="5" fill="#c9a227"/>
      <circle cx="426" cy="143" r="5" fill="#c9a227"/>
      <circle cx="318" cy="188" r="19" fill="#1a3a5c" stroke="#c9a227" strokeWidth="1.5"/>
      <text x="318" y="184" fill="#c9a227" fontSize="7" fontFamily="monospace" textAnchor="middle" fontWeight="bold">360</text>
      <text x="318" y="194" fill="#c9a227" fontSize="7" fontFamily="monospace" textAnchor="middle">ROT</text>
      <line x1="642" y1="58" x2="642" y2="310" stroke="#c9a227" strokeWidth="1" strokeDasharray="5,4" opacity="0.6"/>
      <polygon points="642,53 638,63 646,63" fill="#c9a227"/>
      <polygon points="642,315 638,305 646,305" fill="#c9a227"/>
      <text x="652" y="188" fill="#c9a227" fontSize="9" fontFamily="monospace">98FT</text>
      <line x1="296" y1="328" x2="616" y2="328" stroke="#c9a227" strokeWidth="1" strokeDasharray="5,4" opacity="0.6"/>
      <polygon points="291,328 301,324 301,332" fill="#c9a227"/>
      <polygon points="621,328 611,324 611,332" fill="#c9a227"/>
      <text x="456" y="340" fill="#c9a227" fontSize="8" fontFamily="monospace" textAnchor="middle">85 FT REACH</text>
    </svg>
  );
}

function CAT390Svg() {
  return (
    <svg viewBox="0 0 700 340" xmlns="http://www.w3.org/2000/svg" style={{width:"100%",height:"100%"}}>
      <rect width="700" height="340" fill="#f8f9fa"/>
      <line x1="20" y1="310" x2="680" y2="310" stroke="#c9a227" strokeWidth="1.5" strokeDasharray="8,5" opacity="0.5"/>
      <rect x="58" y="252" width="296" height="48" rx="16" fill="#e9ecef" stroke="#c9a227" strokeWidth="2"/>
      <rect x="72" y="261" width="268" height="30" rx="10" fill="#dee2e6"/>
      {[86,113,140,167,194,221,248,275,302].map(x=>(
        <rect key={x} x={x} y="258" width="21" height="36" rx="3" fill="#e2e8f0" stroke="#c9a227" strokeWidth="0.6"/>
      ))}
      <circle cx="78" cy="276" r="20" fill="#e9ecef" stroke="#c9a227" strokeWidth="2"/>
      <circle cx="78" cy="276" r="10" fill="#dee2e6"/>
      <circle cx="332" cy="276" r="20" fill="#e9ecef" stroke="#c9a227" strokeWidth="2"/>
      <circle cx="332" cy="276" r="10" fill="#dee2e6"/>
      <rect x="58" y="204" width="72" height="50" rx="5" fill="#dee2e6" stroke="#c9a227" strokeWidth="1.5"/>
      <rect x="64" y="210" width="60" height="38" rx="3" fill="#e9ecef"/>
      <rect x="114" y="190" width="204" height="66" rx="8" fill="#e9ecef" stroke="#c9a227" strokeWidth="1.8"/>
      <rect x="122" y="198" width="188" height="50" rx="5" fill="#f1f3f5"/>
      <rect x="130" y="204" width="82" height="38" rx="3" fill="#dee2e6" stroke="#1a3a5c" strokeWidth="1"/>
      <rect x="274" y="168" width="58" height="56" rx="5" fill="#dee2e6" stroke="#c9a227" strokeWidth="1.8"/>
      <rect x="281" y="175" width="44" height="30" rx="3" fill="#f8f9fa" stroke="#c9a227" strokeWidth="1.2"/>
      <line x1="303" y1="175" x2="303" y2="205" stroke="#c9a227" strokeWidth="0.8" opacity="0.5"/>
      <line x1="202" y1="206" x2="430" y2="96" stroke="#c9a227" strokeWidth="10" strokeLinecap="round"/>
      <line x1="202" y1="206" x2="430" y2="96" stroke="#c9a227" strokeWidth="5" strokeLinecap="round" opacity="0.35"/>
      <line x1="198" y1="212" x2="426" y2="102" stroke="#efefef" strokeWidth="3"/>
      <line x1="430" y1="96" x2="552" y2="172" stroke="#c9a227" strokeWidth="7" strokeLinecap="round"/>
      <line x1="430" y1="96" x2="552" y2="172" stroke="#c9a227" strokeWidth="4" strokeLinecap="round" opacity="0.35"/>
      <path d="M552 172 Q582 186 576 216 Q564 234 542 222 Q524 206 534 178 Z" fill="#c9a227" stroke="#c9a227" strokeWidth="2"/>
      <line x1="542" y1="218" x2="552" y2="232" stroke="#c9a227" strokeWidth="2"/>
      <line x1="554" y1="213" x2="564" y2="226" stroke="#c9a227" strokeWidth="2"/>
      <line x1="564" y1="206" x2="574" y2="218" stroke="#c9a227" strokeWidth="2"/>
      <line x1="234" y1="196" x2="358" y2="144" stroke="#6c757d" strokeWidth="5" strokeLinecap="round" opacity="0.8"/>
      <circle cx="237" cy="194" r="6" fill="#c9a227"/>
      <circle cx="356" cy="145" r="6" fill="#c9a227"/>
      <line x1="430" y1="96" x2="494" y2="136" stroke="#6c757d" strokeWidth="4" strokeLinecap="round" opacity="0.8"/>
      <line x1="494" y1="136" x2="552" y2="172" stroke="#6c757d" strokeWidth="3" strokeLinecap="round" opacity="0.7"/>
      <line x1="616" y1="168" x2="616" y2="310" stroke="#c9a227" strokeWidth="1" strokeDasharray="5,4" opacity="0.6"/>
      <polygon points="616,163 612,173 620,173" fill="#c9a227"/>
      <polygon points="616,315 612,305 620,305" fill="#c9a227"/>
      <text x="628" y="243" fill="#c9a227" fontSize="8" fontFamily="monospace">15.75</text>
      <text x="628" y="255" fill="#c9a227" fontSize="8" fontFamily="monospace">FT HT</text>
      <line x1="58" y1="330" x2="354" y2="330" stroke="#c9a227" strokeWidth="1" strokeDasharray="5,4" opacity="0.6"/>
      <polygon points="53,330 63,326 63,334" fill="#c9a227"/>
      <polygon points="359,330 349,326 349,334" fill="#c9a227"/>
      <text x="206" y="342" fill="#c9a227" fontSize="8" fontFamily="monospace" textAnchor="middle">47 FT 2 IN LENGTH</text>
    </svg>
  );
}

function D11Svg() {
  return (
    <svg viewBox="0 0 700 340" xmlns="http://www.w3.org/2000/svg" style={{width:"100%",height:"100%"}}>
      <rect width="700" height="340" fill="#f8f9fa"/>
      <line x1="20" y1="308" x2="680" y2="308" stroke="#c9a227" strokeWidth="1.5" strokeDasharray="8,5" opacity="0.5"/>
      <rect x="52" y="236" width="494" height="62" rx="18" fill="#e9ecef" stroke="#c9a227" strokeWidth="2.2"/>
      <rect x="68" y="246" width="462" height="42" rx="12" fill="#dee2e6"/>
      {[84,118,152,186,220,254,288,322,356,390,424,458].map(x=>(
        <rect key={x} x={x} y="242" width="28" height="50" rx="4" fill="#e2e8f0" stroke="#c9a227" strokeWidth="0.7"/>
      ))}
      <circle cx="72" cy="267" r="24" fill="#e9ecef" stroke="#c9a227" strokeWidth="2.2"/>
      <circle cx="72" cy="267" r="12" fill="#dee2e6" stroke="#c9a227" strokeWidth="1"/>
      <circle cx="526" cy="267" r="24" fill="#e9ecef" stroke="#c9a227" strokeWidth="2.2"/>
      <circle cx="526" cy="267" r="12" fill="#dee2e6" stroke="#c9a227" strokeWidth="1"/>
      <rect x="108" y="168" width="346" height="72" rx="8" fill="#e9ecef" stroke="#c9a227" strokeWidth="1.8"/>
      <rect x="112" y="142" width="216" height="50" rx="6" fill="#dee2e6" stroke="#c9a227" strokeWidth="1.8"/>
      <rect x="120" y="150" width="200" height="34" rx="4" fill="#e9ecef"/>
      <line x1="172" y1="142" x2="172" y2="192" stroke="#c9a227" strokeWidth="1" opacity="0.4"/>
      <line x1="222" y1="142" x2="222" y2="192" stroke="#c9a227" strokeWidth="1" opacity="0.4"/>
      <line x1="272" y1="142" x2="272" y2="192" stroke="#c9a227" strokeWidth="1" opacity="0.4"/>
      <rect x="190" y="112" width="18" height="36" rx="3" fill="#dee2e6" stroke="#c9a227" strokeWidth="1.5"/>
      <ellipse cx="199" cy="112" rx="9" ry="4" fill="#e9ecef" stroke="#c9a227" strokeWidth="1"/>
      <rect x="352" y="126" width="94" height="82" rx="6" fill="#dee2e6" stroke="#c9a227" strokeWidth="2"/>
      <rect x="360" y="134" width="78" height="44" rx="4" fill="#f8f9fa" stroke="#c9a227" strokeWidth="1.2"/>
      <line x1="399" y1="134" x2="399" y2="178" stroke="#c9a227" strokeWidth="1" opacity="0.6"/>
      <rect x="362" y="184" width="72" height="14" rx="2" fill="#e9ecef" stroke="#c9a227" strokeWidth="1"/>
      <rect x="18" y="162" width="66" height="100" rx="5" fill="#c9a227" stroke="#c9a227" strokeWidth="2.2"/>
      <rect x="22" y="168" width="58" height="88" rx="3" fill="#c9a227" opacity="0.45"/>
      <line x1="18" y1="200" x2="6" y2="200" stroke="#c9a227" strokeWidth="3" strokeLinecap="round"/>
      <line x1="18" y1="232" x2="6" y2="232" stroke="#c9a227" strokeWidth="3" strokeLinecap="round"/>
      <line x1="84" y1="180" x2="148" y2="174" stroke="#8b6914" strokeWidth="5" strokeLinecap="round"/>
      <line x1="84" y1="252" x2="148" y2="244" stroke="#8b6914" strokeWidth="5" strokeLinecap="round"/>
      <circle cx="146" cy="174" r="6" fill="#c9a227"/>
      <circle cx="146" cy="244" r="6" fill="#c9a227"/>
      <rect x="466" y="210" width="28" height="56" rx="4" fill="#1a3a5c" stroke="#c9a227" strokeWidth="1.8"/>
      <path d="M480 266 L472 306 L488 306 Z" fill="#c9a227" stroke="#c9a227" strokeWidth="1.5"/>
      <path d="M490 266 L483 300 L498 300 Z" fill="#c9a227" stroke="#c9a227" strokeWidth="1.5"/>
      <rect x="450" y="194" width="62" height="18" rx="3" fill="#dee2e6" stroke="#c9a227" strokeWidth="1.2"/>
      <line x1="604" y1="126" x2="604" y2="308" stroke="#c9a227" strokeWidth="1" strokeDasharray="5,4" opacity="0.6"/>
      <polygon points="604,121 600,131 608,131" fill="#c9a227"/>
      <polygon points="604,313 600,303 608,303" fill="#c9a227"/>
      <text x="616" y="220" fill="#c9a227" fontSize="8" fontFamily="monospace">13.75</text>
      <text x="616" y="232" fill="#c9a227" fontSize="8" fontFamily="monospace">FT HT</text>
      <line x1="18" y1="328" x2="546" y2="328" stroke="#c9a227" strokeWidth="1" strokeDasharray="5,4" opacity="0.6"/>
      <polygon points="13,328 23,324 23,332" fill="#c9a227"/>
      <polygon points="551,328 541,324 541,332" fill="#c9a227"/>
      <text x="282" y="340" fill="#c9a227" fontSize="8" fontFamily="monospace" textAnchor="middle">37 FT 2 IN — WORLD LARGEST PRODUCTION DOZER</text>
    </svg>
  );
}

function LTM1500Svg() {
  return (
    <svg viewBox="0 0 700 340" xmlns="http://www.w3.org/2000/svg" style={{width:"100%",height:"100%"}}>
      <rect width="700" height="340" fill="#f8f9fa"/>
      <line x1="20" y1="308" x2="680" y2="308" stroke="#c9a227" strokeWidth="1.5" strokeDasharray="8,5" opacity="0.5"/>
      {[82,196,334,454,554].map(x=>(
        <g key={x}>
          <line x1={x} y1="286" x2={x-16} y2="286" stroke="#c9a227" strokeWidth="4" strokeLinecap="round"/>
          <line x1={x-16} y1="278" x2={x-16} y2="294" stroke="#c9a227" strokeWidth="4" strokeLinecap="round"/>
          <rect x={x-24} y="290" width="16" height="6" rx="2" fill="#c9a227"/>
        </g>
      ))}
      <rect x="46" y="245" width="578" height="50" rx="8" fill="#e9ecef" stroke="#c9a227" strokeWidth="2"/>
      <rect x="56" y="253" width="558" height="34" rx="5" fill="#f1f3f5"/>
      {[78,146,210,268,336,396,458,526].map(x=>(
        <g key={x}>
          <circle cx={x} cy={284} r={20} fill="#dee2e6" stroke="#c9a227" strokeWidth="1.8"/>
          <circle cx={x} cy={284} r={9} fill="#e9ecef" stroke="#1a3a5c" strokeWidth="1.5"/>
          <circle cx={x} cy={284} r={3} fill="#c9a227"/>
        </g>
      ))}
      <rect x="520" y="214" width="70" height="42" rx="5" fill="#dee2e6" stroke="#c9a227" strokeWidth="1.8"/>
      <rect x="527" y="220" width="56" height="26" rx="3" fill="#f8f9fa" stroke="#c9a227" strokeWidth="1.2"/>
      <rect x="196" y="186" width="166" height="60" rx="7" fill="#e9ecef" stroke="#c9a227" strokeWidth="1.8"/>
      <rect x="46" y="192" width="108" height="54" rx="5" fill="#dee2e6" stroke="#c9a227" strokeWidth="1.8"/>
      <rect x="54" y="200" width="92" height="38" rx="3" fill="#e9ecef"/>
      <line x1="80" y1="200" x2="80" y2="238" stroke="#c9a227" strokeWidth="1" opacity="0.4"/>
      <line x1="108" y1="200" x2="108" y2="238" stroke="#c9a227" strokeWidth="1" opacity="0.4"/>
      <rect x="332" y="160" width="52" height="46" rx="4" fill="#dee2e6" stroke="#c9a227" strokeWidth="1.8"/>
      <rect x="339" y="167" width="38" height="26" rx="2" fill="#f8f9fa" stroke="#c9a227" strokeWidth="1.2"/>
      <line x1="282" y1="194" x2="654" y2="36" stroke="#c9a227" strokeWidth="11" strokeLinecap="round"/>
      <line x1="282" y1="194" x2="654" y2="36" stroke="#c9a227" strokeWidth="6" strokeLinecap="round" opacity="0.3"/>
      <line x1="278" y1="200" x2="650" y2="42" stroke="#efefef" strokeWidth="3"/>
      {[0.2,0.4,0.6,0.8].map(t=>{
        const x=Math.round(282+t*372); const y=Math.round(194-t*158);
        return <line key={t} x1={x-5} y1={y+12} x2={x+5} y2={y-12} stroke="#1a3a5c" strokeWidth="1.5" opacity="0.6"/>;
      })}
      <line x1="654" y1="36" x2="682" y2="64" stroke="#c9a227" strokeWidth="3" strokeLinecap="round"/>
      <line x1="668" y1="49" x2="668" y2="188" stroke="#8b6914" strokeWidth="1.5" strokeDasharray="5,4"/>
      <path d="M661 188 Q668 201 675 188" stroke="#c9a227" fill="none" strokeWidth="3"/>
      <circle cx="668" cy="203" r="5" fill="#c9a227"/>
      <circle cx="282" cy="194" r="10" fill="#c9a227" stroke="#c9a227" strokeWidth="1.5"/>
      <line x1="44" y1="36" x2="44" y2="308" stroke="#c9a227" strokeWidth="1" strokeDasharray="5,4" opacity="0.6"/>
      <polygon points="44,31 40,41 48,41" fill="#c9a227"/>
      <polygon points="44,313 40,303 48,303" fill="#c9a227"/>
      <text x="10" y="178" fill="#c9a227" fontSize="8" fontFamily="monospace" transform="rotate(-90,20,178)">394 FT TIP HEIGHT</text>
      <line x1="282" y1="328" x2="654" y2="328" stroke="#c9a227" strokeWidth="1" strokeDasharray="5,4" opacity="0.6"/>
      <polygon points="277,328 287,324 287,332" fill="#c9a227"/>
      <polygon points="659,328 649,324 649,332" fill="#c9a227"/>
      <text x="468" y="340" fill="#c9a227" fontSize="8" fontFamily="monospace" textAnchor="middle">295 FT BOOM — 8 AXLE CRANE</text>
    </svg>
  );
}

function PC800Svg() {
  return (
    <svg viewBox="0 0 700 340" xmlns="http://www.w3.org/2000/svg" style={{width:"100%",height:"100%"}}>
      <rect width="700" height="340" fill="#f8f9fa"/>
      <line x1="20" y1="310" x2="680" y2="310" stroke="#c9a227" strokeWidth="1.5" strokeDasharray="8,5" opacity="0.5"/>
      <rect x="50" y="258" width="300" height="50" rx="16" fill="#e9ecef" stroke="#c9a227" strokeWidth="2"/>
      <rect x="64" y="267" width="272" height="32" rx="9" fill="#dee2e6"/>
      {[78,106,134,162,190,218,246,274,302].map(x=>(
        <rect key={x} x={x} y="264" width="22" height="38" rx="3" fill="#e2e8f0" stroke="#c9a227" strokeWidth="0.6"/>
      ))}
      <circle cx="70" cy="283" r="22" fill="#e9ecef" stroke="#c9a227" strokeWidth="2"/>
      <circle cx="70" cy="283" r="11" fill="#dee2e6"/>
      <circle cx="330" cy="283" r="22" fill="#e9ecef" stroke="#c9a227" strokeWidth="2"/>
      <circle cx="330" cy="283" r="11" fill="#dee2e6"/>
      <path d="M50 210 L50 258 L140 258 L154 210 Z" fill="#dee2e6" stroke="#c9a227" strokeWidth="1.5"/>
      <rect x="58" y="218" width="82" height="34" rx="2" fill="#e9ecef"/>
      <rect x="116" y="194" width="200" height="68" rx="7" fill="#e9ecef" stroke="#c9a227" strokeWidth="1.8"/>
      <rect x="124" y="202" width="184" height="52" rx="4" fill="#f1f3f5"/>
      <rect x="272" y="164" width="56" height="66" rx="4" fill="#dee2e6" stroke="#c9a227" strokeWidth="1.8"/>
      <rect x="279" y="171" width="42" height="38" rx="3" fill="#f8f9fa" stroke="#c9a227" strokeWidth="1.2"/>
      <rect x="277" y="214" width="46" height="10" rx="2" fill="#e9ecef" stroke="#c9a227" strokeWidth="1"/>
      <line x1="196" y1="208" x2="428" y2="96" stroke="#c9a227" strokeWidth="10" strokeLinecap="round"/>
      <line x1="196" y1="208" x2="428" y2="96" stroke="#c9a227" strokeWidth="5" strokeLinecap="round" opacity="0.35"/>
      <line x1="192" y1="214" x2="424" y2="102" stroke="#efefef" strokeWidth="3"/>
      <line x1="428" y1="96" x2="550" y2="174" stroke="#c9a227" strokeWidth="7" strokeLinecap="round"/>
      <line x1="428" y1="96" x2="550" y2="174" stroke="#c9a227" strokeWidth="4" strokeLinecap="round" opacity="0.35"/>
      <path d="M550 174 Q578 188 573 216 Q562 232 540 220 Q522 204 532 180 Z" fill="#c9a227" stroke="#c9a227" strokeWidth="2"/>
      <line x1="540" y1="216" x2="550" y2="230" stroke="#c9a227" strokeWidth="2"/>
      <line x1="552" y1="210" x2="563" y2="224" stroke="#c9a227" strokeWidth="2"/>
      <line x1="563" y1="204" x2="572" y2="216" stroke="#c9a227" strokeWidth="2"/>
      <line x1="226" y1="198" x2="350" y2="144" stroke="#6c757d" strokeWidth="5" strokeLinecap="round" opacity="0.8"/>
      <circle cx="228" cy="196" r="6" fill="#c9a227"/>
      <circle cx="348" cy="145" r="6" fill="#c9a227"/>
      <line x1="428" y1="96" x2="492" y2="138" stroke="#6c757d" strokeWidth="4" strokeLinecap="round" opacity="0.8"/>
      <line x1="492" y1="138" x2="550" y2="174" stroke="#6c757d" strokeWidth="3" strokeLinecap="round" opacity="0.7"/>
      <line x1="616" y1="164" x2="616" y2="310" stroke="#c9a227" strokeWidth="1" strokeDasharray="5,4" opacity="0.6"/>
      <polygon points="616,159 612,169 620,169" fill="#c9a227"/>
      <polygon points="616,315 612,305 620,305" fill="#c9a227"/>
      <text x="628" y="241" fill="#c9a227" fontSize="8" fontFamily="monospace">15.4</text>
      <text x="628" y="253" fill="#c9a227" fontSize="8" fontFamily="monospace">FT HT</text>
      <line x1="50" y1="330" x2="352" y2="330" stroke="#c9a227" strokeWidth="1" strokeDasharray="5,4" opacity="0.6"/>
      <polygon points="45,330 55,326 55,334" fill="#c9a227"/>
      <polygon points="357,330 347,326 347,334" fill="#c9a227"/>
      <text x="201" y="342" fill="#c9a227" fontSize="8" fontFamily="monospace" textAnchor="middle">44 FT 7 IN LENGTH</text>
    </svg>
  );
}

function GMK6300Svg() {
  return (
    <svg viewBox="0 0 700 340" xmlns="http://www.w3.org/2000/svg" style={{width:"100%",height:"100%"}}>
      <rect width="700" height="340" fill="#f8f9fa"/>
      <line x1="20" y1="308" x2="680" y2="308" stroke="#c9a227" strokeWidth="1.5" strokeDasharray="8,5" opacity="0.5"/>
      {[92,228,376,510].map(x=>(
        <g key={x}>
          <line x1={x} y1="290" x2={x-15} y2="290" stroke="#c9a227" strokeWidth="4" strokeLinecap="round"/>
          <line x1={x-15} y1="282" x2={x-15} y2="298" stroke="#c9a227" strokeWidth="4" strokeLinecap="round"/>
          <rect x={x-23} y="294" width="16" height="5" rx="2" fill="#c9a227"/>
        </g>
      ))}
      <rect x="58" y="249" width="492" height="50" rx="8" fill="#e9ecef" stroke="#c9a227" strokeWidth="2"/>
      <rect x="68" y="257" width="472" height="34" rx="5" fill="#f1f3f5"/>
      {[92,162,228,308,378,448].map(x=>(
        <g key={x}>
          <circle cx={x} cy={288} r={20} fill="#dee2e6" stroke="#c9a227" strokeWidth="1.8"/>
          <circle cx={x} cy={288} r={9} fill="#e9ecef" stroke="#1a3a5c" strokeWidth="1.5"/>
          <circle cx={x} cy={288} r={3} fill="#c9a227"/>
        </g>
      ))}
      <rect x="482" y="218" width="68" height="42" rx="5" fill="#dee2e6" stroke="#c9a227" strokeWidth="1.8"/>
      <rect x="489" y="224" width="54" height="26" rx="3" fill="#f8f9fa" stroke="#c9a227" strokeWidth="1.2"/>
      <rect x="188" y="190" width="162" height="60" rx="7" fill="#e9ecef" stroke="#c9a227" strokeWidth="1.8"/>
      <rect x="58" y="196" width="104" height="54" rx="5" fill="#dee2e6" stroke="#c9a227" strokeWidth="1.8"/>
      <rect x="66" y="204" width="88" height="38" rx="3" fill="#e9ecef"/>
      <line x1="82" y1="204" x2="82" y2="242" stroke="#c9a227" strokeWidth="1" opacity="0.4"/>
      <line x1="110" y1="204" x2="110" y2="242" stroke="#c9a227" strokeWidth="1" opacity="0.4"/>
      <rect x="322" y="164" width="52" height="48" rx="4" fill="#dee2e6" stroke="#c9a227" strokeWidth="1.8"/>
      <rect x="329" y="171" width="38" height="26" rx="2" fill="#f8f9fa" stroke="#c9a227" strokeWidth="1.2"/>
      <line x1="270" y1="198" x2="644" y2="40" stroke="#c9a227" strokeWidth="10" strokeLinecap="round"/>
      <line x1="270" y1="198" x2="644" y2="40" stroke="#c9a227" strokeWidth="5" strokeLinecap="round" opacity="0.3"/>
      <line x1="266" y1="204" x2="640" y2="46" stroke="#efefef" strokeWidth="3"/>
      {[0.25,0.5,0.75].map(t=>{
        const x=Math.round(270+t*374); const y=Math.round(198-t*158);
        return <line key={t} x1={x-5} y1={y+13} x2={x+5} y2={y-13} stroke="#1a3a5c" strokeWidth="1.5" opacity="0.6"/>;
      })}
      <line x1="644" y1="40" x2="670" y2="67" stroke="#c9a227" strokeWidth="4" strokeLinecap="round"/>
      <line x1="657" y1="52" x2="657" y2="194" stroke="#8b6914" strokeWidth="1.5" strokeDasharray="5,4"/>
      <path d="M650 194 Q657 207 664 194" stroke="#c9a227" fill="none" strokeWidth="3"/>
      <circle cx="657" cy="209" r="5" fill="#c9a227"/>
      <circle cx="270" cy="198" r="9" fill="#c9a227" stroke="#c9a227" strokeWidth="1.5"/>
      <line x1="44" y1="40" x2="44" y2="308" stroke="#c9a227" strokeWidth="1" strokeDasharray="5,4" opacity="0.6"/>
      <polygon points="44,35 40,45 48,45" fill="#c9a227"/>
      <polygon points="44,313 40,303 48,303" fill="#c9a227"/>
      <text x="10" y="178" fill="#c9a227" fontSize="8" fontFamily="monospace" transform="rotate(-90,20,178)">341 FT TIP HEIGHT</text>
      <line x1="270" y1="328" x2="644" y2="328" stroke="#c9a227" strokeWidth="1" strokeDasharray="5,4" opacity="0.6"/>
      <polygon points="265,328 275,324 275,332" fill="#c9a227"/>
      <polygon points="649,328 639,324 639,332" fill="#c9a227"/>
      <text x="457" y="340" fill="#c9a227" fontSize="8" fontFamily="monospace" textAnchor="middle">246 FT BOOM — 6 AXLE CRANE</text>
    </svg>
  );
}

function Deere850PSvg() {
  return (
    <svg viewBox="0 0 700 340" xmlns="http://www.w3.org/2000/svg" style={{width:"100%",height:"100%"}}>
      <rect width="700" height="340" fill="#f8f9fa"/>
      <line x1="20" y1="308" x2="680" y2="308" stroke="#c9a227" strokeWidth="1.5" strokeDasharray="8,5" opacity="0.5"/>
      <rect x="66" y="242" width="444" height="60" rx="16" fill="#e9ecef" stroke="#c9a227" strokeWidth="2"/>
      <rect x="80" y="252" width="416" height="40" rx="10" fill="#dee2e6"/>
      {[94,126,158,190,222,254,286,318,350,382,414,446].map(x=>(
        <rect key={x} x={x} y="248" width="26" height="48" rx="4" fill="#e2e8f0" stroke="#c9a227" strokeWidth="0.6"/>
      ))}
      <circle cx="84" cy="272" r="24" fill="#e9ecef" stroke="#c9a227" strokeWidth="2"/>
      <circle cx="84" cy="272" r="12" fill="#dee2e6"/>
      <circle cx="502" cy="272" r="24" fill="#e9ecef" stroke="#c9a227" strokeWidth="2"/>
      <circle cx="502" cy="272" r="12" fill="#dee2e6"/>
      <rect x="116" y="176" width="316" height="70" rx="8" fill="#e9ecef" stroke="#c9a227" strokeWidth="1.8"/>
      <rect x="122" y="150" width="200" height="50" rx="6" fill="#dee2e6" stroke="#c9a227" strokeWidth="1.8"/>
      <rect x="130" y="158" width="184" height="34" rx="4" fill="#e9ecef"/>
      <line x1="178" y1="150" x2="178" y2="200" stroke="#c9a227" strokeWidth="1" opacity="0.4"/>
      <line x1="228" y1="150" x2="228" y2="200" stroke="#c9a227" strokeWidth="1" opacity="0.4"/>
      <line x1="278" y1="150" x2="278" y2="200" stroke="#c9a227" strokeWidth="1" opacity="0.4"/>
      <rect x="198" y="120" width="16" height="36" rx="3" fill="#dee2e6" stroke="#c9a227" strokeWidth="1.5"/>
      <ellipse cx="206" cy="120" rx="8" ry="4" fill="#e9ecef" stroke="#c9a227" strokeWidth="1"/>
      <rect x="344" y="134" width="84" height="82" rx="6" fill="#dee2e6" stroke="#c9a227" strokeWidth="2"/>
      <rect x="352" y="142" width="68" height="44" rx="4" fill="#f8f9fa" stroke="#c9a227" strokeWidth="1.2"/>
      <line x1="386" y1="142" x2="386" y2="186" stroke="#c9a227" strokeWidth="1" opacity="0.6"/>
      <rect x="354" y="190" width="62" height="16" rx="3" fill="#e9ecef" stroke="#c9a227" strokeWidth="1"/>
      <line x1="418" y1="134" x2="418" y2="114" stroke="#c9a227" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="418" cy="110" r="5" fill="#c9a227" stroke="#c9a227" strokeWidth="1"/>
      <text x="426" y="114" fill="#c9a227" fontSize="7" fontFamily="monospace">GPS</text>
      <rect x="22" y="170" width="62" height="96" rx="5" fill="#c9a227" stroke="#c9a227" strokeWidth="2"/>
      <rect x="26" y="176" width="54" height="84" rx="3" fill="#c9a227" opacity="0.4"/>
      <line x1="22" y1="208" x2="10" y2="208" stroke="#c9a227" strokeWidth="3" strokeLinecap="round"/>
      <line x1="22" y1="238" x2="10" y2="238" stroke="#c9a227" strokeWidth="3" strokeLinecap="round"/>
      <line x1="84" y1="188" x2="148" y2="182" stroke="#8b6914" strokeWidth="4" strokeLinecap="round"/>
      <line x1="84" y1="252" x2="148" y2="246" stroke="#8b6914" strokeWidth="4" strokeLinecap="round"/>
      <circle cx="146" cy="182" r="5" fill="#c9a227"/>
      <circle cx="146" cy="246" r="5" fill="#c9a227"/>
      <rect x="454" y="218" width="24" height="50" rx="4" fill="#1a3a5c" stroke="#c9a227" strokeWidth="1.8"/>
      <path d="M466 268 L459 302 L473 302 Z" fill="#c9a227" stroke="#c9a227" strokeWidth="1.5"/>
      <rect x="438" y="200" width="56" height="18" rx="3" fill="#dee2e6" stroke="#c9a227" strokeWidth="1.2"/>
      <line x1="590" y1="134" x2="590" y2="308" stroke="#c9a227" strokeWidth="1" strokeDasharray="5,4" opacity="0.6"/>
      <polygon points="590,129 586,139 594,139" fill="#c9a227"/>
      <polygon points="590,313 586,303 594,303" fill="#c9a227"/>
      <text x="602" y="224" fill="#c9a227" fontSize="8" fontFamily="monospace">12.7</text>
      <text x="602" y="236" fill="#c9a227" fontSize="8" fontFamily="monospace">FT HT</text>
      <line x1="22" y1="328" x2="510" y2="328" stroke="#c9a227" strokeWidth="1" strokeDasharray="5,4" opacity="0.6"/>
      <polygon points="17,328 27,324 27,332" fill="#c9a227"/>
      <polygon points="515,328 505,324 505,332" fill="#c9a227"/>
      <text x="266" y="340" fill="#c9a227" fontSize="8" fontFamily="monospace" textAnchor="middle">28 FT 6 IN — SMARTGRADE GPS EQUIPPED</text>
    </svg>
  );
}

function R9400Svg() {
  return (
    <svg viewBox="0 0 700 340" xmlns="http://www.w3.org/2000/svg" style={{width:"100%",height:"100%"}}>
      <rect width="700" height="340" fill="#f8f9fa"/>
      <line x1="20" y1="328" x2="680" y2="328" stroke="#c9a227" strokeWidth="1.5" strokeDasharray="8,5" opacity="0.5"/>
      <rect x="28" y="220" width="348" height="98" rx="20" fill="#e9ecef" stroke="#c9a227" strokeWidth="2.5"/>
      <rect x="46" y="233" width="312" height="72" rx="14" fill="#dee2e6"/>
      {[60,94,128,162,196,230,264,298,332].map(x=>(
        <rect key={x} x={x} y="229" width="28" height="80" rx="5" fill="#e2e8f0" stroke="#c9a227" strokeWidth="0.8"/>
      ))}
      <circle cx="48" cy="269" r="36" fill="#e9ecef" stroke="#c9a227" strokeWidth="2.5"/>
      <circle cx="48" cy="269" r="18" fill="#dee2e6" stroke="#c9a227" strokeWidth="1.5"/>
      <circle cx="48" cy="269" r="7" fill="#c9a227"/>
      <circle cx="352" cy="269" r="36" fill="#e9ecef" stroke="#c9a227" strokeWidth="2.5"/>
      <circle cx="352" cy="269" r="18" fill="#dee2e6" stroke="#c9a227" strokeWidth="1.5"/>
      <circle cx="352" cy="269" r="7" fill="#c9a227"/>
      <rect x="28" y="114" width="124" height="108" rx="6" fill="#dee2e6" stroke="#c9a227" strokeWidth="2"/>
      <rect x="40" y="124" width="100" height="88" rx="4" fill="#e9ecef"/>
      <line x1="58" y1="124" x2="58" y2="212" stroke="#c9a227" strokeWidth="1" opacity="0.4"/>
      <line x1="88" y1="124" x2="88" y2="212" stroke="#c9a227" strokeWidth="1" opacity="0.4"/>
      <line x1="118" y1="124" x2="118" y2="212" stroke="#c9a227" strokeWidth="1" opacity="0.4"/>
      <text x="90" y="173" fill="#c9a227" fontSize="9" fontFamily="monospace" textAnchor="middle" opacity="0.7">CWT</text>
      <rect x="132" y="130" width="248" height="92" rx="9" fill="#e9ecef" stroke="#c9a227" strokeWidth="2.2"/>
      <rect x="142" y="140" width="228" height="74" rx="6" fill="#f1f3f5"/>
      <rect x="152" y="146" width="100" height="62" rx="4" fill="#dee2e6" stroke="#1a3a5c" strokeWidth="1"/>
      <rect x="322" y="98" width="68" height="72" rx="6" fill="#dee2e6" stroke="#c9a227" strokeWidth="2"/>
      <rect x="330" y="106" width="52" height="40" rx="3" fill="#f8f9fa" stroke="#c9a227" strokeWidth="1.5"/>
      <line x1="356" y1="106" x2="356" y2="146" stroke="#c9a227" strokeWidth="1" opacity="0.6"/>
      <rect x="328" y="150" width="56" height="14" rx="3" fill="#e9ecef" stroke="#c9a227" strokeWidth="1"/>
      <line x1="236" y1="148" x2="506" y2="42" stroke="#c9a227" strokeWidth="14" strokeLinecap="round"/>
      <line x1="236" y1="148" x2="506" y2="42" stroke="#c9a227" strokeWidth="8" strokeLinecap="round" opacity="0.3"/>
      <line x1="230" y1="156" x2="500" y2="50" stroke="#efefef" strokeWidth="4"/>
      <line x1="242" y1="140" x2="512" y2="34" stroke="#ced4da" strokeWidth="3"/>
      <line x1="506" y1="42" x2="624" y2="126" stroke="#c9a227" strokeWidth="10" strokeLinecap="round"/>
      <line x1="506" y1="42" x2="624" y2="126" stroke="#c9a227" strokeWidth="6" strokeLinecap="round" opacity="0.3"/>
      <path d="M624 126 Q664 144 656 186 Q640 210 610 194 Q586 170 600 138 Z" fill="#c9a227" stroke="#c9a227" strokeWidth="2.5"/>
      <line x1="610" y1="190" x2="622" y2="210" stroke="#c9a227" strokeWidth="2.5"/>
      <line x1="626" y1="184" x2="640" y2="202" stroke="#c9a227" strokeWidth="2.5"/>
      <line x1="640" y1="176" x2="652" y2="192" stroke="#c9a227" strokeWidth="2.5"/>
      <line x1="650" y1="166" x2="660" y2="180" stroke="#c9a227" strokeWidth="2.5"/>
      <line x1="280" y1="136" x2="412" y2="84" stroke="#6c757d" strokeWidth="7" strokeLinecap="round" opacity="0.8"/>
      <circle cx="283" cy="134" r="8" fill="#c9a227"/>
      <circle cx="410" cy="85" r="8" fill="#c9a227"/>
      <line x1="506" y1="42" x2="570" y2="88" stroke="#6c757d" strokeWidth="5" strokeLinecap="round" opacity="0.8"/>
      <line x1="570" y1="88" x2="624" y2="126" stroke="#6c757d" strokeWidth="4" strokeLinecap="round" opacity="0.7"/>
      <rect x="430" y="290" width="106" height="18" rx="3" fill="none" stroke="#c9a227" strokeWidth="1" strokeDasharray="3,2" opacity="0.5"/>
      <text x="483" y="303" fill="#c9a227" fontSize="7" fontFamily="monospace" textAnchor="middle" opacity="0.7">MINING SCALE — 440 TONS</text>
      <line x1="668" y1="98" x2="668" y2="320" stroke="#c9a227" strokeWidth="1" strokeDasharray="5,4" opacity="0.6"/>
      <polygon points="668,93 664,103 672,103" fill="#c9a227"/>
      <polygon points="668,325 664,315 672,315" fill="#c9a227"/>
      <text x="680" y="212" fill="#c9a227" fontSize="7" fontFamily="monospace">26FT</text>
      <line x1="28" y1="342" x2="376" y2="342" stroke="#c9a227" strokeWidth="1" strokeDasharray="5,4" opacity="0.6"/>
      <polygon points="23,342 33,338 33,346" fill="#c9a227"/>
      <polygon points="381,342 371,338 371,346" fill="#c9a227"/>
      <text x="202" y="334" fill="#adb5bd" fontSize="7" fontFamily="monospace" textAnchor="middle">LIEBHERR R 9400 — 880,000 LBS — SUPERLOAD</text>
    </svg>
  );
}

const SVG_MAP = {
  "manitou-mrt-3060": MRT3060Svg,
  "caterpillar-390f-excavator": CAT390Svg,
  "caterpillar-d11-dozer": D11Svg,
  "liebherr-ltm-1500-crane": LTM1500Svg,
  "komatsu-pc800-excavator": PC800Svg,
  "grove-gmk6300l-crane": GMK6300Svg,
  "john-deere-850p-dozer": Deere850PSvg,
  "liebherr-r-9400-excavator": R9400Svg,
};

function GenericSvg({type}) {
  const shapes = {
    excavator: <><rect x="60" y="235" width="220" height="32" rx="10" fill="#e9ecef" stroke="#c9a227" strokeWidth="1.5"/><ellipse cx="190" cy="235" rx="90" ry="13" fill="#dee2e6" stroke="#c9a227" strokeWidth="1.5"/><rect x="120" y="186" width="140" height="52" rx="8" fill="#e9ecef" stroke="#c9a227" strokeWidth="1.5"/><rect x="218" y="166" width="52" height="46" rx="5" fill="#dee2e6" stroke="#c9a227" strokeWidth="1.5"/><rect x="225" y="173" width="38" height="24" rx="2" fill="#f8f9fa" stroke="#c9a227" strokeWidth="1"/><line x1="158" y1="196" x2="335" y2="112" stroke="#c9a227" strokeWidth="7" strokeLinecap="round"/><line x1="335" y1="112" x2="425" y2="168" stroke="#c9a227" strokeWidth="5" strokeLinecap="round"/><path d="M425 168 Q448 178 443 202 Q434 216 414 207 Q400 192 410 172 Z" fill="#c9a227" stroke="#c9a227" strokeWidth="1.5"/></>,
    telehandler: <><rect x="80" y="192" width="235" height="64" rx="6" fill="#e9ecef" stroke="#c9a227" strokeWidth="1.5"/><rect x="255" y="162" width="52" height="42" rx="4" fill="#dee2e6" stroke="#c9a227" strokeWidth="1.5"/><rect x="262" y="168" width="38" height="22" rx="2" fill="#f8f9fa" stroke="#c9a227" strokeWidth="1"/><line x1="196" y1="172" x2="480" y2="55" stroke="#c9a227" strokeWidth="5" strokeLinecap="round"/><circle cx="112" cy="258" r="17" fill="#f8f9fa" stroke="#c9a227" strokeWidth="2"/><circle cx="264" cy="258" r="17" fill="#f8f9fa" stroke="#c9a227" strokeWidth="2"/></>,
    crane: <><rect x="60" y="222" width="290" height="46" rx="6" fill="#e9ecef" stroke="#c9a227" strokeWidth="1.5"/><rect x="156" y="184" width="96" height="42" rx="6" fill="#dee2e6" stroke="#c9a227" strokeWidth="1.5"/><line x1="190" y1="188" x2="452" y2="52" stroke="#c9a227" strokeWidth="6" strokeLinecap="round"/></>,
    dozer: <><rect x="50" y="222" width="370" height="44" rx="13" fill="#e9ecef" stroke="#c9a227" strokeWidth="2"/><rect x="98" y="168" width="254" height="57" rx="8" fill="#e9ecef" stroke="#c9a227" strokeWidth="1.5"/><rect x="264" y="140" width="78" height="50" rx="5" fill="#dee2e6" stroke="#c9a227" strokeWidth="1.5"/><rect x="20" y="178" width="48" height="58" rx="4" fill="#c9a227" stroke="#c9a227" strokeWidth="2"/></>,
  };
  return (
    <svg viewBox="0 0 600 300" xmlns="http://www.w3.org/2000/svg" style={{width:"100%",height:"100%"}}>
      <rect width="600" height="300" fill="#f8f9fa"/>
      <line x1="20" y1="268" x2="580" y2="268" stroke="#c9a227" strokeWidth="1.5" strokeDasharray="6,4" opacity="0.4"/>
      {shapes[type] || shapes.excavator}
    </svg>
  );
}

function getDiagramEl(eq) {
  const Comp = SVG_MAP[slug(eq.name)];
  if (Comp) return Comp;
  return () => <GenericSvg type={eq.diagramType}/>;
}

function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2400); return () => clearTimeout(t); }, []);
  return <div style={{position:"fixed",bottom:28,left:"50%",transform:"translateX(-50%)",background:"#c9a227",color:"#1a1a1a",padding:"10px 24px",borderRadius:8,fontFamily:"monospace",fontSize:12,fontWeight:700,letterSpacing:2,zIndex:9999,boxShadow:"0 4px 24px #000a",whiteSpace:"nowrap"}}>{msg}</div>;
}


function SharePanel({eq, slug, onCopy}) {
  const [shareTab, setShareTab] = React.useState("feed");
  const caption = shareTab==="feed" ? buildFeedCaption(eq) : buildStoryCaption(eq);
  const btnBase = {flex:1,padding:"9px",borderRadius:6,fontFamily:"sans-serif",fontSize:12,fontWeight:600,cursor:"pointer",border:"1px solid"};
  return (
    <div style={{background:"#f8f8f8",border:"1px solid #c9a227",borderRadius:10,padding:16,marginBottom:14}}>
      <div style={{display:"flex",gap:6,marginBottom:12}}>
        <button onClick={()=>setShareTab("feed")} style={{...btnBase,borderColor:shareTab==="feed"?"#c9a227":"#dddddd",background:shareTab==="feed"?"#c9a227":"#ffffff",color:"#111111"}}>
          📸 Feed Post
        </button>
        <button onClick={()=>setShareTab("story")} style={{...btnBase,borderColor:shareTab==="story"?"#c9a227":"#dddddd",background:shareTab==="story"?"#c9a227":"#ffffff",color:"#111111"}}>
          ⚡ Story
        </button>
      </div>
      <div style={{fontSize:11,color:"#888888",fontFamily:"sans-serif",marginBottom:10}}>
        {shareTab==="feed"?"Full equipment spotlight — permanent SEO value on your feed":"Quick in-transit update — post while loading or delivering"}
      </div>
      <pre style={{fontFamily:"monospace",fontSize:11,color:"#222222",lineHeight:1.8,margin:0,whiteSpace:"pre-wrap",wordBreak:"break-word",background:"#ffffff",border:"1px solid #eeeeee",padding:12,borderRadius:8,marginBottom:12}}>{caption}</pre>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <Btn amber onClick={()=>{navigator.clipboard.writeText(caption);onCopy(shareTab==="feed"?"FEED CAPTION COPIED":"STORY CAPTION COPIED");}}>Copy Caption</Btn>
        <Btn ghost onClick={()=>{navigator.clipboard.writeText("edwardscarriers.com/equipment-specs/"+slug(eq.name));onCopy("LINK COPIED");}}>Copy Link</Btn>
      </div>
    </div>
  );
}


function NotesTab({eqId, notes, setNotes, onSave, slug, name}) {
  return (
    <div style={{background:"#ffffff",border:"1px solid #dddddd",borderRadius:10,padding:18}}>
      <div style={{fontSize:11,color:"#888888",fontFamily:"sans-serif",marginBottom:10}}>General notes — shipper info, loading tips, receiver details, anything useful.</div>
      <textarea
        value={notes}
        onChange={e=>setNotes(e.target.value)}
        placeholder="e.g. Shipper always ready by 6am. Watch loading dock clearance at receiver. TWIC required at delivery..."
        style={{width:"100%",minHeight:180,background:"#f8f8f8",border:"1px solid #dddddd",borderRadius:8,padding:12,fontSize:13,fontFamily:"sans-serif",color:"#222222",resize:"vertical",outline:"none",boxSizing:"border-box",lineHeight:1.7}}
      />
      <div style={{marginTop:10}}>
        <Btn amber onClick={async()=>{
          if(eqId){ await db.updateNotes(eqId,notes); onSave(); }
          else{ localStorage.setItem("notes:"+slug(name),notes); onSave(); }
        }}>Save Notes</Btn>
      </div>
    </div>
  );
}

function LoadLogTab({eqId, logs, newLog, setNewLog, savingLog, setSavingLog, loadLogs, onToast, resizeToBase64, isAdmin}) {
  const [addingLog, setAddingLog] = React.useState(false);
  const SI2 = {background:"#f8f8f8",border:"1px solid #dddddd",borderRadius:6,padding:"8px 10px",color:"#222222",fontSize:12,fontFamily:"sans-serif",width:"100%",boxSizing:"border-box"};
  const LB2 = {fontSize:11,color:"#666666",fontFamily:"sans-serif",fontWeight:600,marginBottom:3,marginTop:10,display:"block"};
  const EMPTY = {haul_date:"",actual_width:"",actual_height:"",actual_weight:"",permits_required:false,notes:"",attachment_url:""};

  async function saveLog() {
    if(!eqId){onToast("Save equipment first");return;}
    if(!newLog.haul_date){onToast("Date required");return;}
    setSavingLog(true);
    await db.insertLog({...newLog,equipment_id:eqId,permits_required:newLog.permits_required===true||newLog.permits_required==="true"});
    await loadLogs(eqId);
    setNewLog(EMPTY);
    setAddingLog(false);
    setSavingLog(false);
    onToast("HAUL LOGGED");
  }

  return (
    <div style={{marginTop:24,paddingTop:18,borderTop:"1px solid #eeeeee"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontSize:13,fontFamily:"sans-serif",fontWeight:600,color:"#222222"}}>{logs.length} Haul{logs.length!==1?"s":""} Logged</div>
        {isAdmin&&<Btn amber onClick={()=>setAddingLog(a=>!a)}>{addingLog?"Cancel":"+ Add Haul"}</Btn>}
      </div>
      {addingLog&&(
        <div style={{background:"#ffffff",border:"1px solid #c9a227",borderRadius:10,padding:16,marginBottom:16}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div style={{gridColumn:"1/-1"}}><label style={LB2}>Date of Haul</label><input type="date" style={SI2} value={newLog.haul_date} onChange={e=>setNewLog(l=>({...l,haul_date:e.target.value}))}/></div>
            <div><label style={LB2}>Transport Width</label><input style={SI2} value={newLog.actual_width} onChange={e=>setNewLog(l=>({...l,actual_width:e.target.value}))} placeholder="e.g. 8 ft 5 in"/></div>
            <div><label style={LB2}>Transport Height</label><input style={SI2} value={newLog.actual_height} onChange={e=>setNewLog(l=>({...l,actual_height:e.target.value}))} placeholder="e.g. 11 ft 6 in"/></div>
            <div style={{gridColumn:"1/-1"}}><label style={LB2}>Transport Weight</label><input style={SI2} value={newLog.actual_weight} onChange={e=>setNewLog(l=>({...l,actual_weight:e.target.value}))} placeholder="e.g. 44,500 lbs"/></div>
            <div style={{gridColumn:"1/-1"}}>
              <label style={LB2}>Permits Actually Required?</label>
              <select style={SI2} value={newLog.permits_required} onChange={e=>setNewLog(l=>({...l,permits_required:e.target.value==="true"}))}>
                <option value="false">No — Load was legal</option>
                <option value="true">Yes — Permits required</option>
              </select>
            </div>
            <div style={{gridColumn:"1/-1"}}>
              <label style={LB2}>Notes</label>
              <textarea style={{...SI2,minHeight:80,resize:"vertical"}} value={newLog.notes} onChange={e=>setNewLog(l=>({...l,notes:e.target.value}))} placeholder="Anything worth noting about this haul..."/>
            </div>
            <div style={{gridColumn:"1/-1"}}>
              <label style={LB2}>Weigh Station Ticket (PDF or photo)</label>
              <input type="file" accept="image/*,.pdf" style={{...SI2,padding:"6px"}} onChange={async e=>{
                const file=e.target.files?.[0];if(!file)return;
                const b64=await resizeToBase64(file);
                setNewLog(l=>({...l,attachment_url:b64}));
                onToast("Attachment ready");
              }}/>
              {newLog.attachment_url&&<div style={{fontSize:10,color:"#22c55e",fontFamily:"sans-serif",marginTop:4}}>✓ Attachment ready</div>}
            </div>
          </div>
          <div style={{marginTop:14}}>
            <Btn amber onClick={saveLog} disabled={savingLog} style={{width:"100%",padding:"12px"}}>{savingLog?"Saving...":"Save Haul Entry"}</Btn>
          </div>
        </div>
      )}
      {logs.length===0&&!addingLog&&(
        <div style={{textAlign:"center",padding:30,color:"#aaaaaa",fontFamily:"sans-serif",fontSize:13}}>No hauls logged yet. Tap + Add Haul after each delivery.</div>
      )}
      {logs.map(log=>(
        <div key={log.id} style={{background:"#ffffff",border:"1px solid #dddddd",borderRadius:10,padding:16,marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
            <div style={{fontSize:11,color:"#888888",fontFamily:"sans-serif"}}>{log.haul_date||"No date"}</div>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <span style={{padding:"3px 10px",borderRadius:20,fontSize:10,fontFamily:"sans-serif",fontWeight:600,background:log.permits_required?"#fef9c3":"#dcfce7",color:log.permits_required?"#854d0e":"#166534"}}>
                {log.permits_required?"⚠ Permits":"✓ Legal"}
              </span>
              {isAdmin&&<Btn danger onClick={async()=>{await db.deleteLog(log.id);await loadLogs(eqId);onToast("Deleted");}}>✕</Btn>}
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:8}}>
            {[["Transport Width",log.actual_width],["Transport Height",log.actual_height],["Transport Weight",log.actual_weight]].filter(([k,v])=>v).map(([k,v])=>(
              <div key={k} style={{background:"#f8f8f8",borderRadius:6,padding:"8px 10px"}}>
                <div style={{fontSize:9,color:"#888888",fontFamily:"sans-serif",textTransform:"uppercase",letterSpacing:1}}>{k}</div>
                <div style={{fontSize:13,fontWeight:600,color:"#222222",fontFamily:"sans-serif"}}>{v}</div>
              </div>
            ))}
          </div>
          {log.notes&&<div style={{fontSize:12,color:"#555555",fontFamily:"sans-serif",lineHeight:1.7,marginBottom:8}}>{log.notes}</div>}
          {log.attachment_url&&<div style={{marginTop:8}}><a href={log.attachment_url} download="weigh-station-ticket" style={{fontSize:11,color:"#c9a227",fontFamily:"sans-serif",fontWeight:600,textDecoration:"none"}}>📎 View Weigh Station Ticket</a></div>}
        </div>
      ))}
    </div>
  );
}


function LoginModal({onClose, onSuccess}) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  async function handleLogin(e){
    e.preventDefault();
    setLoading(true);setError(null);
    try{
      const ok = await auth.login(email.trim(), password);
      if(ok) onSuccess();
      else setError("Invalid email or password");
    }catch(err){setError("Login failed: "+err.message);}
    finally{setLoading(false);}
  }

  return (
    <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"#00000066",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20}} onClick={onClose}>
      <div style={{background:"#ffffff",borderRadius:12,padding:24,maxWidth:340,width:"100%"}} onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:14,fontWeight:700,color:"#111111",fontFamily:"sans-serif",marginBottom:14,textAlign:"center"}}>Admin Login</div>
        <form onSubmit={handleLogin}>
          <input
            type="email" autoFocus required value={email} onChange={e=>setEmail(e.target.value)}
            placeholder="Email" autoComplete="username"
            style={{width:"100%",background:"#f8f8f8",border:"1px solid #dddddd",borderRadius:6,padding:"10px 12px",fontSize:13,fontFamily:"sans-serif",color:"#111111",marginBottom:10,boxSizing:"border-box"}}
          />
          <input
            type="password" required value={password} onChange={e=>setPassword(e.target.value)}
            placeholder="Password" autoComplete="current-password"
            style={{width:"100%",background:"#f8f8f8",border:"1px solid #dddddd",borderRadius:6,padding:"10px 12px",fontSize:13,fontFamily:"sans-serif",color:"#111111",marginBottom:10,boxSizing:"border-box"}}
          />
          {error&&<div style={{color:"#dc2626",fontSize:12,fontFamily:"sans-serif",marginBottom:10}}>{error}</div>}
          <button type="submit" disabled={loading} style={{width:"100%",padding:"11px",background:"#c9a227",color:"#111111",border:"none",borderRadius:6,fontSize:13,fontWeight:700,fontFamily:"sans-serif",cursor:"pointer",marginBottom:8}}>
            {loading?"Logging in...":"Log In"}
          </button>
          <button type="button" onClick={onClose} style={{width:"100%",padding:"10px",background:"none",color:"#888888",border:"none",fontSize:12,fontFamily:"sans-serif",cursor:"pointer"}}>
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}


const US_STATES = [
  ["AL","Alabama"],["AK","Alaska"],["AZ","Arizona"],["AR","Arkansas"],["CA","California"],
  ["CO","Colorado"],["CT","Connecticut"],["DE","Delaware"],["FL","Florida"],["GA","Georgia"],
  ["HI","Hawaii"],["ID","Idaho"],["IL","Illinois"],["IN","Indiana"],["IA","Iowa"],
  ["KS","Kansas"],["KY","Kentucky"],["LA","Louisiana"],["ME","Maine"],["MD","Maryland"],
  ["MA","Massachusetts"],["MI","Michigan"],["MN","Minnesota"],["MS","Mississippi"],["MO","Missouri"],
  ["MT","Montana"],["NE","Nebraska"],["NV","Nevada"],["NH","New Hampshire"],["NJ","New Jersey"],
  ["NM","New Mexico"],["NY","New York"],["NC","North Carolina"],["ND","North Dakota"],["OH","Ohio"],
  ["OK","Oklahoma"],["OR","Oregon"],["PA","Pennsylvania"],["RI","Rhode Island"],["SC","South Carolina"],
  ["SD","South Dakota"],["TN","Tennessee"],["TX","Texas"],["UT","Utah"],["VT","Vermont"],
  ["VA","Virginia"],["WA","Washington"],["WV","West Virginia"],["WI","Wisconsin"],["WY","Wyoming"]
];

// State bounding boxes [minLng, minLat, maxLng, maxLat]
const STATE_BOUNDS = {
  AL:[-88.47,30.22,-84.89,35.01],AK:[-179.15,51.21,-129.97,71.38],AZ:[-114.82,31.33,-109.04,37.00],
  AR:[-94.62,33.00,-89.64,36.50],CA:[-124.41,32.53,-114.13,42.01],CO:[-109.06,36.99,-102.04,41.00],
  CT:[-73.73,40.98,-71.79,42.05],DE:[-75.79,38.45,-75.05,39.84],FL:[-87.63,24.52,-80.03,31.00],
  GA:[-85.61,30.36,-80.84,35.00],HI:[-160.25,18.91,-154.81,22.24],ID:[-117.24,41.99,-111.04,49.00],
  IL:[-91.51,36.97,-87.02,42.51],IN:[-88.10,37.77,-84.78,41.76],IA:[-96.64,40.37,-90.14,43.50],
  KS:[-102.05,36.99,-94.59,40.00],KY:[-89.57,36.50,-81.96,39.15],LA:[-94.04,28.93,-88.82,33.02],
  ME:[-71.08,43.06,-66.95,47.46],MD:[-79.49,37.91,-74.99,39.72],MA:[-73.51,41.24,-69.93,42.89],
  MI:[-90.42,41.70,-82.41,48.31],MN:[-97.24,43.50,-89.49,49.38],MS:[-91.66,30.17,-88.10,35.01],
  MO:[-95.77,35.99,-89.10,40.61],MT:[-116.05,44.35,-104.04,49.00],NE:[-104.05,39.99,-95.31,43.00],
  NV:[-120.01,35.00,-114.03,42.00],NH:[-72.56,42.70,-70.70,45.31],NJ:[-75.56,38.93,-73.89,41.36],
  NM:[-109.05,31.33,-103.00,37.00],NY:[-79.76,40.50,-71.86,45.02],NC:[-84.32,33.84,-75.46,36.59],
  ND:[-104.05,45.93,-96.55,49.00],OH:[-84.82,38.40,-80.52,41.98],OK:[-103.00,33.62,-94.43,37.00],
  OR:[-124.57,41.99,-116.46,46.24],PA:[-80.52,39.72,-74.69,42.27],RI:[-71.90,41.15,-71.12,42.02],
  SC:[-83.35,32.05,-78.54,35.22],SD:[-104.06,42.48,-96.44,45.95],TN:[-90.31,34.98,-81.65,36.68],
  TX:[-106.65,25.84,-93.51,36.50],UT:[-114.05,36.99,-109.04,42.00],VT:[-73.44,42.73,-71.50,45.02],
  VA:[-83.68,36.54,-75.24,39.47],WA:[-124.73,45.54,-116.92,49.00],WV:[-82.64,37.20,-77.72,40.64],
  WI:[-92.89,42.49,-86.25,47.31],WY:[-111.06,40.99,-104.05,45.01]
};

function statesFromCoords(coords) {
  // Find which states each coordinate falls in
  const found = new Set();
  coords.forEach(([lng, lat]) => {
    Object.entries(STATE_BOUNDS).forEach(([abbr, [minLng, minLat, maxLng, maxLat]]) => {
      if(lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat) {
        found.add(abbr);
      }
    });
  });
  return Array.from(found);
}

async function geocodeAddress(address) {
  const url = "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + encodeURIComponent(address);
  const res = await fetch(url, { headers: { "User-Agent": "EdwardsCarriers/1.0" } });
  const data = await res.json();
  if(data && data[0]) return [parseFloat(data[0].lon), parseFloat(data[0].lat)];
  return null;
}

async function getRouteStates(originCoords, destCoords) {
  const [oLng, oLat] = originCoords;
  const [dLng, dLat] = destCoords;
  const url = "https://router.project-osrm.org/route/v1/driving/" + oLng + "," + oLat + ";" + dLng + "," + dLat + "?overview=full&geometries=geojson";
  const res = await fetch(url);
  const data = await res.json();
  if(data.routes && data.routes[0]) {
    const coords = data.routes[0].geometry.coordinates;
    // Sample every 20th coordinate to keep it fast
    const sampled = coords.filter((_,i) => i % 20 === 0);
    sampled.push(coords[coords.length-1]);
    return statesFromCoords(sampled);
  }
  return [];
}

function RoutePlannerTab({eq}) {
  const [origin, setOrigin] = React.useState("");
  const [destination, setDestination] = React.useState("");
  const [customW, setCustomW] = React.useState("");
  const [customH, setCustomH] = React.useState("");
  const [customWt, setCustomWt] = React.useState("");
  const [results, setResults] = React.useState(null);
  const [routeStates, setRouteStates] = React.useState([]);
  const [useEqDims, setUseEqDims] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [loadMsg, setLoadMsg] = React.useState("");
  const [error, setError] = React.useState(null);

  const eqWidth = eq?.dimensions?.["Equipment Width"]||eq?.dimensions?.["Transport Width"]||"";
  const eqHeight = eq?.dimensions?.["Equipment Height"]||eq?.dimensions?.["Transport Height"]||"";
  const eqWeight = eq?.keySpecs?.find(s=>s.label==="Operating Weight")?.value||"";

  const width = useEqDims ? eqWidth : customW;
  const height = useEqDims ? eqHeight : customH;
  const weight = useEqDims ? eqWeight : customWt;

  const SI = {background:"#f8f8f8",border:"1px solid #dddddd",borderRadius:6,padding:"8px 10px",color:"#222222",fontSize:12,fontFamily:"sans-serif",width:"100%",boxSizing:"border-box"};
  const LB = {fontSize:11,color:"#666666",fontFamily:"sans-serif",fontWeight:600,marginBottom:4,marginTop:12,display:"block"};

  async function calculate(){
    if(!origin||!destination){setError("Enter both origin and destination");return;}
    setLoading(true);setError(null);setResults(null);setRouteStates([]);
    try{
      setLoadMsg("Locating origin...");
      const oCoords = await geocodeAddress(origin);
      if(!oCoords){setError("Could not find origin address. Try city, state format.");setLoading(false);return;}

      setLoadMsg("Locating destination...");
      const dCoords = await geocodeAddress(destination);
      if(!dCoords){setError("Could not find destination address. Try city, state format.");setLoading(false);return;}

      setLoadMsg("Calculating route...");
      const states = await getRouteStates(oCoords, dCoords);
      if(!states.length){setError("Could not determine route states. Try city, state format.");setLoading(false);return;}

      setRouteStates(states);
      setLoadMsg("Checking state rules...");
      const wFt = parseFeet(width);
      const hFt = parseFeet(height);
      const wLbs = parseFloat(String(weight).replace(/,/g,''))||0;
      setResults(calcRouteRequirements(states, wFt, hFt, wLbs));
    }catch(e){setError("Error: "+e.message);}
    finally{setLoading(false);setLoadMsg("");}
  }

  const anyPermits = results && results.some(r=>r.permitsRequired);
  const anyEscort = results && results.some(r=>r.escort!=="None");

  return (
    <div>
      <div style={{background:"#fff8e6",border:"1px solid #c9a227",borderRadius:8,padding:12,marginBottom:16,fontSize:11,color:"#8a6d0b",fontFamily:"sans-serif",lineHeight:1.6}}>
        ⚠️ <strong>Estimate only.</strong> Always verify with state DOTs before hauling. For official permits use <a href="https://oversize.io" target="_blank" rel="noreferrer" style={{color:"#c9a227",fontWeight:700}}>Oversize.io</a>.<br/><span style={{color:"#aaaaaa",fontSize:10}}>State rules last updated: {RULES_LAST_UPDATED}</span>
      </div>

      <label style={LB}>Shipper / Origin Address</label>
      <input style={SI} value={origin} onChange={e=>setOrigin(e.target.value)} placeholder="e.g. Grand Island, NE or 3445 W Stolley Park Rd, Grand Island, NE"/>

      <label style={LB}>Receiver / Destination Address</label>
      <input style={SI} value={destination} onChange={e=>setDestination(e.target.value)} placeholder="e.g. Baltimore, MD or 2700 Broening Hwy, Baltimore, MD"/>

      <div style={{marginTop:14,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
          <input type="checkbox" id="useEqR" checked={useEqDims} onChange={e=>setUseEqDims(e.target.checked)} style={{width:16,height:16,accentColor:"#c9a227"}}/>
          <label htmlFor="useEqR" style={{fontSize:12,fontFamily:"sans-serif",color:"#333333",cursor:"pointer"}}>Use this equipment's dimensions{eqWidth?" ("+eqWidth+" wide, "+eqHeight+" tall, "+eqWeight+")":""}</label>
        </div>
        {!useEqDims&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            <div><label style={LB}>Width</label><input style={SI} value={customW} onChange={e=>setCustomW(e.target.value)} placeholder="e.g. 14 ft"/></div>
            <div><label style={LB}>Height</label><input style={SI} value={customH} onChange={e=>setCustomH(e.target.value)} placeholder="e.g. 13 ft 6 in"/></div>
            <div><label style={LB}>Weight (lbs)</label><input style={SI} value={customWt} onChange={e=>setCustomWt(e.target.value)} placeholder="e.g. 80000"/></div>
          </div>
        )}
      </div>

      {error&&<div style={{color:"#dc2626",fontSize:12,fontFamily:"sans-serif",marginBottom:10,padding:"8px 12px",background:"#fee2e2",borderRadius:6}}>{error}</div>}

      <Btn amber onClick={calculate} disabled={loading} style={{width:"100%",padding:"12px",marginBottom:16}}>
        {loading?loadMsg||"Calculating...":"Calculate Route Requirements"}
      </Btn>

      {routeStates.length>0&&(
        <div style={{fontSize:11,color:"#666666",fontFamily:"sans-serif",marginBottom:14,padding:"8px 12px",background:"#f8f8f8",borderRadius:6}}>
          Route passes through {routeStates.length} state{routeStates.length!==1?"s":""}: <strong>{routeStates.join(" → ")}</strong>
        </div>
      )}

      {results&&(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
            <div style={{background:anyPermits?"#fef9c3":"#dcfce7",borderRadius:8,padding:12,textAlign:"center"}}>
              <div style={{fontSize:22,marginBottom:4}}>{anyPermits?"📋":"✓"}</div>
              <div style={{fontSize:11,fontWeight:700,fontFamily:"sans-serif",color:anyPermits?"#854d0e":"#166534"}}>{anyPermits?"PERMITS REQUIRED":"NO PERMITS NEEDED"}</div>
            </div>
            <div style={{background:anyEscort?"#fef9c3":"#dcfce7",borderRadius:8,padding:12,textAlign:"center"}}>
              <div style={{fontSize:22,marginBottom:4}}>{anyEscort?"🚨":"✓"}</div>
              <div style={{fontSize:11,fontWeight:700,fontFamily:"sans-serif",color:anyEscort?"#854d0e":"#166534"}}>{anyEscort?"ESCORT REQUIRED":"NO ESCORTS NEEDED"}</div>
            </div>
          </div>

          {results.map(r=>(
            <div key={r.abbr} style={{background:"#ffffff",border:"1px solid "+(r.permitsRequired||r.escort!=="None"?"#f59e0b":"#dddddd"),borderRadius:10,padding:14,marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontSize:14,fontWeight:700,color:"#111111",fontFamily:"sans-serif"}}>{r.state}</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"flex-end"}}>
                  {r.permits.map((p,i)=>p!=="None"&&<span key={i} style={{background:"#fef9c3",color:"#854d0e",fontSize:9,padding:"3px 8px",borderRadius:10,fontFamily:"sans-serif",fontWeight:700}}>{p}</span>)}
                  {r.escort!=="None"&&<span style={{background:"#fee2e2",color:"#991b1b",fontSize:9,padding:"3px 8px",borderRadius:10,fontFamily:"sans-serif",fontWeight:700}}>🚨 {r.escort}</span>}
                  {!r.permitsRequired&&r.escort==="None"&&<span style={{background:"#dcfce7",color:"#166534",fontSize:9,padding:"3px 8px",borderRadius:10,fontFamily:"sans-serif",fontWeight:700}}>✓ Legal</span>}
                </div>
              </div>
              {r.restrictions.length>0&&<div style={{fontSize:11,color:"#666666",fontFamily:"sans-serif",marginBottom:4}}>{r.restrictions.join(" · ")}</div>}
              <div style={{fontSize:10,color:"#888888",fontFamily:"sans-serif",lineHeight:1.6}}>{r.notes}</div>
            </div>
          ))}

          <div style={{textAlign:"center",marginTop:16,padding:"12px",background:"#f8f8f8",borderRadius:8}}>
            <div style={{fontSize:11,color:"#555555",fontFamily:"sans-serif",marginBottom:8}}>Ready to file official permits?</div>
            <a href="https://oversize.io" target="_blank" rel="noreferrer" style={{display:"inline-block",padding:"10px 20px",background:"#c9a227",color:"#111111",borderRadius:6,fontSize:12,fontWeight:700,fontFamily:"sans-serif",textDecoration:"none"}}>
              Get Permits on Oversize.io →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [screen,setScreen]   = useState("home");
  const [current,setCurrent] = useState(null);
  const [tab,setTab]         = useState("specs");
  const [toast,setToast]     = useState(null);
  const [shareOpen,setShare] = useState(false);
  const [search,setSearch]   = useState("");
  const [custom,setCustom]   = useState([]);
  const EMPTY_EQ = {name:"",manufacturer:"",category:"Excavator",weight:"",power:"",length:"",width:"",height:"",trailerType:"Flatbed",tonnage:"",permits:"None",escort:"None",chains:"",haulerNote:""};
  const [newEq,setNewEq]       = useState(EMPTY_EQ);
  const [saving,setSaving]     = useState(false);
  const [addError,setAddError] = useState(null);
  const [imgMode,setImgMode]   = useState("diagram");
  const [photo,setPhoto]       = useState(null);
  const [photos,setPhotos]     = useState([]);
  const [photoIdx,setPhotoIdx] = useState(0);
  const [profileNotes,setProfileNotes] = useState("");
  const EMPTY_LOG = {haul_date:"",actual_width:"",actual_height:"",actual_weight:"",permits_required:false,notes:"",attachment_url:""};
  const [newLog,setNewLog]     = useState(EMPTY_LOG);
  const [savingLog,setSavingLog] = useState(false);
  const [logs,setLogs]         = useState([]);
  const [aiQuery,setAiQuery]   = useState("");
  const [aiAdding,setAiAdding] = useState(false);
  const [aiDots,setAiDots]     = useState("");
  const [isAdmin,setIsAdmin]   = useState(auth.isLoggedIn());
  const [loginOpen,setLoginOpen] = useState(false);

  useEffect(()=>{ loadCustom(); },[]);

  // Refresh admin session on load
  useEffect(()=>{
    if(auth.isLoggedIn()){
      auth.refresh().then(ok=>setIsAdmin(ok));
    }
  },[]);

  // Kick back to home if admin-only screen accessed without admin
  useEffect(()=>{
    if(screen==="add"&&!isAdmin) setScreen("home");
  },[screen,isAdmin]);

  useEffect(()=>{
    if(!aiAdding)return;
    const i=setInterval(()=>setAiDots(d=>d.length>=3?"":d+"."),500);
    return()=>clearInterval(i);
  },[aiAdding]);


  async function loadCustom(){
    try{
      const items = await db.getAll();
      setCustom(items||[]);
    }catch(e){console.error(e);setCustom([]);}
  }

  async function saveCustom(eq){
    const record = {
      name: eq.name,
      manufacturer: eq.manufacturer||"",
      category: eq.category||"",
      year: eq.year||"",
      tagline: eq.tagline||"",
      diagram_type: eq.diagramType||"generic",
      key_specs: eq.keySpecs||[],
      dimensions: eq.dimensions||{},
      transport_info: eq.transportInfo||{},
      hauler_note: eq.haulerNote||"",
      history: eq.history||"",
      tags: eq.tags||[],
    };
    const saved = await db.insert(record);
    await loadCustom();
    return saved;
  }

  async function deleteCustom(id){
    await db.remove(id);loadCustom();setToast("DELETED");
  }

  async function loadPhoto(name){
    // localStorage fallback for prebuilt profiles
    try{
      const r=localStorage.getItem("photo:"+slug(name));
      if(r){setPhoto(r);setImgMode("photo");setPhotos([]);}
      else{setPhoto(null);setImgMode("diagram");setPhotos([]);}
    }catch{setPhoto(null);setImgMode("diagram");setPhotos([]);}
  }

  async function loadLogs(equipmentId){
    try{
      const rows = await db.getLogs(equipmentId);
      setLogs(rows||[]);
    }catch{ setLogs([]); }
  }

  async function loadPhotos(equipmentId){
    try{
      const rows = await db.getPhotos(equipmentId);
      if(rows&&rows.length>0){
        setPhotos(rows);
        setPhoto(rows[0].url);
        setImgMode("photo");
      } else {
        setPhotos([]);setPhoto(null);setImgMode("diagram");
      }
    }catch{setPhotos([]);setPhoto(null);setImgMode("diagram");}
  }

  function mapRecord(r){
    if(!r) return r;
    return {
      ...r,
      diagramType: r.diagram_type||r.diagramType||"generic",
      keySpecs: r.key_specs||r.keySpecs||[],
      dimensions: r.dimensions||{},
      transportInfo: r.transport_info||r.transportInfo||{},
      haulerNote: r.hauler_note||r.haulerNote||"",
      _id: r.id||r._id,
    };
  }

  function openProfile(eq){
    setCurrent(mapRecord(eq));setTab("specs");setShare(false);
    setScreen("profile");
    const eqId = eq.id||eq._id;
    if(eqId) { loadPhotos(eqId); loadLogs(eqId); }
    else loadPhoto(eq.name);
    setNotes(eq.notes||"");
    setLogs([]);
    setAddingLog(false);
    setNewLog({haul_date:"",broker_name:"",advertised_width:"",actual_width:"",advertised_weight:"",actual_weight:"",permits_required:false,notes:""});
  }


  async function generateNew(){
    if(!aiQuery.trim())return;
    setAiAdding(true);setAddError(null);
    try{
      const res = await fetch("/api/generate", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:2500,
          system:AI_SYSTEM,
          messages:[{role:"user",content:"Equipment profile for: "+aiQuery}]
        })
      });
      const text = await res.text();
      if(!res.ok){setAddError("Server error "+res.status+": "+text.slice(0,120));return;}
      let data;
      try{data=JSON.parse(text);}catch(e){setAddError("Bad response: "+text.slice(0,120));return;}
      if(data.error){setAddError("API: "+data.error.message);return;}
      let raw=(data.content||[]).map(b=>b.text||"").join("").trim();
      if(!raw){setAddError("Empty response");return;}
      const s=raw.indexOf("{"),e=raw.lastIndexOf("}");
      if(s!==-1&&e!==-1)raw=raw.slice(s,e+1);
      let parsed;
      try{parsed=JSON.parse(raw);}catch(e){setAddError("Parse error: "+raw.slice(0,120));return;}
      if(!parsed.name){setAddError("Missing name in response");return;}
      const saved = await saveCustom(parsed);
      setToast("SAVED");
      if(saved&&saved.id) openProfile(saved);
      else openProfile(parsed);
      setAiQuery("");
    }catch(err){setAddError("Error: "+err.message);}
    finally{setAiAdding(false);}
  }

  const DTYPE = {Excavator:"excavator",Crane:"crane",Dozer:"dozer",Telehandler:"telehandler",Loader:"generic",Scraper:"generic",Grader:"generic",Other:"generic"};

  async function saveManual(){
    if(!newEq.name.trim()){setAddError("Equipment name is required");return;}
    setSaving(true);setAddError(null);
    const eq = {
      name: newEq.name.trim(),
      manufacturer: newEq.manufacturer.trim()||"Unknown",
      category: newEq.category,
      year: new Date().getFullYear()+"",
      tagline: newEq.manufacturer.trim()+" "+newEq.name.trim(),
      diagramType: DTYPE[newEq.category]||"generic",
      keySpecs:[
        {label:"Operating Weight",value:newEq.weight?newEq.weight+" lbs":"—",icon:"⚖️"},
        {label:"Engine Power",value:newEq.power?newEq.power+" HP":"—",icon:"⚙️"},
        {label:"Overall Length",value:newEq.length||"—",icon:"📐"},
        {label:"Overall Width",value:newEq.width||"—",icon:"↔️"},
        {label:"Overall Height",value:newEq.height||"—",icon:"⬆️"},
        {label:"Trailer Type",value:newEq.trailerType,icon:"🚛"},
      ].filter(s=>s.value!=="—"),
      dimensions:{"Overall Length":newEq.length||"—","Overall Width":newEq.width||"—","Overall Height":newEq.height||"—"},
      transportInfo:{"Trailer Type":newEq.trailerType,"Lowboy Tonnage":newEq.tonnage||"N/A","Permits Required":newEq.permits||"None","Escort Required":newEq.escort||"None","Chains Required":newEq.chains?(newEq.chains+" chains"):"See DOT formula","Exhaust Bag Required":newEq.exhaustBag||"No","Boom Securement":newEq.boomSecurement||"No"},
      haulerNote: newEq.haulerNote.trim()||"Verify all dimensions and weight with equipment owner before transport.",
      history: newEq.name.trim()+" — Added to Edwards Carriers equipment library.",
      tags:[newEq.category,"Heavy Equipment","Open Deck"],
    };
    try{
      await saveCustom(eq);
      setToast("SAVED");
      setNewEq({name:"",manufacturer:"",category:"Excavator",weight:"",power:"",length:"",width:"",height:"",trailerType:"RGN / Lowboy",haulerNote:""});
      openProfile(eq);
    }catch(err){setAddError("Save failed: "+err.message);}
    finally{setSaving(false);}
  }

  async function saveTransport(field, val) {
    const updatedTI = {...(current.transportInfo||{}), [field]: val};
    const updated = {...current, transportInfo: updatedTI};
    setCurrent(updated);
    const eqId = current._id||current.id;
    if(eqId) await db.update(eqId, {transport_info: updatedTI});
    setToast("Saved");
  }

  async function handlePhoto(e){
    const file=e.target.files?.[0];if(!file||!current)return;
    const eqId = current._id||current.id;
    try{
      setToast("Uploading...");
      // Convert to base64 for reliable display on all devices
      const b64 = await resizeToBase64(file);
      setPhoto(b64);
      setImgMode("photo");
      if(eqId){
        // Save base64 to equipment_photos table
        const inserted = await db.insertPhoto(eqId, b64, true);
        if(inserted){
          await loadPhotos(eqId);
          setPhotoIdx(0);
        } else {
          setPhotos(prev=>[{id:Date.now()+"",url:b64,equipment_id:eqId,is_primary:true},...prev]);
          setPhotoIdx(0);
        }
      } else {
        // localStorage for prebuilt profiles
        localStorage.setItem("photo:"+slug(current.name),b64);
      }
      setToast("PHOTO SAVED");
    }catch(err){setToast("Error: "+err.message);}
  }

  async function removePhoto(photoId){
    try{
      const eqId = current._id||current.id;
      if(photoId&&eqId){
        await db.deletePhoto(photoId);
        setPhotoIdx(0);
        await loadPhotos(eqId);
      } else if(!eqId) {
        localStorage.removeItem("photo:"+slug(current.name));
        setPhoto(null);setImgMode("diagram");setPhotos([]);
      }
      setToast("PHOTO REMOVED");
    }catch{}
  }

  const isCustom=current&&(current._id||current.id)&&custom.some(c=>c.id===(current._id||current.id));
  const DiagramEl=current?getDiagramEl(current):null;

  if(screen==="home")return(
    <Page toast={toast} onClear={()=>setToast(null)}>
      <Hdr/>
      <div style={{display:"flex",gap:10,marginBottom:18}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search equipment..." style={{flex:1,background:"#f8f9fa",border:"1px solid #44403c",borderRadius:8,padding:"11px 14px",color:"#1a1a1a",fontSize:13,fontFamily:"monospace",outline:"none"}}/>
        {isAdmin&&<Btn amber onClick={()=>{setAddError(null);setScreen("add");}}>+ ADD</Btn>}
      </div>
      {custom.length>0&&<><SL>Custom ({custom.length})</SL><Grd>{custom.filter(e=>ok(e,search)).map((eq,i)=><Crd key={i} eq={eq} badge="CUSTOM" onClick={()=>openProfile(eq)}/>)}</Grd><div style={{marginBottom:16}}/></>}
      <SL>Built-In Library ({PREBUILT.filter(e=>ok(e,search)).length})</SL>
      <Grd>{PREBUILT.filter(e=>ok(e,search)).map((eq,i)=><Crd key={i} eq={eq} onClick={()=>openProfile(eq)}/>)}</Grd>
      {!PREBUILT.concat(custom).some(e=>ok(e,search))&&<div style={{textAlign:"center",padding:"40px 20px",color:"#dee2e6",fontFamily:"monospace",fontSize:11}}>No results for "{search}"</div>}
      <div style={{textAlign:"center",marginTop:30,paddingTop:16,borderTop:"1px solid #eeeeee"}}>
        {isAdmin?(
          <button onClick={()=>{auth.logout();setIsAdmin(false);setToast("LOGGED OUT");}} style={{background:"none",border:"none",color:"#aaaaaa",fontSize:10,fontFamily:"monospace",letterSpacing:1,cursor:"pointer",textDecoration:"underline"}}>Admin: Logged in — Log out</button>
        ):(
          <button onClick={()=>setLoginOpen(true)} style={{background:"none",border:"none",color:"#cccccc",fontSize:10,fontFamily:"monospace",letterSpacing:1,cursor:"pointer",textDecoration:"underline"}}>Admin Login</button>
        )}
      </div>
      {loginOpen&&<LoginModal onClose={()=>setLoginOpen(false)} onSuccess={()=>{setIsAdmin(true);setLoginOpen(false);setToast("LOGGED IN");}}/>}
    </Page>
  );

  const FI = {background:"#ffffff",border:"1px solid #cccccc",borderRadius:7,padding:"10px 12px",color:"#1a1a1a",fontSize:13,fontFamily:"monospace",outline:"none",width:"100%",boxSizing:"border-box"};
  const SEL = {...FI,appearance:"none"};
  const ROW = {marginBottom:14};
  const LBL = {fontSize:9,color:"#6c757d",fontFamily:"monospace",letterSpacing:2,textTransform:"uppercase",marginBottom:5,display:"block"};

  if(screen==="add")return(
    <Page toast={toast} onClear={()=>setToast(null)}>
      <Hdr/>
      <Btn ghost onClick={()=>setScreen("home")} style={{marginBottom:16}}>← BACK</Btn>
      <div style={{background:"#f8f9fa",border:"1px solid #292524",borderRadius:12,padding:22}}>
        <SL>Add Equipment Profile</SL>

        <div style={{marginBottom:20,paddingBottom:20,borderBottom:"1px solid #292524"}}>
          <div style={{fontSize:9,color:"#8b6914",fontFamily:"monospace",letterSpacing:2,marginBottom:10}}>AI GENERATE — TYPE NAME, GET FULL PROFILE</div>
          <div style={{display:"flex",gap:10}}>
            <input value={aiQuery} onChange={e=>setAiQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&generateNew()} placeholder="e.g. Volvo EC950F Excavator" style={{flex:1,background:"#ffffff",border:"1px solid #cccccc",borderRadius:7,padding:"10px 12px",color:"#1a1a1a",fontSize:13,fontFamily:"monospace",outline:"none"}}/>
            <Btn amber onClick={generateNew} disabled={aiAdding||!aiQuery.trim()}>{aiAdding?"Generating"+aiDots:"AI FILL"}</Btn>
          </div>
          <div style={{fontSize:9,color:"#dee2e6",fontFamily:"monospace",marginTop:7}}>Auto-fills all fields from AI training data.</div>
          {addError&&<div style={{background:"#fff5f5",border:"1px solid #991b1b",borderRadius:8,padding:12,color:"#dc3545",fontFamily:"monospace",fontSize:11,marginTop:10}}>{addError}</div>}
        </div>
        <div style={{fontSize:9,color:"#adb5bd",fontFamily:"monospace",letterSpacing:2,marginBottom:12}}>OR ENTER MANUALLY</div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:4}}>
          <div style={{gridColumn:"1/-1",...ROW}}>
            <span style={LBL}>Equipment Name *</span>
            <input style={FI} value={newEq.name} onChange={e=>setNewEq(q=>({...q,name:e.target.value}))} placeholder="e.g. CAT 374 Excavator"/>
          </div>
          <div style={ROW}>
            <span style={LBL}>Manufacturer</span>
            <input style={FI} value={newEq.manufacturer} onChange={e=>setNewEq(q=>({...q,manufacturer:e.target.value}))} placeholder="Caterpillar"/>
          </div>
          <div style={ROW}>
            <span style={LBL}>Category</span>
            <select style={SEL} value={newEq.category} onChange={e=>setNewEq(q=>({...q,category:e.target.value}))}>
              {["Excavator","Crane","Dozer","Telehandler","Loader","Grader","Scraper","Other"].map(c=>(
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div style={ROW}>
            <span style={LBL}>Operating Weight (lbs)</span>
            <input style={FI} value={newEq.weight} onChange={e=>setNewEq(q=>({...q,weight:e.target.value}))} placeholder="194,000"/>
          </div>
          <div style={ROW}>
            <span style={LBL}>Engine Power (HP)</span>
            <input style={FI} value={newEq.power} onChange={e=>setNewEq(q=>({...q,power:e.target.value}))} placeholder="513"/>
          </div>
          <div style={ROW}>
            <span style={LBL}>Overall Length</span>
            <input style={FI} value={newEq.length} onChange={e=>setNewEq(q=>({...q,length:e.target.value}))} placeholder="47 ft 2 in"/>
          </div>
          <div style={ROW}>
            <span style={LBL}>Overall Width</span>
            <input style={FI} value={newEq.width} onChange={e=>setNewEq(q=>({...q,width:e.target.value}))} placeholder="13 ft 2 in"/>
          </div>
          <div style={{gridColumn:"1/-1",...ROW}}>
            <span style={LBL}>Overall Height</span>
            <input style={FI} value={newEq.height} onChange={e=>setNewEq(q=>({...q,height:e.target.value}))} placeholder="15 ft 9 in"/>
          </div>
          <div style={ROW}>
            <span style={LBL}>Trailer Type</span>
            <select style={SEL} value={newEq.trailerType} onChange={e=>setNewEq(q=>({...q,trailerType:e.target.value}))}>
              {["RGN / Lowboy","Multi-Axle Lowboy","Flatbed","Step Deck","Double Drop","Extendable RGN","Multi-Trailer Convoy"].map(t=>(
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div style={ROW}>
            <span style={LBL}>Lowboy Tonnage</span>
            <select style={SEL} value={newEq.tonnage} onChange={e=>setNewEq(q=>({...q,tonnage:e.target.value}))}>
              {["","35 Ton Lowboy","40 Ton Lowboy","50-55 Ton Lowboy"].map(t=>(
                <option key={t} value={t}>{t||"Not applicable"}</option>
              ))}
            </select>
          </div>
          <div style={ROW}>
            <span style={LBL}>Permits Required</span>
            <select style={SEL} value={newEq.permits} onChange={e=>setNewEq(q=>({...q,permits:e.target.value}))}>
              {["None","Overheight","Overwidth","Overweight","Overheight + Overwidth","Overheight + Overweight","Overwidth + Overweight","All Permits"].map(t=>(
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div style={ROW}>
            <span style={LBL}>Escort Required</span>
            <select style={SEL} value={newEq.escort} onChange={e=>setNewEq(q=>({...q,escort:e.target.value}))}>
              {["None","1 Pilot Car","2 Pilot Cars","Police Escort","Police + Pilot Cars"].map(t=>(
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div style={ROW}>
            <span style={LBL}>Chains Required</span>
            <input style={FI} value={newEq.chains} onChange={e=>setNewEq(q=>({...q,chains:e.target.value}))} placeholder="e.g. 6"/>
          </div>
          <div style={ROW}>
            <span style={LBL}>Exhaust Bag Required</span>
            <select style={SEL} value={newEq.exhaustBag||"No"} onChange={e=>setNewEq(q=>({...q,exhaustBag:e.target.value}))}>
              {["No","Yes"].map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          <div style={ROW}>
            <span style={LBL}>Boom Securement</span>
            <select style={SEL} value={newEq.boomSecurement||"No"} onChange={e=>setNewEq(q=>({...q,boomSecurement:e.target.value}))}>
              {["No","Yes"].map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          <div style={{gridColumn:"1/-1",...ROW}}>
            <span style={LBL}>Hauler Notes</span>
            <input style={FI} value={newEq.haulerNote} onChange={e=>setNewEq(q=>({...q,haulerNote:e.target.value}))} placeholder="e.g. Remove blade before loading. Oversize all 48 states."/>
          </div>
        </div>
        {addError&&<div style={{background:"#fff5f5",border:"1px solid #991b1b",borderRadius:8,padding:12,color:"#dc3545",fontFamily:"monospace",fontSize:11,marginBottom:12}}>{addError}</div>}
        <Btn amber onClick={saveManual} disabled={saving||!newEq.name.trim()} style={{width:"100%",padding:"13px",fontSize:12,letterSpacing:2}}>{saving?"SAVING...":"SAVE PROFILE"}</Btn>
      </div>
    </Page>
  );

  if(screen==="profile"&&current)return(
    <Page toast={toast} onClear={()=>setToast(null)}>
      <Hdr/>
      <div style={{display:"flex",gap:12,marginBottom:10}}>
        <div style={{width:4,minHeight:52,background:"#c9a227",borderRadius:2,marginTop:2,flexShrink:0}}/>
        <div style={{flex:1}}>
          <div style={{fontSize:9,letterSpacing:4,color:"#8b6914",textTransform:"uppercase",fontFamily:"monospace"}}>{current.manufacturer} · {current.category}</div>
          <h1 style={{fontSize:22,fontWeight:700,margin:"2px 0",color:"#1a1a1a",letterSpacing:-0.5}}>{current.name}</h1>
          <div style={{fontSize:11,color:"#c9a227",fontFamily:"monospace"}}>{current.tagline}</div>
        </div>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        <Btn ghost onClick={()=>setScreen("home")}>← BACK</Btn>
        <Btn ghost active={shareOpen} onClick={()=>setShare(s=>!s)}>SHARE</Btn>
        {isAdmin&&isCustom&&<Btn danger onClick={()=>{deleteCustom(current._id||current.id);setScreen("home");}}>DELETE</Btn>}
      </div>
      {shareOpen&&(
        <SharePanel eq={current} slug={slug} onCopy={msg=>setToast(msg)}/>
      )}
      <div style={{background:"#f8f9fa",border:"1px solid #292524",borderRadius:12,padding:16,marginBottom:14}}>
        <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
          <Btn ghost active={imgMode==="diagram"} onClick={()=>setImgMode("diagram")}>DIAGRAM</Btn>

          {isAdmin&&<label style={{padding:"6px 14px",borderRadius:6,border:"1px solid "+(imgMode==="photo"?"#c9a227":"#dee2e6"),background:imgMode==="photo"?"#1a3a5c":"transparent",color:imgMode==="photo"?"#1a1a1a":"#6c757d",fontSize:10,fontFamily:"monospace",letterSpacing:1,cursor:"pointer",display:"inline-block"}}>
            UPLOAD PHOTO<input type="file" accept="image/*" onChange={handlePhoto} style={{display:"none"}}/>
          </label>}
          {isAdmin&&photo&&imgMode==="photo"&&<Btn danger onClick={()=>removePhoto(photos[photoIdx]?.id)}>REMOVE</Btn>}
        </div>
        {imgMode==="diagram"&&(
          <div style={{position:"relative"}}>
            <div style={{position:"absolute",top:0,left:2,fontSize:8,color:"#adb5bd",letterSpacing:3,fontFamily:"monospace",textTransform:"uppercase"}}>Profile View Not to Scale</div>
            <div style={{position:"absolute",top:0,right:2,fontSize:8,color:"#adb5bd",fontFamily:"monospace"}}>{current.year}</div>
            <div style={{height:280,paddingTop:16}}><DiagramEl/></div>
          </div>
        )}
        {imgMode==="ai"&&(
          <div style={{minHeight:220,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:8,background:"#ffffff",overflow:"hidden"}}>
            {aiLoad?<div style={{textAlign:"center",padding:40}}><div style={{fontSize:28,marginBottom:10,animation:"spin 2s linear infinite",display:"inline-block"}}>⚙️</div><div style={{fontFamily:"monospace",color:"#c9a227",fontSize:11,letterSpacing:2}}>DRAWING...</div><div style={{fontFamily:"monospace",color:"#dee2e6",fontSize:9,marginTop:6}}>15-30 seconds</div></div>
            :<div style={{textAlign:"center",padding:40,color:"#aaaaaa",fontFamily:"sans-serif",fontSize:12}}>AI Draw not available</div>}
          </div>
        )}
        {imgMode==="photo"&&(
          <div>
            <div style={{minHeight:220,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:8,background:"#ffffff",overflow:"hidden"}}>
              {photo?<div style={{width:"100%",position:"relative",background:"#f0f0f0",borderRadius:8,overflow:"hidden"}}><img src={photo} alt={current.name} style={{width:"100%",height:"auto",maxHeight:480,display:"block",objectFit:"contain"}}/><div style={{position:"absolute",bottom:8,right:10,background:"#00000099",padding:"3px 8px",borderRadius:4,fontSize:8,color:"#c9a227",fontFamily:"monospace"}}>YOUR PHOTO{photos.length>1?" "+(photoIdx+1)+"/"+photos.length:""}</div></div>
              :<div style={{textAlign:"center",padding:40}}><div style={{fontSize:36,marginBottom:12}}>📷</div><div style={{fontFamily:"monospace",color:"#6c757d",fontSize:11,letterSpacing:2,marginBottom:isAdmin?14:0}}>NO PHOTO YET</div>{isAdmin&&<label style={{padding:"10px 22px",background:"#c9a227",color:"#1a1a1a",borderRadius:8,fontSize:11,fontWeight:700,fontFamily:"monospace",letterSpacing:2,cursor:"pointer",display:"inline-block"}}>TAP TO UPLOAD<input type="file" accept="image/*" onChange={handlePhoto} style={{display:"none"}}/></label>}</div>}
            </div>
            {photos.length>1&&(
              <div style={{display:"flex",gap:6,marginTop:10,flexWrap:"wrap"}}>
                {photos.map((p,i)=>(
                  <div key={p.id||i} onClick={()=>{setPhotoIdx(i);setPhoto(p.url);}} style={{width:54,height:54,borderRadius:6,overflow:"hidden",border:"2px solid "+(i===photoIdx?"#c9a227":"#dee2e6"),cursor:"pointer",flexShrink:0,background:"#f0f0f0"}}>
                    <img src={p.url} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div style={{display:"flex",gap:4,marginBottom:14,flexWrap:"wrap"}}>
        {["specs","dimensions","transport","route","about",...(isAdmin?["notes"]:[])].map(t=><Btn key={t} ghost active={tab===t} onClick={()=>setTab(t)}>{t==="route"?"ROUTE PLAN":t.toUpperCase()}</Btn>)}
      </div>
      {tab==="specs"&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:10}}>{current.keySpecs?.map((s,i)=>(<div key={i} style={{background:"#f8f9fa",border:"1px solid #292524",borderRadius:10,padding:"13px 12px"}}><div style={{fontSize:20,marginBottom:5}}>{s.icon}</div><div style={{fontSize:15,fontWeight:700,color:"#c9a227",fontFamily:"monospace"}}>{s.value}</div><div style={{fontSize:9,color:"#6c757d",letterSpacing:1.5,textTransform:"uppercase",marginTop:3}}>{s.label}</div></div>))}</div>}
      {tab==="dimensions"&&(()=>{
        const expandKey=k=>{const map={"Length":"Equipment Length","Width":"Equipment Width","Height":"Equipment Height","Weight":"Equipment Weight","Clearance":"Ground Clearance","Gauge":"Track Gauge","Transport Length":"Equipment Length","Transport Width":"Equipment Width","Transport Height":"Equipment Height"};return map[k]||k;};
        return <div style={{background:"#ffffff",border:"1px solid #dddddd",borderRadius:10,padding:18}}>{Object.entries(current.dimensions||{}).map(([k,v])=>(<div key={k} style={{display:"flex",justifyContent:"space-between",padding:"12px 0",borderBottom:"1px solid #eeeeee"}}><span style={{color:"#666666",fontSize:12,fontFamily:"sans-serif",fontWeight:500}}>{expandKey(k)}</span><span style={{color:"#c9a227",fontSize:13,fontWeight:600,fontFamily:"sans-serif"}}>{v}</span></div>))}</div>;
      })()}
      {tab==="transport"&&(()=>{
  const ti = current.transportInfo||{};
  const SI = {background:"#ffffff",border:"1px solid #cccccc",borderRadius:6,padding:"8px 10px",color:"#111111",fontSize:12,fontFamily:"sans-serif",width:"100%",marginTop:4,boxSizing:"border-box"};
  const LB = {fontSize:11,color:"#666666",fontFamily:"sans-serif",fontWeight:600,marginBottom:4,marginTop:14,display:"block"};
  const RO = {display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 0",borderBottom:"1px solid #eeeeee"};
  const ROL = {fontSize:12,color:"#666666",fontFamily:"sans-serif"};
  const ROV = {fontSize:13,fontWeight:600,color:"#111111",fontFamily:"sans-serif",textAlign:"right"};

  function SelectField({label, field, options, fallback}){
    const val = ti[field]||fallback||"";
    if(!isAdmin) return <div style={RO}><span style={ROL}>{label}</span><span style={ROV}>{val||"—"}</span></div>;
    return (<>
      <label style={LB}>{label}</label>
      <select style={SI} value={val} onChange={e=>saveTransport(field,e.target.value)}>
        {options.map(t=><option key={t} value={t}>{t||"Not applicable"}</option>)}
      </select>
    </>);
  }

  function InputField({label, field, placeholder}){
    const val = ti[field]||"";
    if(!isAdmin) return <div style={RO}><span style={ROL}>{label}</span><span style={ROV}>{val||"—"}</span></div>;
    return (<>
      <label style={LB}>{label}</label>
      <input style={SI} value={val} onChange={e=>saveTransport(field,e.target.value)} placeholder={placeholder||""}/>
    </>);
  }

  return (
<div style={{background:"#ffffff",border:"1px solid #dddddd",borderRadius:10,padding:18}}>
      <SelectField label="Trailer Type" field="Trailer Type" options={["RGN / Lowboy","Multi-Axle Lowboy","Flatbed","Step Deck","Double Drop","Extendable RGN","Multi-Trailer Convoy"]}/>
      <SelectField label="Lowboy Tonnage" field="Lowboy Tonnage" options={["","35 Ton Lowboy","40 Ton Lowboy","50-55 Ton Lowboy"]}/>
      <SelectField label="Permits Required" field="Permits Required" options={["None","Overheight","Overwidth","Overweight","Overheight + Overwidth","Overheight + Overweight","Overwidth + Overweight","All Permits"]} fallback="None"/>
      <SelectField label="Escort Required" field="Escort Required" options={["None","1 Pilot Car","2 Pilot Cars","Police Escort","Police + Pilot Cars"]} fallback="None"/>
      <InputField label="Chains Required" field="Chains Required"/>
      <SelectField label="Exhaust Bag Required" field="Exhaust Bag Required" options={["No","Yes"]} fallback="No"/>
      <SelectField label="Boom Securement" field="Boom Securement" options={["No","Yes"]} fallback="No"/>
      <InputField label="Recommended Tractor & Trailer Axles" field="Recommended Axles" placeholder="e.g. 5-7 Axle"/>
      {current.haulerNote&&(
        <div style={{marginTop:18,padding:13,background:"#fff3cd66",border:"1px solid #c9a227",borderRadius:8}}>
          <div style={{fontSize:11,color:"#c9a227",fontFamily:"monospace",marginBottom:5}}>Hauler Note</div>
          <div style={{fontSize:12,color:"#6c757d",lineHeight:1.8}}>{current.haulerNote}</div>
        </div>
      )}
      <LoadLogTab eqId={current._id||current.id} logs={logs} newLog={newLog} setNewLog={setNewLog} savingLog={savingLog} setSavingLog={setSavingLog} loadLogs={loadLogs} onToast={setToast} resizeToBase64={resizeToBase64} isAdmin={isAdmin}/>
    </div>
  );
})()}

      {tab==="about"&&<div style={{background:"#f8f9fa",border:"1px solid #292524",borderRadius:10,padding:20}}><p style={{fontSize:13,lineHeight:1.9,color:"#343a40",margin:0,whiteSpace:"pre-line"}}>{current.history}</p><div style={{marginTop:16,display:"flex",gap:8,flexWrap:"wrap"}}>{current.tags?.map(t=>(<span key={t} style={{padding:"4px 11px",background:"#e9ecef",borderRadius:20,fontSize:9,color:"#8b6914",fontFamily:"monospace",letterSpacing:1,border:"1px solid #44403c"}}>{t}</span>))}</div></div>}

      {tab==="route"&&<RoutePlannerTab eq={current}/>}
      {tab==="notes"&&isAdmin&&<NotesTab eqId={current._id||current.id} notes={profileNotes} setNotes={setProfileNotes} onSave={()=>setToast("NOTES SAVED")} slug={slug} name={current.name}/>}
      {tab==="notes"&&!isAdmin&&<div style={{textAlign:"center",padding:30,color:"#aaaaaa",fontFamily:"sans-serif",fontSize:12}}>Admin login required to view notes.</div>}
            <div style={{marginTop:24,paddingTop:14,borderTop:"1px solid #1c1917",display:"flex",justifyContent:"space-between"}}>
        <span style={{fontSize:8,color:"#adb5bd",fontFamily:"monospace",letterSpacing:2}}>EDWARDSCARRIERS.COM</span>
        <span style={{fontSize:8,color:"#adb5bd",fontFamily:"monospace",letterSpacing:2}}>@EDWARDSCARRIERS</span>
      </div>
    </Page>
  );

  return null;
}

function Page({children,toast,onClear}){return(<div style={{fontFamily:"'Georgia',serif",background:"#f5f6f8",minHeight:"100vh",padding:"22px 14px",color:"#2d2d2d"}}>{toast&&<Toast msg={toast} onDone={onClear}/>}<div style={{maxWidth:860,margin:"0 auto"}}>{children}</div><style>{`input::placeholder{color:#aaaaaa}input:focus{border-color:#c9a227!important}select{color:#111111}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style></div>);}
function Hdr(){return(<div style={{marginBottom:22}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontSize:9,letterSpacing:4,color:"#8b6914",textTransform:"uppercase",fontFamily:"monospace"}}>Edwards Carriers</div><div style={{fontSize:18,fontWeight:700,color:"#1a1a1a",letterSpacing:-0.5}}>Equipment Specs</div></div><div style={{textAlign:"right"}}><div style={{fontSize:8,color:"#adb5bd",fontFamily:"monospace",letterSpacing:2}}>edwardscarriers.com</div><div style={{fontSize:8,color:"#adb5bd",fontFamily:"monospace",letterSpacing:2}}>@edwardscarriers</div></div></div><div style={{fontSize:11,color:"#999999",fontFamily:"sans-serif",marginTop:6}}>Specs and transport requirements for equipment we haul</div></div>);}
function SL({children}){return <div style={{fontSize:9,color:"#adb5bd",fontFamily:"monospace",letterSpacing:3,textTransform:"uppercase",marginBottom:10}}>{children}</div>;}
function Grd({children}){return <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))",gap:10}}>{children}</div>;}
function Crd({eq,onClick,badge}){
  const[h,setH]=useState(false);
  return(<div onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{background:"#f8f9fa",border:"1px solid "+(h?"#c9a227":"#ced4da"),borderRadius:10,padding:16,cursor:"pointer",transition:"border-color 0.15s",position:"relative"}}>{badge&&<span style={{position:"absolute",top:10,right:10,background:"#1a3a5c",color:"#c9a227",fontSize:8,fontFamily:"monospace",padding:"2px 7px",borderRadius:10}}>{badge}</span>}<div style={{fontSize:9,color:"#8b6914",fontFamily:"monospace",letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>{eq.category}</div><div style={{fontSize:14,fontWeight:700,color:"#1a1a1a",marginBottom:5,lineHeight:1.3}}>{eq.name}</div><div style={{fontSize:11,color:"#c9a227",fontFamily:"monospace",marginBottom:5}}>{eq.keySpecs?.[0]?.value}</div><div style={{fontSize:10,color:"#adb5bd",fontFamily:"monospace"}}>{eq.transportInfo?.["Trailer Type"]}</div></div>);
}
function Btn({children,onClick,amber,ghost,active,danger,disabled,style={}}){
  const b={padding:"6px 14px",borderRadius:6,fontSize:10,fontFamily:"monospace",letterSpacing:1,cursor:disabled?"not-allowed":"pointer",border:"1px solid",transition:"all 0.15s",...style};
  if(amber) return (<button onClick={onClick} disabled={disabled} style={{...b,background:disabled?"#1a3a5c":"#c9a227",color:"#ffffff",borderColor:disabled?"#1a3a5c":"#c9a227",fontWeight:700}}>{children}</button>);
  if(danger) return (<button onClick={onClick} style={{...b,background:"transparent",borderColor:"#dc3545",color:"#dc3545"}}>{children}</button>);
  return (<button onClick={onClick} disabled={disabled} style={{...b,background:active?"#1a3a5c":"transparent",borderColor:active?"#c9a227":"#dee2e6",color:active?"#1a1a1a":disabled?"#adb5bd":"#6c757d"}}>{children}</button>);
}
function ok(eq,s){if(!s)return true;const q=s.toLowerCase();return eq.name?.toLowerCase().includes(q)||eq.category?.toLowerCase().includes(q);}
