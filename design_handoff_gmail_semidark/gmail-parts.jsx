// Shared small components: icons, row, etc.
const I = {
  search: <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z"></path></svg>,
  tune: <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"></path></svg>,
  menu: <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"></path></svg>,
  star: (on) => <svg viewBox="0 0 24 24" width="18" height="18" fill={on ? "var(--accent)" : "none"} stroke={on ? "var(--accent)" : "currentColor"} strokeWidth="1.6"><path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"></path></svg>,
  imp: (on) => <svg viewBox="0 0 20 16" width="17" height="14"><path d="M1 1h10l6 7-6 7H1l6-7z" fill={on ? "var(--accent)" : "none"} stroke={on ? "var(--accent)" : "currentColor"} strokeWidth="1.4" strokeLinejoin="round"></path></svg>,
  chev: (dir) => <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style={{ transform: dir === "up" ? "rotate(180deg)" : "none" }}><path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z"></path></svg>,
  arrow: (dir) => <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style={{ transform: dir === "left" ? "rotate(180deg)" : "none" }}><path d="M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6z"></path></svg>,
  refresh: <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M17.65 6.35A7.96 7.96 0 0 0 12 4a8 8 0 1 0 7.73 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"></path></svg>,
  more: <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M12 8a2 2 0 1 0-2-2 2 2 0 0 0 2 2zm0 2a2 2 0 1 0 2 2 2 2 0 0 0-2-2zm0 6a2 2 0 1 0 2 2 2 2 0 0 0-2-2z"></path></svg>,
  pencil: <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"></path></svg>,
  mail: <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"></path></svg>,
  chat: <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"></path></svg>,
  video: <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z"></path></svg>,
  label: (c) => <svg viewBox="0 0 24 24" width="15" height="15" fill={c || "currentColor"}><path d="M17.63 5.84A2 2 0 0 0 16 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 1.63-.84L22 12l-4.37-6.16z"></path></svg>,
  gear: <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19.14 12.94a7.07 7.07 0 0 0 0-1.88l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7.03 7.03 0 0 0-1.62-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96a.5.5 0 0 0-.61.22L2.65 8.84a.5.5 0 0 0 .12.64l2.03 1.58a7.07 7.07 0 0 0 0 1.88l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.13.23.4.32.61.22l2.39-.96c.49.38 1.03.7 1.62.94l.36 2.54c.04.24.25.42.5.42h3.84a.5.5 0 0 0 .5-.42l.36-2.54a7.03 7.03 0 0 0 1.62-.94l2.39.96c.21.1.48.01.61-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.5A3.5 3.5 0 1 1 15.5 12 3.5 3.5 0 0 1 12 15.5z"></path></svg>,
  help: <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 17h-2v-2h2zm2.07-7.75-.9.92A3.4 3.4 0 0 0 13 15h-2v-.5a4.02 4.02 0 0 1 1.17-2.83l1.24-1.26A1.96 1.96 0 0 0 12 7a2 2 0 0 0-2 2H8a4 4 0 0 1 8 0 3.18 3.18 0 0 1-.93 2.25z"></path></svg>,
  grid: <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z"></path></svg>,
  spark: <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2 9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z"></path></svg>,
  check: <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"></path></svg>,
  openNew: <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"></path></svg>,
  close: <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path></svg>,
  comment: <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M21.99 4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14l4 4-.01-18z"></path></svg>,
  clock: <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm.5 5H11v6l5.25 3.15.75-1.23-4.5-2.67z"></path></svg>,
  img: <svg viewBox="0 0 24 24" width="13" height="13" fill="#e94235"><path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5l3.5-4.5z"></path></svg>,
  pdf: <svg viewBox="0 0 24 24" width="13" height="13" fill="#e94235"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z"></path></svg>,
};
window.GI = I;

function Checkbox({ dark }) {
  return <span className={"cbx" + (dark ? " cbx-dark" : "")}></span>;
}

function Chip({ kind, children }) {
  return (
    <span className="chip">
      {kind === "pdf" ? I.pdf : kind === "comment" ? I.comment : I.img}
      <span className="chip-txt">{children}</span>
    </span>
  );
}

function LabelTag({ children }) {
  return <span className="ltag">{children}</span>;
}

function MailRow({ row, idx }) {
  const cls = ["mrow", idx % 2 === 1 ? "alt" : "", row.unread ? "unread" : "", row.selected ? "sel" : ""].filter(Boolean).join(" ");
  return (
    <div className={cls}>
      <div className="mrow-line">
        <Checkbox />
        <span className="mr-ico">{I.star(row.starred)}</span>
        <span className="mr-ico">{I.imp(row.imp)}</span>
        <span className="mr-from">
          {row.draft ? <span>{row.from.replace(" Draft", "")} <em className="draft">Draft</em></span> : row.from}
          {row.n ? <span className="mr-n"> {row.n}</span> : null}
        </span>
        <span className="mr-subj">
          {(row.labels || []).map((l) => <LabelTag key={l}>{l}</LabelTag>)}
          <span className="mr-subj-main">{row.subject.split(" — ")[0]}</span>
          {row.subject.includes(" — ") ? <span className="mr-subj-rest"> — {row.subject.split(" — ").slice(1).join(" — ")}</span> : null}
        </span>
        <span className="mr-time">{row.time}</span>
      </div>
      {row.chips ? (
        <div className="mrow-chips">
          {row.chips.map((c, i) =>
            c.startsWith("+") ? <span key={i} className="chip chip-more">{c}</span> :
            <Chip key={i} kind={c.toLowerCase().includes("pdf") || c.startsWith("proposal") || c.startsWith("Pacificomm") ? "pdf" : c.startsWith("O") && !c.startsWith("Outloo") ? "comment" : "img"}>{c}</Chip>
          )}
        </div>
      ) : null}
    </div>
  );
}

window.MailRow = MailRow;
window.Checkbox = Checkbox;
window.Chip = Chip;
