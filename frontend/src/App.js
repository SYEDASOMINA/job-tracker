import { useState, useMemo, useEffect, useRef } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
// ─── API helpers ──────────────────────────────────────────────────────────────
const API = "https://job-tracker-a7yr.onrender.com";

async function getCsrf() {
  try {
    // First try to get CSRF token from the dedicated endpoint
    const res = await fetch(`${API}/api/auth/csrf/`, { credentials: 'include' });
    const data = await res.json();
    if (data.csrfToken) {
      return data.csrfToken;
    }
  } catch (e) {
    console.log('Could not get CSRF from endpoint:', e);
  }
  
  // Fallback: try to extract from cookie
  const name = 'csrftoken';
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue || '';
}

async function apiLogin(username, password) {
  const csrf = await getCsrf();
  const res = await fetch(`${API}/api/auth/login/`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrf },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error('Login failed:', data);
    throw new Error(data.error || 'Login failed');
  }
  return data;
}

async function apiFetch(path, options = {}) {
  const csrf = await getCsrf();
  const headers = { ...options.headers, 'X-CSRFToken': csrf };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  const res = await fetch(`${API}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  if (res.status === 204) return {};
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || `API error: ${res.status}`);
  }
  return res.json();
}

function toClientEntry(raw) {
  return {
    id: raw.id,
    name: raw.name,
    company: raw.company,
    job: raw.job_title,
    status: raw.status,
    priority: raw.priority,
    date: raw.date_applied || "",
    interviewDate: raw.interview_date || "",
    salary: raw.salary || "",
    contact: raw.contact_name || "",
    email: raw.contact_email || "",
    notes: raw.notes || "",
    starred: raw.starred || false,
    resumeName: raw.resume ? raw.resume.split('/').pop() : "",
  };
}

function toServerPayload(data) {
  return {
    name: data.name,
    company: data.company,
    job_title: data.job,
    status: data.status,
    priority: data.priority,
    date_applied: data.date || null,
    interview_date: data.interviewDate || null,
    salary: data.salary,
    contact_name: data.contact,
    contact_email: data.email,
    notes: data.notes,
    starred: data.starred,
  };
}

async function loadEntries(setEntries) {
  const data = await apiFetch('/api/applications/');
  if (Array.isArray(data)) {
    setEntries(data.map(toClientEntry));
  }
}

async function ensureLoggedIn() {
  try {
    // Check if already logged in
    const me = await apiFetch('/api/auth/me/');
    if (me.username) {
      console.log('Already logged in as:', me.username);
      return;
    }
  } catch (e) {
    console.log('Not logged in, attempting login...');
  }
  
  // Try to log in
  try {
    const loginRes = await apiLogin('appuser', 'appuser123');
    console.log('Logged in:', loginRes);
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}
const STATUS   = ["Applied", "Interview", "Offer", "Rejected"];
const PRIORITY = ["Low", "Medium", "High"];

const STATUS_STYLE = {
  Applied:   { dot:"#60a5fa", bg:"#eff6ff", text:"#1e40af", dark_bg:"#1e3a5f", dark_text:"#93c5fd" },
  Interview: { dot:"#f59e0b", bg:"#fffbeb", text:"#92400e", dark_bg:"#4a3000", dark_text:"#fcd34d" },
  Offer:     { dot:"#10b981", bg:"#ecfdf5", text:"#065f46", dark_bg:"#0c3a2a", dark_text:"#6ee7b7" },
  Rejected:  { dot:"#f87171", bg:"#fef2f2", text:"#991b1b", dark_bg:"#3a1515", dark_text:"#fca5a5" },
};

const PRIORITY_STYLE = {
  Low:    { color:"#10b981", label:"↓ Low" },
  Medium: { color:"#f59e0b", label:"→ Mid" },
  High:   { color:"#ef4444", label:"↑ High" },
};

const AVATAR_COLORS = ["#6366f1","#ec4899","#14b8a6","#f59e0b","#8b5cf6","#10b981","#f43f5e","#3b82f6"];
const avatarColor   = (name) => AVATAR_COLORS[(name || "A").charCodeAt(0) % AVATAR_COLORS.length];
const initials      = (name) => (name || "?").split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase();

const EMPTY_FORM = { name:"", company:"", job:"", status:"Applied", priority:"Medium", date:"", interviewDate:"", salary:"", contact:"", email:"", notes:"", starred:false, resumeName:"" };

// ─── CSV Export ───────────────────────────────────────────────────────────────
function exportCSV(entries) {
  const headers = ["Name","Company","Job Title","Status","Priority","Date Applied","Interview Date","Salary","Contact","Email","Notes","Starred"];
  const rows = entries.map(e => [e.name,e.company,e.job,e.status,e.priority,e.date,e.interviewDate,e.salary,e.contact,e.email,e.notes,e.starred?"Yes":"No"]);
  const csv  = [headers, ...rows].map(r => r.map(v => `"${(v||"").replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type:"text/csv" });
  const a    = document.createElement("a");
  a.href     = URL.createObjectURL(blob);
  a.download = "job-applications.csv";
  a.click();
}

// ─── Upcoming interviews (within 7 days) ─────────────────────────────────────
function getUpcoming(entries) {
  const now   = new Date();
  const in7   = new Date(now); in7.setDate(now.getDate() + 7);
  return entries.filter(e => {
    if (!e.interviewDate) return false;
    const d = new Date(e.interviewDate);
    return d >= now && d <= in7;
  }).sort((a,b) => new Date(a.interviewDate) - new Date(b.interviewDate));
}

// ─── Theming ──────────────────────────────────────────────────────────────────
function getTheme(dark) {
  return {
    bg:       dark ? "#0f0f0f" : "#f8f7f4",
    surface:  dark ? "#1a1a1a" : "#ffffff",
    border:   dark ? "#2a2a2a" : "#ebebeb",
    text:     dark ? "#f0f0f0" : "#1a1a1a",
    muted:    dark ? "#666"    : "#aaa",
    input:    dark ? "#222"    : "#fafafa",
    inputBorder: dark ? "#333" : "#e5e5e5",
    pill:     dark ? "#2a2a2a" : "#ffffff",
    pillActive: dark ? "#f0f0f0" : "#1a1a1a",
    pillActiveText: dark ? "#111" : "#fff",
    shadow:   dark ? "0 1px 4px rgba(0,0,0,0.4)" : "0 1px 4px rgba(0,0,0,0.04)",
    btnBg:    dark ? "#f0f0f0" : "#1a1a1a",
    btnText:  dark ? "#111"    : "#fff",
    kanbanCol: dark ? "#161616": "#f0eeeb",
    accent:   dark ? "#818cf8" : "#6366f1",
  };
}

function FormFields({ data, onChange, isEdit, S, t, fileRef, handleFile }) {
  return (
    <div>
      <div style={S.grid2}>
        <div style={S.field}>
          <label style={S.lbl}>Your Name</label>
          <input style={S.inp} value={data.name} onChange={e => onChange("name", e.target.value)} placeholder="e.g. Ravi Kumar" />
        </div>
        <div style={S.field}>
          <label style={S.lbl}>Company</label>
          <input style={S.inp} value={data.company} onChange={e => onChange("company", e.target.value)} placeholder="e.g. Google" />
        </div>
        <div style={{ ...S.field, gridColumn:"1/-1" }}>
          <label style={S.lbl}>Job Title</label>
          <input style={S.inp} value={data.job} onChange={e => onChange("job", e.target.value)} placeholder="e.g. Frontend Engineer" />
        </div>
      </div>

      <div style={{ ...S.grid3, marginTop:10 }}>
        <div style={S.field}>
          <label style={S.lbl}>Status</label>
          <select style={S.inp} value={data.status} onChange={e => onChange("status", e.target.value)}>
            {STATUS.map(st => <option key={st}>{st}</option>)}
          </select>
        </div>
        <div style={S.field}>
          <label style={S.lbl}>Priority</label>
          <select style={S.inp} value={data.priority} onChange={e => onChange("priority", e.target.value)}>
            {PRIORITY.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div style={S.field}>
          <label style={S.lbl}>Date Applied</label>
          <input style={S.inp} type="date" value={data.date} onChange={e => onChange("date", e.target.value)} />
        </div>
      </div>

      <div style={{ ...S.grid2, marginTop:10 }}>
        <div style={S.field}>
          <label style={S.lbl}>Interview Date</label>
          <input style={S.inp} type="date" value={data.interviewDate} onChange={e => onChange("interviewDate", e.target.value)} />
        </div>
        <div style={S.field}>
          <label style={S.lbl}>Salary Range</label>
          <input style={S.inp} value={data.salary} onChange={e => onChange("salary", e.target.value)} placeholder="e.g. ₹20–28L" />
        </div>
        <div style={S.field}>
          <label style={S.lbl}>Contact Person</label>
          <input style={S.inp} value={data.contact} onChange={e => onChange("contact", e.target.value)} placeholder="e.g. HR Meera" />
        </div>
        <div style={S.field}>
          <label style={S.lbl}>Contact Email</label>
          <input style={S.inp} type="email" value={data.email} onChange={e => onChange("email", e.target.value)} placeholder="e.g. hr@company.com" />
        </div>
        <div style={{ ...S.field, gridColumn:"1/-1" }}>
          <label style={S.lbl}>Notes</label>
          <textarea style={S.ta} rows={2} value={data.notes} onChange={e => onChange("notes", e.target.value)} placeholder="Referral, package details, anything..." />
        </div>
        <div style={{ ...S.field, gridColumn:"1/-1" }}>
          <label style={S.lbl}>Resume File</label>
          <input
            ref={isEdit ? null : fileRef}
            type="file" accept=".pdf,.doc,.docx"
            style={{ fontSize:13, color:t.muted }}
            onChange={e => handleFile(e, onChange)}
          />
          {data.resumeName && <span style={{ fontSize:12, color:t.accent, marginTop:3 }}>📎 {data.resumeName}</span>}
        </div>
      </div>
    </div>
  );
}

function ChartsView({ entries, counts, S, t }) {
  const total = entries.length || 1;
  const successRate = entries.length ? Math.round((counts["Offer"] / entries.length) * 100) : 0;
  const interviewRate = entries.length ? Math.round(((counts["Interview"] + counts["Offer"]) / entries.length) * 100) : 0;

  const topCompanies = useMemo(() => {
    const map = {};
    entries.forEach(e => { map[e.company] = (map[e.company] || 0) + 1; });
    return Object.entries(map).sort((a,b) => b[1]-a[1]).slice(0,5);
  }, [entries]);

  const barColors = { Applied:"#60a5fa", Interview:"#f59e0b", Offer:"#10b981", Rejected:"#f87171" };

  return (
    <div>
      <div style={{ ...S.statsRow, gridTemplateColumns:"repeat(3,1fr)", marginBottom:14 }}>
        {[
          { label:"Success Rate",      value:`${successRate}%`,     color:"#10b981" },
          { label:"Interview Rate",    value:`${interviewRate}%`,   color:"#f59e0b" },
          { label:"Starred",           value:entries.filter(e=>e.starred).length, color:"#f59e0b" },
        ].map(m => (
          <div key={m.label} style={S.statBox}>
            <div style={{ ...S.statNum, color:m.color }}>{m.value}</div>
            <div style={S.statLabel}>{m.label}</div>
          </div>
        ))}
      </div>

      <div style={S.chartRow}>
        <div style={S.chartBox}>
          <div style={{ ...S.cardTitle, marginBottom:16 }}>Status Breakdown</div>
          {STATUS.map(st => (
            <div key={st} style={S.barRow}>
              <span style={S.barLabel}>{st}</span>
              <div style={{ flex:1, background:t.kanbanCol, borderRadius:5, overflow:"hidden" }}>
                <div style={S.bar(Math.round((counts[st]/total)*100), barColors[st])}>
                  {counts[st] > 0 && counts[st]}
                </div>
              </div>
              <span style={S.barCount}>{Math.round((counts[st]/total)*100)}%</span>
            </div>
          ))}
        </div>

        <div style={S.chartBox}>
          <div style={{ ...S.cardTitle, marginBottom:16 }}>Top Companies</div>
          {topCompanies.length === 0 ? <p style={{ color:t.muted, fontSize:13 }}>No data yet.</p> :
            topCompanies.map(([company, count], i) => (
              <div key={company} style={S.barRow}>
                <span style={S.barLabel}>{company}</span>
                <div style={{ flex:1, background:t.kanbanCol, borderRadius:5, overflow:"hidden" }}>
                  <div style={S.bar(Math.round((count/topCompanies[0][1])*100), AVATAR_COLORS[i % AVATAR_COLORS.length])}>
                    {count}
                  </div>
                </div>
                <span style={S.barCount}>{count}</span>
              </div>
            ))
          }
        </div>

        <div style={S.chartBox}>
          <div style={{ ...S.cardTitle, marginBottom:16 }}>Priority Split</div>
          {PRIORITY.map(p => {
            const cnt = entries.filter(e => e.priority === p).length;
            return (
              <div key={p} style={S.barRow}>
                <span style={S.barLabel}><span style={S.priDot(PRIORITY_STYLE[p].color)} />{p}</span>
                <div style={{ flex:1, background:t.kanbanCol, borderRadius:5, overflow:"hidden" }}>
                  <div style={S.bar(Math.round((cnt/total)*100), PRIORITY_STYLE[p].color)}>{cnt > 0 && cnt}</div>
                </div>
                <span style={S.barCount}>{Math.round((cnt/total)*100)}%</span>
              </div>
            );
          })}
        </div>

        <div style={S.chartBox}>
          <div style={{ ...S.cardTitle, marginBottom:16 }}>Monthly Applications</div>
          {(() => {
            const map = {};
            entries.forEach(e => {
              if (!e.date) return;
              const mon = e.date.slice(0,7);
              map[mon] = (map[mon] || 0) + 1;
            });
            const months = Object.entries(map).sort((a,b) => a[0].localeCompare(b[0])).slice(-5);
            const max = Math.max(...months.map(m=>m[1]), 1);
            return months.length === 0 ? <p style={{ color:t.muted, fontSize:13 }}>No dated entries yet.</p> :
              months.map(([mon, cnt]) => (
                <div key={mon} style={S.barRow}>
                  <span style={S.barLabel}>{mon.slice(5)} {mon.slice(0,4)}</span>
                  <div style={{ flex:1, background:t.kanbanCol, borderRadius:5, overflow:"hidden" }}>
                    <div style={S.bar(Math.round((cnt/max)*100), t.accent)}>{cnt}</div>
                  </div>
                  <span style={S.barCount}>{cnt}</span>
                </div>
              ));
          })()}
        </div>
      </div>
    </div>
  );
}

function KanbanView({ entries, counts, dragId, setDragId, onDrop, S, t }) {
  return (
    <div style={S.kanban}>
      {STATUS.map(st => (
        <div
          key={st}
          style={S.kanbanCol}
          onDragOver={e => e.preventDefault()}
          onDrop={() => onDrop(st)}
        >
          <div style={S.kanbanHdr}>
            <span>{st}</span>
            <span style={{ background: STATUS_STYLE[st].dot, color:"#fff", borderRadius:10, padding:"1px 7px", fontSize:11 }}>{counts[st]}</span>
          </div>
          {entries.filter(e => e.status === st).map(e => (
            <div
              key={e.id}
              draggable
              onDragStart={() => setDragId(e.id)}
              style={{ ...S.kanbanCard, opacity: dragId === e.id ? 0.5 : 1 }}
            >
              <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:6 }}>
                <Avatar name={e.name} />
                <div>
                  <div style={{ fontSize:13, fontWeight:600 }}>{e.name}</div>
                  <div style={{ fontSize:11, color:t.muted }}>{e.company}</div>
                </div>
              </div>
              <div style={{ fontSize:12, color:t.muted }}>{e.job}</div>
              {e.salary && <div style={{ fontSize:11, color:t.accent, marginTop:4, fontWeight:600 }}>{e.salary}</div>}
              {e.interviewDate && <div style={{ fontSize:11, color:"#f59e0b", marginTop:3 }}>📅 {e.interviewDate}</div>}
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:7, alignItems:"center" }}>
                <span style={{ fontSize:11, color:PRIORITY_STYLE[e.priority]?.color, fontWeight:600 }}>
                  {PRIORITY_STYLE[e.priority]?.label}
                </span>
                <span style={{ fontSize:14 }}>{e.starred ? "⭐" : ""}</span>
              </div>
            </div>
          ))}
          {counts[st] === 0 && <div style={{ textAlign:"center", color:t.muted, fontSize:12, padding:"20px 0" }}>Drop here</div>}
        </div>
      ))}
    </div>
  );
}

