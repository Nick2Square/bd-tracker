import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://ygtzqdjhhlrcurrqnyco.supabase.co",
  "sb_publishable_W2b4dSD-NGpBgzYfzFFp1A_jTbFIlCu"
);

const USERS = {
  nick: { name: "Nick", color: "#4F46E5", bg: "#EEF2FF" },
  maz:  { name: "Maz",  color: "#DB2777", bg: "#FDF2F8" },
};

const STAGES = ["Outreach", "Nurturing", "Active", "Proposal", "Closed Won", "Closed Lost"];

const STAGE_COLORS = {
  Outreach:      { bg: "#F1F5F9", text: "#475569" },
  Nurturing:     { bg: "#FFF7ED", text: "#C2410C" },
  Active:        { bg: "#EFF6FF", text: "#1D4ED8" },
  Proposal:      { bg: "#FAF5FF", text: "#7C3AED" },
  "Closed Won":  { bg: "#F0FDF4", text: "#15803D" },
  "Closed Lost": { bg: "#F8FAFC", text: "#94A3B8" },
};

const ACTIVITY_TYPES = [
  { value: "note",     label: "Note",     icon: "📝" },
  { value: "call",     label: "Call",     icon: "📞" },
  { value: "email",    label: "Email",    icon: "✉️" },
  { value: "meeting",  label: "Meeting",  icon: "🤝" },
  { value: "demo",     label: "Demo",     icon: "🖥️" },
  { value: "linkedin", label: "LinkedIn", icon: "💼" },
];

const INDUSTRIES = [
  "Technology","Finance","Healthcare","Education","Retail",
  "Manufacturing","Media","Real Estate","Legal","Consulting","Other",
];

const PACING_KEY = "2st_pacing";
const PACING_DEFAULTS = {
  Outreach: 7, Nurturing: 30, Active: 90,
  Proposal: 7, "Closed Won": 90, "Closed Lost": 180,
};
const PACING_LABELS = {
  Outreach:      "Weekly outreach cadence",
  Nurturing:     "Monthly nurture check-in",
  Active:        "Quarterly client touch",
  Proposal:      "Weekly proposal follow-up",
  "Closed Won":  "Quarterly account review",
  "Closed Lost": "Re-approach interval",
};

const URG_DOT  = { overdue: "#DC2626", today: "#D97706", soon: "#CA8A04", ok: "#D1D5DB" };
const URG_TEXT = { overdue: "#DC2626", today: "#D97706", soon: "#CA8A04", ok: "#6B7280" };
const PASSWORD = "Nickandmaz26";

const pad = n => String(n).padStart(2, "0");
const toLocalISO = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const TODAY = toLocalISO(new Date());

const addDays = (isoDate, days) => {
  const d = new Date(isoDate || TODAY);
  d.setDate(d.getDate() + parseInt(days));
  return toLocalISO(d);
};

const loadPacing = () => {
  try {
    const s = localStorage.getItem(PACING_KEY);
    return s ? { ...PACING_DEFAULTS, ...JSON.parse(s) } : { ...PACING_DEFAULTS };
  } catch { return { ...PACING_DEFAULTS }; }
};
const savePacing = p => localStorage.setItem(PACING_KEY, JSON.stringify(p));

const effectiveInterval = (contact, pacing) =>
  contact.follow_up_interval ? parseInt(contact.follow_up_interval) : (pacing[contact.stage] || 30);

const isPacingOverdue = (contact, pacing) => {
  if (!contact.last_touch) return false;
  const interval = effectiveInterval(contact, pacing);
  const due = new Date(addDays(contact.last_touch, interval)); due.setHours(0,0,0,0);
  const today = new Date(); today.setHours(0,0,0,0);
  return due <= today;
};

const daysSinceTouch = c => {
  if (!c.last_touch) return null;
  const last = new Date(c.last_touch); last.setHours(0,0,0,0);
  const today = new Date(); today.setHours(0,0,0,0);
  return Math.round((today - last) / 86400000);
};

const getEOW = () => {
  const t = new Date(); t.setHours(0,0,0,0);
  const day = t.getDay();
  const fri = new Date(t);
  fri.setDate(t.getDate() + (day===0?5:day===6?6:(5-day)||7));
  return fri;
};

const workdays = due => {
  const t = new Date(); t.setHours(0,0,0,0);
  const d = new Date(due); d.setHours(0,0,0,0);
  if (d <= t) return Math.round((d-t)/86400000);
  let c=0; const cur=new Date(t); cur.setDate(cur.getDate()+1);
  while(cur<=d){const wd=cur.getDay();if(wd!==0&&wd!==6)c++;cur.setDate(cur.getDate()+1);}
  return c;
};

const urgency = due => {
  if (!due) return {label:"No date",level:"ok",diff:999};
  const t=new Date();t.setHours(0,0,0,0);
  const d=new Date(due);d.setHours(0,0,0,0);
  const diff=Math.round((d-t)/86400000);
  const wd=workdays(due);
  const eow=getEOW();
  if(diff<0) return {label:`${Math.abs(diff)}d overdue`,level:"overdue",diff};
  if(diff===0) return {label:"Due today",level:"today",diff};
  if(d<=eow) return {label:`${wd}wd`,level:"soon",diff};
  return {label:`in ${wd}wd`,level:"ok",diff};
};

