/** Self-contained viewer theme; no network fonts or assets. */
export const viewerStyles: string = String.raw`
:root{--paper:#F5F7F2;--panel:#fff;--surface:#edf2ed;--surface-2:#e2eae3;--ink:#102C2A;--muted:#4e6360;--line:#dae3dc;--line-strong:#b2c4b7;--teal:#087F72;--teal-soft:#e2f1ee;--blue:#087F72;--blue-soft:#e2f1ee;--green:#1b6354;--green-soft:#e4f2ee;--amber:#855217;--amber-soft:#fff1dd;--red:#a33e43;--red-soft:#fcebed;--focus:#087F72;--mint:#65DEC0;--sans:'Segoe UI Variable Text','Segoe UI',-apple-system,BlinkMacSystemFont,Arial,sans-serif;--mono:ui-monospace,'Cascadia Code',Consolas,monospace;--p-density:1}
:root{--graph-active:#087F72;--graph-line:#9ac2b9}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font:14px/1.5 var(--sans);-webkit-font-smoothing:antialiased}
::selection{background:#c2e8e1;color:var(--ink)}
a{color:var(--blue);text-underline-offset:3px;text-decoration-thickness:1px}
button,input,select,textarea{font:inherit;color:inherit}
button,a,input,select,textarea{touch-action:manipulation}
:focus-visible{outline:3px solid var(--focus);outline-offset:3px}
button{cursor:pointer;border:1px solid var(--line-strong);background:var(--panel);padding:8px 14px;border-radius:8px;font-size:13px;font-weight:600;line-height:1.35;min-height:38px}
button:hover:not(:disabled){background:var(--blue-soft);border-color:#7ab8ae}
button:disabled{color:var(--muted);background:var(--surface);border-color:var(--line);opacity:1;cursor:not-allowed}
#clear-annotations[data-armed]{background:var(--red-soft);border-color:var(--red);color:var(--red)}
input,select,textarea{width:100%;background:var(--panel);border:1px solid var(--line-strong);border-radius:8px;min-height:38px;padding:8px 10px;font-size:13px;caret-color:var(--blue)}
textarea{resize:vertical}
input::placeholder,textarea::placeholder{color:var(--muted);opacity:1}
input[type=checkbox]{accent-color:var(--blue)}
.skip{position:absolute;left:12px;top:-80px;padding:10px 16px;background:var(--panel);border:1px solid var(--focus);z-index:20;border-radius:12px}
.skip:focus{top:10px}
.workspace-shell{display:grid;grid-template-columns:68px minmax(0,1fr);max-width:1900px;margin:0 auto;min-height:100vh}
.workspace{min-width:0}
.icon-rail{position:sticky;top:0;height:100vh;display:flex;flex-direction:column;align-items:center;padding:24px 8px;z-index:5}
.icon-rail .rail-brand{display:flex;align-items:center;justify-content:center;width:40px;height:40px;background:#102C2A;color:#65DEC0;border:1px solid #102C2A;border-radius:12px;text-decoration:none}
.icon-rail svg{width:22px;height:22px;flex-shrink:0}
.icon-rail .rail-brand:hover{background:#163b38;border-color:#163b38}
.workspace-header{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:18px;padding:20px 28px 12px 12px}
.brand{font-size:21px;font-weight:650;letter-spacing:-.035em;white-space:nowrap;color:var(--ink);display:flex;align-items:center;line-height:1}
.brand-logo{height:28px;width:auto;display:block;max-width:130px}
.connection{font:12px/1.4 var(--sans);color:var(--muted);display:flex;align-items:center;gap:12px;justify-content:flex-end}
nav[role=tablist],.top-nav{display:flex;align-items:center;justify-content:center;gap:6px;padding:0;overflow-x:auto;scrollbar-width:thin}
nav[role=tablist] button{flex:0 0 auto;text-align:center;border:1px solid transparent;border-radius:999px;padding:9px 16px;background:transparent;color:var(--muted);font-size:13px;font-weight:600;min-height:40px;white-space:nowrap}
nav[role=tablist] button:hover:not(:disabled){background:#ffffffc0;color:var(--ink)}
nav[role=tablist] button[aria-selected=true]{background:#102C2A;color:#fff;border-color:#102C2A}
.nav-count{display:inline-block;margin-left:6px;color:var(--muted);font:500 12px/1.6 var(--sans);font-variant-numeric:tabular-nums}
nav[role=tablist] button[aria-selected=true] .nav-count{color:#65DEC0}
.nav-count.is-alert{color:var(--red)}
main{max-width:1680px;margin:0 auto;padding:16px 28px 48px 12px;min-width:0}
h1{font-size:30px;font-weight:650;line-height:1.2;letter-spacing:-.035em;margin:0 0 6px}
h2{font:650 16px/1.4 var(--sans);letter-spacing:-.015em;margin:0 0 12px}
h3{font:650 14px/1.4 var(--sans);margin:20px 0 8px;color:var(--ink)}
p{margin:0 0 10px;max-width:72ch}
.muted,.help{color:var(--muted);font-size:13px}
.intro{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:16px}
.intro p{margin-bottom:0}
.summary{font:400 12px/1.5 var(--sans);font-variant-numeric:tabular-nums;color:var(--muted);overflow-wrap:anywhere;max-width:40%}
.filters{padding:16px 20px;background:#fbfcf9;border:1px solid #fff;border-radius:24px;margin-bottom:12px}
.filter-primary{display:block;width:100%}
.filter-advanced{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:12px}
.filter-primary>label,.filter-advanced>label{min-width:0}
.advanced-filters{margin-top:10px}
.advanced-filters summary{font-size:12px;font-weight:600;color:var(--blue);cursor:pointer;width:fit-content;user-select:none;padding:4px 0}
.panel-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 20px 10px}
.panel-heading h2{margin:0;font-size:15px;font-weight:650}
.panel-heading .help{font-size:12px}
.catalog-sidebar{background:#fbfcf9;border:1px solid #fff;border-radius:24px;min-width:0}
.catalog-sidebar .catalog-list{border:0;background:transparent;padding-top:0;border-top-left-radius:0;border-top-right-radius:0}
.scenario-footer{display:block;margin-top:8px}.scenario-index{font-size:12px}.scenario-title{overflow-wrap:anywhere}
.detail-header{padding-bottom:16px;margin-bottom:18px;border-bottom:1px solid var(--line)}
.detail-meta{display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin-top:12px}
.step-heading{color:var(--ink)}
label{display:block;font-size:12px;font-weight:600;color:#46516a}
label input,label select{display:block;margin-top:6px;font-weight:400}
.toolbar{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;margin:0 0 16px;font-size:13px;padding:0 4px}
.toolbar-actions,.toolbar-meta{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.count-status{font:500 12px/1.4 var(--sans);font-variant-numeric:tabular-nums;color:var(--muted)}
.shortcut-hint{font-size:12px;color:var(--muted)}
kbd{display:inline-block;min-width:20px;padding:1px 5px;border:1px solid var(--line-strong);border-bottom-width:2px;border-radius:5px;background:var(--panel);color:var(--ink);font:500 12px/1.4 var(--mono);text-align:center}
.catalog{display:grid;grid-template-columns:minmax(260px,340px) minmax(0,1fr);gap:18px;align-items:start}
.catalog-list{max-height:74vh;overflow:auto;scrollbar-color:var(--line-strong) transparent;background:#fbfcf9;border:1px solid #fff;border-radius:24px;padding:8px}
.scenario{display:block;width:100%;text-align:left;border:1px solid transparent;border-radius:10px;padding:12px 14px;background:transparent;margin-bottom:2px}
.scenario:last-child{margin-bottom:0}
.scenario:hover:not([aria-pressed=true]){background:#eef6f3}
.scenario[aria-pressed=true]{border-color:#7bbdb3;background:#e2f1ee}
.scenario strong{display:block;margin:6px 0 8px;font-size:14px;font-weight:600;line-height:1.45}
.meta{font:12px/1.5 var(--mono);color:var(--muted);overflow-wrap:anywhere;font-variant-numeric:tabular-nums}
.badge{display:inline-flex;align-items:center;padding:2px 0;border:1px solid transparent;font:400 12px/1.3 var(--sans);color:var(--muted);margin:0 8px 4px 0;overflow-wrap:anywhere;max-width:100%}
.badge-critical,.badge-fail,.badge-high,.badge-medium,.badge-low,.badge-pass{padding:2px 7px;border-radius:5px;font-weight:500;font-size:12px}
.badge-critical,.badge-fail{background:var(--red-soft);border-color:#efc8cc;color:var(--red)}
.badge-high{background:var(--amber-soft);border-color:#ebd3ad;color:var(--amber)}
.badge-medium{background:var(--blue-soft);border-color:#a8d5cc;color:var(--blue)}
.badge-low{background:var(--surface);border-color:var(--line);color:var(--muted)}
.badge-pass{background:var(--green-soft);border-color:#c4ddcf;color:var(--green)}
.detail{background:var(--panel);border:1px solid #fff;border-radius:26px;padding:26px 28px;min-width:0;scrollbar-color:var(--line-strong) transparent}
.detail h2{font:650 23px/1.3 var(--sans);letter-spacing:-.025em;margin:4px 0 12px;overflow-wrap:anywhere}
.detail h2.section-gap{font:650 16px/1.4 var(--sans);margin-top:24px;padding-top:18px;border-top:1px solid var(--line)}
#refresh[aria-busy=true]{color:var(--muted);cursor:progress}
.detail ul,.detail ol{margin:8px 0 16px;padding-left:20px}
.detail li{margin-bottom:6px}
.detail ol.steps,.steps{padding-left:36px;margin:16px 0 24px;counter-reset:step;list-style:none}
.steps li{position:relative;padding:12px 0 14px;border-bottom:1px solid #edf0f5;margin-bottom:4px}
.steps li:last-child{border-bottom:0}
.steps li::before{content:counter(step);position:absolute;left:-36px;top:12px;width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:#e2ebe4;color:#283d38;font:600 12px/1 var(--mono);counter-increment:step}
.steps strong{display:block;font-size:14px;font-weight:600;margin-bottom:4px;color:var(--ink)}
.steps p{margin:4px 0;white-space:pre-wrap;overflow-wrap:anywhere}
.steps p.step-data{font:12px/1.55 var(--mono);color:var(--muted);background:#f3f6f3;padding:4px 8px;border-radius:6px;display:inline-block;max-width:100%}
.steps p.step-expected{font:14px/1.65 var(--sans);color:#2d3a4e;max-width:68ch}
.annotation-box{margin-top:24px;border-top:1px solid var(--line);display:grid;grid-template-columns:160px minmax(0,1fr);gap:14px;align-items:start;padding-top:18px}
.annotation-note{grid-column:1/-1;font-size:12px;color:var(--muted);margin:0}
.table-wrap{overflow:auto;max-height:78vh;padding:0;background:var(--panel);border:1px solid #fff;border-radius:24px;scrollbar-color:var(--line-strong) var(--surface)}
.doc-table{width:100%;min-width:1060px;border-collapse:separate;border-spacing:0;font-size:13px;text-align:left}
.doc-table caption{text-align:left;padding:14px 20px 12px;font-size:12px;font-weight:400;color:var(--muted);line-height:1.4;background:var(--panel);border-bottom:1px solid var(--line)}
.doc-table th,.doc-table td{padding:calc(10px * var(--p-density,1)) 12px;border-bottom:1px solid var(--line);border-right:1px solid #edf0f5;vertical-align:top;overflow-wrap:anywhere}
.doc-table th:last-child:not(.col-expected),.doc-table td:last-child:not(.col-expected),.doc-table .col-comment{border-right:0}
.doc-table thead th{position:sticky;top:0;z-index:2;background:#e5ece6;font-size:12px;font-weight:650;color:#102C2A;vertical-align:middle;box-shadow:inset 0 -1px 0 var(--line);height:38px;border-right:1px solid #d0dbd2}
.doc-table thead th.col-comment{border-right:0}
.doc-table thead tr:nth-child(2) th{top:38px;font-weight:600;color:#344945}
.doc-table thead th.col-expected{border-right:1px solid #d0dbd2}
.doc-table td.col-expected{border-right:1px solid #edf0f5}
.doc-table thead tr:first-child th[colspan]{text-align:center;text-transform:uppercase;font-size:11px;letter-spacing:.05em;font-weight:700;color:#344945;border-bottom:1px solid #d0dbd2}
.doc-table thead th.col-step-num,.doc-table thead th.col-priority,.doc-table thead th.col-status{text-align:center}
.doc-table tbody th{font:600 12px/1.5 var(--mono);color:var(--ink);background:var(--panel);white-space:nowrap}
.doc-table .module-group th{background:#edf3ee;font:600 13px/1.5 var(--sans);color:#102C2A;padding:12px 16px;border-top:8px solid #fff}
.doc-table .module-group .meta{font-weight:400;margin-left:8px}
.doc-table tr.row-pass td,.doc-table tr.row-pass th[scope=row]{background:#f0f7f3}
.doc-table tr.row-fail td,.doc-table tr.row-fail th[scope=row]{background:#fff1f1}
.col-id{width:96px}.col-title{width:180px}.col-pre{width:170px}
.col-step-num{width:42px;text-align:right;font:500 12px/1.5 var(--mono);color:var(--muted);font-variant-numeric:tabular-nums}
.col-action{width:190px}.col-data{width:140px;font:12px/1.5 var(--mono);color:var(--muted)}
.col-expected{width:220px;font:13.5px/1.6 var(--sans);max-width:68ch}
.col-priority{width:96px;white-space:nowrap;vertical-align:middle;text-align:center}
.col-priority .badge{margin:0 auto;display:inline-flex}
.col-status{width:120px;vertical-align:middle;text-align:center}.col-comment{width:200px;vertical-align:middle}
.pre-list{margin:0;padding-left:16px;font-size:12px;line-height:1.5}.pre-list li{margin-bottom:4px}
.cell-title{font-weight:600;color:var(--ink);display:block;margin-bottom:4px}
.status-select{min-height:34px;padding:6px;font-size:12px;font-weight:500}
.comment-input{min-height:64px;resize:vertical;font-size:12px;line-height:1.5;padding:8px;margin-top:6px}
.empty{padding:26px 20px;border:1px dashed var(--line-strong);border-radius:18px;color:var(--muted);background:#f8faff;font-size:13px}
.notice{background:var(--amber-soft);color:#704619;border:1px solid #e6c99f;padding:14px 18px;margin-bottom:16px;border-radius:16px;white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px}
.error{color:var(--red);font-weight:500}
.issue{padding:12px 0;border-bottom:1px solid var(--line);margin-bottom:4px;min-width:0}
.issue:last-child{border-bottom:0}
.issue h3{margin:0 0 6px;font-size:13.5px;font-weight:600;color:var(--ink);overflow-wrap:anywhere;min-width:0}
.issue p{margin:4px 0;overflow-wrap:anywhere;word-break:break-word;font-size:12px;color:var(--muted);min-width:0}
#diagnostics{min-width:0}
.diagnostic-check.is-ok{display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 8px;padding:6px 0;border-bottom:1px solid #edf0f6;font-size:12px;color:var(--muted);min-width:0}
.diagnostic-check.is-ok strong{color:var(--green);font-weight:600;min-width:0;overflow-wrap:anywhere;word-break:break-word}
.diagnostic-check.is-ok span{overflow-wrap:anywhere;word-break:break-word;min-width:0;flex:1 1 200px}
.issue.is-attention{padding:12px 14px;background:var(--red-soft);border:1px solid #f2c7cb;border-radius:12px;margin:8px 0;min-width:0}
.issue.is-attention strong{color:var(--red);display:block;margin-bottom:4px;font-size:13px;font-weight:600;overflow-wrap:anywhere;min-width:0}
.issue.is-attention p{color:#782328;margin:0;font-size:12px;overflow-wrap:anywhere;word-break:break-word;min-width:0}
.drift-status{display:inline-block;padding:7px 12px;border:1px solid var(--line);border-radius:999px;background:var(--surface);color:var(--ink);font-size:12px;font-weight:500}
.drift-status.is-blocked{background:var(--red-soft);border-color:#ecc6cc;color:var(--red)}
.drift-status.is-clear{background:var(--green-soft);border-color:#c4ddcf;color:var(--green)}
.drift-status.is-unknown{background:var(--amber-soft);border-color:#ebd3ad;color:var(--amber)}
.columns{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:18px;align-items:start}
.columns>div,.columns>.detail{padding:24px 26px;background:var(--panel);border:1px solid #fff;border-radius:26px;min-width:0}
.impact-form{display:flex;align-items:end;gap:10px;margin:16px 0}.impact-form label{flex:1;min-width:0}
.impact-form button{background:#102C2A;border-color:#102C2A;color:#fff;flex-shrink:0}.impact-form button:hover:not(:disabled){background:#1c423e}
.graph-toolbar{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;margin:0 0 16px;padding:0 4px}
.graph-toolbar-group{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.graph-filter-label{display:inline-flex;align-items:center;gap:8px;font-size:12px;font-weight:600;color:var(--muted)}
.graph-filter-label select{width:auto;min-height:36px;padding:6px 10px;font-size:12px;font-weight:500;margin:0}
.graph-search-input{min-height:36px;padding:6px 10px;font-size:12px;width:190px}
.graph-toggle{display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:500;color:var(--muted);cursor:pointer}
.graph-toggle input{width:16px;height:16px;min-height:0;cursor:pointer;margin:0}
.graph-layout{display:grid;grid-template-columns:minmax(0,1fr) 290px;gap:18px;align-items:start}
.graph-scroll{overflow:auto;padding:16px;background:#f5f8f5;border:1px solid #fff;border-radius:26px;max-height:80vh;min-height:560px;scrollbar-color:var(--line-strong) var(--surface);-webkit-overflow-scrolling:touch}
.graph{position:relative;min-width:1168px}.graph svg{position:absolute;inset:0;pointer-events:none;width:100%;height:100%}
.graph-edge{fill:none;stroke-linecap:round}.graph-edge.edge-hover{stroke:var(--blue)!important;stroke-width:2px!important;stroke-opacity:.9!important}
.graph-node{position:absolute;width:220px;min-height:56px;padding:9px 12px;text-align:left;overflow-wrap:anywhere;font-size:12px;background:var(--panel);border:1px solid #c9d7cc;border-radius:16px;color:var(--ink)}
.graph-node strong{display:block;margin-bottom:3px;font-size:12px;line-height:1.35;overflow-wrap:anywhere}
.graph-node .meta{display:block;font:500 12px/1.3 var(--sans);color:var(--muted);overflow-wrap:anywhere}
.graph-node:hover{border-color:#7bbdb3;background:#f8faf8}
.graph-node.related{background:#e2f1ee;border-color:#7bbdb3;color:var(--ink)}
.graph-node.related strong{color:var(--ink)}.graph-node.related .meta{color:var(--muted)}
.graph-node.related-hover{background:#e2f1ee!important;border-color:#7ab8ae!important;color:var(--ink)!important}
.graph-node.related-hover strong{color:var(--ink)!important}.graph-node.related-hover .meta{color:var(--muted)!important}
.graph-node[aria-pressed=true],.graph-node.selected{background:#102C2A!important;color:#fff!important;border-color:#102C2A!important}
.graph-node[aria-pressed=true] strong,.graph-node.selected strong{color:#fff!important}
.graph-node[aria-pressed=true] .meta,.graph-node.selected .meta{color:#65DEC0!important}
.graph-node.node-dimmed{background:#edf2ed;border-color:#d5dfd6;color:#788880}
.graph-node.node-dimmed strong{color:#64756c}
.graph-node.node-dimmed .meta{color:#88978e}
.graph-node.node-dimmed:hover,.graph-node.node-dimmed:focus-visible{background:var(--panel);border-color:#7bbdb3;color:var(--ink)}
.graph-node.node-dimmed:hover strong,.graph-node.node-dimmed:focus-visible strong{color:var(--ink)}
.graph-node.node-dimmed:hover .meta,.graph-node.node-dimmed:focus-visible .meta{color:var(--muted)}
.graph-heading{position:absolute;font:600 13px/1.3 var(--sans);color:#3c504b}
.neighbor{display:block;text-align:left;width:100%;margin:0;padding:10px 0;font:12px/1.5 var(--sans);border:0;border-bottom:1px solid var(--line);border-radius:0;background:transparent;overflow-wrap:anywhere}
.neighbor:last-child{border-bottom:0}
.diff-row{margin:0 0 16px;padding:22px 24px;background:var(--panel);border:1px solid #fff;border-radius:24px}
.diff-row h2{font:600 14px/1.5 var(--mono);margin:0 0 12px;overflow-wrap:anywhere;color:var(--ink)}
.diff-columns{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;margin-top:12px}
.diff-side{padding:14px 16px;border-radius:12px;min-width:0}
.diff-side h3{margin:0 0 8px;font-size:13px}
.diff-side pre{margin:0;padding:0;background:transparent;border:0;border-radius:0}
.diff-side.before{background:#fff1f2;border:1px solid #fecdd3}
.diff-side.before h3{color:var(--red)}
.diff-side.after{background:#e6f4f1;border:1px solid #9dd1c7}
.diff-side.after h3{color:var(--blue)}
pre{white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.6 var(--mono);margin:8px 0 0;padding:0;background:transparent;border:0;color:inherit}
details{margin-top:14px}
summary{cursor:pointer;color:var(--blue);font-weight:600;font-size:13px}
.export-bar{margin:0 0 16px;padding:0 4px}
.export-summary{color:#3a504a;font-size:13px}.export-summary .help{font-weight:400;margin-left:12px}
.export-bar[open]>.help{margin:10px 0}.export-bar[open] .export-links{margin-top:10px}
.export-links{display:flex;flex-wrap:wrap;gap:7px}.export-links a{display:inline-flex;align-items:center;border:1px solid #c5d4cb;background:var(--panel);padding:6px 11px;border-radius:6px;font-size:12px;font-weight:500;text-decoration:none;min-height:34px}
.export-links a:hover{background:var(--blue-soft);border-color:#7ab8ae}.export-bar h2{font-size:13px;margin:0 0 4px}.export-bar .help{margin:0;font-size:12px}
.section-gap{margin-top:24px}
footer{font-size:12px;color:var(--muted);padding:16px 28px 24px 12px}
[hidden]{display:none!important}
@media(min-width:981px){#catalog-list,#scenario-detail{max-height:74vh;overflow:auto}}
@media(min-width:1500px){.workspace-header{grid-template-columns:auto minmax(0,1fr) auto;gap:24px}.workspace-header nav[role=tablist]{grid-column:2}.workspace-header .connection{grid-column:3}}
@media(max-width:1100px){.graph-layout{grid-template-columns:minmax(0,1fr) 250px}}
@media(max-width:980px){.filter-advanced{grid-template-columns:repeat(2,minmax(0,1fr))}.catalog,.columns,.graph-layout{grid-template-columns:1fr}.catalog-list{max-height:300px}.intro{align-items:start;flex-direction:column;gap:10px}.summary{max-width:100%}.graph-scroll{min-height:420px}.connection{gap:8px}}
@media(max-width:600px){
.workspace-shell{grid-template-columns:1fr}
.icon-rail{display:none}
.workspace-header{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;padding:12px 14px 8px}
.workspace-header .brand{font-size:18px}
.workspace-header .brand-logo{height:24px;max-width:110px}
.workspace-header .connection{gap:8px;font-size:12px;width:auto}
.workspace-header #refresh{min-height:44px;padding:6px 14px;font-size:12px}
.workspace-header nav[role=tablist]{width:100%;justify-content:start;gap:4px;padding:4px 0 2px;margin:0;overflow-x:auto;-webkit-overflow-scrolling:touch}
nav[role=tablist] button{min-height:44px;padding:8px 14px;font-size:12px}
main{padding:10px 14px 32px}
h1{font-size:22px;margin:0 0 4px}
.intro{flex-direction:column;align-items:start;gap:4px;margin-bottom:10px}
.intro p{font-size:12px;margin-bottom:0}
.summary{display:none}
.filters{padding:10px 12px;border-radius:18px;margin-bottom:10px}
.filter-primary{display:block;width:100%}
.filter-primary label{font-size:12px}
.filter-primary input{min-height:44px;padding:8px 12px;margin-top:4px;font-size:13px}
.advanced-filters{margin-top:6px}
.advanced-filters summary{min-height:44px;display:inline-flex;align-items:center;font-size:12px;padding:4px 0}
.filter-advanced{grid-template-columns:1fr;gap:10px;margin-top:8px}
.filter-advanced label{font-size:12px}
.filter-advanced input,.filter-advanced select{min-height:44px;padding:8px 10px;font-size:12px}
.toolbar{margin:0 0 10px;padding:0 2px;gap:8px}
.toolbar-meta{gap:6px}
.shortcut-hint{display:none}
.count-status{font-size:12px}
.toolbar-actions{gap:8px;width:100%}
.toolbar-actions button{min-height:44px;padding:8px 12px;font-size:12px;flex:1}
.export-bar{margin:0 0 10px}
.export-summary{min-height:44px;display:inline-flex;align-items:center;font-size:12px}
.export-links a{min-height:44px;padding:8px 12px;font-size:12px}
.catalog{grid-template-columns:1fr;gap:12px}
.catalog-sidebar{border-radius:18px}
.catalog-list{max-height:280px;padding:6px}
.scenario{min-height:44px}
.detail,.columns>div,.columns>.detail{padding:18px;border-radius:20px}
.diagnostic-check.is-ok{flex-direction:column;align-items:flex-start;gap:2px;padding:6px 0}
.diagnostic-check.is-ok strong{white-space:normal;min-width:0;width:100%}
.diagnostic-check.is-ok span{width:100%;min-width:0;flex:none}
.annotation-box,.diff-columns{grid-template-columns:1fr}
.status-select{min-height:44px;font-size:12px}
.impact-form{align-items:stretch;flex-direction:column}
.impact-form input{min-height:44px;font-size:13px}
.impact-form button{min-height:44px;font-size:13px}
.graph-toolbar{gap:8px;margin-bottom:10px}
.graph-toolbar-group{width:100%;gap:8px}
.graph-search-input{width:100%;min-height:44px;font-size:12px}
.graph-filter-label{width:100%;justify-content:space-between;font-size:12px}
.graph-filter-label select{flex:1;margin-left:8px;min-height:44px;font-size:12px}
.graph-toggle{min-height:44px;display:inline-flex;align-items:center;font-size:12px}
#graph-clear-sel{min-height:44px;font-size:12px}
.neighbor{min-height:44px;display:flex;align-items:center;font-size:12px}
.graph-scroll{padding:10px;min-height:360px;border-radius:18px}
.steps li{padding:10px 0}
.diff-row{padding:16px;border-radius:18px}
.diff-side{padding:12px}
footer{padding:14px;font-size:12px}
}
@media(prefers-reduced-motion:no-preference){button,.export-links a,.rail-brand{transition:background-color .14s ease-out,border-color .14s ease-out,color .14s ease-out}.graph-edge{transition:stroke-opacity .15s ease,stroke .15s ease}}
@media(forced-colors:active){.scenario[aria-pressed=true],nav[role=tablist] button[aria-selected=true],.graph-node[aria-pressed=true],.rail-brand[aria-current=page]{outline:2px solid Highlight}.graph-edge{stroke:CanvasText}.graph-node.node-dimmed{opacity:1}}
`;
