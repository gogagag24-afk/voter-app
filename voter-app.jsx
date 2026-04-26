import { useState, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────────────────
// STORAGE & HELPERS
// ─────────────────────────────────────────────────────────
const STORAGE_KEY = "voter_polls_v1";
const LOCAL_KEY = "voter_my_votes";

const genId = () => `p_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

async function fetchPolls() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_POLLS;
  } catch {
    return DEFAULT_POLLS;
  }
}

async function pushPolls(polls) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(polls));
  } catch {}
}

function getMyVotes() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}"); } catch { return {}; }
}

function saveMyVote(pollId, choice) {
  try {
    const v = getMyVotes();
    v[pollId] = choice;
    localStorage.setItem(LOCAL_KEY, JSON.stringify(v));
  } catch {}
}

// ─────────────────────────────────────────────────────────
// DEFAULT DATA (სპეისები წაშლილია)
// ─────────────────────────────────────────────────────────
const DEFAULT_POLLS = [
  {
    id: "d1", title: "მხარს უჭერთ საქართველოს ევროკავშირში გაწევრიანებას?",
    description: "ევროინტეგრაცია კონსტიტუციით განმტკიცებული მიზანია.", type: "yes_no",
    options: [], category: "პოლიტიკა", createdAt: new Date(Date.now() - 172800000).toISOString(),
    votes: { "კი": 1247, "არა": 389 }
  },
  {
    id: "d2", title: "საქართველოს ყველაზე მნიშვნელოვანი გამოწვევა",
    description: "რომელია ქვეყნის ყველაზე გადაუდებელი პრობლემა?", type: "multiple",
    options: ["ეკონომიკური განვითარება", "კორუფცია", "სასამართლო სისტემა", "სამუშაო ადგილები", "ჯანდაცვა"],
    category: "საზოგადოება", createdAt: new Date(Date.now() - 86400000).toISOString(),
    votes: { "ეკონომიკური განვითარება": 445, "კორუფცია": 823, "სასამართლო სისტემა": 612, "სამუშაო ადგილები": 398, "ჯანდაცვა": 234 }
  },
  {
    id: "d3", title: "მთავრობის მუშაობის შეფასება",
    description: "1 — ძალიან ცუდი · 5 — ძალიან კარგი", type: "rating",
    options: [], ratingMax: 5, category: "შეფასება",
    createdAt: new Date(Date.now() - 18000000).toISOString(),
    votes: { "1": 567, "2": 412, "3": 289, "4": 134, "5": 67 }
  }
];

const CATEGORIES = ["ყველა", "პოლიტიკა", "საზოგადოება", "შეფასება", "ეკონომიკა", "გარემო", "სხვა"];
const TYPE_LABELS = { yes_no: "კი / არა", multiple: "მრავალი", rating: "შეფასება" };

function totalVotes(poll) { return Object.values(poll.votes || {}).reduce((s, v) => s + v, 0); }
function pct(count, total) { return total === 0 ? 0 : Math.round((count / total) * 100); }
function avgRating(votes) {
  let s = 0, t = 0;
  for (const [k, v] of Object.entries(votes)) { t += v; s += parseInt(k) * v; }
  return t === 0 ? 0 : (s / t).toFixed(1);
}
function timeAgo(d) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000), h = Math.floor(m / 60), days = Math.floor(h / 24);
  if (days > 0) return `${days} დღის წინ`;
  if (h > 0) return `${h} სთ წინ`;
  if (m > 0) return `${m} წთ წინ`;
  return "ახლახანს";
}
function fmt(n) { return n >= 1000 ? (n / 1000).toFixed(1) + "კ" : String(n); }

// ─────────────────────────────────────────────────────────
// DARK THEME CSS (Contributor სტილი)
// ─────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Georgian:wght@400;500;600;700&family=Noto+Serif+Georgian:wght@400;700;800&family=IBM+Plex+Mono:wght@400;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#0a0a0a;--surface:#1f2937;--border:#374151;--border2:#4b5563;
  --text:#f9fafb;--muted:#9ca3af;--primary:#e8a020;--primary-bg:rgba(232,160,32,.12);
  --yes:#10b981;--yes-bg:rgba(16,185,129,.12);--no:#ef4444;--no-bg:rgba(239,68,68,.12);
  --purple:#8b5cf6;--purple-bg:rgba(139,92,246,.12);
  --radius:12px;--shadow:0 4px 12px rgba(0,0,0,.4);
}
body{background:var(--bg);color:var(--text);font-family:'Noto Sans Georgian',sans-serif;min-height:100vh}
.app{min-height:100vh;display:flex;flex-direction:column}
.nav{background:var(--surface);border-bottom:1px solid var(--border);padding:0 20px;height:60px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:50}
.logo{font-family:'IBM Plex Mono',sans-serif;font-size:20px;font-weight:700;color:var(--text);cursor:pointer;display:flex;flex-direction:column;align-items:flex-start;gap:2px}
.logo span{font-weight:700;letter-spacing:.02em}
.logo em{color:var(--primary);font-style:normal;font-weight:400;font-size:11px}
.btn{display:inline-flex;align-items:center;gap:6px;padding:9px 18px;border-radius:8px;border:none;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap}
.btn:disabled{opacity:.45;cursor:not-allowed}
.btn-primary{background:var(--primary);color:#0a0a0a}
.btn-primary:not(:disabled):hover{background:#d49018}
.btn-ghost{background:transparent;color:var(--muted);border:1px solid var(--border)}
.btn-ghost:hover{color:var(--text);border-color:var(--border2);background:var(--surface)}
.btn-lg{padding:13px 28px;font-size:16px;border-radius:10px}
.btn-sm{padding:7px 14px;font-size:13px}
.btn-yes{background:var(--yes-bg);color:var(--yes);border:1.5px solid var(--yes)}
.btn-yes:hover,.btn-yes.sel{background:var(--yes);color:#fff}
.btn-no{background:var(--no-bg);color:var(--no);border:1.5px solid var(--no)}
.btn-no:hover,.btn-no.sel{background:var(--no);color:#fff}
.main{flex:1;max-width:1080px;margin:0 auto;width:100%;padding:32px 20px}
.hero{text-align:center;padding:48px 0 40px}
.hero-badge{display:inline-flex;align-items:center;gap:6px;background:var(--primary-bg);color:var(--primary);border:1px solid rgba(232,160,32,.2);border-radius:100px;padding:5px 14px;font-size:12px;font-weight:600;letter-spacing:.5px;margin-bottom:16px;text-transform:uppercase}
.hero h1{font-family:'Noto Serif Georgian',serif;font-size:clamp(28px,5vw,50px);font-weight:700;line-height:1.15;letter-spacing:-1px;margin-bottom:14px}
.hero h1 em{color:var(--primary);font-style:normal}
.hero p{color:var(--muted);font-size:16px;max-width:440px;margin:0 auto 28px;line-height:1.6}
.stats{display:flex;gap:0;justify-content:center;margin-bottom:40px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden}
.stat{flex:1;text-align:center;padding:18px 12px;border-right:1px solid var(--border)}
.stat:last-child{border-right:none}
.stat-num{font-family:'IBM Plex Mono',sans-serif;font-size:26px;font-weight:700;color:var(--text)}
.stat-label{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-top:2px}
.filters{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:24px}
.chip{padding:6px 16px;border-radius:100px;border:1px solid var(--border);background:var(--surface);color:var(--muted);font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;transition:all .15s}
.chip:hover,.chip.active{background:var(--primary-bg);border-color:rgba(232,160,32,.3);color:var(--primary)}
.search{margin-left:auto;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:8px 14px;color:var(--text);font-family:inherit;font-size:14px;width:200px;outline:none;transition:border-color .15s}
.search:focus{border-color:var(--primary)}
.search::placeholder{color:var(--muted)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}
.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:22px;cursor:pointer;transition:all .2s;display:flex;flex-direction:column;gap:14px;position:relative}
.card:hover{border-color:var(--primary);box-shadow:var(--shadow);transform:translateY(-2px)}
.card-top{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
.type-badge{padding:3px 10px;border-radius:100px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;white-space:nowrap}
.tb-yes_no{background:var(--yes-bg);color:var(--yes)}
.tb-multiple{background:var(--primary-bg);color:var(--primary)}
.tb-rating{background:var(--purple-bg);color:var(--purple)}
.voted-chip{font-size:11px;color:var(--yes);font-weight:600;display:flex;align-items:center;gap:4px}
.card h3{font-size:15px;font-weight:600;line-height:1.45;font-family:'Noto Serif Georgian',serif}
.card p{font-size:13px;color:var(--muted);line-height:1.5}
.mini-bar{height:3px;background:var(--border);border-radius:2px;overflow:hidden;margin-top:4px}
.mini-fill{height:100%;background:var(--primary);border-radius:2px;transition:width .6s ease}
.card-footer{display:flex;align-items:center;justify-content:space-between;margin-top:auto;font-size:12px;color:var(--muted)}
.card-footer strong{font-size:14px;font-weight:700;color:var(--text);font-family:'IBM Plex Mono',sans-serif}
.detail{max-width:680px;margin:0 auto}
.back-btn{display:inline-flex;align-items:center;gap:4px;color:var(--muted);font-size:14px;cursor:pointer;border:none;background:none;font-family:inherit;padding:0;margin-bottom:28px;transition:color .15s}
.back-btn:hover{color:var(--text)}
.poll-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px}
.detail h2{font-family:'Noto Serif Georgian',serif;font-size:clamp(20px,4vw,30px);font-weight:700;line-height:1.25;letter-spacing:-.5px;margin-bottom:10px}
.detail-desc{color:var(--muted);font-size:15px;line-height:1.6;margin-bottom:28px}
.panel{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:24px;margin-bottom:16px}
.panel-title{font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:18px}
.yn-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.yn-btn{padding:18px;border-radius:10px;font-family:'IBM Plex Mono',sans-serif;font-size:18px;font-weight:700;cursor:pointer;transition:all .15s;text-align:center}
.choices{display:flex;flex-direction:column;gap:8px}
.choice-item{display:flex;align-items:center;gap:10px;padding:13px 16px;border-radius:10px;border:1.5px solid var(--border);background:transparent;font-family:inherit;font-size:14px;font-weight:500;cursor:pointer;transition:all .15s;color:var(--text);text-align:left}
.choice-item:hover{border-color:var(--primary);background:var(--primary-bg)}
.choice-item.sel{border-color:var(--primary);background:var(--primary-bg);color:var(--primary)}
.choice-dot{width:16px;height:16px;border-radius:50%;border:1.5px solid currentColor;flex-shrink:0;display:flex;align-items:center;justify-content:center}
.choice-dot.filled::after{content:'';width:7px;height:7px;border-radius:50%;background:currentColor;display:block}
.rating-row{display:flex;gap:10px;flex-wrap:wrap}
.r-btn{width:52px;height:52px;border-radius:10px;border:1.5px solid var(--border);background:transparent;font-family:'IBM Plex Mono',sans-serif;font-size:18px;font-weight:700;cursor:pointer;transition:all .15s;color:var(--text);display:flex;align-items:center;justify-content:center}
.r-btn:hover{border-color:var(--purple);color:var(--purple);background:var(--purple-bg)}
.r-btn.sel{border-color:var(--purple);background:var(--purple);color:#fff}
.rating-hints{display:flex;justify-content:space-between;margin-top:8px;font-size:11px;color:var(--muted)}
.vote-btn-row{margin-top:20px}
.already-voted{display:flex;align-items:center;gap:8px;background:var(--yes-bg);border:1px solid rgba(16,185,129,.25);color:var(--yes);padding:11px 14px;border-radius:8px;font-size:14px;font-weight:500;margin-bottom:16px}
.res-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}
.res-header .panel-title{margin-bottom:0}
.total-label{font-family:'IBM Plex Mono',sans-serif;font-size:16px;font-weight:700;color:var(--text)}
.avg-box{background:var(--purple-bg);border-radius:10px;padding:16px;text-align:center;margin-bottom:20px}
.avg-num{font-family:'IBM Plex Mono',sans-serif;font-size:40px;font-weight:700;color:var(--purple)}
.avg-sub{font-size:12px;color:var(--muted);margin-top:4px}
.res-row{margin-bottom:16px}
.res-row:last-child{margin-bottom:0}
.res-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
.res-label{font-size:14px;font-weight:500;color:var(--text);display:flex;align-items:center;gap:6px}
.my-dot{width:7px;height:7px;border-radius:50%;background:var(--primary);flex-shrink:0}
.res-pct{font-family:'IBM Plex Mono',sans-serif;font-size:15px;font-weight:700;color:var(--text)}
.bar-track{height:7px;background:var(--border);border-radius:4px;overflow:hidden}
.bar-fill{height:100%;border-radius:4px;transition:width .8s cubic-bezier(.4,0,.2,1)}
.res-count{font-size:12px;color:var(--muted);margin-top:4px}
.create-page{max-width:640px;margin:0 auto}
.page-h{font-family:'Noto Serif Georgian',serif;font-size:28px;font-weight:700;letter-spacing:-.5px;margin-bottom:6px}
.page-sub{color:var(--muted);font-size:15px;margin-bottom:32px}
.fg{margin-bottom:22px}
.label{display:block;font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:7px}
.inp,.ta,.sel{width:100%;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:11px 14px;color:var(--text);font-family:inherit;font-size:15px;outline:none;transition:border-color .15s;appearance:none}
.inp:focus,.ta:focus,.sel:focus{border-color:var(--primary)}
.inp::placeholder,.ta::placeholder{color:var(--muted)}
.ta{resize:vertical;min-height:75px}
.type-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.type-opt{padding:14px 10px;border-radius:10px;border:1.5px solid var(--border);background:transparent;font-family:inherit;cursor:pointer;transition:all .15s;text-align:center}
.type-opt:hover{border-color:var(--border2)}
.type-opt.sel{border-color:var(--primary);background:var(--primary-bg)}
.type-icon{font-size:20px;margin-bottom:5px}
.type-name{font-size:13px;font-weight:600;color:var(--text)}
.type-hint{font-size:11px;color:var(--muted);margin-top:2px}
.opt-list{display:flex;flex-direction:column;gap:8px}
.opt-row{display:flex;gap:8px;align-items:center}
.opt-row .inp{margin:0;flex:1}
.rm-btn{width:34px;height:34px;border-radius:7px;border:1px solid var(--border);background:transparent;color:var(--muted);font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s}
.rm-btn:hover{border-color:var(--no);color:var(--no)}
.add-opt{display:flex;align-items:center;justify-content:center;gap:6px;color:var(--primary);background:none;border:1px dashed rgba(232,160,32,.4);border-radius:8px;padding:10px 16px;font-family:inherit;font-size:14px;font-weight:500;cursor:pointer;width:100%;transition:all .15s}
.add-opt:hover{background:var(--primary-bg)}
.form-actions{display:flex;gap:10px;justify-content:flex-end;padding-top:4px}
.empty{text-align:center;padding:60px 20px;color:var(--muted)}
.empty-icon{font-size:44px;margin-bottom:14px}
.empty h3{color:var(--text);margin-bottom:6px;font-size:18px}
.toast{position:fixed;bottom:20px;right:20px;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:13px 18px;font-size:14px;font-weight:500;display:flex;align-items:center;gap:8px;z-index:200;box-shadow:var(--shadow);animation:toastIn .3s ease}
@keyframes toastIn{from{transform:translateX(110%);opacity:0}to{transform:translateX(0);opacity:1}}
.skel{background:linear-gradient(90deg,var(--border) 0%,#2d3748 50%,var(--border) 100%);background-size:200%;animation:sk 1.4s infinite;border-radius:var(--radius)}
@keyframes sk{0%{background-position:200%}100%{background-position:-200%}}
@media(max-width:600px){
  .grid{grid-template-columns:1fr}
  .type-grid{grid-template-columns:1fr}
  .stats{flex-wrap:wrap}
  .stat{min-width:100px}
  .search{width:140px}
}
`;

// ─────────────────────────────────────────────────────────
// MAIN APP COMPONENT
// ─────────────────────────────────────────────────────────
const ADMIN_PASSWORD = "admin123";
const ADMIN_SESSION_KEY = "voter_admin";

export default function VoterApp() {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("home");
  const [activePoll, setActivePoll] = useState(null);
  const [cat, setCat] = useState("ყველა");
  const [search, setSearch] = useState("");
  const [myVotes, setMyVotes] = useState(getMyVotes());
  const [toast, setToast] = useState(null);
const [isAdmin, setIsAdmin] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem(ADMIN_SESSION_KEY) === "true";
  });

  const isAdminRoute = typeof window !== "undefined" && window.location.pathname.startsWith("/admin");

  useEffect(() => {
    fetchPolls().then(p => { setPolls(p); setLoading(false); });
  }, []);

  const notify = (msg) => {
    setToast({ msg });
    setTimeout(() => setToast(null), 3000);
  };

  const persist = async (updated) => {
    setPolls(updated);
    await pushPolls(updated);
  };

  const handleVote = useCallback(async (pollId, choice) => {
    if (myVotes[pollId] !== undefined) return;
    const updated = polls.map(p => {
      if (p.id !== pollId) return p;
      return { ...p, votes: { ...p.votes, [choice]: (p.votes[choice] || 0) + 1 } };
    });
    saveMyVote(pollId, choice);
    const fresh = getMyVotes();
    setMyVotes(fresh);
    if (activePoll?.id === pollId) setActivePoll(updated.find(p => p.id === pollId));
    await persist(updated);
    notify("✓ ხმა ჩაირიცხა!");
  }, [polls, activePoll, myVotes]);

  const handleCreate = async (data) => {
    const voteInit = {};
    if (data.type === "yes_no") { voteInit["კი"] = 0; voteInit["არა"] = 0; }
    else if (data.type === "multiple") data.options.forEach(o => { voteInit[o] = 0; });
    else for (let i = 1; i <= (data.ratingMax || 5); i++) voteInit[String(i)] = 0;
    const newPoll = { id: genId(), ...data, createdAt: new Date().toISOString(), votes: voteInit };
    await persist([newPoll, ...polls]);
    notify("✓ კენჭისყრა გამოქვეყნდა!");
    setView("home");
  };

  const filtered = polls.filter(p => {
    if (cat !== "ყველა" && p.category !== cat) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const allVotes = polls.reduce((s, p) => s + totalVotes(p), 0);

  if (isAdminRoute) {
    if (!isAdmin) {
      return <AdminLogin onLogin={(success) => { if(success) setIsAdmin(true); window.location.href="/admin"; }} />;
    }
    return <AdminPanel polls={polls} onCreate={handleCreate} onLogout={() => { window.sessionStorage.removeItem(ADMIN_SESSION_KEY); setIsAdmin(false); window.location.href="/"; }} />;
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        <nav className="nav">
          <div className="logo" onClick={() => setView("home")}>
            <span>🗳 VOTER</span>
            <em>საჯარო კენჭისყრა</em>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {view !== "home" && <button className="btn btn-ghost btn-sm" onClick={() => setView("home")}>← მთავარი</button>}
          </div>
        </nav>

        <main className="main">
          {view === "home" && (
            <HomePage polls={filtered} allPolls={polls} loading={loading} cat={cat} setCat={setCat}
              search={search} setSearch={setSearch} myVotes={myVotes} allVotes={allVotes}
              onOpen={p => { setActivePoll(p); setView("poll"); }}
              onCreateClick={() => setView("create")} />
          )}
          {view === "poll" && activePoll && (
            <PollDetail poll={activePoll} myVote={myVotes[activePoll.id]}
              onBack={() => setView("home")} onVote={handleVote} />
          )}
          {view === "create" && (
            <CreatePage onBack={() => setView("home")} onSubmit={handleCreate} />
          )}
        </main>

        {toast && (
          <div className="toast">
            <span style={{ color: "var(--primary)", fontSize: 16 }}>●</span> {toast.msg}
          </div>
        )}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────
function HomePage({ polls, allPolls, loading, cat, setCat, search, setSearch, myVotes, allVotes, onOpen, onCreateClick }) {
  return (
    <>
      <div className="hero">
        <div className="hero-badge">🔓 რეგისტრაციის გარეშე</div>
        <h1>გამოხატე შენი <em>პოზიცია</em></h1>
        <p>ღია პლატფორმა — ყოველი ხმა ანონიმურია, ყოველი ხმა ითვლება.</p>
      </div>

      <div className="stats">
        <div className="stat"><div className="stat-num">{allPolls.length}</div><div className="stat-label">კენჭისყრა</div></div>
        <div className="stat"><div className="stat-num">{fmt(allVotes)}</div><div className="stat-label">ხმა სულ</div></div>
        <div className="stat"><div className="stat-num">{Object.keys(myVotes).length}</div><div className="stat-label">ჩემი ხმა</div></div>
      </div>

      <div className="filters">
        {CATEGORIES.map(c => (
          <button key={c} className={`chip ${cat === c ? "active" : ""}`} onClick={() => setCat(c)}>{c}</button>
        ))}
        <input className="search" placeholder="ძებნა..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="grid">{[1, 2, 3].map(i => <div key={i} className="skel" style={{ height: 200 }} />)}</div>
      ) : polls.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🗳</div>
          <h3>კენჭისყრა ვერ მოიძებნა</h3>
          <p>სცადეთ სხვა კატეგორია ან შექმენით ახალი</p>
        </div>
      ) : (
        <div className="grid">
          {polls.map(p => <PollCard key={p.id} poll={p} voted={myVotes[p.id] !== undefined} onClick={() => onOpen(p)} />)}
        </div>
      )}
    </>
  );
}

