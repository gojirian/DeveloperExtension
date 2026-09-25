const { useTweaks, TweaksPanel, TweakSection, TweakSlider, TweakRadio, TweakColor } = window;
const D = window.GMAIL_DATA, GI = window.GI;

const GMAIL_TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "edgeScheme": ["#151c24", "#1f2933", "#28333f", "#232e39"],
  "tasksTone": "dark",
  "colHeaders": "dark",
  "zebra": 4,
  "compose": "yellow"
}/*EDITMODE-END*/;

function Sidebar({ compose }) {
  return (
    <nav className="sidebar">
      <button className={"compose " + (compose === "yellow" ? "compose-yellow" : "compose-subtle")}>
        {GI.pencil}<span>Compose</span>
      </button>
      <div className="nav-list">
        {D.nav.map((n) => (
          <a key={n.name} className={"nav-item" + (n.active ? " active" : "") + (n.indent ? " indent" : "")} href="#">
            <span className="nav-ico">{n.name === "Inbox" ? GI.mail : n.name === "Starred" ? GI.star(false) : n.name === "More" || n.name === "Categories" ? GI.chev() : GI.label()}</span>
            <span className="nav-name">{n.name}</span>
            {n.count ? <span className={"nav-count" + (n.active ? " hot" : "")}>{n.count}</span> : null}
          </a>
        ))}
      </div>
      <div className="lbl-head"><span>Labels</span><span className="lbl-plus">+</span></div>
      <div className="nav-list">
        {D.labels.map((g) => (
          <React.Fragment key={g.name}>
            <a className="nav-item" href="#"><span className="nav-ico">{GI.chev()}</span><span className="nav-ico">{GI.label("var(--accent)")}</span><span className="nav-name">{g.name}</span></a>
            {g.children.map((c) => (
              <a key={c} className="nav-item indent" href="#"><span className="nav-ico">{GI.label()}</span><span className="nav-name">{c}</span></a>
            ))}
          </React.Fragment>
        ))}
      </div>
    </nav>
  );
}

function TopBar() {
  return (
    <header className="topbar">
      <span className="tb-burger">{GI.menu}</span>
      <span className="tb-logo">M</span>
      <span className="tb-brand">Gmail</span>
      <div className="searchbox">
        {GI.search}
        <span className="search-ph">Search mail</span>
        <span className="search-tune">{GI.tune}</span>
      </div>
      <div className="tb-right">
        <span className="tb-active"><span className="dot"></span>Active {GI.chev()}</span>
        <span className="tb-ico">{GI.help}</span>
        <span className="tb-ico">{GI.gear}</span>
        <span className="tb-ico">{GI.spark}</span>
        <span className="tb-ico">{GI.grid}</span>
        <span className="tb-org">Luminate<b>one</b></span>
        <span className="tb-avatar">N</span>
      </div>
    </header>
  );
}

function ColHeader({ title, range }) {
  return (
    <div className="col-head">
      <span className="ch-ico">{GI.chev("up")}</span>
      <span className="ch-title">{title}</span>
      <span className="ch-range">{range}</span>
      <span className="ch-ico dim">{GI.arrow("left")}</span>
      <span className="ch-ico dim">{GI.arrow()}</span>
    </div>
  );
}

function MiniRail() {
  return (
    <div className="minirail">
      <div className="mr-item active"><span className="mr-badge">29</span>{GI.mail}<span>Mail</span></div>
      <div className="mr-item">{GI.chat}<span>Chat</span></div>
      <div className="mr-item">{GI.video}<span>Meet</span></div>
      <div className="mr-spacer"></div>
      <div className="mr-avatar"></div>
    </div>
  );
}

function TasksPanel({ tone }) {
  return (
    <aside className={"tasks " + (tone === "dark" ? "tasks-dark" : "tasks-light")}>
      <div className="tasks-head">
        <div>
          <div className="tasks-kicker">Tasks</div>
          <div className="tasks-title">My Tasks {GI.chev()}</div>
        </div>
        <div className="tasks-head-icons">{GI.openNew}{GI.close}</div>
      </div>
      <div className="tasks-add">{GI.check}<span>Add a task</span><span className="grow"></span>{GI.more}</div>
      <div className="tasks-list">
        {D.tasks.map((t, i) => (
          <div key={i} className="task">
            <span className="task-circle"></span>
            <div className="task-body">
              <div className="task-text">{t.text}</div>
              {t.link ? <a className="task-link" href="#">{t.link}</a> : null}
              <div className="task-meta">
                {t.due ? <span className="task-due">{GI.clock}{t.due}</span> : null}
                <span className="task-mico">{t.comment ? GI.comment : GI.mail}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

function AppRail() {
  return (
    <div className="apprail">
      <span className="ar-badge">31</span>
      <span className="ar-dot a"></span><span className="ar-dot b"></span><span className="ar-dot c"></span><span className="ar-dot d"></span>
      <span className="ar-plus">+</span>
    </div>
  );
}

function App() {
  const [t, setTweak] = useTweaks(GMAIL_TWEAK_DEFAULTS);
  const [rail, side, top, panel] = t.edgeScheme;
  const vars = {
    "--rail": rail, "--side": side, "--top": top, "--panel": panel,
    "--zebra-a": `rgba(31, 41, 51, ${t.zebra * 0.011})`,
  };
  return (
    <div className={"app colheads-" + t.colHeaders} style={vars}>
      <TopBar />
      <div className="body">
        <MiniRail />
        <Sidebar compose={t.compose} />
        <main className="content">
          <div className="toolbar">
            <Checkbox /><span className="tb2-ico">{GI.chev()}</span>
            <span className="tb2-ico">{GI.refresh}</span>
            <span className="tb2-ico">{GI.more}</span>
          </div>
          <div className="cols">
            <section className="col">
              <ColHeader title="Inbox" range="1–50 of 318" />
              <div className="rows">
                {D.inbox.map((r, i) => <MailRow key={i} row={r} idx={i} />)}
              </div>
            </section>
            <section className="col">
              {D.sections.map((s) => (
                <React.Fragment key={s.title}>
                  <ColHeader title={s.title} range={s.range} />
                  <div className="rows">
                    {s.rows.map((r, i) => <MailRow key={i} row={r} idx={i} />)}
                  </div>
                </React.Fragment>
              ))}
            </section>
          </div>
        </main>
        <TasksPanel tone={t.tasksTone} />
        <AppRail />
      </div>

      <TweaksPanel>
        <TweakSection label="Edge shades" />
        <TweakColor label="Scheme (rail · sidebar · top · tasks)" value={t.edgeScheme}
          options={[
            ["#151c24", "#1f2933", "#28333f", "#232e39"],
            ["#18191c", "#212327", "#2a2d31", "#25272b"],
            ["#1c1a17", "#26231e", "#302c26", "#2a2722"],
            ["#10161d", "#161d26", "#1f2833", "#1a222c"],
          ]}
          onChange={(v) => setTweak("edgeScheme", v)} />
        <TweakSection label="Areas" />
        <TweakRadio label="Tasks panel" value={t.tasksTone} options={["dark", "light"]} onChange={(v) => setTweak("tasksTone", v)} />
        <TweakRadio label="Column headers" value={t.colHeaders} options={["dark", "light"]} onChange={(v) => setTweak("colHeaders", v)} />
        <TweakRadio label="Compose button" value={t.compose} options={["yellow", "subtle"]} onChange={(v) => setTweak("compose", v)} />
        <TweakSection label="Mail list" />
        <TweakSlider label="Zebra contrast" value={t.zebra} min={0} max={10} step={1} onChange={(v) => setTweak("zebra", v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