const fmtL = d => new Date(d).toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"long",year:"numeric"});
const fmtS = d => new Date(d).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"});
const fmtC = v => {
  if(!v) return "";
  const n=parseFloat(v);
  if(isNaN(n)) return "";
  return new Intl.NumberFormat("en-AU",{style:"currency",currency:"AUD",maximumFractionDigits:0}).format(n);
};
const aIcon = t => ACTIVITY_TYPES.find(a=>a.value===t)?.icon||"📝";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Epilogue:wght@300;400;500;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}body{background:#FAFAF8;}
  .e{font-family:'Epilogue',sans-serif;}
  .row{border-bottom:1px solid #EBEBEB;transition:background .12s;cursor:pointer;}.row:hover{background:#F7F7F5;}
  .btn{border:none;cursor:pointer;font-family:'Epilogue',sans-serif;font-size:12px;letter-spacing:.04em;padding:9px 18px;border-radius:6px;transition:opacity .15s;}.btn:hover{opacity:.8;}
  .ghost{background:none;border:1px solid #E5E5E5;color:#6B7280;}.ghost:hover{border-color:#9CA3AF;opacity:1;}
  input,select,textarea{background:#fff;border:1px solid #E5E5E5;color:#1a1a1a;font-family:'Epilogue',sans-serif;font-size:13px;padding:9px 12px;border-radius:6px;width:100%;outline:none;transition:border .15s;resize:vertical;}
  input:focus,select:focus,textarea:focus{border-color:#1a1a1a;}
  .tag{display:inline-block;font-family:'Epilogue',sans-serif;font-size:10px;font-weight:500;letter-spacing:.06em;padding:3px 10px;border-radius:20px;}
  .nav-btn{background:none;border:none;font-family:'Epilogue',sans-serif;font-size:13px;cursor:pointer;padding:8px 16px;border-radius:6px;color:#6B7280;transition:all .12s;}.nav-btn:hover{background:#F3F4F6;color:#1a1a1a;}.nav-btn.active{background:#1a1a1a;color:#fff;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}.fu{animation:fadeUp .25s ease;}
  .lbl{font-family:'Epilogue',sans-serif;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#9CA3AF;display:block;margin-bottom:5px;}
  .filter-btn{background:none;border:1px solid #E5E5E5;color:#9CA3AF;font-family:'Epilogue',sans-serif;font-size:11px;padding:5px 14px;border-radius:20px;cursor:pointer;transition:all .15s;}.filter-btn.on{border-color:#1a1a1a;color:#1a1a1a;background:#fff;}
  .timeline-dot{width:10px;height:10px;border-radius:50%;border:2px solid #fff;flex-shrink:0;margin-top:4px;}
  .user-pill{display:inline-flex;align-items:center;gap:5px;font-family:'Epilogue',sans-serif;font-size:11px;font-weight:500;padding:3px 10px;border-radius:20px;}
  .spinner{width:32px;height:32px;border:3px solid #EBEBEB;border-top-color:#1a1a1a;border-radius:50%;animation:spin .7s linear infinite;}@keyframes spin{to{transform:rotate(360deg);}}
  .kanban-col{background:#F8F8F6;border-radius:10px;padding:14px;min-height:200px;flex:0 0 220px;}
  .kanban-card{background:#fff;border:1px solid #EBEBEB;border-radius:8px;padding:12px 14px;margin-bottom:8px;cursor:pointer;transition:box-shadow .15s;}.kanban-card:hover{box-shadow:0 4px 12px rgba(0,0,0,0.08);}
  .tab-btn{border:none;background:none;font-family:'Epilogue',sans-serif;font-size:13px;cursor:pointer;padding:10px 18px;border-bottom:2px solid transparent;color:#9CA3AF;transition:all .15s;margin-bottom:-1px;}.tab-btn.active{border-bottom-color:#1a1a1a;color:#1a1a1a;font-weight:500;}
  .chip{display:inline-flex;align-items:center;gap:4px;font-family:'Epilogue',sans-serif;font-size:11px;padding:3px 8px;border-radius:20px;background:#F3F4F6;color:#6B7280;}
  .chip-remove{cursor:pointer;font-size:10px;color:#9CA3AF;line-height:1;background:none;border:none;padding:0;}.chip-remove:hover{color:#1a1a1a;}
  .pw{display:inline-flex;align-items:center;gap:4px;font-family:'Epilogue',sans-serif;font-size:10px;font-weight:500;padding:2px 8px;border-radius:20px;background:#FFF7ED;color:#C2410C;border:1px solid #FED7AA;}
  .dmenu{position:absolute;right:0;top:calc(100% + 6px);background:#fff;border:1px solid #E5E5E5;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.1);z-index:200;overflow:hidden;min-width:160px;}
  .ditem{display:block;width:100%;text-align:left;padding:10px 16px;font-family:'Epilogue',sans-serif;font-size:13px;color:#1a1a1a;background:none;border:none;cursor:pointer;transition:background .1s;}.ditem:hover{background:#F7F7F5;}
`;

const Avatar = ({userId,size=24}) => {
  const u=USERS[userId]||USERS.nick;
  return <div style={{width:size,height:size,borderRadius:"50%",background:u.bg,border:`2px solid ${u.color}20`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontFamily:"Epilogue,sans-serif",fontSize:size*.4,fontWeight:600,color:u.color}}>{u.name[0]}</span></div>;
};

const OwnerPill = ({userId}) => {
  const u=USERS[userId]||USERS.nick;
  return <span className="user-pill" style={{background:u.bg,color:u.color}}><Avatar userId={userId} size={14}/>{u.name}</span>;
};

const UBadge = ({due}) => {
  const urg=urgency(due);
  return <div style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:6,height:6,borderRadius:"50%",background:URG_DOT[urg.level],flexShrink:0}}/><span className="e" style={{fontSize:11,color:URG_TEXT[urg.level],fontWeight:500}}>{urg.label}</span></div>;
};

const SBadge = ({stage}) => <span className="tag" style={{background:STAGE_COLORS[stage]?.bg||"#F1F5F9",color:STAGE_COLORS[stage]?.text||"#475569"}}>{stage}</span>;

const PacingWarn = ({contact,pacing}) => {
  const days=daysSinceTouch(contact);
  const interval=effectiveInterval(contact,pacing);
  if(days===null||days<interval) return null;
  return <span className="pw">⏱ {days}d since touch</span>;
};

const SearchBar = ({value,onChange}) => (
  <div style={{position:"relative"}}>
    <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:14,color:"#C4C4C4"}}>🔍</span>
    <input value={value} onChange={e=>onChange(e.target.value)} placeholder="Search companies, contacts, notes…" style={{paddingLeft:36,paddingRight:value?36:12}}/>
    {value&&<button onClick={()=>onChange("")} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",border:"none",background:"none",cursor:"pointer",fontSize:16,color:"#9CA3AF"}}>×</button>}
  </div>
);

const OwnerBar = ({contacts}) => {
  const nc=contacts.filter(c=>c.owner==="nick"&&!c.archived).length;
  const mc=contacts.filter(c=>c.owner==="maz"&&!c.archived).length;
  const t=nc+mc; if(!t) return null;
  return (
    <div style={{display:"flex",gap:12,alignItems:"center"}}>
      <div style={{flex:1,height:6,borderRadius:10,background:"#F1F5F9",overflow:"hidden",display:"flex"}}>
        <div style={{width:`${(nc/t)*100}%`,background:USERS.nick.color,borderRadius:"10px 0 0 10px",transition:"width .3s"}}/>
        <div style={{width:`${(mc/t)*100}%`,background:USERS.maz.color,borderRadius:"0 10px 10px 0",transition:"width .3s"}}/>
      </div>
      <div style={{display:"flex",gap:10,flexShrink:0}}>
        <span className="e" style={{fontSize:11,color:USERS.nick.color}}>{nc} Nick</span>
        <span className="e" style={{fontSize:11,color:USERS.maz.color}}>{mc} Maz</span>
      </div>
    </div>
  );
};

const EmptyState = ({icon="✦",title,sub}) => (
  <div style={{background:"#fff",border:"1px solid #EBEBEB",borderRadius:10,padding:"48px 24px",textAlign:"center"}}>
    <div style={{fontSize:28,marginBottom:8}}>{icon}</div>
    <div style={{fontSize:20,fontWeight:600,color:"#1a1a1a"}}>{title}</div>
    {sub&&<div className="e" style={{fontSize:13,color:"#9CA3AF",marginTop:6}}>{sub}</div>}
  </div>
);

const CalPicker = ({value,onChange,label}) => {
  const [open,setOpen]=useState(false);
  const [view,setView]=useState(()=>value?new Date(value):new Date());
  const [pos,setPos]=useState({top:0,left:0});
  const triggerRef=useRef(null);
  const calRef=useRef(null);

  const openIt=()=>{
    if(triggerRef.current){
      const r=triggerRef.current.getBoundingClientRect();
      const sb=window.innerHeight-r.bottom;
      setPos({top:sb>300?r.bottom+6:r.top-306,left:Math.min(r.left,window.innerWidth-296)});
    }
    setOpen(o=>!o);
  };

  useEffect(()=>{
    if(!open) return;
    const close=e=>{
      if(!triggerRef.current?.contains(e.target)&&!calRef.current?.contains(e.target))
        setOpen(false);
    };
    document.addEventListener("mousedown",close);
    return()=>document.removeEventListener("mousedown",close);
  },[open]);

  const today=new Date();today.setHours(0,0,0,0);
  const sel=value?(()=>{const d=new Date(value);d.setHours(0,0,0,0);return d;})():null;
  const yr=view.getFullYear(),mo=view.getMonth();
  const fd=new Date(yr,mo,1).getDay();
  const dim=new Date(yr,mo+1,0).getDate();

  const calendar = open ? createPortal(
    <div ref={calRef} style={{position:"fixed",top:pos.top,left:pos.left,zIndex:99999,background:"#fff",border:"1px solid #E5E5E5",borderRadius:10,boxShadow:"0 8px 30px rgba(0,0,0,0.18)",padding:16,width:280}} onMouseDown={e=>e.stopPropagation()}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <button onClick={()=>setView(new Date(yr,mo-1,1))} style={{border:"none",background:"none",cursor:"pointer",fontSize:16,color:"#6B7280",padding:"2px 6px"}}>‹</button>
        <span style={{fontFamily:"Cormorant Garamond,serif",fontSize:16,fontWeight:700}}>{view.toLocaleDateString("en-GB",{month:"long",year:"numeric"})}</span>
        <button onClick={()=>setView(new Date(yr,mo+1,1))} style={{border:"none",background:"none",cursor:"pointer",fontSize:16,color:"#6B7280",padding:"2px 6px"}}>›</button>
      </div>
      <div style={{display:"flex",gap:4,marginBottom:10,flexWrap:"wrap"}}>
        {[["Today",0],["+3d",3],["Next Mon",null],["+2wk",14]].map(([l,n])=>(
          <button key={l} onClick={()=>{let d=new Date(today);if(l==="Next Mon"){const dw=d.getDay();d.setDate(d.getDate()+(dw===0?1:8-dw));}else d.setDate(d.getDate()+n);onChange(toLocalISO(d));setView(new Date(d));setOpen(false);}} style={{fontFamily:"Epilogue,sans-serif",fontSize:10,border:"1px solid #E5E5E5",background:"#FAFAF8",borderRadius:20,padding:"3px 8px",cursor:"pointer",color:"#6B7280"}}>{l}</button>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:4}}>
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d=><div key={d} style={{textAlign:"center",fontFamily:"Epilogue,sans-serif",fontSize:10,color:"#C4C4C4",padding:"2px 0"}}>{d}</div>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
        {Array(fd).fill(null).map((_,i)=><div key={"b"+i}/>)}
        {Array.from({length:dim},(_,i)=>i+1).map(day=>{
          const d=new Date(yr,mo,day);d.setHours(0,0,0,0);
          const isSel=sel&&d.getTime()===sel.getTime();
          const isT=d.getTime()===today.getTime();
          const isPast=d<today;
          const isW=d.getDay()===0||d.getDay()===6;
          return <button key={day} onClick={()=>!isPast&&(onChange(toLocalISO(new Date(yr,mo,day))),setOpen(false))} style={{border:"none",borderRadius:6,padding:"6px 2px",cursor:isPast?"default":"pointer",fontFamily:"Epilogue,sans-serif",fontSize:12,textAlign:"center",background:isSel?"#1a1a1a":isT?"#EEF2FF":"transparent",color:isSel?"#fff":isPast?"#D1D5DB":isW?"#C4C4C4":"#1a1a1a",fontWeight:isT||isSel?600:400}}>{day}</button>;
        })}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div style={{position:"relative"}}>
      {label&&<label className="lbl">{label}</label>}
      <div ref={triggerRef} onClick={openIt} style={{background:"#fff",border:"1px solid #E5E5E5",borderRadius:6,padding:"9px 12px",cursor:"pointer",fontFamily:"Epilogue,sans-serif",fontSize:13,color:value?"#1a1a1a":"#9CA3AF",display:"flex",alignItems:"center",justifyContent:"space-between",borderColor:open?"#1a1a1a":"#E5E5E5",transition:"border .15s"}}>
        <span>{value?fmtS(value):"Select date"}</span><span style={{fontSize:12,color:"#9CA3AF"}}>📅</span>
      </div>
      {calendar}
    </div>
  );
};

const TagInput = ({tags=[],onChange}) => {
  const [inp,setInp]=useState("");
  const add=()=>{const t=inp.trim().toLowerCase();if(t&&!tags.includes(t))onChange([...tags,t]);setInp("");};
  return (
    <div style={{border:"1px solid #E5E5E5",borderRadius:6,padding:"6px 10px",background:"#fff",display:"flex",flexWrap:"wrap",gap:6,alignItems:"center",minHeight:40}}>
      {tags.map(t=><span key={t} className="chip">{t}<button className="chip-remove" onClick={()=>onChange(tags.filter(x=>x!==t))}>×</button></span>)}
      <input value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"||e.key===","){e.preventDefault();add();}}} onBlur={add} placeholder={tags.length===0?"Add tags (press Enter)":""} style={{border:"none",outline:"none",padding:"2px 0",fontSize:12,flex:1,minWidth:80,background:"transparent"}}/>
    </div>
  );
};

const AddBtn = ({onContact,onCompany}) => {
  const [open,setOpen]=useState(false);
  const ref=useRef(null);
  useEffect(()=>{if(!open)return;const c=e=>{if(!ref.current?.contains(e.target))setOpen(false);};document.addEventListener("mousedown",c);return()=>document.removeEventListener("mousedown",c);},[open]);
  return (
    <div ref={ref} style={{position:"relative"}}>
      <button className="btn e" style={{background:"#1a1a1a",color:"#fff",display:"flex",alignItems:"center",gap:6}} onClick={()=>setOpen(o=>!o)}>+ Add <span style={{fontSize:10,opacity:.7}}>▾</span></button>
      {open&&<div className="dmenu"><button className="ditem" onClick={()=>{onContact();setOpen(false);}}>👤 New contact</button><button className="ditem" onClick={()=>{onCompany();setOpen(false);}}>🏢 New company</button></div>}
    </div>
  );
};

function SettingsView({pacing,onSave}) {
  const [form,setForm]=useState({...pacing});
  const [saved,setSaved]=useState(false);
  const save=()=>{onSave(form);setSaved(true);setTimeout(()=>setSaved(false),2000);};
  return (
    <div className="fu" style={{maxWidth:640,margin:"0 auto",padding:"40px 24px"}}>
      <div style={{marginBottom:32}}>
        <div style={{fontSize:34,fontWeight:700,letterSpacing:"-.02em",color:"#1a1a1a"}}>Settings</div>
        <div className="e" style={{fontSize:13,color:"#9CA3AF",marginTop:4}}>Configure default follow-up pacing by stage</div>
      </div>
      <div style={{background:"#fff",border:"1px solid #EBEBEB",borderRadius:10,overflow:"hidden",marginBottom:24}}>
        <div style={{padding:"16px 24px",borderBottom:"1px solid #EBEBEB",background:"#FAFAF8"}}>
          <div style={{fontSize:15,fontWeight:600,color:"#1a1a1a"}}>Follow-up pacing defaults</div>
          <div className="e" style={{fontSize:12,color:"#9CA3AF",marginTop:2}}>When you log a touchpoint, the next follow-up date is auto-suggested based on these intervals. Individual contacts can override these in their Profile tab.</div>
        </div>
        {STAGES.map((stage,i)=>(
          <div key={stage} style={{padding:"18px 24px",display:"grid",gridTemplateColumns:"1fr 180px",gap:24,alignItems:"center",borderBottom:i<STAGES.length-1?"1px solid #EBEBEB":"none"}}>
            <div>
              <div style={{marginBottom:4}}><SBadge stage={stage}/></div>
              <div className="e" style={{fontSize:12,color:"#9CA3AF"}}>{PACING_LABELS[stage]}</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <input type="number" min="1" max="365" value={form[stage]} onChange={e=>setForm({...form,[stage]:parseInt(e.target.value)||1})} style={{width:70,textAlign:"center"}}/>
              <span className="e" style={{fontSize:13,color:"#6B7280",whiteSpace:"nowrap"}}>days</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{background:"#EFF6FF",border:"1px solid #BFDBFE",borderRadius:8,padding:"14px 18px",marginBottom:28}}>
        <div className="e" style={{fontSize:12,color:"#1D4ED8"}}>💡 <strong>How it works:</strong> After logging a touchpoint, the next follow-up is auto-suggested from the stage interval. The ⏱ pacing badge appears when a contact hasn't been touched within their interval — even if a future follow-up is already scheduled.</div>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end"}}>
        <button className="btn e" style={{background:saved?"#15803D":"#1a1a1a",color:"#fff"}} onClick={save}>{saved?"Saved ✓":"Save settings"}</button>
      </div>
    </div>
  );
}

function ProfileEditor({contact:c,onSave,saving,pacing}) {
  const [form,setForm]=useState({
    company:c.company||"",contact:c.contact||"",phone:c.phone||"",email:c.email||"",
    linkedin:c.linkedin||"",website:c.website||"",industry:c.industry||"",
    company_size:c.company_size||"",deal_value:c.deal_value||"",
    follow_up_interval:c.follow_up_interval||"",tags:c.tags||[],
  });
  const [saved,setSaved]=useState(false);
  const save=async()=>{await onSave(form);setSaved(true);setTimeout(()=>setSaved(false),2000);};
  const sd=pacing[c.stage]||30;
  return (
    <div style={{background:"#fff",border:"1px solid #EBEBEB",borderRadius:10,padding:24}}>
      <div style={{fontSize:18,fontWeight:600,color:"#1a1a1a",marginBottom:20}}>Contact details</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <div><label className="lbl">Company</label><input value={form.company} onChange={e=>setForm({...form,company:e.target.value})}/></div>
        <div><label className="lbl">Contact name</label><input value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})}/></div>
        <div><label className="lbl">Phone</label><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></div>
        <div><label className="lbl">Email</label><input value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></div>
        <div><label className="lbl">LinkedIn URL</label><input value={form.linkedin} onChange={e=>setForm({...form,linkedin:e.target.value})}/></div>
        <div><label className="lbl">Website</label><input value={form.website} onChange={e=>setForm({...form,website:e.target.value})}/></div>
        <div><label className="lbl">Industry</label><select value={form.industry} onChange={e=>setForm({...form,industry:e.target.value})}><option value="">Select industry</option>{INDUSTRIES.map(i=><option key={i}>{i}</option>)}</select></div>
        <div><label className="lbl">Company size</label><select value={form.company_size} onChange={e=>setForm({...form,company_size:e.target.value})}><option value="">Select size</option>{["1–10","11–50","51–200","201–500","500+"].map(s=><option key={s}>{s}</option>)}</select></div>
        <div><label className="lbl">Deal value (AUD)</label><input type="number" value={form.deal_value} onChange={e=>setForm({...form,deal_value:e.target.value})}/></div>
        <div>
          <label className="lbl">Custom follow-up interval (days)</label>
          <input type="number" min="1" max="365" value={form.follow_up_interval} onChange={e=>setForm({...form,follow_up_interval:e.target.value})} placeholder={`Stage default: ${sd}d`}/>
          <div className="e" style={{fontSize:11,color:"#9CA3AF",marginTop:4}}>Leave blank to use the {c.stage} default ({sd} days)</div>
        </div>
      </div>
      <div style={{marginBottom:20}}><label className="lbl">Tags</label><TagInput tags={form.tags} onChange={tags=>setForm({...form,tags})}/></div>
      <div style={{display:"flex",justifyContent:"flex-end"}}>
        <button className="btn e" style={{background:saved?"#15803D":"#1a1a1a",color:"#fff",opacity:saving?0.6:1}} onClick={save} disabled={saving}>{saving?"Saving…":saved?"Saved ✓":"Save changes"}</button>
      </div>
    </div>
  );
}

function CompanyCard({company, onOpen, onLogTouchpoint, allContacts, pacing, onStageChange}) {
  const [exp, setExp] = useState(false);
  const [stageSaving, setStageSaving] = useState(false);
  const [bioEdit, setBioEdit] = useState(false);
  const [bioText, setBioText] = useState(company.contacts[0]?.company_bio || "");
  const [bioSaving, setBioSaving] = useState(false);
  const ws = company.contacts.map(c => c.website).find(Boolean);
  const companySize = company.contacts.map(c => c.company_size).find(Boolean);
  const industry = company.contacts.map(c => c.industry).find(Boolean);

  const saveBio = async () => {
    setBioSaving(true);
    await supabase.from("contacts").update({company_bio: bioText}).eq("id", company.contacts[0].id);
    setBioSaving(false);
    setBioEdit(false);
  };

  // Merge all history from all contacts under this company, sorted newest first
  const allHistory = company.contacts
    .flatMap(c => (c.history||[]).map(h => ({...h, contactName: c.contact||c.company, contactId: c.id})))
    .sort((a,b) => new Date(b.date) - new Date(a.date));

  // Company stage = most recently touched contact's stage
  const currentStage = company.contacts.slice().sort((a,b) => new Date(b.last_touch||0) - new Date(a.last_touch||0))[0]?.stage || "Outreach";
  const latestDue = company.contacts.map(c=>c.next_due).filter(Boolean).sort()[0];

  const handleStageChange = async (e) => {
    e.stopPropagation();
    const newStage = e.target.value;
    setStageSaving(true);
    // Update ALL contacts under this company to the new stage
    await Promise.all(company.contacts.map(c =>
      supabase.from("contacts").update({stage: newStage}).eq("id", c.id)
    ));
    setStageSaving(false);
    onStageChange();
  };

  return (
    <div style={{background:"#fff",border:"1px solid #EBEBEB",borderRadius:10,marginBottom:10,overflow:"hidden"}}>
      {/* Header row */}
      <div style={{padding:"14px 24px",display:"grid",gridTemplateColumns:"1fr 120px 120px 200px 40px",gap:16,alignItems:"center",transition:"background .12s"}}
        onMouseEnter={e=>e.currentTarget.style.background="#F7F7F5"}
        onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
        <div style={{display:"flex",alignItems:"center",gap:12,cursor:"pointer"}} onClick={()=>setExp(o=>!o)}>
          <div style={{width:38,height:38,borderRadius:"50%",background:"#F3F4F6",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,border:"1px solid #EBEBEB"}}>
            <span style={{fontSize:16,fontWeight:700,color:"#6B7280"}}>{company.name?.[0]||"?"}</span>
          </div>
          <div>
            <div style={{fontSize:15,fontWeight:600,color:"#1a1a1a"}}>{company.name}</div>
            <div style={{display:"flex",gap:8,marginTop:2,alignItems:"center",flexWrap:"wrap"}}>
              {ws&&<a href={ws} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} className="e" style={{fontSize:11,color:"#4F46E5",textDecoration:"none"}}>🌐 {ws.replace(/^https?:\/\/|\/$/g,"")}</a>}
              {industry&&<span className="e" style={{fontSize:11,color:"#9CA3AF"}}>{industry}</span>}
              {companySize&&<span className="e" style={{fontSize:11,color:"#9CA3AF"}}>· {companySize}</span>}
              {company.contacts.length>1&&<span className="e" style={{fontSize:11,color:"#9CA3AF"}}>· {company.contacts.length} contacts</span>}
            </div>
          </div>
        </div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{[...new Set(company.contacts.map(c=>c.owner))].map(o=><OwnerPill key={o} userId={o}/>)}</div>
        <div className="e" style={{fontSize:13,fontWeight:600,color:company.tv>0?"#15803D":"#D1D5DB"}}>{company.tv>0?fmtC(company.tv):"—"}</div>
        <div style={{display:"flex",alignItems:"center",gap:8}} onClick={e=>e.stopPropagation()}>
          <select
            value={currentStage}
            onChange={handleStageChange}
            disabled={stageSaving}
            style={{
              fontSize:11, fontFamily:"Epilogue,sans-serif", fontWeight:500,
              padding:"4px 10px", borderRadius:20, cursor:"pointer",
              border:`1px solid ${STAGE_COLORS[currentStage]?.text||"#9CA3AF"}40`,
              background:STAGE_COLORS[currentStage]?.bg||"#F1F5F9",
              color:STAGE_COLORS[currentStage]?.text||"#475569",
              opacity:stageSaving?0.6:1, width:"100%",
            }}>
            {STAGES.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          {latestDue&&<UBadge due={latestDue}/>}
        </div>
        <div style={{fontSize:14,color:"#9CA3AF",textAlign:"center",transition:"transform .2s",transform:exp?"rotate(180deg)":"rotate(0deg)",cursor:"pointer"}} onClick={()=>setExp(o=>!o)}>▾</div>
      </div>

      {exp&&(
        <div style={{borderTop:"1px solid #EBEBEB",background:"#FAFAF8"}}>

          {/* Bio / About section */}
          <div style={{padding:"16px 24px",borderBottom:"1px solid #EBEBEB",display:"flex",alignItems:"flex-start",gap:16}}>
            <div style={{flex:1}}>
              {!bioEdit ? (
                <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                  <div style={{flex:1}}>
                    {bioText
                      ? <div className="e" style={{fontSize:13,color:"#374151",lineHeight:1.6}}>{bioText}</div>
                      : <div className="e" style={{fontSize:13,color:"#D1D5DB",fontStyle:"italic"}}>No company notes yet — click to add</div>
                    }
                  </div>
                  <button onClick={e=>{e.stopPropagation();setBioEdit(true);}} style={{border:"1px solid #E5E5E5",background:"none",fontFamily:"Epilogue,sans-serif",fontSize:11,color:"#9CA3AF",padding:"4px 10px",borderRadius:6,cursor:"pointer",flexShrink:0,whiteSpace:"nowrap"}}>
                    {bioText ? "Edit" : "+ Add notes"}
                  </button>
                </div>
              ) : (
                <div onClick={e=>e.stopPropagation()}>
                  <textarea
                    value={bioText}
                    onChange={e=>setBioText(e.target.value)}
                    autoFocus
                    placeholder="Add notes about this company — what they do, key context, relationship history…"
                    rows={3}
                    style={{width:"100%",fontFamily:"Epilogue,sans-serif",fontSize:13,padding:"8px 12px",border:"1px solid #1a1a1a",borderRadius:6,resize:"vertical",outline:"none",background:"#fff"}}
                  />
                  <div style={{display:"flex",gap:8,marginTop:8}}>
                    <button onClick={saveBio} disabled={bioSaving} style={{border:"none",background:"#1a1a1a",color:"#fff",fontFamily:"Epilogue,sans-serif",fontSize:11,padding:"5px 14px",borderRadius:6,cursor:"pointer",opacity:bioSaving?0.6:1}}>
                      {bioSaving?"Saving…":"Save"}
                    </button>
                    <button onClick={e=>{e.stopPropagation();setBioEdit(false);setBioText(company.contacts[0]?.company_bio||"");}} style={{border:"1px solid #E5E5E5",background:"none",fontFamily:"Epilogue,sans-serif",fontSize:11,color:"#6B7280",padding:"5px 14px",borderRadius:6,cursor:"pointer"}}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:0}}>

            {/* LEFT: Timeline */}
            <div style={{padding:"20px 24px",borderRight:"1px solid #EBEBEB"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
                <div className="e" style={{fontSize:10,letterSpacing:".1em",textTransform:"uppercase",color:"#9CA3AF"}}>Touchpoint history ({allHistory.length})</div>
                <button onClick={e=>{e.stopPropagation();onLogTouchpoint(company);}} className="btn e" style={{background:"#1a1a1a",color:"#fff",padding:"5px 14px",fontSize:11}}>+ Log touchpoint</button>
              </div>
              {allHistory.length===0&&<div className="e" style={{fontSize:13,color:"#D1D5DB"}}>No touchpoints logged yet.</div>}
              <div style={{position:"relative"}}>
                <div style={{position:"absolute",left:4,top:8,bottom:8,width:1,background:"#EBEBEB"}}/>
                {allHistory.map((h,i)=>(
                  <div key={i} style={{display:"flex",gap:14,paddingBottom:16}}>
                    <div style={{paddingTop:3,flexShrink:0}}>
                      <div style={{width:9,height:9,borderRadius:"50%",background:i===0?"#1a1a1a":"#D1D5DB",border:"2px solid #FAFAF8",flexShrink:0}}/>
                    </div>
                    <div style={{flex:1,background:i===0?"#fff":"transparent",border:i===0?"1px solid #EBEBEB":"none",borderRadius:7,padding:i===0?"10px 14px":"0 0 0 2px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4,flexWrap:"wrap"}}>
                        <span style={{fontSize:13}}>{aIcon(h.type)}</span>
                        <span className="e" style={{fontSize:11,fontWeight:500,color:i===0?"#1a1a1a":"#9CA3AF"}}>{fmtS(h.date)}</span>
                        {h.by&&<OwnerPill userId={h.by}/>}
                        {h.contactName&&<span className="e" style={{fontSize:10,color:"#9CA3AF",background:"#F3F4F6",padding:"1px 7px",borderRadius:20}}>{h.contactName}</span>}
                        {i===0&&<span className="tag e" style={{background:"#F3F4F6",color:"#6B7280",fontSize:9}}>Latest</span>}
                      </div>
                      <div style={{fontSize:13,color:i===0?"#1a1a1a":"#6B7280",lineHeight:1.5}}>{h.note||"—"}</div>
                      {h.action&&h.action!=="—"&&<div className="e" style={{fontSize:11,color:"#C4C4C4",marginTop:3}}>→ {h.action}</div>}
                      {h.stage&&<div style={{marginTop:4}}><SBadge stage={h.stage}/></div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT: Contacts panel */}
            <div style={{padding:"20px 20px"}}>
              <div className="e" style={{fontSize:10,letterSpacing:".1em",textTransform:"uppercase",color:"#9CA3AF",marginBottom:12}}>Contacts ({company.contacts.length})</div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {company.contacts.map(c=>(
                  <div key={c.id} onClick={e=>{e.stopPropagation();onOpen(c);}}
                    style={{background:"#fff",border:"1px solid #EBEBEB",borderRadius:8,padding:"10px 12px",cursor:"pointer",transition:"box-shadow .15s"}}
                    onMouseEnter={e=>e.currentTarget.style.boxShadow="0 2px 8px rgba(0,0,0,0.08)"}
                    onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:600,color:"#1a1a1a"}}>{c.contact||c.company}</div>
                        <div style={{display:"flex",gap:8,marginTop:3,flexWrap:"wrap"}}>
                          {c.email&&<a href={`mailto:${c.email}`} onClick={e=>e.stopPropagation()} className="e" style={{fontSize:11,color:"#4F46E5",textDecoration:"none"}}>✉️</a>}
                          {c.phone&&<a href={`tel:${c.phone}`} onClick={e=>e.stopPropagation()} className="e" style={{fontSize:11,color:"#4F46E5",textDecoration:"none"}}>📞</a>}
                          {c.linkedin&&<a href={c.linkedin} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} className="e" style={{fontSize:11,color:"#4F46E5",textDecoration:"none"}}>💼</a>}
                        </div>
                      </div>
                      <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3}}>
                        <OwnerPill userId={c.owner}/>
                      </div>
                    </div>
                    {c.next_action&&<div className="e" style={{fontSize:11,color:"#9CA3AF",marginTop:4}}>→ {c.next_action}</div>}
                    <PacingWarn contact={c} pacing={pacing}/>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



function CompaniesView({contacts, onOpen, onLogTouchpoint, pacing, onRefresh}) {
  const [search, setSearch] = useState("");
  const [stageF, setStageF] = useState("All");

  const map = {};
  contacts.forEach(c => {
    const k = c.company?.toLowerCase().trim() || "unknown";
    if (!map[k]) map[k] = {name:c.company, contacts:[], tv:0, stages:new Set()};
    map[k].contacts.push(c);
    map[k].tv += parseFloat(c.deal_value) || 0;
    map[k].stages.add(c.stage);
  });

  const list = Object.values(map)
    .filter(co => !search || co.name?.toLowerCase().includes(search.toLowerCase()))
    .filter(co => stageF === "All" || co.stages.has(stageF))
    .sort((a,b) => b.tv - a.tv || b.contacts.length - a.contacts.length);

  return (
    <div className="fu" style={{maxWidth:980,margin:"0 auto",padding:"40px 24px"}}>
      <div style={{marginBottom:24}}>
        <div style={{fontSize:34,fontWeight:700,letterSpacing:"-.02em",color:"#1a1a1a"}}>Companies</div>
        <div className="e" style={{fontSize:13,color:"#9CA3AF",marginTop:4}}>{list.length} companies</div>
      </div>
      <div style={{marginBottom:14}}><SearchBar value={search} onChange={setSearch}/></div>
      <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
        {["All",...STAGES].map(s=>(
          <button key={s} className={`filter-btn e ${stageF===s?"on":""}`} onClick={()=>setStageF(s)}>{s}</button>
        ))}
      </div>
      <div className="e" style={{padding:"10px 24px",display:"grid",gridTemplateColumns:"1fr 120px 120px 180px 40px",gap:16,fontSize:10,color:"#C4C4C4",letterSpacing:".12em",textTransform:"uppercase",marginBottom:4}}>
        <span>Company</span><span>Owner</span><span>Value</span><span>Stage / Due</span><span/>
      </div>
      {list.length===0&&<EmptyState title="No companies found."/>}
      {list.map(co=><CompanyCard key={co.name} company={co} onOpen={onOpen} onLogTouchpoint={onLogTouchpoint} allContacts={contacts} pacing={pacing} onStageChange={onRefresh}/>)}
    </div>
  );
}

function PipelineView({contacts, currentUser, onOpen, onGoToCompany}) {
  const [ownerF, setOwnerF] = useState("all");
  const [expanded, setExpanded] = useState({});
  const active = contacts.filter(c => !c.archived);
  const filtered = active.filter(c => ownerF==="all" ? true : c.owner===currentUser);

  // Group by company for pipeline display
  const companiesByStage = stage => {
    const map = {};
    filtered.filter(c => c.stage===stage).forEach(c => {
      const k = c.company?.toLowerCase().trim()||"?";
      if (!map[k]) map[k] = {name:c.company, contacts:[], tv:0};
      map[k].contacts.push(c);
      map[k].tv += parseFloat(c.deal_value)||0;
    });
    return Object.values(map).sort((a,b) => b.tv-a.tv);
  };

  const sd = STAGES.map(s => {
    const companies = companiesByStage(s);
    const value = companies.reduce((a,co)=>a+co.tv,0);
    return {s, count:companies.length, value, companies};
  });

  const tp = filtered.filter(c=>c.stage!=="Closed Lost").reduce((a,c)=>a+(parseFloat(c.deal_value)||0),0);
  const tw = filtered.filter(c=>c.stage==="Closed Won").reduce((a,c)=>a+(parseFloat(c.deal_value)||0),0);
  const ct = filtered.filter(c=>c.stage==="Closed Won"||c.stage==="Closed Lost").length;
  const wr = ct ? Math.round(filtered.filter(c=>c.stage==="Closed Won").length/ct*100) : null;

  const toggle = s => setExpanded(e => ({...e, [s]:!e[s]}));

  return (
    <div className="fu" style={{maxWidth:900,margin:"0 auto",padding:"40px 24px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:28}}>
        <div>
          <div style={{fontSize:34,fontWeight:700,letterSpacing:"-.02em",color:"#1a1a1a"}}>Pipeline</div>
          <div className="e" style={{fontSize:13,color:"#9CA3AF",marginTop:4}}>Stage-by-stage breakdown</div>
        </div>
        <div style={{display:"flex",gap:6}}>
          {[["all","Everyone"],[currentUser,USERS[currentUser].name]].map(([k,l])=>(
            <button key={k} className={`filter-btn e ${ownerF===k?"on":""}`} onClick={()=>setOwnerF(k)}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginBottom:32}}>
        {[{l:"Active pipeline",v:fmtC(tp),c:"#4F46E5",show:tp>0},{l:"Closed won",v:fmtC(tw),c:"#15803D",show:tw>0},{l:"Win rate",v:wr!==null?`${wr}%`:"—",c:"#D97706",show:wr!==null}].map(({l,v,c,show})=>(
          <div key={l} style={{background:"#fff",border:"1px solid #EBEBEB",borderRadius:10,padding:"20px 24px"}}>
            <div className="e" style={{fontSize:11,letterSpacing:".1em",textTransform:"uppercase",color:"#9CA3AF",marginBottom:8}}>{l}</div>
            <div style={{fontSize:28,fontWeight:700,color:show?c:"#D1D5DB"}}>{show?v:"—"}</div>
          </div>
        ))}
      </div>

      <div style={{background:"#fff",border:"1px solid #EBEBEB",borderRadius:10,overflow:"hidden"}}>
        {sd.map(({s, count, value, companies}, si) => (
          <div key={s}>
            <div style={{padding:"16px 24px",display:"grid",gridTemplateColumns:"1fr 60px 120px 40px",gap:16,alignItems:"center",borderBottom:"1px solid #EBEBEB",cursor:count>0?"pointer":"default",transition:"background .12s"}}
              onMouseEnter={e=>count>0&&(e.currentTarget.style.background="#F7F7F5")}
              onMouseLeave={e=>e.currentTarget.style.background="#fff"}
              onClick={()=>count>0&&toggle(s)}>
              <SBadge stage={s}/>
              <div className="e" style={{fontSize:15,fontWeight:600,color:count>0?"#1a1a1a":"#D1D5DB"}}>{count}</div>
              <div className="e" style={{fontSize:14,fontWeight:600,color:value>0?"#15803D":"#D1D5DB"}}>{value>0?fmtC(value):"—"}</div>
              <div style={{fontSize:13,color:"#9CA3AF",textAlign:"center",transition:"transform .2s",transform:expanded[s]?"rotate(180deg)":"rotate(0deg)"}}>
                {count>0?"▾":""}
              </div>
            </div>

            {expanded[s] && count>0 && (
              <div style={{background:"#FAFAF8",borderBottom:"1px solid #EBEBEB"}}>
                {companies.map((co, ci) => (
                  <div key={co.name} style={{padding:"12px 24px 12px 40px",display:"grid",gridTemplateColumns:"1fr 120px 120px",gap:16,alignItems:"center",borderBottom:ci<companies.length-1?"1px solid #EBEBEB":"none",cursor:"pointer",transition:"background .12s"}}
                    onMouseEnter={e=>e.currentTarget.style.background="#F0F0EE"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                    onClick={()=>onGoToCompany(co.name)}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:6,height:6,borderRadius:"50%",background:STAGE_COLORS[s]?.text||"#9CA3AF",flexShrink:0}}/>
                      <div>
                        <div style={{fontSize:14,fontWeight:600,color:"#1a1a1a"}}>{co.name}</div>
                        <div className="e" style={{fontSize:11,color:"#9CA3AF"}}>
                          {co.contacts.map(c=>c.contact||"").filter(Boolean).join(", ")||"No named contacts"}
                        </div>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                      {[...new Set(co.contacts.map(c=>c.owner))].map(o=><OwnerPill key={o} userId={o}/>)}
                    </div>
                    <div className="e" style={{fontSize:13,fontWeight:600,color:co.tv>0?"#15803D":"#D1D5DB"}}>
                      {co.tv>0?fmtC(co.tv):"—"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


// ── LOG TOUCHPOINT MODAL (portal — renders outside App stacking context) ──────

function LogModal({company, contacts, currentUser, pacing, onClose, onSaved}) {
  const u = USERS[currentUser] || USERS.nick;
  const [ln, setLn] = useState("");
  const [la, setLa] = useState("");
  const [ld, setLd] = useState(addDays(TODAY, 30));
  const [ls, setLs] = useState(company.contacts[0]?.stage || "Outreach");
  const [lt, setLt] = useState("note");
  const [selId, setSelId] = useState(company.contacts[0]?.id || null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const targetId = selId || company.contacts[0]?.id;
    if (targetId) {
      const c = contacts.find(x => x.id === targetId) || company.contacts[0];
      const entry = {date:TODAY, note:ln, action:la, stage:ls, type:lt, by:currentUser};
      await supabase.from("contacts").update({
        last_note: ln, last_touch: TODAY, next_action: la, next_due: ld,
        history: [...(c?.history||[]), entry],
      }).eq("id", targetId);
      if (ls) await Promise.all(company.contacts.map(con =>
        supabase.from("contacts").update({stage: ls}).eq("id", con.id)
      ));
    }
    setSaving(false);
    onSaved();
  };

  return createPortal(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9000}} onClick={onClose}>
      <div style={{background:"#fff",borderRadius:12,padding:32,width:560,maxWidth:"94vw",boxShadow:"0 24px 64px rgba(0,0,0,0.18)",overflowY:"auto",maxHeight:"90vh",fontFamily:"Cormorant Garamond,Georgia,serif"}} onClick={e=>e.stopPropagation()}>
        <style>{`
          .lml{font-family:'Epilogue',sans-serif;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#9CA3AF;display:block;margin-bottom:5px;}
          .lmi{background:#fff;border:1px solid #E5E5E5;color:#1a1a1a;font-family:'Epilogue',sans-serif;font-size:13px;padding:9px 12px;border-radius:6px;width:100%;outline:none;}
          .lmi:focus{border-color:#1a1a1a;}
        `}</style>
        <div style={{fontSize:22,fontWeight:700,letterSpacing:"-.02em",color:"#1a1a1a",marginBottom:4}}>Log touchpoint</div>
        <div style={{fontFamily:"Epilogue,sans-serif",fontSize:13,color:"#9CA3AF",marginBottom:24}}>{company.name} · saving as {u.name}</div>

        <div style={{marginBottom:14}}>
          <label className="lml">Contact</label>
          <select className="lmi" value={selId||""} onChange={e=>setSelId(e.target.value?parseInt(e.target.value):null)}>
            <option value="">Company-wide</option>
            {company.contacts.map(c=><option key={c.id} value={c.id}>{c.contact||c.company}</option>)}
          </select>
        </div>

        <div style={{marginBottom:14}}>
          <label className="lml">Activity type</label>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {ACTIVITY_TYPES.map(a=>(
              <button key={a.value} onClick={()=>setLt(a.value)} style={{border:`1px solid ${lt===a.value?"#1a1a1a":"#E5E5E5"}`,background:lt===a.value?"#1a1a1a":"#fff",color:lt===a.value?"#fff":"#6B7280",borderRadius:20,padding:"5px 14px",fontSize:12,fontFamily:"Epilogue,sans-serif",cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
                <span>{a.icon}</span>{a.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{display:"grid",gap:12,marginBottom:20}}>
          <div>
            <label className="lml">What happened?</label>
            <textarea className="lmi" rows={3} placeholder="Notes from the call, email, meeting…" value={ln} onChange={e=>setLn(e.target.value)} style={{resize:"vertical"}}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div>
              <label className="lml">Next action</label>
              <input className="lmi" placeholder="e.g. Send proposal" value={la} onChange={e=>setLa(e.target.value)}/>
            </div>
            <CalPicker label="Next follow-up" value={ld} onChange={setLd}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div>
              <label className="lml">Move to stage</label>
              <select className="lmi" value={ls} onChange={e=>setLs(e.target.value)}>
                {STAGES.map(s=><option key={s}>{s}</option>)}
              </select>
              <div style={{fontFamily:"Epilogue,sans-serif",fontSize:10,color:"#9CA3AF",marginTop:4}}>Updates all contacts at this company</div>
            </div>
          </div>
        </div>

        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <button onClick={onClose} style={{border:"1px solid #E5E5E5",background:"none",color:"#6B7280",fontFamily:"Epilogue,sans-serif",fontSize:12,padding:"9px 18px",borderRadius:6,cursor:"pointer"}}>Cancel</button>
          <button onClick={save} disabled={saving} style={{border:"none",background:u.color,color:"#fff",fontFamily:"Epilogue,sans-serif",fontSize:12,padding:"9px 18px",borderRadius:6,cursor:saving?"default":"pointer",opacity:saving?0.6:1}}>
            {saving?"Saving…":"Save touchpoint"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}


// ── ADD CONTACT/COMPANY MODAL (portal) ────────────────────────────────────────

function AddModal({type, allContacts, onClose, onSaved, currentUser, pacing}) {
  const u = USERS[currentUser] || USERS.nick;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Company form state
  const [cName, setCName] = useState("");
  const [cWebsite, setCWebsite] = useState("");
  const [cIndustry, setCIndustry] = useState("");
  const [cSize, setCSize] = useState("");
  const [cOwner, setCOwner] = useState(currentUser);
  const [cStage, setCStage] = useState("Outreach");
  const [cValue, setCValue] = useState("");
  const [cNote, setCNote] = useState("");
  const [cAction, setCAction] = useState("");
  const [cDue, setCDue] = useState("");

  // Contact form state
  const [ctCompany, setCtCompany] = useState(""); // existing company name or new
  const [ctName, setCtName] = useState("");
  const [ctPhone, setCtPhone] = useState("");
  const [ctEmail, setCtEmail] = useState("");
  const [ctLinkedin, setCtLinkedin] = useState("");
  const [ctOwner, setCtOwner] = useState(currentUser);
  const [ctNote, setCtNote] = useState("");
  const [ctAction, setCtAction] = useState("");
  const [ctDue, setCtDue] = useState("");

  const existingCompanies = [...new Set(allContacts.filter(c=>c.company).map(c=>c.company))].sort();

  // When picking an existing company, inherit its stage/owner/website
  const matchedCompany = allContacts.find(c => c.company === ctCompany);

  const saveCompany = async () => {
    if (!cName.trim()) { setError("Company name is required"); return; }
    setSaving(true); setError("");
    await supabase.from("contacts").insert([{
      company: cName.trim(), contact: "", website: cWebsite, industry: cIndustry,
      company_size: cSize, owner: cOwner, stage: cStage, deal_value: cValue||null,
      last_touch: TODAY, last_note: cNote, next_action: cAction,
      next_due: cDue || addDays(TODAY, pacing[cStage]||30),
      archived: false, tags: [],
      history: [{date:TODAY, note:cNote, action:cAction, stage:cStage, type:"note", by:currentUser}],
    }]);
    setSaving(false);
    onSaved();
  };

  const saveContact = async () => {
    if (!ctCompany.trim()) { setError("Please select or enter a company"); return; }
    if (!ctName.trim()) { setError("Contact name is required"); return; }
    setSaving(true); setError("");
    const stage = matchedCompany?.stage || "Outreach";
    const website = matchedCompany?.website || "";
    const industry = matchedCompany?.industry || "";
    await supabase.from("contacts").insert([{
      company: ctCompany.trim(), contact: ctName.trim(),
      phone: ctPhone, email: ctEmail, linkedin: ctLinkedin,
      website, industry, owner: ctOwner, stage,
      last_touch: TODAY, last_note: ctNote, next_action: ctAction,
      next_due: ctDue || addDays(TODAY, pacing[stage]||30),
      archived: false, tags: [],
      history: [{date:TODAY, note:ctNote, action:ctAction, stage, type:"note", by:currentUser}],
    }]);
    setSaving(false);
    onSaved();
  };

  const S = {fontFamily:"Epilogue,sans-serif"};
  const labelStyle = {...S, fontSize:10, letterSpacing:".1em", textTransform:"uppercase", color:"#9CA3AF", display:"block", marginBottom:5};
  const inputStyle = {...S, fontSize:13, padding:"9px 12px", borderRadius:6, border:"1px solid #E5E5E5", width:"100%", outline:"none", background:"#fff", color:"#1a1a1a"};
  const btnPrimary = {...S, border:"none", background:u.color, color:"#fff", fontSize:12, padding:"9px 20px", borderRadius:6, cursor:saving?"default":"pointer", opacity:saving?0.6:1};
  const btnGhost = {...S, border:"1px solid #E5E5E5", background:"none", color:"#6B7280", fontSize:12, padding:"9px 18px", borderRadius:6, cursor:"pointer"};
  const grid2 = {display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14};

  return createPortal(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9000}} onClick={onClose}>
      <div style={{background:"#fff",borderRadius:12,padding:32,width:540,maxWidth:"94vw",boxShadow:"0 24px 64px rgba(0,0,0,0.18)",overflowY:"auto",maxHeight:"92vh"}} onClick={e=>e.stopPropagation()}>

        <div style={{fontSize:26,fontWeight:700,letterSpacing:"-.02em",color:"#1a1a1a",fontFamily:"Cormorant Garamond,serif",marginBottom:4}}>
          {type==="company" ? "🏢 New company" : "👤 New contact"}
        </div>
        <div style={{...S,fontSize:12,color:"#9CA3AF",marginBottom:24}}>
          {type==="company" ? "Add a new company to your pipeline" : "Add a contact and link them to a company"}
        </div>

        {error && <div style={{...S,fontSize:12,color:"#DC2626",background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:6,padding:"8px 12px",marginBottom:16}}>{error}</div>}

        {type==="company" && (
          <>
            <div style={grid2}>
              <div style={{gridColumn:"1/-1"}}><label style={labelStyle}>Company name *</label><input style={inputStyle} placeholder="e.g. Commbank Connect" value={cName} onChange={e=>setCName(e.target.value)} autoFocus/></div>
              <div><label style={labelStyle}>Website</label><input style={inputStyle} placeholder="https://..." value={cWebsite} onChange={e=>setCWebsite(e.target.value)}/></div>
              <div><label style={labelStyle}>Industry</label><select style={inputStyle} value={cIndustry} onChange={e=>setCIndustry(e.target.value)}><option value="">Select…</option>{INDUSTRIES.map(i=><option key={i}>{i}</option>)}</select></div>
              <div><label style={labelStyle}>Company size</label><select style={inputStyle} value={cSize} onChange={e=>setCSize(e.target.value)}><option value="">Select…</option>{["1–10","11–50","51–200","201–500","500+"].map(s=><option key={s}>{s}</option>)}</select></div>
              <div><label style={labelStyle}>Deal value (AUD)</label><input style={inputStyle} type="number" placeholder="50000" value={cValue} onChange={e=>setCValue(e.target.value)}/></div>
              <div><label style={labelStyle}>Owner</label><select style={inputStyle} value={cOwner} onChange={e=>setCOwner(e.target.value)}>{Object.entries(USERS).map(([k,v])=><option key={k} value={k}>{v.name}</option>)}</select></div>
              <div><label style={labelStyle}>Stage</label><select style={inputStyle} value={cStage} onChange={e=>setCStage(e.target.value)}>{STAGES.map(s=><option key={s}>{s}</option>)}</select></div>
            </div>
            <div style={{marginBottom:14}}><label style={labelStyle}>Note</label><textarea style={{...inputStyle,resize:"vertical"}} rows={2} placeholder="How did you find them / context…" value={cNote} onChange={e=>setCNote(e.target.value)}/></div>
            <div style={{...grid2,marginBottom:20}}>
              <div><label style={labelStyle}>Next action</label><input style={inputStyle} placeholder="e.g. Send intro email" value={cAction} onChange={e=>setCAction(e.target.value)}/></div>
              <CalPicker label="Follow-up date" value={cDue} onChange={setCDue}/>
            </div>
          </>
        )}

        {type==="contact" && (
          <>
            <div style={{marginBottom:14}}>
              <label style={labelStyle}>Company *</label>
              <input style={{...inputStyle, borderColor: ctCompany&&!matchedCompany?"#F59E0B":"#E5E5E5"}}
                list="company-options"
                placeholder="Type to search or add new company…"
                value={ctCompany}
                onChange={e=>setCtCompany(e.target.value)}
                autoFocus
              />
              <datalist id="company-options">
                {existingCompanies.map(co=><option key={co} value={co}/>)}
              </datalist>
              {ctCompany && !matchedCompany && <div style={{...S,fontSize:11,color:"#F59E0B",marginTop:4}}>⚠ New company — will be created automatically</div>}
              {matchedCompany && <div style={{...S,fontSize:11,color:"#15803D",marginTop:4}}>✓ Linked to existing company ({matchedCompany.stage})</div>}
            </div>
            <div style={grid2}>
              <div style={{gridColumn:"1/-1"}}><label style={labelStyle}>Contact name *</label><input style={inputStyle} placeholder="e.g. Shannon Hollis" value={ctName} onChange={e=>setCtName(e.target.value)}/></div>
              <div><label style={labelStyle}>Phone</label><input style={inputStyle} placeholder="+61 4xx xxx xxx" value={ctPhone} onChange={e=>setCtPhone(e.target.value)}/></div>
              <div><label style={labelStyle}>Email</label><input style={inputStyle} placeholder="shannon@..." value={ctEmail} onChange={e=>setCtEmail(e.target.value)}/></div>
              <div style={{gridColumn:"1/-1"}}><label style={labelStyle}>LinkedIn URL</label><input style={inputStyle} placeholder="https://linkedin.com/in/…" value={ctLinkedin} onChange={e=>setCtLinkedin(e.target.value)}/></div>
              <div><label style={labelStyle}>Owner</label><select style={inputStyle} value={ctOwner} onChange={e=>setCtOwner(e.target.value)}>{Object.entries(USERS).map(([k,v])=><option key={k} value={k}>{v.name}</option>)}</select></div>
            </div>
            <div style={{marginBottom:14}}><label style={labelStyle}>Note</label><textarea style={{...inputStyle,resize:"vertical"}} rows={2} placeholder="How did you meet / context…" value={ctNote} onChange={e=>setCtNote(e.target.value)}/></div>
            <div style={{...grid2,marginBottom:20}}>
              <div><label style={labelStyle}>Next action</label><input style={inputStyle} placeholder="e.g. Follow up call" value={ctAction} onChange={e=>setCtAction(e.target.value)}/></div>
              <CalPicker label="Follow-up date" value={ctDue} onChange={setCtDue}/>
            </div>
          </>
        )}

        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <button style={btnGhost} onClick={onClose}>Cancel</button>
          <button style={btnPrimary} disabled={saving} onClick={type==="company"?saveCompany:saveContact}>
            {saving?"Saving…":type==="company"?"Save company":"Save contact"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}


// ── CANDIDATES VIEW ───────────────────────────────────────────────────────────

const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/1BICeqw44-N21r_NsqfKzxkhXPLfX3QI7xwGmHFalO3w/export?format=csv&sheet=Sheet1";

const JOB_FUNCTIONS = ["All","Sales","Account Management","Operations","Data","Marketing","Other"];

function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g,""));
  return lines.slice(1).map((line, idx) => {
    // Handle quoted fields
    const cols = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQ = !inQ; }
      else if (line[i] === "," && !inQ) { cols.push(cur.trim()); cur = ""; }
      else { cur += line[i]; }
    }
    cols.push(cur.trim());
    return {
      _id: `row-${idx}`,
      date: cols[0]||"",
      name: cols[1]||"",
      jobFunction: cols[2]||"",
      currentPosition: cols[3]||"",
      company: cols[4]||"",
      salary: cols[5]||"",
      noticePeriod: cols[6]||"",
      city: cols[7]||"",
      skills: cols[8]||"",
    };
  }).filter(r => r.name);
}

function parseSalary(s) {
  if (!s) return null;
  const m = s.toString().replace(/[,$k]/gi,"").match(/\d+/);
  if (!m) return null;
  const n = parseInt(m[0]);
  return n < 1000 ? n * 1000 : n;
}

function fmtSalary(s) {
  const n = parseSalary(s);
  if (!n) return s||"—";
  return "$" + Math.round(n/1000) + "k";
}

function parseNotice(s) {
  if (!s) return null;
  const str = s.toString().toLowerCase();
  if (str.includes("immediate") || str === "0") return 0;
  const m = str.match(/(\d+)/);
  if (!m) return null;
  const n = parseInt(m[1]);
  // if it's already weeks (small number), use as is; if months multiply
  if (str.includes("month")) return n * 4;
  return n;
}

function fmtNotice(s) {
  const w = parseNotice(s);
  if (w === null) return s||"—";
  if (w === 0) return "Immediate";
  if (w < 4) return `${w}w`;
  const months = Math.round(w/4);
  return months === 1 ? "1 month" : `${months} months`;
}

function CandidatePanel({candidate, note, onNoteChange, onSave, saving, onClose}) {
  return createPortal(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"flex-end",justifyContent:"flex-end",zIndex:9000}} onClick={onClose}>
      <div style={{width:420,height:"100vh",background:"#fff",boxShadow:"-8px 0 40px rgba(0,0,0,0.12)",overflowY:"auto",padding:32,display:"flex",flexDirection:"column",gap:20}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{fontSize:22,fontWeight:700,letterSpacing:"-.02em",color:"#1a1a1a",fontFamily:"Cormorant Garamond,serif"}}>{candidate.name}</div>
          <button onClick={onClose} style={{border:"none",background:"none",fontSize:20,color:"#9CA3AF",cursor:"pointer",padding:4}}>×</button>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {[
            ["Role", candidate.currentPosition||"—"],
            ["Company", candidate.company||"—"],
            ["Function", candidate.jobFunction||"—"],
            ["Salary", fmtSalary(candidate.salary)],
            ["Notice", fmtNotice(candidate.noticePeriod)],
            ["City", candidate.city||"—"],
            ["Added", candidate.date||"—"],
          ].map(([label, val]) => (
            <div key={label} style={{display:"flex",gap:12,alignItems:"flex-start"}}>
              <span style={{fontFamily:"Epilogue,sans-serif",fontSize:10,letterSpacing:".1em",textTransform:"uppercase",color:"#9CA3AF",minWidth:60,paddingTop:2}}>>{label}</span>
              <span style={{fontFamily:"Epilogue,sans-serif",fontSize:13,color:"#1a1a1a",flex:1}}>{val}</span>
            </div>
          ))}
          {candidate.skills && (
            <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
              <span style={{fontFamily:"Epilogue,sans-serif",fontSize:10,letterSpacing:".1em",textTransform:"uppercase",color:"#9CA3AF",minWidth:60,paddingTop:2}}>Skills</span>
              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                {candidate.skills.split(",").map(s => s.trim()).filter(Boolean).map(s => (
                  <span key={s} className="chip">{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{borderTop:"1px solid #EBEBEB",paddingTop:20}}>
          <label style={{fontFamily:"Epilogue,sans-serif",fontSize:10,letterSpacing:".1em",textTransform:"uppercase",color:"#9CA3AF",display:"block",marginBottom:8}}>Notes</label>
          <textarea
            value={note} onChange={e=>onNoteChange(e.target.value)}
            rows={5} placeholder="Add notes about this candidate…"
            style={{width:"100%",fontFamily:"Epilogue,sans-serif",fontSize:13,padding:"10px 12px",border:"1px solid #E5E5E5",borderRadius:6,resize:"vertical",outline:"none"}}
          />
          <button onClick={onSave} disabled={saving} style={{marginTop:10,border:"none",background:"#1a1a1a",color:"#fff",fontFamily:"Epilogue,sans-serif",fontSize:12,padding:"9px 20px",borderRadius:6,cursor:saving?"default":"pointer",opacity:saving?0.6:1,width:"100%"}}>
            {saving?"Saving…":"Save note"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function CandidatesView({currentUser}) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [search, setSearch]         = useState("");
  const [fnFilter, setFnFilter]     = useState("All");
  const [noticeMax, setNoticeMax]   = useState("any");
  const [selected, setSelected]     = useState(null);
  const [notes, setNotes]           = useState({});
  const [noteInput, setNoteInput]   = useState("");
  const [saving, setSaving]         = useState(false);

  // Load sheet data
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await window.fetch(SHEET_CSV_URL);
        const text = await res.text();
        const rows = parseCSV(text);
        setCandidates(rows);
      } catch(e) {
        setError("Couldn't load sheet — make sure it's shared publicly or try refreshing.");
      }
      setLoading(false);
    };
    load();
  }, []);

  // Load notes from Supabase
  useEffect(() => {
    const loadNotes = async () => {
      const {data} = await supabase.from("candidate_notes").select("*");
      if (data) {
        const map = {};
        data.forEach(n => { map[n.candidate_name] = n.note; });
        setNotes(map);
      }
    };
    loadNotes();
  }, []);

  const openCandidate = c => {
    setSelected(c);
    setNoteInput(notes[c.name] || "");
  };

  const saveNote = async () => {
    if (!selected) return;
    setSaving(true);
    await supabase.from("candidate_notes").upsert({
      candidate_name: selected.name,
      note: noteInput,
      updated_by: currentUser,
      updated_at: new Date().toISOString(),
    }, {onConflict: "candidate_name"});
    setNotes(n => ({...n, [selected.name]: noteInput}));
    setSaving(false);
  };

  // Filter
  const filtered = candidates.filter(c => {
    if (fnFilter !== "All" && c.jobFunction !== fnFilter) return false;
    if (noticeMax !== "any") {
      const w = parseNotice(c.noticePeriod);
      if (w === null || w > parseInt(noticeMax)) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      return [c.name, c.jobFunction, c.currentPosition, c.company, c.skills].some(f => f?.toLowerCase().includes(q));
    }
    return true;
  });

  const u = USERS[currentUser] || USERS.nick;

  if (loading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"80px 24px",gap:12}}>
      <div className="spinner"/>
      <span className="e" style={{fontSize:13,color:"#9CA3AF"}}>Loading candidates…</span>
    </div>
  );

  if (error) return (
    <div className="fu" style={{maxWidth:760,margin:"0 auto",padding:"40px 24px"}}>
      <EmptyState icon="⚠️" title="Couldn't load sheet" sub={error}/>
    </div>
  );

  return (
    <div className="fu" style={{maxWidth:1000,margin:"0 auto",padding:"40px 24px"}}>
      <div style={{marginBottom:24}}>
        <div style={{fontSize:34,fontWeight:700,letterSpacing:"-.02em",color:"#1a1a1a"}}>Candidates</div>
        <div className="e" style={{fontSize:13,color:"#9CA3AF",marginTop:4}}>{filtered.length} of {candidates.length} candidates · live from Google Sheet</div>
      </div>

      <div style={{marginBottom:14}}><SearchBar value={search} onChange={setSearch}/></div>

      <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap",alignItems:"center"}}>
        {JOB_FUNCTIONS.map(f => (
          <button key={f} className={`filter-btn e ${fnFilter===f?"on":""}`} onClick={()=>setFnFilter(f)}>>{f}</button>
        ))}
        <span style={{width:1,background:"#E5E5E5",margin:"0 4px"}}/>
        <span className="e" style={{fontSize:11,color:"#9CA3AF"}}>Notice ≤</span>
        {[["any","Any"],["4","1 month"],["8","2 months"],["12","3 months"]].map(([v,l]) => (
          <button key={v} className={`filter-btn e ${noticeMax===v?"on":""}`} onClick={()=>setNoticeMax(v)}>{l}</button>
        ))}
      </div>

      <div style={{background:"#fff",border:"1px solid #EBEBEB",borderRadius:10,overflow:"hidden"}}>
        <div className="e" style={{padding:"10px 24px",display:"grid",gridTemplateColumns:"1fr 140px 120px 80px 80px 80px",gap:16,fontSize:10,color:"#C4C4C4",letterSpacing:".12em",textTransform:"uppercase",borderBottom:"1px solid #EBEBEB",background:"#FAFAF8"}}>
          <span>Name / Role</span><span>Company</span><span>Function</span><span>Salary</span><span>Notice</span><span>Notes</span>
        </div>
        {filtered.length === 0 && <div className="e" style={{padding:"40px 24px",textAlign:"center",color:"#D1D5DB",fontSize:13}}>No candidates match these filters.</div>}
        {filtered.map((c, i) => (
          <div key={c._id} className="row" style={{padding:"12px 24px",display:"grid",gridTemplateColumns:"1fr 140px 120px 80px 80px 80px",gap:16,alignItems:"center",borderBottom:i<filtered.length-1?"1px solid #EBEBEB":"none"}} onClick={()=>openCandidate(c)}>
            <div>
              <div style={{fontSize:14,fontWeight:600,color:"#1a1a1a"}}>{c.name}</div>
              <div className="e" style={{fontSize:11,color:"#9CA3AF",marginTop:1}}>{c.currentPosition||"—"}</div>
            </div>
            <div className="e" style={{fontSize:12,color:"#6B7280",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.company||"—"}</div>
            <div>{c.jobFunction && <span className="tag e" style={{background:c.jobFunction==="Sales"?"#EFF6FF":c.jobFunction==="Account Management"?"#F0FDF4":c.jobFunction==="Operations"?"#FFF7ED":"#F3F4F6",color:c.jobFunction==="Sales"?"#1D4ED8":c.jobFunction==="Account Management"?"#15803D":c.jobFunction==="Operations"?"#C2410C":"#6B7280"}}>{c.jobFunction}</span>}</div>
            <div className="e" style={{fontSize:12,color:parseSalary(c.salary)?"#1a1a1a":"#D1D5DB"}}>{fmtSalary(c.salary)}</div>
            <div className="e" style={{fontSize:12,color:"#6B7280"}}>{fmtNotice(c.noticePeriod)}</div>
            <div>{notes[c.name] && <span style={{width:8,height:8,borderRadius:"50%",background:u.color,display:"inline-block"}}/>}</div>
          </div>
        ))}
      </div>

      {selected && (
        <CandidatePanel
          candidate={selected}
          note={noteInput}
          onNoteChange={setNoteInput}
          onSave={saveNote}
          saving={saving}
          onClose={()=>setSelected(null)}
        />
      )}
    </div>
  );
}


const EMPTY = {company:"",contact:"",phone:"",email:"",linkedin:"",website:"",industry:"",company_size:"",deal_value:"",last_touch:TODAY,last_note:"",next_action:"",next_due:"",stage:"Outreach",owner:"nick",tags:[],archived:false,follow_up_interval:""};

export default function App() {
  const [cu,setCu]=useState("nick");
  const [contacts,setC]=useState([]);
  const [loading,setL]=useState(true);
  const [saving,setS]=useState(false);
  const [page,setPage]=useState("home");
  const [sel,setSel]=useState(null);
  const [showAdd,setShowAdd]=useState(false);
  const [form,setForm]=useState({...EMPTY});
  const [af,setAf]=useState("active");
  const [sf,setSf]=useState("All");
  const [of,setOf]=useState("mine");
  const [wt,setWt]=useState("overdue");
  const [vm,setVm]=useState("list");
  const [sq,setSq]=useState("");
  const [cf,setCf]=useState(""); // company filter for jumping from contacts
  const [ln,setLn]=useState("");
  const [la,setLa]=useState("");
  const [ld,setLd]=useState("");
  const [ls,setLs]=useState("");
  const [lt,setLt]=useState("note");
  const [dt,setDt]=useState("log");
  const [logCompany,setLogCompany]=useState(null); // company object for company-level log modal
  const [pacing,setPacing]=useState(loadPacing);
  const [authed,setAuthed]=useState(()=>sessionStorage.getItem("2st_auth")==="true");
  const [pw,setPw]=useState("");
  const [pwe,setPwe]=useState(false);

  const u=USERS[cu];

  const fetchData=useCallback(async()=>{
    setL(true);
    const {data,error}=await supabase.from("contacts").select("*").order("next_due",{ascending:true});
    if(!error&&data) setC(data);
    setL(false);
  },[]);

  useEffect(()=>{if(authed)fetchData();},[authed,fetchData]);
  useEffect(()=>{const p=async()=>await supabase.from("contacts").select("id").limit(1);p();const iv=setInterval(p,1000*60*60*24*3);return()=>clearInterval(iv);},[]);

  const savePacingState=p=>{savePacing(p);setPacing(p);};

  const allA=contacts.filter(c=>!c.archived);
  const myA=allA.filter(c=>c.owner===cu);
  const myDue=myA.filter(c=>urgency(c.next_due).diff<=0);
  const eow=getEOW();
  const myUp=myA.filter(c=>{const d=urgency(c.next_due).diff;const due=new Date(c.next_due);return d>0&&due<=eow;});
  const pid=Object.keys(USERS).find(k=>k!==cu);
  const myPO=myA.filter(c=>isPacingOverdue(c,pacing)&&urgency(c.next_due).diff>0);
  const sm=c=>{if(!sq)return true;const q=sq.toLowerCase();return[c.company,c.contact,c.email,c.phone,c.last_note,c.next_action,...(c.tags||[])].some(f=>f?.toLowerCase().includes(q));};
  const dc=contacts.filter(c=>af==="active"?!c.archived:af==="archived"?c.archived:true).filter(c=>sf==="All"||c.stage===sf).filter(c=>of==="all"?true:of==="mine"?c.owner===cu:c.owner!==cu).filter(c=>!cf||c.company===cf).filter(sm);
  const fc=allA.filter(c=>of==="all"?true:c.owner===cu);
  const pv=allA.filter(c=>c.stage!=="Closed Lost").reduce((s,c)=>s+(parseFloat(c.deal_value)||0),0);
  const wv=contacts.filter(c=>c.stage==="Closed Won").reduce((s,c)=>s+(parseFloat(c.deal_value)||0),0);

  const open=c=>{setSel(c.id);setLn("");setLt("note");setLa(c.next_action);setLd(addDays(TODAY,effectiveInterval(c,pacing)));setLs(c.stage);setDt("log");};
  const openCompanyLog=company=>{
    const first=company.contacts[0];
    setLogCompany({...company, selectedContactId: first?.id||null});
    setLn(""); setLt("note"); setLa(""); setLd(addDays(TODAY,30)); setLs(first?.stage||"Outreach");
  };

  const saveLog=async id=>{
    const c=contacts.find(x=>x.id===id);
    if(!ln.trim()&&!ld) return;
    setS(true);
    const ni=c.follow_up_interval?parseInt(c.follow_up_interval):(pacing[ls]||30);
    const nd=ld||addDays(TODAY,ni);
    const ne={date:TODAY,note:ln||c.last_note,action:la,stage:ls,type:lt,by:cu};
    await supabase.from("contacts").update({last_note:ln||c.last_note,last_touch:TODAY,next_action:la,next_due:nd,stage:ls,history:[...(c.history||[]),ne]}).eq("id",id);
    await fetchData();setS(false);setSel(null);
  };

  const upd=async(id,u)=>{setS(true);await supabase.from("contacts").update(u).eq("id",id);await fetchData();setS(false);};

  const saveForm=async()=>{
    if(!form.company||!form.next_due) return;
    setS(true);
    await supabase.from("contacts").insert([{...form,archived:false,history:[{date:form.last_touch,note:form.last_note,action:form.next_action,stage:form.stage,type:"note",by:cu}]}]);
    await fetchData();setForm({...EMPTY,owner:cu});setShowAdd(false);setS(false);
  };

  const del=async id=>{
    if(!window.confirm("Delete this contact permanently?")) return;
    setS(true);await supabase.from("contacts").delete().eq("id",id);await fetchData();setS(false);setSel(null);
  };

  const login=()=>{if(pw===PASSWORD){sessionStorage.setItem("2st_auth","true");setAuthed(true);}else{setPwe(true);setTimeout(()=>setPwe(false),1500);}};

  const sc=contacts.find(c=>c.id===sel);

  if(!authed) return (
    <div style={{fontFamily:"Cormorant Garamond,Georgia,serif",background:"#FAFAF8",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <style>{css}</style>
      <div className="fu" style={{background:"#fff",border:"1px solid #EBEBEB",borderRadius:12,padding:40,width:360,maxWidth:"90vw",boxShadow:"0 20px 60px rgba(0,0,0,0.08)",textAlign:"center"}}>
        <img src="/logo.png" alt="2Square" style={{height:36,width:"auto",marginBottom:24}}/>
        <div style={{fontSize:26,fontWeight:700,letterSpacing:"-.02em",marginBottom:6}}>CRM</div>
        <div className="e" style={{fontSize:13,color:"#9CA3AF",marginBottom:28}}>Enter your password to continue</div>
        <input type="password" placeholder="Password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&login()} style={{marginBottom:12,textAlign:"center",borderColor:pwe?"#DC2626":"#E5E5E5"}} autoFocus/>
        {pwe&&<div className="e" style={{fontSize:12,color:"#DC2626",marginBottom:8}}>Incorrect password</div>}
        <button className="btn e" style={{background:"#1a1a1a",color:"#fff",width:"100%",padding:"10px 0"}} onClick={login}>Enter</button>
      </div>
    </div>
  );

  if(loading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#FAFAF8",flexDirection:"column",gap:16}}>
      <style>{css}</style><div className="spinner"/><div className="e" style={{fontSize:13,color:"#9CA3AF"}}>Loading your pipeline…</div>
    </div>
  );

  if(sel&&sc){
    const c=sc,owner=USERS[c.owner]||USERS.nick,isOwner=c.owner===cu,hist=[...(c.history||[])].reverse(),intv=effectiveInterval(c,pacing);
    return (
      <div style={{fontFamily:"'Cormorant Garamond',Georgia,serif",background:"#FAFAF8",minHeight:"100vh"}}>
        <style>{css}</style>
        <div style={{background:"#fff",borderBottom:"1px solid #EBEBEB",padding:"16px 40px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <button className="btn ghost e" onClick={()=>setSel(null)} style={{padding:"7px 14px",fontSize:12}}>← Back</button>
            <span style={{color:"#D1D5DB"}}>/</span><span className="e" style={{fontSize:13,color:"#6B7280"}}>{page==="followups"?"Follow-ups":"Contacts"}</span>
            <span style={{color:"#D1D5DB"}}>/</span><span className="e" style={{fontSize:13,color:"#1a1a1a"}}>{c.company}</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}><OwnerPill userId={c.owner}/>{c.deal_value&&<span className="e" style={{fontSize:13,fontWeight:600,color:"#15803D"}}>{fmtC(c.deal_value)}</span>}</div>
        </div>
        <div className="fu" style={{maxWidth:800,margin:"0 auto",padding:"40px 24px 80px"}}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:28}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:6}}>
                <div style={{width:52,height:52,borderRadius:"50%",background:owner.bg,border:`2px solid ${owner.color}30`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:22,fontWeight:700,color:owner.color}}>{c.company?.[0]||"?"}</span></div>
                <div><div style={{fontSize:32,fontWeight:700,letterSpacing:"-.02em",color:"#1a1a1a",lineHeight:1}}>{c.company}</div>{c.contact&&<div className="e" style={{fontSize:14,color:"#6B7280",marginTop:3}}>{c.contact}</div>}</div>
              </div>
              <div style={{display:"flex",gap:14,marginTop:10,flexWrap:"wrap",alignItems:"center"}}>
                {c.phone&&<a href={`tel:${c.phone}`} className="e" style={{fontSize:13,color:"#4F46E5",textDecoration:"none"}}>📞 {c.phone}</a>}
                {c.email&&<a href={`mailto:${c.email}`} className="e" style={{fontSize:13,color:"#4F46E5",textDecoration:"none"}}>✉️ {c.email}</a>}
                {c.linkedin&&<a href={c.linkedin} target="_blank" rel="noreferrer" className="e" style={{fontSize:13,color:"#4F46E5",textDecoration:"none"}}>💼 LinkedIn</a>}
                {c.website&&<a href={c.website} target="_blank" rel="noreferrer" className="e" style={{fontSize:13,color:"#4F46E5",textDecoration:"none"}}>🌐 {c.website.replace(/^https?:\/\//,"")}</a>}
              </div>
              <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap",alignItems:"center"}}>
                <SBadge stage={c.stage}/>{c.industry&&<span className="tag e" style={{background:"#F3F4F6",color:"#6B7280"}}>{c.industry}</span>}{c.company_size&&<span className="tag e" style={{background:"#F3F4F6",color:"#6B7280"}}>{c.company_size}</span>}{c.archived&&<span className="tag e" style={{background:"#F1F5F9",color:"#94A3B8"}}>Archived</span>}{(c.tags||[]).map(t=><span key={t} className="chip">{t}</span>)}
              </div>
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              <UBadge due={c.next_due}/>{c.next_due&&<div className="e" style={{fontSize:11,color:"#C4C4C4",marginTop:4}}>due {fmtS(c.next_due)}</div>}
              <div className="e" style={{fontSize:11,color:"#9CA3AF",marginTop:6}}>Pacing: every {intv}d {c.follow_up_interval?"(custom)":"(stage default)"}</div>
              <div style={{marginTop:4}}><PacingWarn contact={c} pacing={pacing}/></div>
            </div>
          </div>
          {!isOwner&&<div style={{background:owner.bg,border:`1px solid ${owner.color}30`,borderRadius:8,padding:"10px 16px",marginBottom:20,display:"flex",alignItems:"center",gap:8}}><Avatar userId={c.owner} size={20}/><span className="e" style={{fontSize:12,color:owner.color}}>Owned by <strong>{owner.name}</strong></span></div>}
          <div style={{borderBottom:"1px solid #EBEBEB",marginBottom:24,display:"flex"}}>
            <button className={`tab-btn ${dt==="log"?"active":""}`} onClick={()=>setDt("log")}>Log activity</button>
            <button className={`tab-btn ${dt==="profile"?"active":""}`} onClick={()=>setDt("profile")}>Profile & details</button>
            <button className={`tab-btn ${dt==="history"?"active":""}`} onClick={()=>setDt("history")}>History ({hist.length})</button>
          </div>
          {dt==="log"&&(
            <div style={{background:"#fff",border:`1px solid ${isOwner?u.color+"30":"#EBEBEB"}`,borderRadius:10,padding:24,marginBottom:24}}>
              <div style={{fontSize:20,fontWeight:600,color:"#1a1a1a",marginBottom:4}}>Log a touchpoint</div>
              <div className="e" style={{fontSize:12,color:"#9CA3AF",marginBottom:20}}>Saving as {u.name} · {fmtS(TODAY)}</div>
              <div style={{marginBottom:14}}>
                <label className="lbl">Activity type</label>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {ACTIVITY_TYPES.map(a=><button key={a.value} onClick={()=>setLt(a.value)} style={{border:`1px solid ${lt===a.value?"#1a1a1a":"#E5E5E5"}`,background:lt===a.value?"#1a1a1a":"#fff",color:lt===a.value?"#fff":"#6B7280",borderRadius:20,padding:"5px 14px",fontSize:12,fontFamily:"Epilogue,sans-serif",cursor:"pointer",display:"flex",alignItems:"center",gap:5}}><span>{a.icon}</span>{a.label}</button>)}
                </div>
              </div>
              <div style={{display:"grid",gap:12}}>
                <div><label className="lbl">What happened?</label><textarea rows={3} placeholder="Quick note on the conversation, email, meeting…" value={ln} onChange={e=>setLn(e.target.value)}/></div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  <div><label className="lbl">Next action</label><input placeholder="e.g. Send deck, follow-up call" value={la} onChange={e=>setLa(e.target.value)}/></div>
                  <div>
                    <CalPicker label="Next follow-up date" value={ld} onChange={setLd}/>
                    <div className="e" style={{fontSize:10,color:"#9CA3AF",marginTop:4}}>Auto-suggested: {ls} pacing ({c.follow_up_interval||pacing[ls]||30}d)</div>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  <div>
                    <label className="lbl">Move to stage</label>
                    <select value={ls} onChange={e=>{setLs(e.target.value);const ni=c.follow_up_interval?parseInt(c.follow_up_interval):(pacing[e.target.value]||30);setLd(addDays(TODAY,ni));}}>{STAGES.map(s=><option key={s}>{s}</option>)}</select>
                    <div className="e" style={{fontSize:10,color:"#9CA3AF",marginTop:4}}>Changing stage updates the suggested date</div>
                  </div>
                  <div><label className="lbl">Reassign to</label><select value={c.owner} onChange={e=>upd(c.id,{owner:e.target.value})}>{Object.entries(USERS).map(([k,v])=><option key={k} value={k}>{v.name}</option>)}</select></div>
                </div>
                <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
                  <button className="btn ghost e" onClick={()=>setSel(null)}>Cancel</button>
                  <button className="btn e" style={{background:u.color,color:"#fff",opacity:saving?0.6:1}} onClick={()=>saveLog(c.id)} disabled={saving}>{saving?"Saving…":"Save & reset follow-up"}</button>
                </div>
              </div>
            </div>
          )}
          {dt==="profile"&&<ProfileEditor contact={c} onSave={updates=>upd(c.id,updates)} saving={saving} pacing={pacing}/>}
          {dt==="history"&&(
            <div style={{position:"relative"}}>
              <div style={{position:"absolute",left:4,top:12,bottom:12,width:1,background:"#EBEBEB"}}/>
              <div style={{display:"flex",flexDirection:"column"}}>
                {hist.map((h,i)=>(
                  <div key={i} style={{display:"flex",gap:16,paddingBottom:20}}>
                    <div style={{paddingTop:2,flexShrink:0}}><div className="timeline-dot" style={{background:i===0?"#1a1a1a":"#E5E7EB"}}/></div>
                    <div style={{flex:1,background:i===0?"#fff":"transparent",border:i===0?"1px solid #EBEBEB":"none",borderRadius:8,padding:i===0?"14px 16px":"0"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
                        <span style={{fontSize:14}}>{aIcon(h.type)}</span>
                        <span className="e" style={{fontSize:11,color:i===0?"#1a1a1a":"#9CA3AF",fontWeight:i===0?500:400}}>{fmtL(h.date)}</span>
                        {h.by&&<OwnerPill userId={h.by}/>}{i===0&&<span className="tag e" style={{background:"#F3F4F6",color:"#6B7280",fontSize:9}}>Latest</span>}<SBadge stage={h.stage}/>
                      </div>
                      <div style={{fontSize:i===0?15:14,color:i===0?"#1a1a1a":"#6B7280",lineHeight:1.55,marginBottom:h.action&&h.action!=="—"?6:0}}>{h.note||"—"}</div>
                      {h.action&&h.action!=="—"&&<div className="e" style={{fontSize:11,color:"#C4C4C4"}}>→ {h.action}</div>}
                    </div>
                  </div>
                ))}
                {hist.length===0&&<div className="e" style={{fontSize:13,color:"#D1D5DB",paddingLeft:24}}>No history yet.</div>}
              </div>
            </div>
          )}
          <div style={{display:"flex",gap:8,justifyContent:"space-between",paddingTop:24,borderTop:"1px solid #EBEBEB",marginTop:8}}>
            <button className="btn ghost e" onClick={()=>upd(c.id,{archived:!c.archived}).then(()=>setSel(null))}>{c.archived?"Unarchive":"Archive"}</button>
            <button className="btn e" style={{background:"#FEF2F2",color:"#DC2626",border:"1px solid #FECACA"}} onClick={()=>del(c.id)}>Delete</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{fontFamily:"'Cormorant Garamond',Georgia,serif",background:"#FAFAF8",minHeight:"100vh"}}>
      <style>{css}</style>
      <div style={{background:"#fff",borderBottom:"1px solid #EBEBEB",padding:"12px 40px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50}}>
        <div style={{cursor:"pointer"}} onClick={()=>setPage("home")}><img src="/logo.png" alt="2Square" style={{height:32,width:"auto",objectFit:"contain"}}/></div>
        <div style={{display:"flex",gap:4}}>
          {[["home","Home"],["followups","Follow-ups"],["contacts","Contacts"],["companies","Companies"],["pipeline","Pipeline"],["candidates","Candidates"],["settings","Settings"]].map(([k,l])=>(
            <button key={k} className={`nav-btn e ${page===k?"active":""}`} onClick={()=>setPage(k)}>{l}{k==="followups"&&myDue.length>0&&<span style={{background:"#DC2626",color:"#fff",borderRadius:10,fontSize:10,padding:"1px 6px",marginLeft:4}}>{myDue.length}</span>}</button>
          ))}
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <div style={{display:"flex",background:"#F3F4F6",borderRadius:8,padding:3,gap:2}}>
            {Object.entries(USERS).map(([k,v])=><button key={k} onClick={()=>setCu(k)} style={{border:"none",cursor:"pointer",fontFamily:"'Epilogue',sans-serif",fontSize:12,fontWeight:500,padding:"6px 14px",borderRadius:6,transition:"all .15s",background:cu===k?v.color:"transparent",color:cu===k?"#fff":"#6B7280"}}>{v.name}</button>)}
          </div>
          <AddBtn onContact={()=>{setShowAdd("contact");setForm({...EMPTY,owner:cu});}} onCompany={()=>{setShowAdd("company");setForm({...EMPTY,owner:cu,contact:"",linkedin:""});}}/>
        </div>
      </div>

      {page==="home"&&(
        <div className="fu" style={{maxWidth:760,margin:"0 auto",padding:"50px 24px"}}>
          <div style={{marginBottom:40}}>
            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:12}}><Avatar userId={cu} size={48}/><div><div style={{fontSize:40,fontWeight:700,letterSpacing:"-.03em",lineHeight:1,color:u.color}}>Hey, {u.name}.</div><div className="e" style={{fontSize:13,color:"#9CA3AF",marginTop:4}}>{new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div></div></div>
            <div style={{marginTop:16}}><OwnerBar contacts={contacts}/></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:14,marginBottom:32}}>
            {[
              {label:"Overdue",count:myA.filter(c=>urgency(c.next_due).level==="overdue").length,color:"#DC2626",bg:"#FEF2F2",border:"#FECACA",p:"followups"},
              {label:"Due today",count:myA.filter(c=>urgency(c.next_due).level==="today").length,color:"#D97706",bg:"#FFFBEB",border:"#FDE68A",p:"followups"},
              {label:"This week",count:myUp.length,color:"#15803D",bg:"#F0FDF4",border:"#BBF7D0",p:"followups"},
              {label:"Pacing overdue",count:myPO.length,color:"#7C3AED",bg:"#FAF5FF",border:"#DDD6FE",p:"contacts"},
            ].map(({label,count,color,bg,border,p})=>(
              <div key={label} style={{background:count>0?bg:"#fff",border:`1px solid ${count>0?border:"#EBEBEB"}`,borderRadius:10,padding:"18px 20px",cursor:count>0?"pointer":"default"}} onClick={()=>count>0&&setPage(p)}>
                <div className="e" style={{fontSize:10,color:count>0?color:"#9CA3AF",letterSpacing:".1em",textTransform:"uppercase",marginBottom:8}}>{label}</div>
                <div style={{fontSize:36,fontWeight:700,color:count>0?color:"#D1D5DB",lineHeight:1}}>{count}</div>
                {count>0&&<div className="e" style={{fontSize:11,color,marginTop:6}}>View →</div>}
              </div>
            ))}
          </div>
          {pv>0&&<div style={{background:"#fff",border:"1px solid #EBEBEB",borderRadius:10,padding:"18px 24px",marginBottom:28,display:"flex",gap:32}}><div><div className="e" style={{fontSize:10,letterSpacing:".1em",textTransform:"uppercase",color:"#9CA3AF",marginBottom:4}}>Pipeline value</div><div style={{fontSize:24,fontWeight:700,color:"#1a1a1a"}}>{fmtC(pv)}</div></div>{wv>0&&<div><div className="e" style={{fontSize:10,letterSpacing:".1em",textTransform:"uppercase",color:"#9CA3AF",marginBottom:4}}>Closed won</div><div style={{fontSize:24,fontWeight:700,color:"#15803D"}}>{fmtC(wv)}</div></div>}</div>}
          {myDue.length>0?(
            <div style={{marginBottom:28}}>
              <div className="e" style={{fontSize:11,letterSpacing:".1em",textTransform:"uppercase",color:"#9CA3AF",marginBottom:12}}>Your attention needed</div>
              <div style={{background:"#fff",border:"1px solid #EBEBEB",borderRadius:10,overflow:"hidden"}}>
                {myDue.map((c,i)=>(
                  <div key={c.id} className="row" style={{padding:"14px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:i<myDue.length-1?"1px solid #EBEBEB":"none"}} onClick={()=>open(c)}>
                    <div style={{display:"flex",alignItems:"center",gap:12}}><div style={{width:3,height:36,borderRadius:4,background:u.color,flexShrink:0}}/><div><div style={{fontSize:17,fontWeight:600,color:"#1a1a1a"}}>{c.contact||c.company}</div><div className="e" style={{fontSize:12,color:"#9CA3AF",marginTop:2}}>{c.contact&&<span style={{color:"#4F46E5"}}>{c.company} · </span>}{c.next_action}</div></div></div>
                    <div style={{display:"flex",alignItems:"center",gap:12}}>{c.deal_value&&<span className="e" style={{fontSize:12,color:"#6B7280"}}>{fmtC(c.deal_value)}</span>}<UBadge due={c.next_due}/><span className="e" style={{fontSize:12,color:"#C4C4C4"}}>Log →</span></div>
                  </div>
                ))}
              </div>
            </div>
          ):<EmptyState icon="✓" title={`All caught up, ${u.name}.`} sub="No overdue follow-ups right now."/>}
          {myPO.length>0&&(
            <div style={{marginTop:24}}>
              <div className="e" style={{fontSize:11,letterSpacing:".1em",textTransform:"uppercase",color:"#9CA3AF",marginBottom:12}}>Pacing overdue — touched less often than their interval</div>
              <div style={{background:"#fff",border:"1px solid #DDD6FE",borderRadius:10,overflow:"hidden"}}>
                {myPO.map((c,i)=><div key={c.id} className="row" style={{padding:"12px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:i<myPO.length-1?"1px solid #EBEBEB":"none"}} onClick={()=>open(c)}><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:3,height:32,borderRadius:4,background:"#7C3AED",flexShrink:0}}/><div><div style={{fontSize:15,fontWeight:600,color:"#1a1a1a"}}>{c.contact||c.company}</div><div className="e" style={{fontSize:11,color:"#9CA3AF",display:"flex",alignItems:"center",gap:6}}>{c.contact&&<span style={{color:"#4F46E5"}}>{c.company} · </span>}<SBadge stage={c.stage}/></div></div></div><span className="pw">⏱ {daysSinceTouch(c)}d since last touch</span></div>)}
              </div>
            </div>
          )}
          {(()=>{const pu=USERS[pid],pd=allA.filter(c=>c.owner===pid&&urgency(c.next_due).diff<=0);if(!pd.length)return null;return(
            <div style={{marginTop:24}}>
              <div className="e" style={{fontSize:11,letterSpacing:".1em",textTransform:"uppercase",color:"#9CA3AF",marginBottom:12}}>{pu.name}'s overdue ({pd.length})</div>
              <div style={{background:pu.bg,border:`1px solid ${pu.color}20`,borderRadius:10,overflow:"hidden"}}>
                {pd.map((c,i)=><div key={c.id} className="row" style={{padding:"12px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:i<pd.length-1?`1px solid ${pu.color}15`:"none",background:"transparent"}} onClick={()=>open(c)}><div style={{display:"flex",alignItems:"center",gap:10}}><Avatar userId={pid} size={20}/><div><div style={{fontSize:15,fontWeight:600,color:"#1a1a1a"}}>{c.contact||c.company}</div><div className="e" style={{fontSize:11,color:"#4F46E5"}}>{c.contact&&c.company}</div></div></div><UBadge due={c.next_due}/></div>)}
              </div>
            </div>
          );})()}
        </div>
      )}

      {page==="followups"&&(
        <div className="fu" style={{maxWidth:900,margin:"0 auto",padding:"40px 24px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
            <div><div style={{fontSize:34,fontWeight:700,letterSpacing:"-.02em",color:"#1a1a1a"}}>Follow-ups</div><div className="e" style={{fontSize:13,color:"#9CA3AF",marginTop:4}}>{myDue.length} overdue or due today · {myUp.length} this week</div></div>
            <div style={{display:"flex",gap:6}}>{[["mine","Mine"],["all","All"]].map(([k,l])=><button key={k} className={`filter-btn e ${of===k?"on":""}`} onClick={()=>setOf(k)}>{l}</button>)}</div>
          </div>
          <div style={{display:"flex",borderBottom:"1px solid #EBEBEB",marginBottom:28}}>
            {[["overdue","Overdue & today"],["thisweek","This week"],["nextweek","Next week"],["all","All upcoming"]].map(([k,l])=><button key={k} className={`tab-btn ${wt===k?"active":""}`} onClick={()=>setWt(k)}>{l}</button>)}
          </div>
          {(()=>{
            const e2=getEOW();const nm=new Date(e2);nm.setDate(e2.getDate()+3);const nf=new Date(nm);nf.setDate(nm.getDate()+4);
            const filt=fc.filter(c=>{const d=urgency(c.next_due).diff;const due=new Date(c.next_due);due.setHours(0,0,0,0);if(wt==="overdue")return d<=0;if(wt==="thisweek")return d>0&&due<=e2;if(wt==="nextweek")return due>e2&&due<=nf;return d>0;});
            if(!filt.length) return <EmptyState title="All clear!" sub="No follow-ups in this view."/>;
            return(
              <div style={{background:"#fff",border:"1px solid #EBEBEB",borderRadius:10,overflow:"hidden"}}>
                <div className="e" style={{padding:"10px 24px",display:"grid",gridTemplateColumns:"1fr 60px 180px 110px 100px",gap:16,fontSize:10,color:"#C4C4C4",letterSpacing:".12em",textTransform:"uppercase",borderBottom:"1px solid #EBEBEB",background:"#FAFAF8"}}><span>Company</span><span>Owner</span><span>Next action</span><span>Stage</span><span style={{textAlign:"right"}}>Due</span></div>
                {filt.map((c,i)=>(
                  <div key={c.id} className="row" style={{padding:"13px 24px",display:"grid",gridTemplateColumns:"1fr 60px 180px 110px 100px",gap:16,alignItems:"center",borderBottom:i<filt.length-1?"1px solid #EBEBEB":"none"}} onClick={()=>open(c)}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:3,height:32,borderRadius:4,background:(USERS[c.owner]||USERS.nick).color,flexShrink:0}}/><div><div style={{fontSize:15,fontWeight:600,color:"#1a1a1a"}}>{c.contact||c.company}</div><div className="e" style={{fontSize:11,color:"#6B7280",marginTop:1,display:"flex",alignItems:"center",gap:6}}>{c.contact&&<span style={{color:"#4F46E5"}}>{c.company}</span>}<PacingWarn contact={c} pacing={pacing}/></div></div></div>
                    <OwnerPill userId={c.owner}/><div className="e" style={{fontSize:12,color:"#6B7280",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.next_action}</div><SBadge stage={c.stage}/>
                    <div style={{display:"flex",justifyContent:"flex-end"}}><UBadge due={c.next_due}/></div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {page==="contacts"&&(
        <div className="fu" style={{maxWidth:980,margin:"0 auto",padding:"40px 24px"}}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:24}}>
            <div><div style={{fontSize:34,fontWeight:700,letterSpacing:"-.02em",color:"#1a1a1a"}}>Contacts</div><div className="e" style={{fontSize:13,color:"#9CA3AF",marginTop:4}}>{allA.length} active · {contacts.filter(c=>c.archived).length} archived</div></div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}><div style={{display:"flex",background:"#F3F4F6",borderRadius:8,padding:3}}>{[["list","☰"],["kanban","⊞"]].map(([k,ic])=><button key={k} onClick={()=>setVm(k)} style={{border:"none",cursor:"pointer",fontFamily:"Epilogue,sans-serif",fontSize:13,padding:"5px 12px",borderRadius:6,background:vm===k?"#fff":"transparent",color:vm===k?"#1a1a1a":"#9CA3AF",transition:"all .15s"}}>{ic}</button>)}</div></div>
          </div>
          <div style={{marginBottom:16}}><SearchBar value={sq} onChange={setSq}/></div>
          <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
            {["active","archived","all"].map(f=><button key={f} className={`filter-btn e ${af===f?"on":""}`} onClick={()=>setAf(f)}>{f.charAt(0).toUpperCase()+f.slice(1)}</button>)}
            <span style={{width:1,background:"#E5E5E5",margin:"0 4px"}}/>
            {[["mine","Mine"],["theirs","Partner's"],["all","Everyone's"]].map(([k,l])=><button key={k} className={`filter-btn e ${of===k?"on":""}`} onClick={()=>setOf(k)}>{l}</button>)}
            <span style={{width:1,background:"#E5E5E5",margin:"0 4px"}}/>
            {["All",...STAGES].map(s=><button key={s} className={`filter-btn e ${sf===s?"on":""}`} onClick={()=>setSf(s)}>{s}</button>)}
          </div>
          {/* Company filter chips */}
          {[...new Set(allA.map(c=>c.company).filter(Boolean))].sort().length>0&&(
            <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
              <span className="e" style={{fontSize:11,color:"#9CA3AF",marginRight:4}}>Company:</span>
              <button className={`filter-btn e ${!cf?"on":""}`} onClick={()=>setCf("")}>All</button>
              {[...new Set(allA.map(c=>c.company).filter(Boolean))].sort().map(co=>(
                <button key={co} className={`filter-btn e ${cf===co?"on":""}`} onClick={()=>setCf(co)}>{co}</button>
              ))}
            </div>
          )}
          {vm==="list"&&(
            <div style={{background:"#fff",border:"1px solid #EBEBEB",borderRadius:10,overflow:"hidden"}}>
              <div className="e" style={{padding:"10px 24px",display:"grid",gridTemplateColumns:"180px 1fr 120px 80px 90px",gap:16,fontSize:10,color:"#C4C4C4",letterSpacing:".12em",textTransform:"uppercase",borderBottom:"1px solid #EBEBEB",background:"#FAFAF8"}}><span>Contact</span><span>Company</span><span>Stage</span><span>Value</span><span>Due</span></div>
              {dc.length===0&&<div className="e" style={{padding:"40px 24px",textAlign:"center",color:"#D1D5DB",fontSize:13}}>No contacts in this view.</div>}
              {dc.map(c=>(
                <div key={c.id} className="row" style={{padding:"13px 24px",display:"grid",gridTemplateColumns:"180px 1fr 120px 80px 90px",gap:16,alignItems:"center",opacity:c.archived?.5:1,borderLeft:`3px solid ${(USERS[c.owner]||USERS.nick).color}`}} onClick={()=>open(c)}>
                  <div>
                    <div style={{fontSize:14,fontWeight:600,color:"#1a1a1a"}}>{c.contact||"—"}</div>
                    <div className="e" style={{fontSize:11,color:"#9CA3AF",marginTop:1,display:"flex",alignItems:"center",gap:4}}><OwnerPill userId={c.owner}/></div>
                  </div>
                  <div>
                    <div onClick={e=>{e.stopPropagation();setPage("companies");setCf(c.company||"");}} style={{fontSize:14,fontWeight:500,color:"#4F46E5",cursor:"pointer"}}>{c.company}</div>
                    <div className="e" style={{fontSize:11,color:"#9CA3AF",marginTop:1,display:"flex",alignItems:"center",gap:4}}>
                      {(c.tags||[]).slice(0,2).map(t=><span key={t} className="chip">{t}</span>)}
                      <PacingWarn contact={c} pacing={pacing}/>
                    </div>
                  </div>
                  <SBadge stage={c.stage}/>
                  <div className="e" style={{fontSize:12,color:c.deal_value?"#15803D":"#D1D5DB"}}>{c.deal_value?fmtC(c.deal_value):"—"}</div>
                  <UBadge due={c.next_due}/>
                </div>
              ))}
            </div>
          )}
          {vm==="kanban"&&(
            <div style={{display:"flex",gap:12,overflowX:"auto",paddingBottom:16}}>
              {STAGES.map(stage=>{const cols=dc.filter(c=>c.stage===stage);const cv=cols.reduce((s,c)=>s+(parseFloat(c.deal_value)||0),0);return(
                <div key={stage} className="kanban-col">
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}><SBadge stage={stage}/><span className="e" style={{fontSize:11,color:"#9CA3AF"}}>{cols.length}</span></div>
                  {cv>0&&<div className="e" style={{fontSize:11,color:"#6B7280",marginBottom:10}}>{fmtC(cv)}</div>}
                  {cols.map(c=>(
                    <div key={c.id} className="kanban-card" onClick={()=>open(c)}>
                      <div style={{fontSize:14,fontWeight:600,color:"#1a1a1a",marginBottom:3}}>{c.contact||c.company}</div>
                      {c.contact&&<div className="e" style={{fontSize:11,color:"#4F46E5",marginBottom:6,cursor:"pointer"}} onClick={e=>{e.stopPropagation();setPage("companies");}}>{c.company}</div>}
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}><OwnerPill userId={c.owner}/><UBadge due={c.next_due}/></div>
                      {c.deal_value&&<div className="e" style={{fontSize:12,color:"#15803D",fontWeight:600,marginTop:6}}>{fmtC(c.deal_value)}</div>}
                      <div style={{marginTop:4}}><PacingWarn contact={c} pacing={pacing}/></div>
                      {(c.tags||[]).length>0&&<div style={{marginTop:6,display:"flex",gap:4,flexWrap:"wrap"}}>{c.tags.map(t=><span key={t} className="chip">{t}</span>)}</div>}
                    </div>
                  ))}
                  {cols.length===0&&<div className="e" style={{fontSize:12,color:"#D1D5DB",textAlign:"center",padding:"20px 0"}}>Empty</div>}
                </div>
              );})}
            </div>
          )}
        </div>
      )}

      {page==="companies"&&<CompaniesView contacts={allA} onOpen={open} onLogTouchpoint={openCompanyLog} pacing={pacing} onRefresh={fetchData}/>}
      {page==="pipeline"&&<PipelineView contacts={contacts} currentUser={cu} onOpen={open} onGoToCompany={name=>{setPage("companies");}}/>}
      {page==="settings"&&<SettingsView pacing={pacing} onSave={savePacingState}/>}
      {page==="candidates"&&<CandidatesView currentUser={cu}/>}

      {showAdd&&<AddModal type={showAdd} allContacts={contacts} onClose={()=>setShowAdd(false)} onSaved={async()=>{await fetchData();setShowAdd(false);}} currentUser={cu} pacing={pacing}/>}
      {logCompany&&<LogModal company={logCompany} contacts={contacts} currentUser={cu} pacing={pacing} onClose={()=>setLogCompany(null)} onSaved={async()=>{await fetchData();setLogCompany(null);}}/>}
    </div>
  );
}
