import React, { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://ygtzqdjhhlrcurrqnyco.supabase.co",
  "sb_publishable_W2b4dSD-NGpBgzYfzFFp1A_jTbFIlCu"
);

// ── CONSTANTS ─────────────────────────────────────────────────────────────────

const USERS = {
  nick: { name: "Nick", color: "#4F46E5", bg: "#EEF2FF", light: "#E0E7FF" },
  maz:  { name: "Maz",  color: "#DB2777", bg: "#FDF2F8", light: "#FCE7F3" },
};

const STAGES = ["Outreach", "Nurturing", "Active", "Proposal", "Closed Won", "Closed Lost"];

const STAGE_COLORS = {
  Outreach:     { bg: "#F1F5F9", text: "#475569" },
  Nurturing:    { bg: "#FFF7ED", text: "#C2410C" },
  Active:       { bg: "#EFF6FF", text: "#1D4ED8" },
  Proposal:     { bg: "#FAF5FF", text: "#7C3AED" },
  "Closed Won": { bg: "#F0FDF4", text: "#15803D" },
  "Closed Lost":{ bg: "#F8FAFC", text: "#94A3B8" },
};

const ACTIVITY_TYPES = [
  { value: "note",    label: "Note",    icon: "📝" },
  { value: "call",    label: "Call",    icon: "📞" },
  { value: "email",   label: "Email",   icon: "✉️" },
  { value: "meeting", label: "Meeting", icon: "🤝" },
  { value: "demo",    label: "Demo",    icon: "🖥️" },
  { value: "linkedin",label: "LinkedIn",icon: "💼" },
];

const INDUSTRIES = [
  "Technology", "Finance", "Healthcare", "Education", "Retail",
  "Manufacturing", "Media", "Real Estate", "Legal", "Consulting", "Other",
];

const URG_DOT  = { overdue: "#DC2626", today: "#D97706", soon: "#CA8A04", ok: "#D1D5DB" };
const URG_TEXT = { overdue: "#DC2626", today: "#D97706", soon: "#CA8A04", ok: "#6B7280" };

const PASSWORD = "Nickandmaz26";

// ── HELPERS ───────────────────────────────────────────────────────────────────

const pad = n => String(n).padStart(2, "0");
const toLocalISO = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const TODAY = toLocalISO(new Date());

const getEndOfWorkWeek = () => {
  const today = new Date(); today.setHours(0,0,0,0);
  const day = today.getDay();
  const daysUntilFriday = day === 0 ? 5 : day === 6 ? 6 : (5 - day) || 7;
  const friday = new Date(today);
  friday.setDate(today.getDate() + daysUntilFriday);
  return friday;
};

const workdaysUntil = (dueDate) => {
  const today = new Date(); today.setHours(0,0,0,0);
  const due = new Date(dueDate); due.setHours(0,0,0,0);
  if (due <= today) return Math.round((due - today) / 86400000);
  let count = 0;
  const cursor = new Date(today); cursor.setDate(cursor.getDate() + 1);
  while (cursor <= due) {
    const d = cursor.getDay();
    if (d !== 0 && d !== 6) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
};

const urgency = (dueDate) => {
  if (!dueDate) return { label: "No date", level: "ok", diff: 999 };
  const today = new Date(); today.setHours(0,0,0,0);
  const due = new Date(dueDate); due.setHours(0,0,0,0);
  const diff = Math.round((due - today) / 86400000);
  const workdays = workdaysUntil(dueDate);
  const endOfWeek = getEndOfWorkWeek();
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, level: "overdue", diff };
  if (diff === 0) return { label: "Due today", level: "today", diff };
  if (due <= endOfWeek) return { label: `${workdays}wd`, level: "soon", diff };
  return { label: `in ${workdays}wd`, level: "ok", diff };
};

const fmtDateLong = d => new Date(d).toLocaleDateString("en-GB", { weekday:"short", day:"numeric", month:"long", year:"numeric" });
const fmtDateShort = d => new Date(d).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" });

const fmtCurrency = v => {
  if (!v) return "";
  const n = parseFloat(v);
  if (isNaN(n)) return "";
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
};

const activityIcon = type => ACTIVITY_TYPES.find(a => a.value === type)?.icon || "📝";