function PollCard({ poll, voted, onClick }) {
  const t = totalVotes(poll);
  const top = Object.entries(poll.votes).sort((a, b) => b[1] - a[1])[0];
  const topPct = top ? pct(top[1], t) : 0;
  return (
    <div className="card" onClick={onClick}>
      <div className="card-top">
        <span className={`type-badge tb-${poll.type}`}>{TYPE_LABELS[poll.type]}</span>
        {voted && <span className="voted-chip">✓ ხმა მიცემულია</span>}
      </div>
      <h3>{poll.title}</h3>
      {poll.description && <p>{poll.description}</p>}
      {t > 0 && (
        <div className="mini-bar">
          <div className="mini-fill" style={{ width: `${topPct}%` }} />
        </div>
      )}
      <div className="card-footer">
        <strong>{fmt(t)} ხმა</strong>
        <span style={{ display: "flex", gap: 8 }}>{poll.category} · {timeAgo(poll.createdAt)}</span>
      </div>
    </div>
  );
}

function PollDetail({ poll, myVote, onBack, onVote }) {
  const [sel, setSel] = useState(null);
  const [localPoll, setLocalPoll] = useState(poll);
  const voted = myVote !== undefined;

  useEffect(() => { setLocalPoll(poll); }, [poll]);

  const submit = () => {
    if (!sel || voted) return;
    const nv = { ...localPoll.votes, [sel]: (localPoll.votes[sel] || 0) + 1 };
    setLocalPoll(p => ({ ...p, votes: nv }));
    onVote(poll.id, sel);
  };

  const t = totalVotes(localPoll);
  const options = poll.type === "yes_no" ? ["კი", "არა"]
    : poll.type === "multiple" ? poll.options
      : Array.from({ length: poll.ratingMax || 5 }, (_, i) => String(i + 1));

  const barColor = (opt) => {
    if (poll.type === "yes_no") return opt === "კი" ? "var(--yes)" : "var(--no)";
    if (poll.type === "rating") return "var(--purple)";
    return "var(--primary)";
  };

  return (
    <div className="detail">
      <button className="back-btn" onClick={onBack}>← უკან</button>
      <div className="poll-meta">
        <span className={`type-badge tb-${poll.type}`}>{TYPE_LABELS[poll.type]}</span>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>{poll.category}</span>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>{timeAgo(poll.createdAt)}</span>
      </div>
      <h2>{poll.title}</h2>
      {poll.description && <p className="detail-desc">{poll.description}</p>}

      {!voted ? (
        <div className="panel">
          <div className="panel-title">მიეცი ხმა</div>
          {poll.type === "yes_no" && (
            <div className="yn-row">
              <button className={`yn-btn btn-yes ${sel === "კი" ? "sel" : ""}`} onClick={() => setSel("კი")}>✓ კი</button>
              <button className={`yn-btn btn-no ${sel === "არა" ? "sel" : ""}`} onClick={() => setSel("არა")}>✕ არა</button>
            </div>
          )}
          {poll.type === "multiple" && (
            <div className="choices">
              {poll.options.map(opt => (
                <button key={opt} className={`choice-item ${sel === opt ? "sel" : ""}`} onClick={() => setSel(opt)}>
                  <span className={`choice-dot ${sel === opt ? "filled" : ""}`} />
                  {opt}
                </button>
              ))}
            </div>
          )}
          {poll.type === "rating" && (
            <div>
              <div className="rating-row">
                {options.map(n => (
                  <button key={n} className={`r-btn ${sel === n ? "sel" : ""}`} onClick={() => setSel(n)}>{n}</button>
                ))}
              </div>
              <div className="rating-hints"><span>ძალიან ცუდი</span><span>ძალიან კარგი</span></div>
            </div>
          )}
          <div className="vote-btn-row">
            <button className="btn btn-primary btn-lg" disabled={!sel} onClick={submit} style={{ width: "100%" }}>ხმის მიცემა</button>
          </div>
        </div>
      ) : (
        <div className="already-voted">
          ✓ თქვენ უკვე მიგიცია ხმა{myVote ? ` — „${myVote}"` : ""}
        </div>
      )}

      <div className="panel">
        <div className="res-header">
          <div className="panel-title">შედეგები</div>
          <div className="total-label">{fmt(t)} ხმა</div>
        </div>
        {poll.type === "rating" && (
          <div className="avg-box">
            <div className="avg-num">{avgRating(localPoll.votes)}</div>
            <div className="avg-sub">საშუალო შეფასება / {poll.ratingMax || 5}</div>
          </div>
        )}
        {options.map(opt => {
          const count = localPoll.votes[opt] || 0;
          const p = pct(count, t);
          const isMe = myVote === opt || sel === opt;
          return (
            <div key={opt} className="res-row">
              <div className="res-top">
                <span className="res-label">
                  {isMe && <span className="my-dot" title="ჩემი ხმა" />}
                  {poll.type === "rating" ? `${opt} ★` : opt}
                </span>
                <span className="res-pct">{p}%</span>
              </div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${p}%`, background: barColor(opt) }} />
              </div>
              <div className="res-count">{count} ხმა</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// ADMIN COMPONENTS
// ─────────────────────────────────────────────────────────
function AdminLogin({ onLogin }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const getPassword = () => localStorage.getItem("voter_admin_password") || ADMIN_PASSWORD;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password !== getPassword()) {
      setError("პაროლი არასწორია");
      return;
    }
    window.sessionStorage.setItem(ADMIN_SESSION_KEY, "true");
    onLogin(true);
  };

  return (
    <div className="app">
      <style>{CSS}</style>
      <div className="main" style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "32px", width: "100%", maxWidth: "400px" }}>
          <h2 style={{ fontFamily: "'Noto Serif Georgian',serif", marginBottom: "8px", fontSize: "24px" }}>შესვლა</h2>
          <p style={{ color: "var(--muted)", marginBottom: "24px", fontSize: "14px" }}>შეიყვანე პაროლი</p>
          <form onSubmit={handleSubmit}>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="პაროლი" style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "8px", padding: "12px", color: "var(--text)", fontSize: "16px", marginBottom: "16px" }} />
            {error && <p style={{ color: "var(--no)", fontSize: "13px", marginBottom: "16px" }}>{error}</p>}
            <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>შესვლა</button>
          </form>
          <a href="/" style={{ display: "block", textAlign: "center", marginTop: "16px", color: "var(--muted)", fontSize: "14px" }}>← მთავარ გვერდზე</a>
        </div>
      </div>
    </div>
  );
}

function AdminPanel({ polls, onCreate, onLogout }) {
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");

  const handlePasswordChange = (e) => {
    e.preventDefault();
    if (currentPassword !== ADMIN_PASSWORD) {
      setPasswordMsg("ძირნი პაროლი არასწორია");
      return;
    }
    if (newPassword.length < 4) {
      setPasswordMsg("პაროლი უნდა იყოს მინიმუმ 4 სიმბოლო");
      return;
    }
    localStorage.setItem("voter_admin_password", newPassword);
    setPasswordMsg("✓ პაროლი შეცვლილია");
    setCurrentPassword("");
    setNewPassword("");
    setTimeout(() => setShowPasswordChange(false), 1500);
  };

  return (
    <div className="app">
      <style>{CSS}</style>
      <nav className="nav">
        <div className="logo"><span>🗳 VOTER</span></div>
        <div style={{ display: "flex", gap: 8 }}>
          <a href="/" className="btn btn-ghost btn-sm">მთავარი</a>
          <button onClick={() => setShowPasswordChange(true)} className="btn btn-ghost btn-sm">პაროლი</button>
          <button onClick={onLogout} className="btn btn-ghost btn-sm">გამოსვლა</button>
        </div>
      </nav>
      <div className="main">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
          <div>
            </div>
        </div>
        <CreatePage onBack={() => {}} onSubmit={onCreate} />
      </div>

      {showPasswordChange && (
        <div className="modal-backdrop" onClick={() => setShowPasswordChange(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "24px", width: "100%", maxWidth: "360px" }}>
            <h3 style={{ marginBottom: "16px" }}>პაროლის შეცვლა</h3>
            <form onSubmit={handlePasswordChange}>
              <input type="password" placeholder="ძირნი პაროლი" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "8px", padding: "10px", color: "var(--text)", marginBottom: "12px" }} />
              <input type="password" placeholder="ახალი პაროლი" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "8px", padding: "10px", color: "var(--text)", marginBottom: "12px" }} />
              {passwordMsg && <p style={{ color: passwordMsg.includes("✓") ? "var(--yes)" : "var(--no)", fontSize: "13px", marginBottom: "12px" }}>{passwordMsg}</p>}
              <div style={{ display: "flex", gap: "8px" }}>
                <button type="button" onClick={() => setShowPasswordChange(false)} className="btn btn-ghost" style={{ flex: 1 }}>გაუქმება</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>შენახვა</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function CreatePage({ onBack, onSubmit }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [type, setType] = useState("yes_no");
  const [cat, setCat] = useState("პოლიტიკა");
  const [opts, setOpts] = useState(["", ""]);
  const valid = title.trim() && (type !== "multiple" || opts.filter(o => o.trim()).length >= 2);

  const submit = () => {
    if (!valid) return;
    onSubmit({
      title: title.trim(), description: desc.trim(), type, category: cat,
      options: type === "multiple" ? opts.filter(o => o.trim()) : [],
      ratingMax: type === "rating" ? 5 : undefined
    });
  };

  return (
    <div className="create-page">
      <button className="back-btn" onClick={onBack}>← უკან</button>
      <h1 className="page-h">ახალი კენჭისყრა</h1>
      <p className="page-sub">შეავსეთ ფორმა — კენჭისყრა ხელმისაწვდომი იქნება ყველასთვის</p>

      <div className="fg">
        <label className="label">სათაური *</label>
        <input className="inp" placeholder="მაგ: მხარს უჭერთ..." value={title} onChange={e => setTitle(e.target.value)} maxLength={200} />
      </div>

      <div className="fg">
        <label className="label">აღწერა (არასავალდებულო)</label>
        <textarea className="ta" placeholder="დამატებითი ინფორმაცია..." value={desc} onChange={e => setDesc(e.target.value)} />
      </div>

      <div className="fg">
        <label className="label">ტიპი *</label>
        <div className="type-grid">
          {[
            { id: "yes_no", icon: "✓✕", name: "კი / არა", hint: "ორი ვარიანტი" },
            { id: "multiple", icon: "≡", name: "მრავალი", hint: "2–8 ვარიანტი" },
            { id: "rating", icon: "★", name: "შეფასება", hint: "1-დან 5-მდე" }
          ].map(t => (
            <button key={t.id} className={`type-opt ${type === t.id ? "sel" : ""}`} onClick={() => setType(t.id)}>
              <div className="type-icon">{t.icon}</div>
              <div className="type-name">{t.name}</div>
              <div className="type-hint">{t.hint}</div>
            </button>
          ))}
        </div>
      </div>

      {type === "multiple" && (
        <div className="fg">
          <label className="label">ვარიანტები *</label>
          <div className="opt-list">
            {opts.map((o, i) => (
              <div key={i} className="opt-row">
                <input className="inp" placeholder={`ვარიანტი ${i + 1}`} value={o} onChange={e => setOpts(arr => arr.map((v, idx) => idx === i ? e.target.value : v))} />
                {opts.length > 2 && (
                  <button className="rm-btn" onClick={() => setOpts(arr => arr.filter((_, idx) => idx !== i))}>×</button>
                )}
              </div>
            ))}
            {opts.length < 8 && (
              <button className="add-opt" onClick={() => setOpts(a => [...a, ""])}>+ ვარიანტის დამატება</button>
            )}
          </div>
        </div>
      )}

      <div className="fg">
        <label className="label">კატეგორია</label>
        <select className="sel" value={cat} onChange={e => setCat(e.target.value)}>
          {CATEGORIES.filter(c => c !== "ყველა").map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="form-actions">
        <button className="btn btn-ghost" onClick={onBack}>გაუქმება</button>
        <button className="btn btn-primary btn-lg" disabled={!valid} onClick={submit}>გამოქვეყნება →</button>
      </div>
    </div>
  );
}