function ListView({ filtered, search, setSearch, filter, setFilter, counts, sort, setSort, editId, editData, updE, startEdit, saveEdit, deleteEntry, toggleStar, setEditId, dark, t, S, fileRef, handleFile }) {
  return (
    <div style={S.card}>
      <input style={S.searchInp} placeholder="🔍  Search by name, company, role or contact..." value={search} onChange={e => setSearch(e.target.value)} />

      <div style={S.filterRow}>
        {['All', ...STATUS].map(f => (
          <button key={f} style={S.fBtn(filter===f)} onClick={() => setFilter(f)}>
            {f} <span style={{ opacity:0.5 }}>({counts[f]??0})</span>
          </button>
        ))}
      </div>

      <div style={S.sortRow}>
        <span style={S.sortLbl}>Sort</span>
        <select style={S.sortSel} value={sort} onChange={e => setSort(e.target.value)}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="company">Company A–Z</option>
          <option value="priority">Priority</option>
          <option value="starred">Starred first</option>
        </select>
        <span style={{ ...S.sortLbl, marginLeft:"auto" }}>{filtered.length} result{filtered.length !== 1?"s":""}</span>
      </div>

      {filtered.length === 0 ? (
        <div style={S.empty}>No applications found.</div>
      ) : filtered.map(e => (
        <div key={e.id} style={S.row}>
          <Avatar name={e.name} />
          <div style={{ flex:1, minWidth:0 }}>
            {editId === e.id ? (
              <>
                <FormFields data={editData} onChange={updE} isEdit S={S} t={t} fileRef={fileRef} handleFile={handleFile} />
                <div style={{ display:"flex", gap:8, marginTop:10 }}>
                  <button style={S.saveBtn} onClick={saveEdit}>Save</button>
                  <button style={S.cancelBtn} onClick={() => setEditId(null)}>Cancel</button>
                </div>
              </>
            ) : (
              <>
                <p style={S.rName}>{e.name} {e.starred && "⭐"}</p>
                <p style={S.rMeta}>{e.job} · {e.company}{e.date ? ` · ${e.date}` : ""}</p>
                {e.salary   && <p style={S.rSalary}>💰 {e.salary}</p>}
                {e.contact  && <p style={{ ...S.rNote, fontStyle:"normal" }}>👤 {e.contact}{e.email ? ` · ${e.email}` : ""}</p>}
                {e.interviewDate && <p style={{ ...S.rNote, color:"#f59e0b", fontStyle:"normal" }}>📅 Interview: {e.interviewDate}</p>}
                {e.notes    && <p style={S.rNote}>"{e.notes}"</p>}
                {e.resumeName && <p style={{ ...S.rNote, color:t.accent, fontStyle:"normal" }}>📎 {e.resumeName}</p>}
                {e.priority && (
                  <span style={{ fontSize:11, fontWeight:600, color: PRIORITY_STYLE[e.priority]?.color, marginTop:3, display:"inline-block" }}>
                    {PRIORITY_STYLE[e.priority]?.label} priority
                  </span>
                )}
              </>
            )}
          </div>
          {editId !== e.id && (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6, flexShrink:0 }}>
              <Badge status={e.status} dark={dark} />
              <div style={{ display:"flex", gap:2 }}>
                <button style={S.starBtn(e.starred)} onClick={() => toggleStar(e.id)} title="Star">⭐</button>
                <button style={S.editBtn} onClick={() => startEdit(e)} title="Edit">✏️</button>
                <button style={S.delBtn}  onClick={() => deleteEntry(e.id)} title="Delete">🗑</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Reusable components ──────────────────────────────────────────────────────────────
function Badge({ status, dark }) {
  const st = STATUS_STYLE[status];
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:11, fontWeight:600,
      padding:"3px 10px", borderRadius:20,
      background: dark ? st.dark_bg : st.bg,
      color:      dark ? st.dark_text : st.text }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:st.dot, flexShrink:0 }} />
      {status}
    </span>
  );
}

function Avatar({ name }) {
  return (
    <div style={{ width:38, height:38, borderRadius:"50%", background:avatarColor(name),
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:12, fontWeight:700, color:"#fff", flexShrink:0 }}>
      {initials(name)}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [entries,  setEntries]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [dark,     setDark]     = useState(false);
  const [view,     setView]     = useState("list");      // list | kanban | charts
  const [filter,   setFilter]   = useState("All");
  const [search,   setSearch]   = useState("");
  const [sort,     setSort]     = useState("newest");
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [editId,   setEditId]   = useState(null);
  const [editData, setEditData] = useState({});
  const [dragId,   setDragId]   = useState(null);
  const fileRef                 = useRef();

  const t = getTheme(dark);

  useEffect(() => {
    async function init() {
      try {
        await ensureLoggedIn();
        await loadEntries(setEntries);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // ── Reminder check ──────────────────────────────────────────────────────────
  useEffect(() => {
    const upcoming = getUpcoming(entries);
    if (upcoming.length > 0) {
      // Browser notification if permitted
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, [entries]);

  // ── Form helpers ────────────────────────────────────────────────────────────
  const upd  = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const updE = (k, v) => setEditData(d => ({ ...d, [k]: v }));

  function handleFile(e, setter) {
    const file = e.target.files[0];
    if (file) setter("resumeName", file.name);
  }

  async function addEntry() {
    if (!form.name || !form.company || !form.job) { alert("Fill in name, company & job title."); return; }

    try {
      const formData = new FormData();
      Object.entries(toServerPayload(form)).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formData.append(key, value);
        }
      });
      if (fileRef.current?.files[0]) {
        formData.append('resume', fileRef.current.files[0]);
      }

      const csrf = await getCsrf();
      console.log('CSRF token:', csrf ? csrf.substring(0, 10) + '...' : 'NOT FOUND');
      console.log('Submitting form with data:', toServerPayload(form));

      const res = await fetch(`${API}/api/applications/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRFToken': csrf },
        body: formData,
      });

      console.log('Response status:', res.status);

      if (!res.ok) {
        const text = await res.text();
        console.error(`POST failed: ${res.status}`, text);
        alert(`Error: ${res.status} ${res.statusText}\n\n${text.substring(0, 200)}`);
        return;
      }

      await loadEntries(setEntries);
      setForm(EMPTY_FORM);
      setShowForm(false);
      alert('Application added successfully!');
    } catch (error) {
      console.error('addEntry error:', error);
      alert(`Error: ${error.message}`);
    }
  }

  async function deleteEntry(id) {
    try {
      const csrf = await getCsrf();
      const res = await fetch(`${API}/api/applications/${id}/`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'X-CSRFToken': csrf },
      });
      if (!res.ok) {
        console.error(`DELETE failed: ${res.status}`);
        return;
      }
      await loadEntries(setEntries);
    } catch (error) {
      console.error('deleteEntry error:', error);
    }
  }

  async function toggleStar(id) {
    try {
      const entry = entries.find(e => e.id === id);
      if (!entry) return;
      const csrf = await getCsrf();
      const res = await fetch(`${API}/api/applications/${id}/`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrf },
        body: JSON.stringify({ starred: !entry.starred }),
      });
      if (!res.ok) {
        console.error(`PATCH failed: ${res.status}`);
        return;
      }
      await loadEntries(setEntries);
    } catch (error) {
      console.error('toggleStar error:', error);
    }
  }

  function startEdit(e) { setEditId(e.id); setEditData({ ...e }); }

  async function saveEdit() {
    try {
      const csrf = await getCsrf();
      const res = await fetch(`${API}/api/applications/${editId}/`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrf },
        body: JSON.stringify(toServerPayload(editData)),
      });
      if (!res.ok) {
        console.error(`PUT failed: ${res.status}`);
        alert(`Error: ${res.status} - Could not save changes`);
        return;
      }
      setEditId(null);
      await loadEntries(setEntries);
    } catch (error) {
      console.error('saveEdit error:', error);
      alert(`Error: ${error.message}`);
    }
  }

  // ── Drag & drop (Kanban) ────────────────────────────────────────────────────
  async function onDrop(status) {
    if (dragId == null) return;
    try {
      const csrf = await getCsrf();
      const res = await fetch(`${API}/api/applications/${dragId}/`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrf },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        console.error(`PATCH status failed: ${res.status}`);
        return;
      }
      setDragId(null);
      await loadEntries(setEntries);
    } catch (error) {
      console.error('onDrop error:', error);
    }
  }

  // ── Computed data ───────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    const c = { All: entries.length };
    STATUS.forEach(st => { c[st] = entries.filter(e => e.status === st).length; });
    return c;
  }, [entries]);

  const filtered = useMemo(() => {
    let list = entries.filter(e => {
      const mf = filter === "All" || e.status === filter;
      const q  = search.toLowerCase();
      const ms = !q || [e.name, e.company, e.job, e.contact].some(x => (x||"").toLowerCase().includes(q));
      return mf && ms;
    });
    if (sort === "newest")   list = [...list].sort((a,b) => b.id - a.id);
    if (sort === "oldest")   list = [...list].sort((a,b) => a.id - b.id);
    if (sort === "company")  list = [...list].sort((a,b) => a.company.localeCompare(b.company));
    if (sort === "priority") list = [...list].sort((a,b) => PRIORITY.indexOf(b.priority) - PRIORITY.indexOf(a.priority));
    if (sort === "starred")  list = [...list].sort((a,b) => b.starred - a.starred);
    return list;
  }, [entries, filter, search, sort]);

  const upcoming = useMemo(() => getUpcoming(entries), [entries]);

  // ── Styles ──────────────────────────────────────────────────────────────────
  const S = {
    page:      { minHeight:"100vh", background:t.bg, fontFamily:"'DM Sans','Helvetica Neue',sans-serif", color:t.text, padding:"36px 20px 80px", transition:"background 0.2s,color 0.2s" },
    wrap:      { maxWidth:860, margin:"0 auto" },
    header:    { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:28, flexWrap:"wrap", gap:12 },
    title:     { fontSize:26, fontWeight:700, letterSpacing:"-0.5px", margin:0 },
    subtitle:  { fontSize:13, color:t.muted, marginTop:3 },
    topRight:  { display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" },
    iconBtn:   { background:"none", border:`1px solid ${t.border}`, borderRadius:8, cursor:"pointer", color:t.text, padding:"7px 10px", fontSize:16 },
    mainBtn:   { padding:"9px 18px", background:t.btnBg, color:t.btnText, border:"none", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer" },
    statsRow:  { display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:22 },
    statBox:   { background:t.surface, border:`1px solid ${t.border}`, borderRadius:12, padding:"14px 16px", textAlign:"center", boxShadow:t.shadow },
    statNum:   { fontSize:22, fontWeight:700, lineHeight:1 },
    statLabel: { fontSize:11, color:t.muted, marginTop:4, textTransform:"uppercase", letterSpacing:"0.5px" },
    card:      { background:t.surface, border:`1px solid ${t.border}`, borderRadius:16, padding:"20px 20px 16px", marginBottom:14, boxShadow:t.shadow },
    cardTitle: { fontSize:11, fontWeight:700, letterSpacing:"0.8px", color:t.muted, textTransform:"uppercase", marginBottom:14 },
    grid2:     { display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 },
    grid3:     { display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 },
    field:     { display:"flex", flexDirection:"column", gap:4 },
    lbl:       { fontSize:11, fontWeight:600, color:t.muted, letterSpacing:"0.3px" },
    inp:       { padding:"9px 11px", border:`1px solid ${t.inputBorder}`, borderRadius:8, fontSize:14, background:t.input, outline:"none", color:t.text, width:"100%", boxSizing:"border-box", fontFamily:"inherit" },
    ta:        { padding:"9px 11px", border:`1px solid ${t.inputBorder}`, borderRadius:8, fontSize:14, background:t.input, outline:"none", color:t.text, width:"100%", boxSizing:"border-box", resize:"none", fontFamily:"inherit" },
    addBtn:    { marginTop:14, width:"100%", padding:12, background:t.btnBg, color:t.btnText, border:"none", borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer" },
    viewTabs:  { display:"flex", gap:6, background:t.surface, border:`1px solid ${t.border}`, borderRadius:10, padding:4 },
    viewTab:   (a) => ({ padding:"6px 14px", borderRadius:7, border:"none", background: a ? t.btnBg : "none", color: a ? t.btnText : t.muted, fontSize:13, fontWeight: a ? 600 : 400, cursor:"pointer" }),
    filterRow: { display:"flex", gap:7, marginBottom:12, flexWrap:"wrap" },
    fBtn:      (a) => ({ padding:"6px 13px", borderRadius:20, border: a ? `1.5px solid ${t.pillActive}` : `1px solid ${t.border}`, background: a ? t.pillActive : t.pill, color: a ? t.pillActiveText : t.muted, fontSize:12, fontWeight: a ? 600 : 400, cursor:"pointer" }),
    searchInp: { width:"100%", padding:"10px 13px", border:`1px solid ${t.inputBorder}`, borderRadius:10, fontSize:14, background:t.input, outline:"none", boxSizing:"border-box", marginBottom:10, fontFamily:"inherit", color:t.text },
    sortRow:   { display:"flex", alignItems:"center", gap:8, marginBottom:10 },
    sortLbl:   { fontSize:12, color:t.muted },
    sortSel:   { fontSize:12, border:`1px solid ${t.inputBorder}`, borderRadius:6, padding:"4px 8px", background:t.input, color:t.text, cursor:"pointer" },
    row:       { background:t.surface, border:`1px solid ${t.border}`, borderRadius:12, padding:"13px 15px", marginBottom:8, display:"flex", alignItems:"center", gap:11, boxShadow:t.shadow },
    rName:     { fontSize:15, fontWeight:600, margin:0 },
    rMeta:     { fontSize:13, color:t.muted, margin:"2px 0 0" },
    rNote:     { fontSize:12, color:t.muted, margin:"3px 0 0", fontStyle:"italic" },
    rSalary:   { fontSize:12, color:t.accent, margin:"2px 0 0", fontWeight:600 },
    starBtn:   (on) => ({ background:"none", border:"none", cursor:"pointer", fontSize:17, color: on ? "#f59e0b" : t.inputBorder, padding:"2px 4px" }),
    delBtn:    { background:"none", border:"none", cursor:"pointer", fontSize:14, padding:"4px 6px", color:t.muted },
    editBtn:   { background:"none", border:"none", cursor:"pointer", fontSize:14, padding:"4px 6px", color:t.muted },
    saveBtn:   { padding:"7px 16px", background:t.btnBg, color:t.btnText, border:"none", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" },
    cancelBtn: { padding:"7px 13px", background:"none", color:t.muted, border:`1px solid ${t.border}`, borderRadius:8, fontSize:13, cursor:"pointer" },
    empty:     { textAlign:"center", padding:"36px 0", color:t.muted, fontSize:14 },
    // kanban
    kanban:    { display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, alignItems:"start" },
    kanbanCol: { background:t.kanbanCol, borderRadius:14, padding:12, minHeight:200 },
    kanbanHdr: { fontSize:12, fontWeight:700, letterSpacing:"0.6px", textTransform:"uppercase", color:t.muted, marginBottom:10, display:"flex", justifyContent:"space-between" },
    kanbanCard:{ background:t.surface, border:`1px solid ${t.border}`, borderRadius:10, padding:"11px 13px", marginBottom:8, cursor:"grab", boxShadow:t.shadow },
    // reminder
    reminderBox: { background: dark?"#1a2a1a":"#f0fdf4", border:`1px solid ${dark?"#2a4a2a":"#bbf7d0"}`, borderRadius:12, padding:"12px 16px", marginBottom:14, display:"flex", alignItems:"flex-start", gap:10 },
    // charts
    chartRow:  { display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 },
    chartBox:  { background:t.surface, border:`1px solid ${t.border}`, borderRadius:14, padding:"18px 20px", boxShadow:t.shadow },
    bar:       (w, color) => ({ height:26, width:`${w}%`, background:color, borderRadius:5, display:"flex", alignItems:"center", paddingLeft:8, fontSize:12, fontWeight:600, color:"#fff", minWidth:28, transition:"width 0.4s" }),
    barRow:    { display:"flex", alignItems:"center", gap:10, marginBottom:8 },
    barLabel:  { fontSize:13, color:t.text, minWidth:70 },
    barCount:  { fontSize:12, color:t.muted, marginLeft:"auto" },
    priDot:    (c) => ({ width:10, height:10, borderRadius:"50%", background:c, display:"inline-block", marginRight:6 }),
  };

  if (loading) return (
    <div style={S.page}>
      <div style={S.wrap}>
        <div style={S.card}>
          <div style={S.cardTitle}>Loading…</div>
          <p style={{ color:t.muted, fontSize:13 }}>Connecting to your backend and loading applications.</p>
        </div>
      </div>
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={S.page}>
      <div style={S.wrap}>

        {/* HEADER */}
        <div style={S.header}>
          <div>
            <h1 style={S.title}>Job Tracker</h1>
            <p style={S.subtitle}>{entries.length} application{entries.length !== 1?"s":""} tracked</p>
          </div>
          <div style={S.topRight}>
            <div style={S.viewTabs}>
              {[["list","📋 List"],["kanban","🗂 Board"],["charts","📊 Charts"]].map(([v,l]) => (
                <button key={v} style={S.viewTab(view===v)} onClick={() => setView(v)}>{l}</button>
              ))}
            </div>
            <button style={S.iconBtn} onClick={() => setDark(d => !d)} title="Toggle dark mode">{dark ? "☀️" : "🌙"}</button>
            <button style={S.iconBtn} onClick={() => exportCSV(entries)} title="Export CSV">⬇️ CSV</button>
            <button style={S.mainBtn} onClick={() => setShowForm(v => !v)}>{showForm ? "✕ Close" : "+ New"}</button>
          </div>
        </div>

        {/* STATS */}
        <div style={S.statsRow}>
          {STATUS.map(st => (
            <div key={st} style={S.statBox}>
              <div style={{ ...S.statNum, color: STATUS_STYLE[st].dot }}>{counts[st]}</div>
              <div style={S.statLabel}>{st}</div>
            </div>
          ))}
        </div>

        {/* UPCOMING INTERVIEWS REMINDER */}
        {upcoming.length > 0 && (
          <div style={S.reminderBox}>
            <span style={{ fontSize:20 }}>🔔</span>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color: dark?"#6ee7b7":"#065f46", marginBottom:4 }}>
                Upcoming interview{upcoming.length > 1?"s":""} this week
              </div>
              {upcoming.map(e => (
                <div key={e.id} style={{ fontSize:13, color: dark?"#a7f3d0":"#047857" }}>
                  {e.name} at {e.company} — <strong>{e.interviewDate}</strong>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ADD FORM */}
        {showForm && (
          <div style={S.card}>
            <div style={S.cardTitle}>New Application</div>
            <FormFields data={form} onChange={upd} isEdit={false} S={S} t={t} fileRef={fileRef} handleFile={handleFile} />
            <button style={S.addBtn} onClick={addEntry}>Add Application →</button>
          </div>
        )}

        {/* MAIN VIEW */}
        {view === "list"   && <ListView
          filtered={filtered}
          search={search}
          setSearch={setSearch}
          filter={filter}
          setFilter={setFilter}
          counts={counts}
          sort={sort}
          setSort={setSort}
          editId={editId}
          editData={editData}
          updE={updE}
          startEdit={startEdit}
          saveEdit={saveEdit}
          deleteEntry={deleteEntry}
          toggleStar={toggleStar}
          setEditId={setEditId}
          dark={dark}
          t={t}
          S={S}
          fileRef={fileRef}
          handleFile={handleFile}
        />}
        {view === "kanban" && <KanbanView entries={entries} counts={counts} dragId={dragId} setDragId={setDragId} onDrop={onDrop} S={S} t={t} />}
        {view === "charts" && <ChartsView entries={entries} counts={counts} S={S} t={t} />}

      </div>
    </div>
  );
}
