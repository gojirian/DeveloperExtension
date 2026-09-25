// Mock data mirroring the user's real Gmail screenshot
window.GMAIL_DATA = {
  labels: [
    { name: "CAIRN", children: ["LATER", "THIS-WEEK", "TODAY", "TOMORROW"] },
    { name: "Projects", children: ["ALBY", "Buxly", "Ford Health", "Giltrap", "GWP", "Negota", "Services", "Showcase"] },
    { name: "RSS Feeds", children: [] },
  ],
  nav: [
    { name: "Inbox", count: 29, active: true },
    { name: "Starred" },
    { name: "Snoozed" },
    { name: "Sent" },
    { name: "Drafts", count: 6 },
    { name: "Categories" },
    { name: "Purchases", count: 8, indent: true },
    { name: "More" },
  ],
  inbox: [
    { from: "KevinStun, me", n: 10, subject: "Re: [ShowcaseSoftwareLtd/errors] Favorite/Pin presenta…", time: "11:29", unread: true },
    { from: "Nick Humphries", subject: "Fwd: Security alert for nathanael.hollings@luminate.one", time: "10:36", unread: true, imp: true },
    { from: "Figma", subject: "Thomas Hargreaves has invited you to join the team Lum…", time: "10:21", unread: true, imp: true },
    { from: "Geena Kumar", subject: "FOR REVIEW: Draft Buxly Pilot Testing Plan — your direct…", time: "09:36", unread: true, imp: true, chips: ["image001.png"] },
    { from: "Figma", subject: "Forgot your password? — Reset your Figma password.", time: "09:25", unread: true, imp: true },
    { from: "Alexx .. me, Shirley", n: 10, subject: "Fwd: Buxly Guide.xlsx — Tha…", time: "09:08", imp: true, labels: ["CAIRN/TODAY", "Projects/Buxly"], chips: ["image002.png", "image005.png"] },
    { from: "Sarah, me", n: 2, subject: "Zoom — Good morning Sarah, sure, I'm happy to jump on…", time: "08:48", imp: true },
    { from: "Alexx De Beer", subject: "Re: — Hi Sarah, I hope you are well. Due to the change in …", time: "08:41", imp: true },
    { from: "Nick, Sarah", n: 2, subject: "Agreement Transfer Notice — Hi team sorry for late reply …", time: "05:14", imp: true },
    { from: "Sentry", subject: "WEBAPP_PYTHON-35M — 2 new alerts s…", time: "", unread: true, starred: true, imp: true, hover: true },
    { from: "Nick .. cracket., me", n: 9, subject: "Backups and DR — Received …", time: "9 Jun", labels: ["CAIRN/LATER", "CAIRN/TODAY"] },
    { from: "Thomas, me", n: 2, subject: "Automote Platform Release — 11th June", time: "", starred: true, imp: true, selected: true },
    { from: "Nathanael .. Draft", n: 10, draft: true, subject: "Azure server takeover and maintenan…", time: "9 Jun", labels: ["CAIRN/THIS-WEEK"] },
    { from: "Nathanael Hollings .", subject: "eSigned document ready: 'Pacificomm Supplier Form.do…", time: "8 Jun", imp: true, chips: ["Pacificomm Su…"] },
    { from: "Nathanael, Thomas", n: 2, subject: "eSignature request for 'Pacificomm Supplier Form.docx …", time: "8 Jun", imp: true },
    { from: "Nathanael Hollings .", n: 2, subject: "eSignature request for 'Pacificomm Supplier Form.docx …", time: "8 Jun", imp: true },
    { from: "Atlassian", subject: "Welcome to Trello Premium — Welcome to Trello Premium…", time: "8 Jun" },
    { from: "Shirley, me", n: 8, subject: "Buxly — ---------- Forwarded message --------- From: S…", time: "8 Jun", imp: true, chips: ["Ope…", "image0…", "image0…", "+1"] },
    { from: "Figma", subject: "Subscription renewal reminder Jun 09, 2026 — Your Prof…", time: "4 Jun" },
    { from: "Alexx .. markob., me", n: 13, subject: "Re: Ap…", time: "", starred: true, imp: true, labels: ["CAIRN/THIS-WEEK", "Projects/Buxly"], chips: ["O…", "i…", "i…", "+4"] },
  ],
  sections: [
    {
      title: "Today", range: "1–4 of 4", rows: [
        { from: "Alexx .. me, Shirley", n: 10, subject: "Fwd: Buxly Guide.xlsx — Thanks, Jor…", time: "9 Jun", imp: true, labels: ["Inbox", "Projects/Buxly"], chips: ["image002.png", "image005.png"] },
        { from: "Alton, Nick, me", n: 4, subject: "FW: Proposal from Exaba for Pacificomm — Hi Alton, I fou…", time: "9 Jun", imp: true, chips: ["proposal_PACI…"] },
        { from: "Nick .. cracket., me", n: 9, subject: "Backups and DR — Received and sig…", time: "9 Jun", imp: true, labels: ["Inbox", "CAIRN/LATER"] },
        { from: "me, Ross", n: 2, subject: "Part Endpoints — Hi Nathanael, In reading your email, I thi…", time: "8 Jun", imp: true, chips: ["image590689.p…", "image046680.p…"] },
      ]
    },
    {
      title: "Tomorrow", range: "1–1 of 1", rows: [
        { from: "Kodie Upton", subject: "Re: [exaba-solutions/biozone-world-app] Enhance TAP …", time: "14 May", imp: true },
      ]
    },
    {
      title: "This week", range: "1–11 of 11", rows: [
        { from: "Nathanael .. Draft", n: 10, draft: true, subject: "Azure server takeover and maintenance scope — H…", time: "8 Jun", labels: ["Inbox"] },
        { from: "me, Paolo, Sam", n: 5, subject: "Legacy uploader + Release — Hi Sam Yes, Monday is fine…", time: "8 Jun", imp: true },
        { from: "Thomas Hargreaves", subject: "Re: New account creation — Luminate Studio Limited — All…", time: "8 Jun", imp: true, chips: ["Outloo…", "Outlo…", "Outloo…", "9+"] },
        { from: "me, Sam", n: 9, subject: "Project catch up — Hey, yes I got the invite, but since we …", time: "4 Jun", starred: true, imp: true },
        { from: "Microsoft .. Paolo", n: 8, subject: "Paolo Evener Curray invited you to collaborate with bioz…", time: "4 Jun", imp: true },
        { from: "Thomas, Annika", n: 4, subject: "Re: Laravel Project — Hi Thomas, Sounds great, …", time: "3 Jun", labels: ["Projects"] },
        { from: "Geena Kumar", subject: "Exaba x Buxly BFM Project Meeting Context — Morena N…", time: "3 Jun", starred: true, imp: true, chips: ["image003.png"] },
        { from: "Alexx .. markob., me", n: 13, subject: "Re: Approval — Hi, The latest build o…", time: "2 Jun", imp: true, labels: ["Inbox", "Projects/Buxly"], chips: ["Ope…", "image0…", "image0…", "+4"] },
        { from: "Nick, Alton", n: 4, subject: "Transfer of your Services Agreement — Thanks Nic…", time: "28 May", imp: true, labels: ["Inbox"], chips: ["Pacificomm Su…"] },
        { from: "Nathanael .. Craig", n: 20, subject: "Parts Update: Phase 1 Staging & Scoping Phase 2 — That'…", time: "26 May", imp: true },
      ]
    },
  ],
  tasks: [
    { text: "When you get a chance can you review this", link: "https://github.com/exaba-…", comment: true },
    { text: "Re: [exaba-solutions/biozone-world-app] Enhance TAP authentication flow and …", mail: true },
    { text: "Part Endpoints", mail: true },
    { text: "Backups and DR", mail: true },
    { text: "Fwd: Buxly Guide.xlsx", mail: true },
    { text: "FW: Proposal from Exaba for Pacificomm", mail: true, due: "Yesterday" },
  ],
};
