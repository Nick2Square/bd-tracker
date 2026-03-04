import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://ygtzqdjhhlrcurrqnyco.supabase.co",
  "sb_publishable_W2b4dSD-NGpBgzYfzFFp1A_jTbFIlCu"
);

const USERS = {
  nick: { name: "Nick", color: "#4F46E5", bg: "#EEF2FF", light: "#E0E7FF" },
  maz: { name: "Maz", color: "#DB2777", bg: "#FDF2F8", light: "#FCE7F3" },
};

const STAGES = ["Outreach", "Nurturing", "Active", "Closed"];

const STAGE_COLORS = {
  Outreach: { bg: "#F1F5F9", text: "#475569" },
  Nurturing: { bg: "#FFF7ED", text: "#C2410C" },
  Active: { bg: "#F0FDF4", text: "#15803D" },
  Closed: { bg: "#F8FAFC", text: "#94A3B8" },
};

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
  const cursor = new Date(today);
  cursor.setDate(cursor.getDate() + 1);
  while (cursor <= due) {
    const d = cursor.getDay();
    if (d !== 0 && d !== 6) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
};

const urgency = (dueDate) => {
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

const URG_DOT = { overdue: "#DC2626", today: "#D97706", soon: "#CA8A04", ok: "#D1D5DB" };
const URG_TEXT = { overdue: "#DC2626", today: "#D97706", soon: "#CA8A04", ok: "#6B7280" };
const TODAY = new Date().toISOString().split("T")[0];
const fmtDateLong = (d) => new Date(d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric" });

const EMPTY = { company: "", contact: "", phone: "", email: "", last_touch: TODAY, last_note: "", next_action: "", next_due: "", stage: "Outreach", owner: "nick" };

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Epilogue:wght@300;400;500&display=swap');
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
`;

const Avatar = ({ userId, size = 24 }) => {
  const u = USERS[userId] || USERS.nick;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: u.bg, border: `2px solid ${u.color}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ fontFamily: "'Epilogue', sans-serif", fontSize: size * 0.4, fontWeight: 600, color: u.color }}>{u.name[0]}</span>
    </div>
  );
};

const OwnerPill = ({ userId }) => {
  const u = USERS[userId] || USERS.nick;
  return (
    <span className="user-pill" style={{ background: u.bg, color: u.color }}>
      <Avatar userId={userId} size={14} />
      {u.name}
    </span>
  );
};

const OwnerBar = ({ contacts }) => {
  const nickCount = contacts.filter(c => c.owner === "nick" && !c.archived).length;
  const mazCount = contacts.filter(c => c.owner === "maz" && !c.archived).length;
  const total = nickCount + mazCount;
  if (total === 0) return null;
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <div style={{ flex: 1, height: 6, borderRadius: 10, background: "#F1F5F9", overflow: "hidden", display: "flex" }}>
        <div style={{ width: `${(nickCount / total) * 100}%`, background: USERS.nick.color, borderRadius: "10px 0 0 10px", transition: "width .3s" }} />
        <div style={{ width: `${(mazCount / total) * 100}%`, background: USERS.maz.color, borderRadius: "0 10px 10px 0", transition: "width .3s" }} />
      </div>
      <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
        <span className="e" style={{ fontSize: 11, color: USERS.nick.color }}>{nickCount} Nick</span>
        <span className="e" style={{ fontSize: 11, color: USERS.maz.color }}>{mazCount} Maz</span>
      </div>
    </div>
  );
};