// ── CSS ───────────────────────────────────────────────────────────────────────

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Epilogue:wght@300;400;500;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #FAFAF8; }
  .e { font-family: 'Epilogue', sans-serif; }
  .row { border-bottom: 1px solid #EBEBEB; transition: background .12s; cursor: pointer; }
  .row:hover { background: #F7F7F5; }
  .btn { border: none; cursor: pointer; font-family: 'Epilogue', sans-serif; font-size: 12px; letter-spacing: .04em; padding: 9px 18px; border-radius: 6px; transition: opacity .15s; }
  .btn:hover { opacity: .8; }
  .ghost { background: none; border: 1px solid #E5E5E5; color: #6B7280; }
  .ghost:hover { border-color: #9CA3AF; opacity: 1; }
  input, select, textarea { background: #fff; border: 1px solid #E5E5E5; color: #1a1a1a; font-family: 'Epilogue', sans-serif; font-size: 13px; padding: 9px 12px; border-radius: 6px; width: 100%; outline: none; transition: border .15s; resize: vertical; }
  input:focus, select:focus, textarea:focus { border-color: #1a1a1a; }
  .tag { display: inline-block; font-family: 'Epilogue', sans-serif; font-size: 10px; font-weight: 500; letter-spacing: .06em; padding: 3px 10px; border-radius: 20px; }
  .nav-btn { background: none; border: none; font-family: 'Epilogue', sans-serif; font-size: 13px; cursor: pointer; padding: 8px 16px; border-radius: 6px; color: #6B7280; transition: all .12s; }
  .nav-btn:hover { background: #F3F4F6; color: #1a1a1a; }
  .nav-btn.active { background: #1a1a1a; color: #fff; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  .fu { animation: fadeUp .25s ease; }
  .lbl { font-family:'Epilogue',sans-serif; font-size:10px; letter-spacing:.1em; text-transform:uppercase; color:#9CA3AF; display:block; margin-bottom:5px; }
  .filter-btn { background: none; border: 1px solid #E5E5E5; color: #9CA3AF; font-family: 'Epilogue', sans-serif; font-size: 11px; padding: 5px 14px; border-radius: 20px; cursor: pointer; transition: all .15s; }
  .filter-btn.on { border-color: #1a1a1a; color: #1a1a1a; background: #fff; }
  .timeline-dot { width: 10px; height: 10px; border-radius: 50%; background: #E5E7EB; border: 2px solid #fff; flex-shrink: 0; margin-top: 4px; }
  .user-pill { display: inline-flex; align-items: center; gap: 5px; font-family: 'Epilogue', sans-serif; font-size: 11px; font-weight: 500; padding: 3px 10px; border-radius: 20px; }
  .spinner { width: 32px; height: 32px; border: 3px solid #EBEBEB; border-top-color: #1a1a1a; border-radius: 50%; animation: spin .7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .kanban-col { background: #F8F8F6; border-radius: 10px; padding: 14px; min-height: 200px; flex: 0 0 220px; }
  .kanban-card { background: #fff; border: 1px solid #EBEBEB; border-radius: 8px; padding: 12px 14px; margin-bottom: 8px; cursor: pointer; transition: box-shadow .15s; }
  .kanban-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
  .search-highlight { background: #FEF9C3; border-radius: 2px; }
  .tab-btn { border: none; background: none; font-family: 'Epilogue', sans-serif; font-size: 13px; cursor: pointer; padding: 10px 18px; border-bottom: 2px solid transparent; color: #9CA3AF; transition: all .15s; margin-bottom: -1px; }
  .tab-btn.active { border-bottom-color: #1a1a1a; color: #1a1a1a; font-weight: 500; }
  .chip { display: inline-flex; align-items: center; gap: 4px; font-family: 'Epilogue', sans-serif; font-size: 11px; padding: 3px 8px; border-radius: 20px; background: #F3F4F6; color: #6B7280; }
  .chip-remove { cursor: pointer; font-size: 10px; color: #9CA3AF; line-height: 1; background: none; border: none; padding: 0; }
  .chip-remove:hover { color: #1a1a1a; }
`;

// ── SMALL COMPONENTS ──────────────────────────────────────────────────────────

const Avatar = ({ userId, size = 24 }) => {
  const u = USERS[userId] || USERS.nick;
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:u.bg, border:`2px solid ${u.color}20`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
      <span style={{ fontFamily:"'Epilogue',sans-serif", fontSize:size*0.4, fontWeight:600, color:u.color }}>{u.name[0]}</span>
    </div>
  );
};

const OwnerPill = ({ userId }) => {
  const u = USERS[userId] || USERS.nick;
  return (
    <span className="user-pill" style={{ background:u.bg, color:u.color }}>
      <Avatar userId={userId} size={14} />
      {u.name}
    </span>
  );
};

const UrgencyBadge = ({ dueDate }) => {
  const urg = urgency(dueDate);
  return (
    <div style={{ display:"flex", alignItems:"center", gap:5 }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:URG_DOT[urg.level], flexShrink:0 }} />
      <span className="e" style={{ fontSize:11, color:URG_TEXT[urg.level], fontWeight:500 }}>{urg.label}</span>
    </div>
  );
};

const StageBadge = ({ stage }) => (
  <span className="tag" style={{ background:STAGE_COLORS[stage]?.bg || "#F1F5F9", color:STAGE_COLORS[stage]?.text || "#475569" }}>{stage}</span>
);

// ── CALENDAR PICKER ───────────────────────────────────────────────────────────

const CalendarPicker = ({ value, onChange, label }) => {
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState(() => value ? new Date(value) : new Date());
  const [pos, setPos] = useState({ top:0, left:0 });
  const triggerRef = useRef(null);

  const openCalendar = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const top = spaceBelow > 360 ? rect.bottom + 6 : rect.top - 366;
      setPos({ top, left: Math.min(rect.left, window.innerWidth - 296) });
    }
    setOpen(o => !o);
  };

  const today = new Date(); today.setHours(0,0,0,0);
  const selected = value ? (() => { const d = new Date(value); d.setHours(0,0,0,0); return d; })() : null;
  const year = viewing.getFullYear(), month = viewing.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const monthName = viewing.toLocaleDateString("en-GB", { month:"long", year:"numeric" });
  const blanks = Array(firstDay).fill(null);
  const days = Array.from({ length: daysInMonth }, (_,i) => i+1);

  const selectDay = (day) => {
    onChange(toLocalISO(new Date(year, month, day)));
    setOpen(false);
  };

  const displayValue = value ? fmtDateShort(value) : "";

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (triggerRef.current && !triggerRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div style={{ position:"relative" }}>
      {label && <label className="lbl">{label}</label>}
      <div ref={triggerRef} onClick={openCalendar} style={{ background:"#fff", border:"1px solid #E5E5E5", borderRadius:6, padding:"9px 12px", cursor:"pointer", fontFamily:"Epilogue,sans-serif", fontSize:13, color:value?"#1a1a1a":"#9CA3AF", display:"flex", alignItems:"center", justifyContent:"space-between", borderColor:open?"#1a1a1a":"#E5E5E5", transition:"border .15s" }}>
        <span>{displayValue || "Select date"}</span>
        <span style={{ fontSize:12, color:"#9CA3AF" }}>📅</span>
      </div>
      {open && (
        <div style={{ position:"fixed", top:pos.top, left:pos.left, zIndex:9999, background:"#fff", border:"1px solid #E5E5E5", borderRadius:10, boxShadow:"0 8px 30px rgba(0,0,0,0.12)", padding:16, width:280 }} onClick={e => e.stopPropagation()}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
            <button onClick={() => setViewing(new Date(year, month-1, 1))} style={{ border:"none", background:"none", cursor:"pointer", fontSize:16, color:"#6B7280", padding:"2px 6px" }}>‹</button>
            <span style={{ fontFamily:"Cormorant Garamond,serif", fontSize:16, fontWeight:700 }}>{monthName}</span>
            <button onClick={() => setViewing(new Date(year, month+1, 1))} style={{ border:"none", background:"none", cursor:"pointer", fontSize:16, color:"#6B7280", padding:"2px 6px" }}>›</button>
          </div>
          <div style={{ display:"flex", gap:4, marginBottom:10, flexWrap:"wrap" }}>
            {[["Today",0],["+3 days",3],["Next Mon",null],["+2 weeks",14]].map(([l,n]) => (
              <button key={l} onClick={() => {
                let d = new Date(today);
                if (l === "Next Mon") { const dow = d.getDay(); d.setDate(d.getDate() + (dow===0?1:8-dow)); }
                else d.setDate(d.getDate()+n);
                onChange(toLocalISO(d)); setViewing(new Date(d)); setOpen(false);
              }} style={{ fontFamily:"Epilogue,sans-serif", fontSize:10, border:"1px solid #E5E5E5", background:"#FAFAF8", borderRadius:20, padding:"3px 8px", cursor:"pointer", color:"#6B7280" }}>{l}</button>
            ))}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:4 }}>
            {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => <div key={d} style={{ textAlign:"center", fontFamily:"Epilogue,sans-serif", fontSize:10, color:"#C4C4C4", padding:"2px 0" }}>{d}</div>)}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
            {blanks.map((_,i) => <div key={`b${i}`} />)}
            {days.map(day => {
              const d = new Date(year,month,day); d.setHours(0,0,0,0);
              const isSel = selected && d.getTime()===selected.getTime();
              const isT = d.getTime()===today.getTime();
              const isPast = d < today;
              const isWknd = d.getDay()===0||d.getDay()===6;
              return (
                <button key={day} onClick={() => !isPast && selectDay(day)} style={{ border:"none", borderRadius:6, padding:"6px 2px", cursor:isPast?"default":"pointer", fontFamily:"Epilogue,sans-serif", fontSize:12, textAlign:"center", background:isSel?"#1a1a1a":isT?"#EEF2FF":"transparent", color:isSel?"#fff":isPast?"#D1D5DB":isWknd?"#C4C4C4":"#1a1a1a", fontWeight:isT||isSel?600:400 }}>{day}</button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ── TAG INPUT ─────────────────────────────────────────────────────────────────

const TagInput = ({ tags = [], onChange }) => {
  const [input, setInput] = useState("");
  const add = () => {
    const t = input.trim().toLowerCase();
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setInput("");
  };
  return (
    <div style={{ border:"1px solid #E5E5E5", borderRadius:6, padding:"6px 10px", background:"#fff", display:"flex", flexWrap:"wrap", gap:6, alignItems:"center", minHeight:40 }}>
      {tags.map(t => (
        <span key={t} className="chip">
          {t}
          <button className="chip-remove" onClick={() => onChange(tags.filter(x => x!==t))}>×</button>
        </span>
      ))}
      <input
        value={input} onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key==="Enter"||e.key===",") { e.preventDefault(); add(); } }}
        onBlur={add}
        placeholder={tags.length===0 ? "Add tags (press Enter)" : ""}
        style={{ border:"none", outline:"none", padding:"2px 0", fontSize:12, flex:1, minWidth:80, background:"transparent" }}
      />
    </div>
  );
};

// ── SEARCH BAR ────────────────────────────────────────────────────────────────

const SearchBar = ({ value, onChange }) => (
  <div style={{ position:"relative" }}>
    <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontSize:14, color:"#C4C4C4" }}>🔍</span>
    <input
      value={value} onChange={e => onChange(e.target.value)}
      placeholder="Search companies, contacts, notes…"
      style={{ paddingLeft:36, paddingRight:value?36:12 }}
    />
    {value && (
      <button onClick={() => onChange("")} style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", border:"none", background:"none", cursor:"pointer", fontSize:16, color:"#9CA3AF" }}>×</button>
    )}
  </div>
);

// ── OWNER BAR ─────────────────────────────────────────────────────────────────

const OwnerBar = ({ contacts }) => {
  const nickCount = contacts.filter(c => c.owner==="nick"&&!c.archived).length;
  const mazCount  = contacts.filter(c => c.owner==="maz" &&!c.archived).length;
  const total = nickCount + mazCount;
  if (!total) return null;
  return (
    <div style={{ display:"flex", gap:12, alignItems:"center" }}>
      <div style={{ flex:1, height:6, borderRadius:10, background:"#F1F5F9", overflow:"hidden", display:"flex" }}>
        <div style={{ width:`${(nickCount/total)*100}%`, background:USERS.nick.color, borderRadius:"10px 0 0 10px", transition:"width .3s" }} />
        <div style={{ width:`${(mazCount/total)*100}%`,  background:USERS.maz.color,  borderRadius:"0 10px 10px 0",  transition:"width .3s" }} />
      </div>
      <div style={{ display:"flex", gap:10, flexShrink:0 }}>
        <span className="e" style={{ fontSize:11, color:USERS.nick.color }}>{nickCount} Nick</span>
        <span className="e" style={{ fontSize:11, color:USERS.maz.color }}>{mazCount} Maz</span>
      </div>
    </div>
  );
};

// ── EMPTY STATE ───────────────────────────────────────────────────────────────

const EmptyState = ({ icon="✦", title, sub }) => (
  <div style={{ background:"#fff", border:"1px solid #EBEBEB", borderRadius:10, padding:"48px 24px", textAlign:"center" }}>
    <div style={{ fontSize:28, marginBottom:8 }}>{icon}</div>
    <div style={{ fontSize:20, fontWeight:600, color:"#1a1a1a" }}>{title}</div>
    {sub && <div className="e" style={{ fontSize:13, color:"#9CA3AF", marginTop:6 }}>{sub}</div>}
  </div>
);

// ── MAIN APP ──────────────────────────────────────────────────────────────────

const EMPTY_CONTACT = {
  company:"", contact:"", phone:"", email:"", linkedin:"",
  website:"", industry:"", company_size:"", deal_value:"",
  last_touch:TODAY, last_note:"", next_action:"", next_due:"",
  stage:"Outreach", owner:"nick", tags:[], archived:false,
};

export default function App() {
  const [currentUser, setCurrentUser] = useState("nick");
  const [contacts,    setContacts]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [page,        setPage]        = useState("home");
  const [selected,    setSelected]    = useState(null);
  const [showAdd,     setShowAdd]     = useState(false);
  const [form,        setForm]        = useState({ ...EMPTY_CONTACT });
  const [archiveFilter, setArchiveFilter] = useState("active");
  const [stageFilter,   setStageFilter]   = useState("All");
  const [ownerFilter,   setOwnerFilter]   = useState("mine");
  const [weekTab,       setWeekTab]       = useState("overdue");
  const [viewMode,      setViewMode]      = useState("list"); // list | kanban
  const [searchQuery,   setSearchQuery]   = useState("");
  const [logNote,    setLogNote]    = useState("");
  const [logAction,  setLogAction]  = useState("");
  const [logDue,     setLogDue]     = useState("");
  const [logStage,   setLogStage]   = useState("");
  const [logType,    setLogType]    = useState("note");
  const [detailTab,  setDetailTab]  = useState("log"); // log | profile
  const [authed,     setAuthed]     = useState(() => sessionStorage.getItem("2st_auth")==="true");
  const [pwInput,    setPwInput]    = useState("");
  const [pwError,    setPwError]    = useState(false);

  const u = USERS[currentUser];

  // ── Data ───────────────────────────────────────────────────────

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("contacts").select("*").order("next_due", { ascending:true });
    if (!error && data) setContacts(data);
    setLoading(false);
  }, []);

  useEffect(() => { if (authed) fetchContacts(); }, [authed, fetchContacts]);

  useEffect(() => {
    const ping = async () => await supabase.from("contacts").select("id").limit(1);
    ping();
    const interval = setInterval(ping, 1000*60*60*24*3);
    return () => clearInterval(interval);
  }, []);

  // ── Derived ────────────────────────────────────────────────────

  const allActive    = contacts.filter(c => !c.archived);
  const myActive     = allActive.filter(c => c.owner === currentUser);
  const myDue        = myActive.filter(c => urgency(c.next_due).diff <= 0);
  const endOfWorkWeek = getEndOfWorkWeek();
  const myUpcoming   = myActive.filter(c => { const d=urgency(c.next_due).diff; const due=new Date(c.next_due); return d>0&&due<=endOfWorkWeek; });
  const partnerId    = Object.keys(USERS).find(k => k !== currentUser);

  const searchMatches = (c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return [c.company, c.contact, c.email, c.phone, c.last_note, c.next_action, ...(c.tags||[])].some(f => f?.toLowerCase().includes(q));
  };

  const displayContacts = contacts
    .filter(c => archiveFilter==="active" ? !c.archived : archiveFilter==="archived" ? c.archived : true)
    .filter(c => stageFilter==="All" || c.stage===stageFilter)
    .filter(c => ownerFilter==="all" ? true : ownerFilter==="mine" ? c.owner===currentUser : c.owner!==currentUser)
    .filter(searchMatches);

  const followupContacts = allActive.filter(c => ownerFilter==="all" ? true : c.owner===currentUser);

  // Pipeline value
  const pipelineValue = allActive
    .filter(c => c.stage !== "Closed Lost")
    .reduce((sum, c) => sum + (parseFloat(c.deal_value)||0), 0);

  const wonValue = contacts
    .filter(c => c.stage==="Closed Won")
    .reduce((sum, c) => sum + (parseFloat(c.deal_value)||0), 0);

  // ── Actions ────────────────────────────────────────────────────

  const openContact = (c) => {
    setSelected(c.id);
    setLogNote(""); setLogType("note");
    setLogAction(c.next_action);
    setLogDue(c.next_due || TODAY);
    setLogStage(c.stage);
    setDetailTab("log");
  };

  const saveLog = async (id) => {
    const c = contacts.find(x => x.id===id);
    if (!logNote.trim() && !logDue) return;
    setSaving(true);
    const newEntry = { date:TODAY, note:logNote||c.last_note, action:logAction, stage:logStage, type:logType, by:currentUser };
    const updatedHistory = [...(c.history||[]), newEntry];
    await supabase.from("contacts").update({
      last_note:  logNote || c.last_note,
      last_touch: TODAY,
      next_action:logAction,
      next_due:   logDue,
      stage:      logStage,
      history:    updatedHistory,
    }).eq("id", id);
    await fetchContacts();
    setSaving(false);
    setSelected(null);
  };

  const updateContact = async (id, updates) => {
    setSaving(true);
    await supabase.from("contacts").update(updates).eq("id", id);
    await fetchContacts();
    setSaving(false);
  };

  const saveForm = async () => {
    if (!form.company || !form.next_due) return;
    setSaving(true);
    const newContact = {
      ...form,
      archived: false,
      history: [{ date:form.last_touch, note:form.last_note, action:form.next_action, stage:form.stage, type:"note", by:currentUser }],
    };
    await supabase.from("contacts").insert([newContact]);
    await fetchContacts();
    setForm({ ...EMPTY_CONTACT, owner:currentUser });
    setShowAdd(false);
    setSaving(false);
  };

  const deleteContact = async (id) => {
    if (!window.confirm("Delete this contact permanently?")) return;
    setSaving(true);
    await supabase.from("contacts").delete().eq("id", id);
    await fetchContacts();
    setSaving(false);
    setSelected(null);
  };

  const handleLogin = () => {
    if (pwInput === PASSWORD) { sessionStorage.setItem("2st_auth","true"); setAuthed(true); }
    else { setPwError(true); setTimeout(() => setPwError(false), 1500); }
  };

  const selectedContact = contacts.find(c => c.id===selected);

  // ── LOGIN ──────────────────────────────────────────────────────

  if (!authed) return (
    <div style={{ fontFamily:"Cormorant Garamond,Georgia,serif", background:"#FAFAF8", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <style>{css}</style>
      <div className="fu" style={{ background:"#fff", border:"1px solid #EBEBEB", borderRadius:12, padding:40, width:360, maxWidth:"90vw", boxShadow:"0 20px 60px rgba(0,0,0,0.08)", textAlign:"center" }}>
        <img src="/logo.png" alt="2Square" style={{ height:36, width:"auto", marginBottom:24 }} />
        <div style={{ fontSize:26, fontWeight:700, letterSpacing:"-.02em", marginBottom:6 }}>CRM</div>
        <div className="e" style={{ fontSize:13, color:"#9CA3AF", marginBottom:28 }}>Enter your password to continue</div>
        <input type="password" placeholder="Password" value={pwInput} onChange={e => setPwInput(e.target.value)} onKeyDown={e => e.key==="Enter"&&handleLogin()} style={{ marginBottom:12, textAlign:"center", borderColor:pwError?"#DC2626":"#E5E5E5" }} autoFocus />
        {pwError && <div className="e" style={{ fontSize:12, color:"#DC2626", marginBottom:8 }}>Incorrect password</div>}
        <button className="btn e" style={{ background:"#1a1a1a", color:"#fff", width:"100%", padding:"10px 0" }} onClick={handleLogin}>Enter</button>
      </div>
    </div>
  );

  // ── LOADING ────────────────────────────────────────────────────

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#FAFAF8", flexDirection:"column", gap:16 }}>
      <style>{css}</style>
      <div className="spinner" />
      <div className="e" style={{ fontSize:13, color:"#9CA3AF" }}>Loading your pipeline…</div>
    </div>
  );

  // ── DETAIL VIEW ────────────────────────────────────────────────

  if (selected && selectedContact) {
    const c = selectedContact;
    const urg = urgency(c.next_due);
    const owner = USERS[c.owner] || USERS.nick;
    const isOwner = c.owner === currentUser;
    const history = [...(c.history||[])].reverse();

    return (
      <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", background:"#FAFAF8", minHeight:"100vh" }}>
        <style>{css}</style>

        {/* Detail Header */}
        <div style={{ background:"#fff", borderBottom:"1px solid #EBEBEB", padding:"16px 40px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <button className="btn ghost e" onClick={() => setSelected(null)} style={{ padding:"7px 14px", fontSize:12 }}>← Back</button>
            <span style={{ color:"#D1D5DB" }}>/</span>
            <span className="e" style={{ fontSize:13, color:"#6B7280" }}>{page==="followups"?"Follow-ups":"Contacts"}</span>
            <span style={{ color:"#D1D5DB" }}>/</span>
            <span className="e" style={{ fontSize:13, color:"#1a1a1a" }}>{c.company}</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <OwnerPill userId={c.owner} />
            {c.deal_value && <span className="e" style={{ fontSize:13, fontWeight:600, color:"#15803D" }}>{fmtCurrency(c.deal_value)}</span>}
          </div>
        </div>

        <div className="fu" style={{ maxWidth:800, margin:"0 auto", padding:"40px 24px 80px" }}>

          {/* Contact Header */}
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:28 }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:6 }}>
                <div style={{ width:52, height:52, borderRadius:"50%", background:owner.bg, border:`2px solid ${owner.color}30`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <span style={{ fontSize:22, fontWeight:700, color:owner.color }}>{c.company?.[0]||"?"}</span>
                </div>
                <div>
                  <div style={{ fontSize:32, fontWeight:700, letterSpacing:"-.02em", color:"#1a1a1a", lineHeight:1 }}>{c.company}</div>
                  {c.contact && <div className="e" style={{ fontSize:14, color:"#6B7280", marginTop:3 }}>{c.contact}</div>}
                </div>
              </div>
              <div style={{ display:"flex", gap:14, marginTop:10, flexWrap:"wrap", alignItems:"center" }}>
                {c.phone   && <a href={`tel:${c.phone}`}         className="e" style={{ fontSize:13, color:"#4F46E5", textDecoration:"none" }}>📞 {c.phone}</a>}
                {c.email   && <a href={`mailto:${c.email}`}      className="e" style={{ fontSize:13, color:"#4F46E5", textDecoration:"none" }}>✉️ {c.email}</a>}
                {c.linkedin&& <a href={c.linkedin} target="_blank" rel="noreferrer" className="e" style={{ fontSize:13, color:"#4F46E5", textDecoration:"none" }}>💼 LinkedIn</a>}
                {c.website && <a href={c.website}  target="_blank" rel="noreferrer" className="e" style={{ fontSize:13, color:"#4F46E5", textDecoration:"none" }}>🌐 {c.website.replace(/^https?:\/\//,"")}</a>}
              </div>
              <div style={{ display:"flex", gap:8, marginTop:10, flexWrap:"wrap", alignItems:"center" }}>
                <StageBadge stage={c.stage} />
                {c.industry && <span className="tag e" style={{ background:"#F3F4F6", color:"#6B7280" }}>{c.industry}</span>}
                {c.company_size && <span className="tag e" style={{ background:"#F3F4F6", color:"#6B7280" }}>{c.company_size}</span>}
                {c.archived && <span className="tag e" style={{ background:"#F1F5F9", color:"#94A3B8" }}>Archived</span>}
                {(c.tags||[]).map(t => <span key={t} className="chip">{t}</span>)}
              </div>
            </div>
            <div style={{ textAlign:"right", flexShrink:0 }}>
              <UrgencyBadge dueDate={c.next_due} />
              {c.next_due && <div className="e" style={{ fontSize:11, color:"#C4C4C4", marginTop:4 }}>due {fmtDateShort(c.next_due)}</div>}
            </div>
          </div>

          {!isOwner && (
            <div style={{ background:owner.bg, border:`1px solid ${owner.color}30`, borderRadius:8, padding:"10px 16px", marginBottom:20, display:"flex", alignItems:"center", gap:8 }}>
              <Avatar userId={c.owner} size={20} />
              <span className="e" style={{ fontSize:12, color:owner.color }}>Owned by <strong>{owner.name}</strong></span>
            </div>
          )}

          {/* Tabs */}
          <div style={{ borderBottom:"1px solid #EBEBEB", marginBottom:24, display:"flex" }}>
            <button className={`tab-btn ${detailTab==="log"?"active":""}`} onClick={() => setDetailTab("log")}>Log activity</button>
            <button className={`tab-btn ${detailTab==="profile"?"active":""}`} onClick={() => setDetailTab("profile")}>Profile & details</button>
            <button className={`tab-btn ${detailTab==="history"?"active":""}`} onClick={() => setDetailTab("history")}>History ({history.length})</button>
          </div>

          {/* LOG TAB */}
          {detailTab==="log" && (
            <div style={{ background:"#fff", border:`1px solid ${isOwner?u.color+"30":"#EBEBEB"}`, borderRadius:10, padding:24, marginBottom:24 }}>
              <div style={{ fontSize:20, fontWeight:600, color:"#1a1a1a", marginBottom:4 }}>Log a touchpoint</div>
              <div className="e" style={{ fontSize:12, color:"#9CA3AF", marginBottom:20 }}>Saving as {u.name} · {fmtDateShort(TODAY)}</div>

              {/* Activity type */}
              <div style={{ marginBottom:14 }}>
                <label className="lbl">Activity type</label>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {ACTIVITY_TYPES.map(a => (
                    <button key={a.value} onClick={() => setLogType(a.value)} style={{ border:`1px solid ${logType===a.value?"#1a1a1a":"#E5E5E5"}`, background:logType===a.value?"#1a1a1a":"#fff", color:logType===a.value?"#fff":"#6B7280", borderRadius:20, padding:"5px 14px", fontSize:12, fontFamily:"Epilogue,sans-serif", cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>
                      <span>{a.icon}</span> {a.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display:"grid", gap:12 }}>
                <div><label className="lbl">What happened?</label><textarea rows={3} placeholder="Quick note on the conversation, email, meeting…" value={logNote} onChange={e => setLogNote(e.target.value)} /></div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <div><label className="lbl">Next action</label><input placeholder="e.g. Send deck, follow-up call" value={logAction} onChange={e => setLogAction(e.target.value)} /></div>
                  <CalendarPicker label="Next follow-up date" value={logDue} onChange={setLogDue} />
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <div><label className="lbl">Move to stage</label><select value={logStage} onChange={e => setLogStage(e.target.value)}>{STAGES.map(s => <option key={s}>{s}</option>)}</select></div>
                  <div><label className="lbl">Reassign to</label>
                    <select value={c.owner} onChange={e => updateContact(c.id, { owner:e.target.value })}>
                      {Object.entries(USERS).map(([k,v]) => <option key={k} value={k}>{v.name}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display:"flex", justifyContent:"flex-end", gap:8 }}>
                  <button className="btn ghost e" onClick={() => setSelected(null)}>Cancel</button>
                  <button className="btn e" style={{ background:u.color, color:"#fff", opacity:saving?.6:1 }} onClick={() => saveLog(c.id)} disabled={saving}>
                    {saving ? "Saving…" : "Save & reset follow-up"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PROFILE TAB */}
          {detailTab==="profile" && (
            <ProfileEditor contact={c} onSave={(updates) => updateContact(c.id, updates).then(() => fetchContacts())} saving={saving} />
          )}

          {/* HISTORY TAB */}
          {detailTab==="history" && (
            <div>
              <div style={{ position:"relative" }}>
                <div style={{ position:"absolute", left:4, top:12, bottom:12, width:1, background:"#EBEBEB" }} />
                <div style={{ display:"flex", flexDirection:"column" }}>
                  {history.map((h, i) => (
                    <div key={i} style={{ display:"flex", gap:16, paddingBottom:20 }}>
                      <div style={{ paddingTop:2, flexShrink:0 }}>
                        <div className="timeline-dot" style={{ background:i===0?"#1a1a1a":"#E5E7EB" }} />
                      </div>
                      <div style={{ flex:1, background:i===0?"#fff":"transparent", border:i===0?"1px solid #EBEBEB":"none", borderRadius:8, padding:i===0?"14px 16px":"0" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6, flexWrap:"wrap" }}>
                          <span style={{ fontSize:14 }}>{activityIcon(h.type)}</span>
                          <span className="e" style={{ fontSize:11, color:i===0?"#1a1a1a":"#9CA3AF", fontWeight:i===0?500:400 }}>{fmtDateLong(h.date)}</span>
                          {h.by && <OwnerPill userId={h.by} />}
                          {i===0 && <span className="tag e" style={{ background:"#F3F4F6", color:"#6B7280", fontSize:9 }}>Latest</span>}
                          <StageBadge stage={h.stage} />
                        </div>
                        <div style={{ fontSize:i===0?15:14, color:i===0?"#1a1a1a":"#6B7280", lineHeight:1.55, marginBottom:h.action&&h.action!=="—"?6:0 }}>{h.note||"—"}</div>
                        {h.action && h.action!=="—" && <div className="e" style={{ fontSize:11, color:"#C4C4C4" }}>→ {h.action}</div>}
                      </div>
                    </div>
                  ))}
                  {history.length===0 && <div className="e" style={{ fontSize:13, color:"#D1D5DB", paddingLeft:24 }}>No history yet.</div>}
                </div>
              </div>
            </div>
          )}

          {/* Footer actions */}
          <div style={{ display:"flex", gap:8, justifyContent:"space-between", paddingTop:24, borderTop:"1px solid #EBEBEB", marginTop:8 }}>
            <div style={{ display:"flex", gap:8 }}>
              <button className="btn ghost e" onClick={() => updateContact(c.id, { archived:!c.archived }).then(() => setSelected(null))}>
                {c.archived ? "Unarchive" : "Archive"}
              </button>
            </div>
            <button className="btn e" style={{ background:"#FEF2F2", color:"#DC2626", border:"1px solid #FECACA" }} onClick={() => deleteContact(c.id)}>Delete</button>
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN LAYOUT ────────────────────────────────────────────────

  return (
    <div style={{ fontFamily:"'Cormorant Garamond',Georgia,serif", background:"#FAFAF8", minHeight:"100vh" }}>
      <style>{css}</style>

      {/* Nav */}
      <div style={{ background:"#fff", borderBottom:"1px solid #EBEBEB", padding:"12px 40px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:50 }}>
        <div style={{ cursor:"pointer", display:"flex", alignItems:"center", gap:10 }} onClick={() => setPage("home")}>
          <img src="/logo.png" alt="2Square" style={{ height:32, width:"auto", objectFit:"contain" }} />
        </div>
        <div style={{ display:"flex", gap:4 }}>
          {[["home","Home"],["followups","Follow-ups"],["contacts","Contacts"],["companies","Companies"],["pipeline","Pipeline"]].map(([k,l]) => (
            <button key={k} className={`nav-btn e ${page===k?"active":""}`} onClick={() => setPage(k)}>
              {l}
              {k==="followups" && myDue.length>0 && <span style={{ background:"#DC2626", color:"#fff", borderRadius:10, fontSize:10, padding:"1px 6px", marginLeft:4 }}>{myDue.length}</span>}
            </button>
          ))}
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <div style={{ display:"flex", background:"#F3F4F6", borderRadius:8, padding:3, gap:2 }}>
            {Object.entries(USERS).map(([k,v]) => (
              <button key={k} onClick={() => setCurrentUser(k)} style={{ border:"none", cursor:"pointer", fontFamily:"'Epilogue',sans-serif", fontSize:12, fontWeight:500, padding:"6px 14px", borderRadius:6, transition:"all .15s", background:currentUser===k?v.color:"transparent", color:currentUser===k?"#fff":"#6B7280" }}>{v.name}</button>
            ))}
          </div>
          <button className="btn e" style={{ background:"#1a1a1a", color:"#fff" }} onClick={() => { setShowAdd(true); setForm({ ...EMPTY_CONTACT, owner:currentUser }); }}>+ Add contact</button>
        </div>
      </div>

      {/* ── HOME ── */}
      {page==="home" && (
        <div className="fu" style={{ maxWidth:760, margin:"0 auto", padding:"50px 24px" }}>
          <div style={{ marginBottom:40 }}>
            <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:12 }}>
              <Avatar userId={currentUser} size={48} />
              <div>
                <div style={{ fontSize:40, fontWeight:700, letterSpacing:"-.03em", lineHeight:1, color:u.color }}>Hey, {u.name}.</div>
                <div className="e" style={{ fontSize:13, color:"#9CA3AF", marginTop:4 }}>{new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>
              </div>
            </div>
            <div style={{ marginTop:16 }}><OwnerBar contacts={contacts} /></div>
          </div>

          {/* Stats */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:14, marginBottom:32 }}>
            {[
              { label:"Overdue",     count:myActive.filter(c=>urgency(c.next_due).level==="overdue").length, color:"#DC2626", bg:"#FEF2F2", border:"#FECACA", page:"followups" },
              { label:"Due today",   count:myActive.filter(c=>urgency(c.next_due).level==="today").length,   color:"#D97706", bg:"#FFFBEB", border:"#FDE68A", page:"followups" },
              { label:"This week",   count:myUpcoming.length, color:"#15803D", bg:"#F0FDF4", border:"#BBF7D0", page:"followups" },
              { label:"Active deals",count:myActive.filter(c=>c.stage==="Active"||c.stage==="Proposal").length, color:"#4F46E5", bg:"#EEF2FF", border:"#C7D2FE", page:"contacts" },
            ].map(({ label, count, color, bg, border, page:p }) => (
              <div key={label} style={{ background:count>0?bg:"#fff", border:`1px solid ${count>0?border:"#EBEBEB"}`, borderRadius:10, padding:"18px 20px", cursor:count>0?"pointer":"default" }} onClick={() => count>0&&setPage(p)}>
                <div className="e" style={{ fontSize:10, color:count>0?color:"#9CA3AF", letterSpacing:".1em", textTransform:"uppercase", marginBottom:8 }}>{label}</div>
                <div style={{ fontSize:36, fontWeight:700, color:count>0?color:"#D1D5DB", lineHeight:1 }}>{count}</div>
                {count>0&&<div className="e" style={{ fontSize:11, color, marginTop:6 }}>View →</div>}
              </div>
            ))}
          </div>

          {/* Pipeline value strip */}
          {pipelineValue > 0 && (
            <div style={{ background:"#fff", border:"1px solid #EBEBEB", borderRadius:10, padding:"18px 24px", marginBottom:28, display:"flex", gap:32 }}>
              <div>
                <div className="e" style={{ fontSize:10, letterSpacing:".1em", textTransform:"uppercase", color:"#9CA3AF", marginBottom:4 }}>Pipeline value</div>
                <div style={{ fontSize:24, fontWeight:700, color:"#1a1a1a" }}>{fmtCurrency(pipelineValue)}</div>
              </div>
              {wonValue>0&&<div>
                <div className="e" style={{ fontSize:10, letterSpacing:".1em", textTransform:"uppercase", color:"#9CA3AF", marginBottom:4 }}>Closed won</div>
                <div style={{ fontSize:24, fontWeight:700, color:"#15803D" }}>{fmtCurrency(wonValue)}</div>
              </div>}
            </div>
          )}

          {/* My due */}
          {myDue.length>0 ? (
            <div style={{ marginBottom:28 }}>
              <div className="e" style={{ fontSize:11, letterSpacing:".1em", textTransform:"uppercase", color:"#9CA3AF", marginBottom:12 }}>Your attention needed</div>
              <div style={{ background:"#fff", border:"1px solid #EBEBEB", borderRadius:10, overflow:"hidden" }}>
                {myDue.map((c, i) => {
                  const urg = urgency(c.next_due);
                  return (
                    <div key={c.id} className="row" style={{ padding:"14px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:i<myDue.length-1?"1px solid #EBEBEB":"none" }} onClick={() => openContact(c)}>
                      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                        <div style={{ width:3, height:36, borderRadius:4, background:u.color, flexShrink:0 }} />
                        <div>
                          <div style={{ fontSize:17, fontWeight:600, color:"#1a1a1a" }}>{c.company}</div>
                          <div className="e" style={{ fontSize:12, color:"#9CA3AF", marginTop:2 }}>{c.contact} · {c.next_action}</div>
                        </div>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                        {c.deal_value&&<span className="e" style={{ fontSize:12, color:"#6B7280" }}>{fmtCurrency(c.deal_value)}</span>}
                        <UrgencyBadge dueDate={c.next_due} />
                        <span className="e" style={{ fontSize:12, color:"#C4C4C4" }}>Log →</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <EmptyState icon="✓" title={`All caught up, ${u.name}.`} sub="No overdue follow-ups on your side right now." />
          )}

          {/* Partner overdue */}
          {(() => {
            const partnerUser = USERS[partnerId];
            const partnerDue = allActive.filter(c => c.owner===partnerId && urgency(c.next_due).diff<=0);
            if (!partnerDue.length) return null;
            return (
              <div style={{ marginTop:24 }}>
                <div className="e" style={{ fontSize:11, letterSpacing:".1em", textTransform:"uppercase", color:"#9CA3AF", marginBottom:12 }}>{partnerUser.name}'s overdue ({partnerDue.length})</div>
                <div style={{ background:partnerUser.bg, border:`1px solid ${partnerUser.color}20`, borderRadius:10, overflow:"hidden" }}>
                  {partnerDue.map((c, i) => (
                    <div key={c.id} className="row" style={{ padding:"12px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:i<partnerDue.length-1?`1px solid ${partnerUser.color}15`:"none", background:"transparent" }} onClick={() => openContact(c)}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <Avatar userId={partnerId} size={20} />
                        <div>
                          <div style={{ fontSize:15, fontWeight:600, color:"#1a1a1a" }}>{c.company}</div>
                          <div className="e" style={{ fontSize:11, color:"#9CA3AF" }}>{c.contact}</div>
                        </div>
                      </div>
                      <UrgencyBadge dueDate={c.next_due} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── FOLLOW-UPS ── */}
      {page==="followups" && (
        <div className="fu" style={{ maxWidth:900, margin:"0 auto", padding:"40px 24px" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
            <div>
              <div style={{ fontSize:34, fontWeight:700, letterSpacing:"-.02em", color:"#1a1a1a" }}>Follow-ups</div>
              <div className="e" style={{ fontSize:13, color:"#9CA3AF", marginTop:4 }}>{myDue.length} overdue or due today · {myUpcoming.length} this week</div>
            </div>
            <div style={{ display:"flex", gap:6 }}>
              {[["mine","Mine"],["all","All"]].map(([k,l]) => (
                <button key={k} className={`filter-btn e ${ownerFilter===k?"on":""}`} onClick={() => setOwnerFilter(k)}>{l}</button>
              ))}
            </div>
          </div>

          <div style={{ display:"flex", borderBottom:"1px solid #EBEBEB", marginBottom:28 }}>
            {[["overdue","Overdue & today"],["thisweek","This week"],["nextweek","Next week"],["all","All upcoming"]].map(([k,l]) => (
              <button key={k} className={`tab-btn ${weekTab===k?"active":""}`} onClick={() => setWeekTab(k)}>{l}</button>
            ))}
          </div>

          {(() => {
            const eow = getEndOfWorkWeek();
            const nextMonday = new Date(eow); nextMonday.setDate(eow.getDate()+3);
            const nextFriday = new Date(nextMonday); nextFriday.setDate(nextMonday.getDate()+4);
            const filtered = followupContacts.filter(c => {
              const d = urgency(c.next_due).diff;
              const due = new Date(c.next_due); due.setHours(0,0,0,0);
              if (weekTab==="overdue")  return d<=0;
              if (weekTab==="thisweek") return d>0&&due<=eow;
              if (weekTab==="nextweek") return due>eow&&due<=nextFriday;
              return d>0;
            });
            if (!filtered.length) return <EmptyState title="All clear!" sub="No follow-ups in this view." />;
            return (
              <div style={{ background:"#fff", border:"1px solid #EBEBEB", borderRadius:10, overflow:"hidden" }}>
                <div className="e" style={{ padding:"10px 24px", display:"grid", gridTemplateColumns:"1fr 60px 180px 110px 100px", gap:16, fontSize:10, color:"#C4C4C4", letterSpacing:".12em", textTransform:"uppercase", borderBottom:"1px solid #EBEBEB", background:"#FAFAF8" }}>
                  <span>Company</span><span>Owner</span><span>Next action</span><span>Stage</span><span style={{ textAlign:"right" }}>Due</span>
                </div>
                {filtered.map((c, i) => (
                  <div key={c.id} className="row" style={{ padding:"13px 24px", display:"grid", gridTemplateColumns:"1fr 60px 180px 110px 100px", gap:16, alignItems:"center", borderBottom:i<filtered.length-1?"1px solid #EBEBEB":"none" }} onClick={() => openContact(c)}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:3, height:32, borderRadius:4, background:(USERS[c.owner]||USERS.nick).color, flexShrink:0 }} />
                      <div>
                        <div style={{ fontSize:15, fontWeight:600, color:"#1a1a1a" }}>{c.company}</div>
                        <div className="e" style={{ fontSize:11, color:"#6B7280", marginTop:1 }}>{c.contact}</div>
                      </div>
                    </div>
                    <OwnerPill userId={c.owner} />
                    <div className="e" style={{ fontSize:12, color:"#6B7280", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.next_action}</div>
                    <StageBadge stage={c.stage} />
                    <div style={{ display:"flex", justifyContent:"flex-end" }}><UrgencyBadge dueDate={c.next_due} /></div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── CONTACTS ── */}
      {page==="contacts" && (
        <div className="fu" style={{ maxWidth:980, margin:"0 auto", padding:"40px 24px" }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:24 }}>
            <div>
              <div style={{ fontSize:34, fontWeight:700, letterSpacing:"-.02em", color:"#1a1a1a" }}>Contacts</div>
              <div className="e" style={{ fontSize:13, color:"#9CA3AF", marginTop:4 }}>{allActive.length} active · {contacts.filter(c=>c.archived).length} archived</div>
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <div style={{ display:"flex", background:"#F3F4F6", borderRadius:8, padding:3 }}>
                {[["list","☰"],["kanban","⊞"]].map(([k,icon]) => (
                  <button key={k} onClick={() => setViewMode(k)} style={{ border:"none", cursor:"pointer", fontFamily:"Epilogue,sans-serif", fontSize:13, padding:"5px 12px", borderRadius:6, background:viewMode===k?"#fff":"transparent", color:viewMode===k?"#1a1a1a":"#9CA3AF", transition:"all .15s" }}>{icon}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Search + filters */}
          <div style={{ marginBottom:16 }}>
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
          </div>
          <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
            {["active","archived","all"].map(f => (
              <button key={f} className={`filter-btn e ${archiveFilter===f?"on":""}`} onClick={() => setArchiveFilter(f)}>{f.charAt(0).toUpperCase()+f.slice(1)}</button>
            ))}
            <span style={{ width:1, background:"#E5E5E5", margin:"0 4px" }} />
            {[["mine","Mine"],["theirs","Partner's"],["all","Everyone's"]].map(([k,l]) => (
              <button key={k} className={`filter-btn e ${ownerFilter===k?"on":""}`} onClick={() => setOwnerFilter(k)}>{l}</button>
            ))}
            <span style={{ width:1, background:"#E5E5E5", margin:"0 4px" }} />
            {["All",...STAGES].map(s => (
              <button key={s} className={`filter-btn e ${stageFilter===s?"on":""}`} onClick={() => setStageFilter(s)}>{s}</button>
            ))}
          </div>

          {/* List view */}
          {viewMode==="list" && (
            <div style={{ background:"#fff", border:"1px solid #EBEBEB", borderRadius:10, overflow:"hidden" }}>
              <div className="e" style={{ padding:"10px 24px", display:"grid", gridTemplateColumns:"1fr 90px 150px 120px 80px 90px", gap:16, fontSize:10, color:"#C4C4C4", letterSpacing:".12em", textTransform:"uppercase", borderBottom:"1px solid #EBEBEB", background:"#FAFAF8" }}>
                <span>Company / Contact</span><span>Owner</span><span>Next action</span><span>Stage</span><span>Value</span><span>Due</span>
              </div>
              {displayContacts.length===0 && <div className="e" style={{ padding:"40px 24px", textAlign:"center", color:"#D1D5DB", fontSize:13 }}>No contacts in this view.</div>}
              {displayContacts.map(c => (
                <div key={c.id} className="row" style={{ padding:"13px 24px", display:"grid", gridTemplateColumns:"1fr 90px 150px 120px 80px 90px", gap:16, alignItems:"center", opacity:c.archived?.5:1, borderLeft:`3px solid ${(USERS[c.owner]||USERS.nick).color}` }} onClick={() => openContact(c)}>
                  <div>
                    <div style={{ fontSize:15, fontWeight:600, color:"#1a1a1a" }}>{c.company}</div>
                    <div className="e" style={{ fontSize:11, color:"#6B7280", marginTop:1 }}>
                      {c.contact}
                      {(c.tags||[]).slice(0,2).map(t => <span key={t} className="chip" style={{ marginLeft:6 }}>{t}</span>)}
                    </div>
                  </div>
                  <OwnerPill userId={c.owner} />
                  <div className="e" style={{ fontSize:12, color:"#6B7280", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.next_action}</div>
                  <StageBadge stage={c.stage} />
                  <div className="e" style={{ fontSize:12, color:c.deal_value?"#15803D":"#D1D5DB" }}>{c.deal_value?fmtCurrency(c.deal_value):"—"}</div>
                  <UrgencyBadge dueDate={c.next_due} />
                </div>
              ))}
            </div>
          )}

          {/* Kanban view */}
          {viewMode==="kanban" && (
            <div style={{ display:"flex", gap:12, overflowX:"auto", paddingBottom:16 }}>
              {STAGES.map(stage => {
                const cols = displayContacts.filter(c => c.stage===stage);
                const colVal = cols.reduce((s,c) => s+(parseFloat(c.deal_value)||0), 0);
                return (
                  <div key={stage} className="kanban-col">
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
                      <div>
                        <span className="tag" style={{ background:STAGE_COLORS[stage]?.bg, color:STAGE_COLORS[stage]?.text }}>{stage}</span>
                      </div>
                      <span className="e" style={{ fontSize:11, color:"#9CA3AF" }}>{cols.length}</span>
                    </div>
                    {colVal>0&&<div className="e" style={{ fontSize:11, color:"#6B7280", marginBottom:10 }}>{fmtCurrency(colVal)}</div>}
                    {cols.map(c => (
                      <div key={c.id} className="kanban-card" onClick={() => openContact(c)}>
                        <div style={{ fontSize:14, fontWeight:600, color:"#1a1a1a", marginBottom:3 }}>{c.company}</div>
                        {c.contact&&<div className="e" style={{ fontSize:11, color:"#9CA3AF", marginBottom:6 }}>{c.contact}</div>}
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                          <OwnerPill userId={c.owner} />
                          <UrgencyBadge dueDate={c.next_due} />
                        </div>
                        {c.deal_value&&<div className="e" style={{ fontSize:12, color:"#15803D", fontWeight:600, marginTop:6 }}>{fmtCurrency(c.deal_value)}</div>}
                        {(c.tags||[]).length>0&&<div style={{ marginTop:6, display:"flex", gap:4, flexWrap:"wrap" }}>{c.tags.map(t => <span key={t} className="chip">{t}</span>)}</div>}
                      </div>
                    ))}
                    {cols.length===0&&<div className="e" style={{ fontSize:12, color:"#D1D5DB", textAlign:"center", padding:"20px 0" }}>Empty</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── COMPANIES ── */}
      {page==="companies" && (
        <CompaniesView contacts={allActive} onOpen={openContact} />
      )}

      {/* ── PIPELINE ── */}
      {page==="pipeline" && (
        <PipelineView contacts={contacts} currentUser={currentUser} onOpen={openContact} />
      )}

      {/* ── ADD MODAL ── */}
      {showAdd && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.35)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, backdropFilter:"blur(4px)" }} onClick={() => setShowAdd(false)}>
          <div className="fu" style={{ background:"#fff", border:"1px solid #E5E5E5", borderRadius:12, padding:32, width:600, maxWidth:"94vw", boxShadow:"0 20px 60px rgba(0,0,0,0.12)", overflowY:"auto", maxHeight:"92vh" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:26, fontWeight:700, letterSpacing:"-.02em", color:"#1a1a1a", marginBottom:6 }}>New contact</div>
            <div className="e" style={{ fontSize:12, color:"#9CA3AF", marginBottom:24 }}>Fields marked * are required</div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
              <div><label className="lbl">Company *</label><input placeholder="Acme Corp" value={form.company} onChange={e => setForm({...form,company:e.target.value})} /></div>
              <div><label className="lbl">Contact name</label><input placeholder="Jane Smith" value={form.contact} onChange={e => setForm({...form,contact:e.target.value})} /></div>
              <div><label className="lbl">Phone</label><input placeholder="+61 4xx xxx xxx" value={form.phone||""} onChange={e => setForm({...form,phone:e.target.value})} /></div>
              <div><label className="lbl">Email</label><input placeholder="jane@acme.com" value={form.email||""} onChange={e => setForm({...form,email:e.target.value})} /></div>
              <div><label className="lbl">LinkedIn URL</label><input placeholder="https://linkedin.com/in/…" value={form.linkedin||""} onChange={e => setForm({...form,linkedin:e.target.value})} /></div>
              <div><label className="lbl">Website</label><input placeholder="https://acme.com" value={form.website||""} onChange={e => setForm({...form,website:e.target.value})} /></div>
              <div><label className="lbl">Industry</label><select value={form.industry||""} onChange={e => setForm({...form,industry:e.target.value})}><option value="">Select industry</option>{INDUSTRIES.map(i=><option key={i}>{i}</option>)}</select></div>
              <div><label className="lbl">Company size</label><select value={form.company_size||""} onChange={e => setForm({...form,company_size:e.target.value})}><option value="">Select size</option>{["1–10","11–50","51–200","201–500","500+"].map(s=><option key={s}>{s}</option>)}</select></div>
              <div><label className="lbl">Owner</label><select value={form.owner} onChange={e => setForm({...form,owner:e.target.value})}>{Object.entries(USERS).map(([k,v])=><option key={k} value={k}>{v.name}</option>)}</select></div>
              <div><label className="lbl">Stage</label><select value={form.stage} onChange={e => setForm({...form,stage:e.target.value})}>{STAGES.map(s=><option key={s}>{s}</option>)}</select></div>
              <div><label className="lbl">Deal value (AUD)</label><input type="number" placeholder="50000" value={form.deal_value||""} onChange={e => setForm({...form,deal_value:e.target.value})} /></div>
              <div><label className="lbl">Last touch</label><input type="date" value={form.last_touch} onChange={e => setForm({...form,last_touch:e.target.value})} /></div>
            </div>
            <div style={{ marginBottom:14 }}><label className="lbl">Tags</label><TagInput tags={form.tags||[]} onChange={tags => setForm({...form,tags})} /></div>
            <div style={{ marginBottom:14 }}><label className="lbl">Note</label><textarea rows={2} placeholder="How did you meet / context…" value={form.last_note} onChange={e => setForm({...form,last_note:e.target.value})} /></div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:28 }}>
              <div><label className="lbl">Next action</label><input placeholder="Send deck, call…" value={form.next_action} onChange={e => setForm({...form,next_action:e.target.value})} /></div>
              <CalendarPicker label="Follow-up date *" value={form.next_due} onChange={v => setForm({...form,next_due:v})} />
            </div>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button className="btn ghost e" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn e" style={{ background:u.color, color:"#fff", opacity:saving?.6:1 }} onClick={saveForm} disabled={saving}>
                {saving?"Saving…":"Save contact"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── PROFILE EDITOR ────────────────────────────────────────────────────────────

function ProfileEditor({ contact: c, onSave, saving }) {
  const [form, setForm] = useState({
    company:      c.company      || "",
    contact:      c.contact      || "",
    phone:        c.phone        || "",
    email:        c.email        || "",
    linkedin:     c.linkedin     || "",
    website:      c.website      || "",
    industry:     c.industry     || "",
    company_size: c.company_size || "",
    deal_value:   c.deal_value   || "",
    tags:         c.tags         || [],
  });
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    await onSave(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ background:"#fff", border:"1px solid #EBEBEB", borderRadius:10, padding:24 }}>
      <div style={{ fontSize:18, fontWeight:600, color:"#1a1a1a", marginBottom:20 }}>Contact details</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
        <div><label className="lbl">Company</label><input value={form.company} onChange={e => setForm({...form,company:e.target.value})} /></div>
        <div><label className="lbl">Contact name</label><input value={form.contact} onChange={e => setForm({...form,contact:e.target.value})} /></div>
        <div><label className="lbl">Phone</label><input value={form.phone} onChange={e => setForm({...form,phone:e.target.value})} /></div>
        <div><label className="lbl">Email</label><input value={form.email} onChange={e => setForm({...form,email:e.target.value})} /></div>
        <div><label className="lbl">LinkedIn URL</label><input value={form.linkedin} onChange={e => setForm({...form,linkedin:e.target.value})} /></div>
        <div><label className="lbl">Website</label><input value={form.website} onChange={e => setForm({...form,website:e.target.value})} /></div>
        <div><label className="lbl">Industry</label><select value={form.industry} onChange={e => setForm({...form,industry:e.target.value})}><option value="">Select industry</option>{INDUSTRIES.map(i=><option key={i}>{i}</option>)}</select></div>
        <div><label className="lbl">Company size</label><select value={form.company_size} onChange={e => setForm({...form,company_size:e.target.value})}><option value="">Select size</option>{["1–10","11–50","51–200","201–500","500+"].map(s=><option key={s}>{s}</option>)}</select></div>
        <div><label className="lbl">Deal value (AUD)</label><input type="number" value={form.deal_value} onChange={e => setForm({...form,deal_value:e.target.value})} /></div>
      </div>
      <div style={{ marginBottom:20 }}><label className="lbl">Tags</label><TagInput tags={form.tags} onChange={tags => setForm({...form,tags})} /></div>
      <div style={{ display:"flex", justifyContent:"flex-end" }}>
        <button className="btn e" style={{ background: saved?"#15803D":"#1a1a1a", color:"#fff", opacity:saving?.6:1 }} onClick={handleSave} disabled={saving}>
          {saving?"Saving…":saved?"Saved ✓":"Save changes"}
        </button>
      </div>
    </div>
  );
}

// ── COMPANIES VIEW ────────────────────────────────────────────────────────────

function CompaniesView({ contacts, onOpen }) {
  const [search, setSearch] = useState("");
  const companies = {};
  contacts.forEach(c => {
    const key = c.company?.toLowerCase().trim() || "unknown";
    if (!companies[key]) companies[key] = { name:c.company, contacts:[], totalValue:0, stages:new Set() };
    companies[key].contacts.push(c);
    companies[key].totalValue += parseFloat(c.deal_value)||0;
    companies[key].stages.add(c.stage);
  });

  const list = Object.values(companies)
    .filter(co => !search || co.name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => b.totalValue - a.totalValue || b.contacts.length - a.contacts.length);

  return (
    <div className="fu" style={{ maxWidth:900, margin:"0 auto", padding:"40px 24px" }}>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontSize:34, fontWeight:700, letterSpacing:"-.02em", color:"#1a1a1a" }}>Companies</div>
        <div className="e" style={{ fontSize:13, color:"#9CA3AF", marginTop:4 }}>{list.length} companies in pipeline</div>
      </div>
      <div style={{ marginBottom:20 }}><SearchBar value={search} onChange={setSearch} /></div>
      <div style={{ background:"#fff", border:"1px solid #EBEBEB", borderRadius:10, overflow:"hidden" }}>
        <div className="e" style={{ padding:"10px 24px", display:"grid", gridTemplateColumns:"1fr 120px 120px 180px", gap:16, fontSize:10, color:"#C4C4C4", letterSpacing:".12em", textTransform:"uppercase", borderBottom:"1px solid #EBEBEB", background:"#FAFAF8" }}>
          <span>Company</span><span>Contacts</span><span>Value</span><span>Stages</span>
        </div>
        {list.length===0 && <div className="e" style={{ padding:"40px 24px", textAlign:"center", color:"#D1D5DB", fontSize:13 }}>No companies found.</div>}
        {list.map(co => (
          <div key={co.name} className="row" style={{ padding:"16px 24px", display:"grid", gridTemplateColumns:"1fr 120px 120px 180px", gap:16, alignItems:"center" }} onClick={() => onOpen(co.contacts[0])}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:36, height:36, borderRadius:"50%", background:"#F3F4F6", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <span style={{ fontSize:15, fontWeight:700, color:"#6B7280" }}>{co.name?.[0]||"?"}</span>
                </div>
                <div>
                  <div style={{ fontSize:15, fontWeight:600, color:"#1a1a1a" }}>{co.name}</div>
                  <div className="e" style={{ fontSize:11, color:"#9CA3AF", marginTop:1 }}>
                    {co.contacts.map(c=>c.contact).filter(Boolean).slice(0,2).join(", ")}
                  </div>
                </div>
              </div>
            </div>
            <div style={{ display:"flex", gap:6 }}>
              {co.contacts.map((c,i) => <OwnerPill key={i} userId={c.owner} />).slice(0,2)}
            </div>
            <div className="e" style={{ fontSize:13, fontWeight:600, color:co.totalValue>0?"#15803D":"#D1D5DB" }}>
              {co.totalValue>0?fmtCurrency(co.totalValue):"—"}
            </div>
            <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
              {[...co.stages].map(s => <StageBadge key={s} stage={s} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── PIPELINE VIEW ─────────────────────────────────────────────────────────────

function PipelineView({ contacts, currentUser, onOpen }) {
  const [ownerF, setOwnerF] = useState("all");
  const active = contacts.filter(c => !c.archived);
  const filtered = active.filter(c => ownerF==="all" ? true : c.owner===currentUser);

  const stageData = STAGES.map(stage => {
    const cols = filtered.filter(c => c.stage===stage);
    const value = cols.reduce((s,c) => s+(parseFloat(c.deal_value)||0), 0);
    return { stage, count:cols.length, value, contacts:cols };
  });

  const totalPipeline = filtered.filter(c=>c.stage!=="Closed Lost").reduce((s,c)=>s+(parseFloat(c.deal_value)||0),0);
  const totalWon      = filtered.filter(c=>c.stage==="Closed Won").reduce((s,c)=>s+(parseFloat(c.deal_value)||0),0);
  const winRate       = filtered.filter(c=>c.stage==="Closed Won"||c.stage==="Closed Lost").length
    ? Math.round(filtered.filter(c=>c.stage==="Closed Won").length / filtered.filter(c=>c.stage==="Closed Won"||c.stage==="Closed Lost").length * 100)
    : null;

  return (
    <div className="fu" style={{ maxWidth:1100, margin:"0 auto", padding:"40px 24px" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:28 }}>
        <div>
          <div style={{ fontSize:34, fontWeight:700, letterSpacing:"-.02em", color:"#1a1a1a" }}>Pipeline</div>
          <div className="e" style={{ fontSize:13, color:"#9CA3AF", marginTop:4 }}>Stage-by-stage breakdown</div>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {[["all","Everyone"],["mine",USERS[currentUser].name]].map(([k,l]) => (
            <button key={k} className={`filter-btn e ${ownerF===k?"on":""}`} onClick={() => setOwnerF(k)}>{l}</button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16, marginBottom:32 }}>
        {[
          { label:"Active pipeline", value:fmtCurrency(totalPipeline), color:"#4F46E5", show:totalPipeline>0 },
          { label:"Closed won",      value:fmtCurrency(totalWon),      color:"#15803D", show:totalWon>0 },
          { label:"Win rate",        value:winRate!==null?`${winRate}%`:"—",  color:"#D97706", show:true },
        ].map(({ label, value, color, show }) => (
          <div key={label} style={{ background:"#fff", border:"1px solid #EBEBEB", borderRadius:10, padding:"20px 24px" }}>
            <div className="e" style={{ fontSize:11, letterSpacing:".1em", textTransform:"uppercase", color:"#9CA3AF", marginBottom:8 }}>{label}</div>
            <div style={{ fontSize:28, fontWeight:700, color:show?color:"#D1D5DB" }}>{show?value:"—"}</div>
          </div>
        ))}
      </div>

      {/* Stage breakdown */}
      <div style={{ background:"#fff", border:"1px solid #EBEBEB", borderRadius:10, overflow:"hidden" }}>
        <div className="e" style={{ padding:"10px 24px", display:"grid", gridTemplateColumns:"140px 60px 120px 1fr", gap:16, fontSize:10, color:"#C4C4C4", letterSpacing:".12em", textTransform:"uppercase", borderBottom:"1px solid #EBEBEB", background:"#FAFAF8" }}>
          <span>Stage</span><span>Count</span><span>Value</span><span>Companies</span>
        </div>
        {stageData.map(({ stage, count, value, contacts:cols }) => (
          <div key={stage} style={{ padding:"16px 24px", display:"grid", gridTemplateColumns:"140px 60px 120px 1fr", gap:16, alignItems:"center", borderBottom:"1px solid #EBEBEB" }}>
            <StageBadge stage={stage} />
            <div className="e" style={{ fontSize:15, fontWeight:600, color:count>0?"#1a1a1a":"#D1D5DB" }}>{count}</div>
            <div className="e" style={{ fontSize:14, fontWeight:600, color:value>0?"#15803D":"#D1D5DB" }}>{value>0?fmtCurrency(value):"—"}</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {cols.slice(0,8).map(c => (
                <button key={c.id} onClick={() => onOpen(c)} style={{ border:"1px solid #E5E5E5", background:"#F8F8F6", borderRadius:20, padding:"3px 10px", fontSize:11, fontFamily:"Epilogue,sans-serif", cursor:"pointer", color:"#1a1a1a" }}>
                  {c.company}
                </button>
              ))}
              {cols.length>8&&<span className="e" style={{ fontSize:11, color:"#9CA3AF", alignSelf:"center" }}>+{cols.length-8} more</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