export default function App() {
  const [currentUser, setCurrentUser] = useState("nick");
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState("home");
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [archiveFilter, setArchiveFilter] = useState("active");
  const [stageFilter, setStageFilter] = useState("All");
  const [ownerFilter, setOwnerFilter] = useState("mine");
  const [weekTab, setWeekTab] = useState("overdue");
  const [logNote, setLogNote] = useState("");
  const [logAction, setLogAction] = useState("");
  const [logDue, setLogDue] = useState("");
  const [logStage, setLogStage] = useState("");

  const u = USERS[currentUser];

  // Load contacts from Supabase
  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("contacts").select("*").order("next_due", { ascending: true });
    if (!error && data) setContacts(data);
    setLoading(false);
  };

  const allActive = contacts.filter(c => !c.archived);
  const myActive = allActive.filter(c => c.owner === currentUser);
  const myDue = myActive.filter(c => urgency(c.next_due).diff <= 0);
  const endOfWorkWeek = getEndOfWorkWeek();
  const myUpcoming = myActive.filter(c => { const d = urgency(c.next_due).diff; const due = new Date(c.next_due); return d > 0 && due <= endOfWorkWeek; });

  const openContact = (c) => {
    setSelected(c.id);
    setLogNote("");
    setLogAction(c.next_action);
    setLogDue(c.next_due);
    setLogStage(c.stage);
  };

  const saveLog = async (id) => {
    const c = contacts.find(x => x.id === id);
    if (!logNote.trim() && !logDue) return;
    setSaving(true);
    const newEntry = { date: TODAY, note: logNote || c.last_note, action: logAction, stage: logStage };
    const updatedHistory = [...(c.history || []), newEntry];
    const { error } = await supabase.from("contacts").update({
      last_note: logNote || c.last_note,
      last_touch: TODAY,
      next_action: logAction,
      next_due: logDue,
      stage: logStage,
      history: updatedHistory,
      phone: document.getElementById(`phone-${id}`)?.value ?? c.phone,
      email: document.getElementById(`email-${id}`)?.value ?? c.email,
    }).eq("id", id);
    if (!error) await fetchContacts();
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
      history: [{ date: form.last_touch, note: form.last_note, action: form.next_action, stage: form.stage }]
    };
    await supabase.from("contacts").insert([newContact]);
    await fetchContacts();
    setForm({ ...EMPTY, owner: currentUser });
    setShowAdd(false);
    setSaving(false);
  };

  const deleteContact = async (id) => {
    setSaving(true);
    await supabase.from("contacts").delete().eq("id", id);
    await fetchContacts();
    setSaving(false);
    setSelected(null);
  };

  const selectedContact = contacts.find(c => c.id === selected);

  const displayContacts = contacts
    .filter(c => archiveFilter === "active" ? !c.archived : archiveFilter === "archived" ? c.archived : true)
    .filter(c => stageFilter === "All" || c.stage === stageFilter)
    .filter(c => ownerFilter === "all" ? true : ownerFilter === "mine" ? c.owner === currentUser : c.owner !== currentUser);

  const followupContacts = allActive.filter(c => ownerFilter === "all" ? true : c.owner === currentUser);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#FAFAF8", flexDirection: "column", gap: 16 }}>
      <style>{css}</style>
      <div className="spinner" />
      <div className="e" style={{ fontSize: 13, color: "#9CA3AF" }}>Loading your pipeline…</div>
    </div>
  );

  // ── DETAIL VIEW ──────────────────────────────────────────────
  if (selected && selectedContact) {
    const c = selectedContact;
    const urg = urgency(c.next_due);
    const owner = USERS[c.owner] || USERS.nick;
    const isOwner = c.owner === currentUser;
    const history = [...(c.history || [])].reverse();

    return (
      <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", background: "#FAFAF8", minHeight: "100vh" }}>
        <style>{css}</style>
        <div style={{ background: "#fff", borderBottom: "1px solid #EBEBEB", padding: "16px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="btn ghost e" onClick={() => setSelected(null)} style={{ padding: "7px 14px", fontSize: 12 }}>← Back</button>
            <span style={{ color: "#D1D5DB" }}>/</span>
            <span className="e" style={{ fontSize: 13, color: "#6B7280" }}>{page === "followups" ? "Follow-ups" : "Contacts"}</span>
          </div>
          <OwnerPill userId={c.owner} />
        </div>

        <div className="fu" style={{ maxWidth: 720, margin: "40px auto", padding: "0 24px 60px" }}>
          {!isOwner && (
            <div style={{ background: owner.bg, border: `1px solid ${owner.color}30`, borderRadius: 8, padding: "10px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
              <Avatar userId={c.owner} size={20} />
              <span className="e" style={{ fontSize: 12, color: owner.color }}>This contact is owned by <strong>{owner.name}</strong>.</span>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32 }}>
            <div>
              <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-.02em", color: "#1a1a1a" }}>{c.company}</div>
              <div className="e" style={{ fontSize: 14, color: "#6B7280", marginTop: 4 }}>{c.contact}</div>
              <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                {c.phone && <a href={`tel:${c.phone}`} className="e" style={{ fontSize: 13, color: "#4F46E5", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>📞 {c.phone}</a>}
                {c.email && <a href={`mailto:${c.email}`} className="e" style={{ fontSize: 13, color: "#4F46E5", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>✉️ {c.email}</a>}
              </div>
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span className="tag" style={{ background: STAGE_COLORS[c.stage]?.bg, color: STAGE_COLORS[c.stage]?.text }}>{c.stage}</span>
                {c.archived && <span className="tag e" style={{ background: "#F1F5F9", color: "#94A3B8" }}>Archived</span>}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: URG_DOT[urg.level] }} />
                <span className="e" style={{ fontSize: 13, color: URG_TEXT[urg.level], fontWeight: 500 }}>{urg.label}</span>
              </div>
              <div className="e" style={{ fontSize: 11, color: "#C4C4C4", marginTop: 4 }}>next due {c.next_due}</div>
            </div>
          </div>

          <div style={{ background: "#fff", border: `1px solid ${isOwner ? u.color + "30" : "#EBEBEB"}`, borderRadius: 10, padding: 24, marginBottom: 24 }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: "#1a1a1a", marginBottom: 4 }}>Log a touchpoint</div>
            <div className="e" style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 16 }}>Saving as {u.name} · {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>
            <div style={{ display: "grid", gap: 12 }}>
              <div><label className="lbl">What happened?</label><textarea rows={3} placeholder="Quick note on the conversation, email, meeting…" value={logNote} onChange={e => setLogNote(e.target.value)} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label className="lbl">Next action</label><input placeholder="e.g. Send deck, follow-up call" value={logAction} onChange={e => setLogAction(e.target.value)} /></div>
                <div><label className="lbl">Next follow-up date</label><input type="date" value={logDue} onChange={e => setLogDue(e.target.value)} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label className="lbl">Stage</label><select value={logStage} onChange={e => setLogStage(e.target.value)}>{STAGES.map(s => <option key={s}>{s}</option>)}</select></div>
                <div><label className="lbl">Reassign to</label>
                  <select value={c.owner} onChange={e => updateContact(c.id, { owner: e.target.value })}>
                    {Object.entries(USERS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label className="lbl">Phone</label><input placeholder="+61 4xx xxx xxx" defaultValue={c.phone || ""} id={`phone-${c.id}`} /></div>
                <div><label className="lbl">Email</label><input placeholder="jane@acme.com" defaultValue={c.email || ""} id={`email-${c.id}`} /></div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button className="btn ghost e" onClick={() => setSelected(null)}>Cancel</button>
                <button className="btn e" style={{ background: u.color, color: "#fff", opacity: saving ? .6 : 1 }} onClick={() => saveLog(c.id)} disabled={saving}>
                  {saving ? "Saving…" : "Save & reset follow-up"}
                </button>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <div className="e" style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 16 }}>
              History · {history.length} {history.length === 1 ? "entry" : "entries"}
            </div>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 4, top: 12, bottom: 12, width: 1, background: "#EBEBEB" }} />
              <div style={{ display: "flex", flexDirection: "column" }}>
                {history.map((h, i) => (
                  <div key={i} style={{ display: "flex", gap: 16, paddingBottom: 20 }}>
                    <div style={{ paddingTop: 2, flexShrink: 0 }}>
                      <div className="timeline-dot" style={{ background: i === 0 ? "#1a1a1a" : "#E5E7EB" }} />
                    </div>
                    <div style={{ flex: 1, background: i === 0 ? "#fff" : "transparent", border: i === 0 ? "1px solid #EBEBEB" : "none", borderRadius: 8, padding: i === 0 ? "14px 16px" : "0" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                        <span className="e" style={{ fontSize: 11, color: i === 0 ? "#1a1a1a" : "#9CA3AF", fontWeight: i === 0 ? 500 : 400 }}>{fmtDateLong(h.date)}</span>
                        {i === 0 && <span className="tag e" style={{ background: "#F3F4F6", color: "#6B7280", fontSize: 9 }}>Latest</span>}
                        <span className="tag" style={{ background: STAGE_COLORS[h.stage]?.bg || "#F1F5F9", color: STAGE_COLORS[h.stage]?.text || "#475569", fontSize: 9 }}>{h.stage}</span>
                      </div>
                      <div style={{ fontSize: i === 0 ? 15 : 14, color: i === 0 ? "#1a1a1a" : "#6B7280", lineHeight: 1.55, marginBottom: h.action && h.action !== "—" ? 6 : 0 }}>{h.note || "—"}</div>
                      {h.action && h.action !== "—" && <div className="e" style={{ fontSize: 11, color: "#C4C4C4" }}>→ {h.action}</div>}
                    </div>
                  </div>
                ))}
                {history.length === 0 && <div className="e" style={{ fontSize: 13, color: "#D1D5DB", paddingLeft: 24 }}>No history yet.</div>}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 8, borderTop: "1px solid #EBEBEB" }}>
            <button className="btn ghost e" onClick={() => updateContact(c.id, { archived: !c.archived }).then(() => setSelected(null))}>
              {c.archived ? "Unarchive" : "Archive (never responded)"}
            </button>
            <button className="btn e" style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" }} onClick={() => deleteContact(c.id)}>Delete</button>
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN ─────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", background: "#FAFAF8", minHeight: "100vh" }}>
      <style>{css}</style>

      <div style={{ background: "#fff", borderBottom: "1px solid #EBEBEB", padding: "12px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }} onClick={() => setPage("home")}>
          <img src="/src/logo.png" alt="2Square Talent" style={{ height: 32, width: "auto", objectFit: "contain" }} />
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button className={`nav-btn e ${page === "home" ? "active" : ""}`} onClick={() => setPage("home")}>Home</button>
          <button className={`nav-btn e ${page === "followups" ? "active" : ""}`} onClick={() => setPage("followups")}>
            Follow-ups {myDue.length > 0 && <span style={{ background: "#DC2626", color: "#fff", borderRadius: 10, fontSize: 10, padding: "1px 6px", marginLeft: 4 }}>{myDue.length}</span>}
          </button>
          <button className={`nav-btn e ${page === "contacts" ? "active" : ""}`} onClick={() => setPage("contacts")}>Contacts</button>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ display: "flex", background: "#F3F4F6", borderRadius: 8, padding: 3, gap: 2 }}>
            {Object.entries(USERS).map(([k, v]) => (
              <button key={k} onClick={() => setCurrentUser(k)} style={{
                border: "none", cursor: "pointer", fontFamily: "'Epilogue', sans-serif", fontSize: 12, fontWeight: 500,
                padding: "6px 14px", borderRadius: 6, transition: "all .15s",
                background: currentUser === k ? v.color : "transparent",
                color: currentUser === k ? "#fff" : "#6B7280",
              }}>{v.name}</button>
            ))}
          </div>
          <button className="btn e" style={{ background: "#1a1a1a", color: "#fff" }} onClick={() => { setShowAdd(true); setForm({ ...EMPTY, owner: currentUser }); }}>+ Add</button>
        </div>
      </div>

      {/* HOME */}
      {page === "home" && (
        <div className="fu" style={{ maxWidth: 720, margin: "0 auto", padding: "50px 24px" }}>
          <div style={{ marginBottom: 40 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
              <Avatar userId={currentUser} size={48} />
              <div>
                <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-.03em", lineHeight: 1, color: u.color }}>Hey, {u.name}.</div>
                <div className="e" style={{ fontSize: 13, color: "#9CA3AF", marginTop: 4 }}>{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
              </div>
            </div>
            <div style={{ marginTop: 16 }}><OwnerBar contacts={contacts} /></div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 32 }}>
            {[
              { label: "Overdue", count: myActive.filter(c => urgency(c.next_due).level === "overdue").length, color: "#DC2626", bg: "#FEF2F2", border: "#FECACA" },
              { label: "Due today", count: myActive.filter(c => urgency(c.next_due).level === "today").length, color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
              { label: "This week", count: myUpcoming.length, color: "#15803D", bg: "#F0FDF4", border: "#BBF7D0" },
            ].map(({ label, count, color, bg, border }) => (
              <div key={label} style={{ background: count > 0 ? bg : "#fff", border: `1px solid ${count > 0 ? border : "#EBEBEB"}`, borderRadius: 10, padding: "20px 24px", cursor: count > 0 ? "pointer" : "default" }}
                onClick={() => count > 0 && setPage("followups")}>
                <div className="e" style={{ fontSize: 11, color: count > 0 ? color : "#9CA3AF", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
                <div style={{ fontSize: 40, fontWeight: 700, color: count > 0 ? color : "#D1D5DB", lineHeight: 1 }}>{count}</div>
                {count > 0 && <div className="e" style={{ fontSize: 11, color, marginTop: 8 }}>View →</div>}
              </div>
            ))}
          </div>

          {myDue.length > 0 ? (
            <div>
              <div className="e" style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 12 }}>Your attention needed</div>
              <div style={{ background: "#fff", border: "1px solid #EBEBEB", borderRadius: 10, overflow: "hidden" }}>
                {myDue.map((c, i) => {
                  const urg = urgency(c.next_due);
                  return (
                    <div key={c.id} className="row" style={{ padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: i < myDue.length - 1 ? "1px solid #EBEBEB" : "none" }}
                      onClick={() => openContact(c)}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 3, height: 36, borderRadius: 4, background: u.color, flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: 17, fontWeight: 600, color: "#1a1a1a" }}>{c.company}</div>
                          <div className="e" style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{c.contact} · {c.next_action}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: URG_DOT[urg.level] }} />
                          <span className="e" style={{ fontSize: 11, color: URG_TEXT[urg.level], fontWeight: 500 }}>{urg.label}</span>
                        </span>
                        <span className="e" style={{ fontSize: 12, color: "#C4C4C4" }}>Log →</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ background: "#fff", border: "1px solid #EBEBEB", borderRadius: 10, padding: "40px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>✓</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: "#1a1a1a" }}>All caught up, {u.name}.</div>
              <div className="e" style={{ fontSize: 13, color: "#9CA3AF", marginTop: 6 }}>No overdue follow-ups on your side right now.</div>
            </div>
          )}

          {(() => {
            const partnerId = Object.keys(USERS).find(k => k !== currentUser);
            const partnerUser = USERS[partnerId];
            const partnerDue = allActive.filter(c => c.owner === partnerId && urgency(c.next_due).diff <= 0);
            if (!partnerDue.length) return null;
            return (
              <div style={{ marginTop: 28 }}>
                <div className="e" style={{ fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 12 }}>{partnerUser.name}'s overdue ({partnerDue.length})</div>
                <div style={{ background: partnerUser.bg, border: `1px solid ${partnerUser.color}20`, borderRadius: 10, overflow: "hidden" }}>
                  {partnerDue.map((c, i) => (
                    <div key={c.id} className="row" style={{ padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: i < partnerDue.length - 1 ? `1px solid ${partnerUser.color}15` : "none", background: "transparent" }}
                      onClick={() => openContact(c)}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar userId={partnerId} size={20} />
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 600, color: "#1a1a1a" }}>{c.company}</div>
                          <div className="e" style={{ fontSize: 11, color: "#9CA3AF" }}>{c.contact}</div>
                        </div>
                      </div>
                      <span className="e" style={{ fontSize: 11, color: URG_TEXT[urgency(c.next_due).level] }}>{urgency(c.next_due).label}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* FOLLOW-UPS */}
      {page === "followups" && (
        <div className="fu" style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-.02em", color: "#1a1a1a" }}>Follow-ups</div>
              <div className="e" style={{ fontSize: 13, color: "#9CA3AF", marginTop: 4 }}>{myDue.length} overdue or due today · {myUpcoming.length} this week</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {[["mine", "Mine"], ["all", "All"]].map(([k, l]) => (
                <button key={k} className={`filter-btn e ${ownerFilter === k ? "on" : ""}`} onClick={() => setOwnerFilter(k)}>{l}</button>
              ))}
            </div>
          </div>

          {/* Week tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid #EBEBEB", marginBottom: 28 }}>
            {[["overdue", "Overdue & today"], ["thisweek", "This week"], ["nextweek", "Next week"], ["all", "All upcoming"]].map(([k, l]) => {
              const isActive = weekTab === k;
              return (
                <button key={k} onClick={() => setWeekTab(k)} style={{
                  border: "none", background: "none", cursor: "pointer",
                  fontFamily: "Epilogue, sans-serif", fontSize: 13,
                  padding: "10px 18px", marginBottom: -1,
                  borderBottom: isActive ? "2px solid #1a1a1a" : "2px solid transparent",
                  color: isActive ? "#1a1a1a" : "#9CA3AF",
                  fontWeight: isActive ? 500 : 400, transition: "all .15s",
                }}>{l}</button>
              );
            })}
          </div>

          {(() => {
            const eow = getEndOfWorkWeek();
            const nextMonday = new Date(eow); nextMonday.setDate(eow.getDate() + 3);
            const nextFriday = new Date(nextMonday); nextFriday.setDate(nextMonday.getDate() + 4);

            const filtered = followupContacts.filter(c => {
              const d = urgency(c.next_due).diff;
              const due = new Date(c.next_due); due.setHours(0,0,0,0);
              if (weekTab === "overdue") return d <= 0;
              if (weekTab === "thisweek") return d > 0 && due <= eow;
              if (weekTab === "nextweek") return due > eow && due <= nextFriday;
              return d > 0;
            });

            if (!filtered.length) return (
              <div style={{ background: "#fff", border: "1px solid #EBEBEB", borderRadius: 10, padding: "40px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 600, color: "#1a1a1a" }}>All clear!</div>
                <div className="e" style={{ fontSize: 13, color: "#9CA3AF", marginTop: 6 }}>No follow-ups in this view.</div>
              </div>
            );

            return (
              <div style={{ background: "#fff", border: "1px solid #EBEBEB", borderRadius: 10, overflow: "hidden" }}>
                {filtered.map((c, i) => {
                  const urg = urgency(c.next_due);
                  const owner = USERS[c.owner] || USERS.nick;
                  return (
                    <div key={c.id} className="row" style={{ padding: "14px 24px", display: "grid", gridTemplateColumns: "1fr 180px 110px 100px", gap: 16, alignItems: "center", borderBottom: i < filtered.length - 1 ? "1px solid #EBEBEB" : "none" }}
                      onClick={() => openContact(c)}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 3, height: 32, borderRadius: 4, background: owner.color, flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 600, color: "#1a1a1a" }}>{c.company}</div>
                          <div className="e" style={{ fontSize: 11, color: "#6B7280", marginTop: 1 }}>{c.contact}</div>
                        </div>
                      </div>
                      <div className="e" style={{ fontSize: 12, color: "#6B7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.next_action}</div>
                      <OwnerPill userId={c.owner} />
                      <div style={{ display: "flex", alignItems: "center", gap: 5, justifyContent: "flex-end" }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: URG_DOT[urg.level] }} />
                        <span className="e" style={{ fontSize: 11, color: URG_TEXT[urg.level], fontWeight: 500 }}>{urg.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* CONTACTS */}
      {page === "contacts" && (
        <div className="fu" style={{ maxWidth: 940, margin: "0 auto", padding: "40px 24px" }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-.02em", color: "#1a1a1a" }}>Contacts</div>
            <div className="e" style={{ fontSize: 13, color: "#9CA3AF", marginTop: 4 }}>{allActive.length} active · {contacts.filter(c => c.archived).length} archived</div>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            {["active", "archived", "all"].map(f => (
              <button key={f} className={`filter-btn e ${archiveFilter === f ? "on" : ""}`} onClick={() => setArchiveFilter(f)}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
            ))}
            <span style={{ width: 1, background: "#E5E5E5", margin: "0 4px" }} />
            {[["mine", "Mine"], ["theirs", "Partner's"], ["all", "Everyone's"]].map(([k, l]) => (
              <button key={k} className={`filter-btn e ${ownerFilter === k ? "on" : ""}`} onClick={() => setOwnerFilter(k)}>{l}</button>
            ))}
            <span style={{ width: 1, background: "#E5E5E5", margin: "0 4px" }} />
            {["All", ...STAGES].map(s => (
              <button key={s} className={`filter-btn e ${stageFilter === s ? "on" : ""}`} onClick={() => setStageFilter(s)}>{s}</button>
            ))}
          </div>
          <div style={{ background: "#fff", border: "1px solid #EBEBEB", borderRadius: 10, overflow: "hidden" }}>
            <div className="e" style={{ padding: "10px 24px", display: "grid", gridTemplateColumns: "1fr 100px 150px 100px 90px", gap: 16, fontSize: 10, color: "#C4C4C4", letterSpacing: ".12em", textTransform: "uppercase", borderBottom: "1px solid #EBEBEB", background: "#FAFAF8" }}>
              <span>Company / Contact</span><span>Owner</span><span>Next action</span><span>Stage</span><span>Due</span>
            </div>
            {displayContacts.length === 0 && (
              <div className="e" style={{ padding: "40px 24px", textAlign: "center", color: "#D1D5DB", fontSize: 13 }}>No contacts in this view.</div>
            )}
            {displayContacts.map((c) => {
              const urg = urgency(c.next_due);
              const owner = USERS[c.owner] || USERS.nick;
              return (
                <div key={c.id} className="row" style={{ padding: "13px 24px", display: "grid", gridTemplateColumns: "1fr 100px 150px 100px 90px", gap: 16, alignItems: "center", opacity: c.archived ? 0.5 : 1, borderLeft: `3px solid ${owner.color}` }}
                  onClick={() => openContact(c)}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#1a1a1a" }}>{c.company}</div>
                    <div className="e" style={{ fontSize: 11, color: "#6B7280", marginTop: 1 }}>{c.contact}</div>
                  </div>
                  <OwnerPill userId={c.owner} />
                  <div className="e" style={{ fontSize: 12, color: "#6B7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.next_action}</div>
                  <div><span className="tag" style={{ background: STAGE_COLORS[c.stage]?.bg, color: STAGE_COLORS[c.stage]?.text }}>{c.stage}</span></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: URG_DOT[urg.level] }} />
                    <span className="e" style={{ fontSize: 11, color: URG_TEXT[urg.level] }}>{urg.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ADD MODAL */}
      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, backdropFilter: "blur(4px)" }} onClick={() => setShowAdd(false)}>
          <div className="fu" style={{ background: "#fff", border: "1px solid #E5E5E5", borderRadius: 12, padding: 32, width: 500, maxWidth: "92vw", boxShadow: "0 20px 60px rgba(0,0,0,0.1)" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-.02em", color: "#1a1a1a", marginBottom: 24 }}>New contact</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div><label className="lbl">Company *</label><input placeholder="Acme Corp" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} /></div>
              <div><label className="lbl">Contact name</label><input placeholder="Jane Smith" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} /></div>
              <div><label className="lbl">Phone</label><input placeholder="+61 4xx xxx xxx" value={form.phone || ""} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <div><label className="lbl">Email</label><input placeholder="jane@acme.com" value={form.email || ""} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div><label className="lbl">Owner</label>
                <select value={form.owner} onChange={e => setForm({ ...form, owner: e.target.value })}>
                  {Object.entries(USERS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
                </select>
              </div>
              <div><label className="lbl">Stage</label><select value={form.stage} onChange={e => setForm({ ...form, stage: e.target.value })}>{STAGES.map(s => <option key={s}>{s}</option>)}</select></div>
              <div><label className="lbl">Last touch</label><input type="date" value={form.last_touch} onChange={e => setForm({ ...form, last_touch: e.target.value })} /></div>
            </div>
            <div style={{ marginBottom: 14 }}><label className="lbl">Note</label><textarea rows={2} placeholder="How did you meet / context…" value={form.last_note} onChange={e => setForm({ ...form, last_note: e.target.value })} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 28 }}>
              <div><label className="lbl">Next action</label><input placeholder="Send deck, call…" value={form.next_action} onChange={e => setForm({ ...form, next_action: e.target.value })} /></div>
              <div><label className="lbl">Follow-up date *</label><input type="date" value={form.next_due} onChange={e => setForm({ ...form, next_due: e.target.value })} /></div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn ghost e" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn e" style={{ background: u.color, color: "#fff", opacity: saving ? .6 : 1 }} onClick={saveForm} disabled={saving}>
                {saving ? "Saving…" : "Save contact"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
