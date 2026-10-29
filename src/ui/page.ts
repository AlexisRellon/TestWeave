import { viewerStyles } from './styles.js';

/** Workspace content is rendered as text, never interpreted as HTML. */
export const viewerPage: string = String.raw`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>TestWeave · Local viewer</title>
<link rel="icon" href="/favicon.ico" sizes="48x48"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><link rel="manifest" href="/site.webmanifest"><meta name="theme-color" content="#102C2A"><style>${viewerStyles}</style></head><body><a class="skip" href="#main">Skip to content</a>
<div class="workspace-shell"><aside class="icon-rail" aria-label="Workspace shortcuts"><a class="rail-brand" href="#main" aria-label="TestWeave workspace"><svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M16 56H56L88 144L128 56H160L104 200H72Z M156 120L170 144L202 56H240L184 200H152L136 172Z"/></svg></a></aside><div class="workspace"><header class="workspace-header"><div class="brand"><img src="/assets/testweave-horizontal-color.svg" alt="TestWeave" class="brand-logo" width="121" height="28"></div><div class="connection"><span id="connection" role="status" aria-live="polite">Connecting…</span><button id="refresh" type="button">Refresh</button></div>
<nav aria-label="Viewer sections" role="tablist"><button type="button" role="tab" id="tab-catalog" aria-controls="view-catalog" aria-selected="true" tabindex="0" data-view="catalog">Scenario catalog <span id="nav-count-catalog" class="nav-count" hidden></span></button><button type="button" role="tab" id="tab-table" aria-controls="view-table" aria-selected="false" tabindex="-1" data-view="table">Test document <span id="nav-count-table" class="nav-count" hidden></span></button><button type="button" role="tab" id="tab-drift" aria-controls="view-drift" aria-selected="false" tabindex="-1" data-view="drift">Live drift <span id="nav-count-drift" class="nav-count" hidden></span></button><button type="button" role="tab" id="tab-graph" aria-controls="view-graph" aria-selected="false" tabindex="-1" data-view="graph">Coverage graph <span id="nav-count-graph" class="nav-count" hidden></span></button><button type="button" role="tab" id="tab-diff" aria-controls="view-diff" aria-selected="false" tabindex="-1" data-view="diff">Semantic diff <span id="nav-count-diff" class="nav-count" hidden></span></button></nav>
</header><main id="main" tabindex="-1"><div id="errors" role="alert" hidden></div><div class="intro"><div class="intro-copy"><h1 id="heading" tabindex="-1">Scenario catalog</h1><p id="description" class="muted">Inspect manual QA scenarios, steps, profiles and linked specifications.</p></div><span id="project" class="summary"></span></div>
<section id="filters" class="filters" aria-label="Catalog filters">
<div class="filter-primary"><label>Search<input id="search" type="search" placeholder="Find a scenario, ID or action…" aria-keyshortcuts="/"></label></div>
<details id="secondary-filters" class="advanced-filters" open><summary>Filters</summary><div class="filter-advanced"><label>Module<select id="module"><option value="">All modules</option></select></label><label>Priority<select id="priority"><option value="">All priorities</option><option>critical</option><option>high</option><option>medium</option><option>low</option></select></label><label>Assessment<select id="assessment"><option value="">All assessments</option><option value="unassessed">Unassessed</option><option value="pass">Pass</option><option value="fail">Fail</option><option value="commented">Commented</option></select></label><label>Test type<select id="type"><option value="">All types</option></select></label><label>Catalog<select id="kind"><option value="">Scenarios &amp; NFT</option><option value="nft">NFT profiles</option><option value="scenario">Scenarios</option></select></label><label>Tags (comma separated)<input id="tags" placeholder="smoke, authentication"></label><label>Fixture<input id="fixture" placeholder="Fixture name or reference"></label><label>Spec pointer<input id="spec" placeholder="docs/spec.md#section"></label></div></details></section>
<div id="filter-toolbar" class="toolbar"><div class="toolbar-meta"><span id="count" class="count-status" role="status" aria-live="polite"></span><span class="shortcut-hint"><kbd>/</kbd> search · <kbd>j</kbd> <kbd>k</kbd> next or previous scenario</span></div><div class="toolbar-actions"><span id="annotation-summary" class="count-status" role="status" aria-live="polite"></span><button id="clear-annotations" type="button">Clear local notes</button><button id="reset" type="button">Clear filters</button></div></div>
<details id="export-bar" class="export-bar" aria-label="Filtered exports"><summary class="export-summary">Export definitions</summary><p class="help">Exports use module, tags and priority from canonical definitions only. Local pass/fail notes are never exported.</p><div id="exports" class="export-links"></div></details>
<section id="view-catalog" role="tabpanel" aria-label="Scenario catalog" aria-labelledby="tab-catalog"><div class="catalog"><div class="catalog-sidebar"><div class="panel-heading"><h2>Scenarios</h2><span class="help">Select to inspect</span></div><div id="catalog-list" class="catalog-list" aria-label="Scenarios" aria-keyshortcuts="j k"></div></div><article id="scenario-detail" class="detail" aria-label="Scenario details"></article></div></section>
<section id="view-table" role="tabpanel" aria-label="Test document" aria-labelledby="tab-table" hidden><div class="table-wrap" role="region" aria-label="Test document table" tabindex="0"><table class="doc-table"><caption>Ordered steps with browser-local Pass/Fail and comments. Notes stay in this browser, separate from test-truth.md and exports.</caption><thead><tr><th id="th-id" scope="col" rowspan="2" class="col-id">ID</th><th id="th-title" scope="col" rowspan="2" class="col-title">Title</th><th id="th-pre" scope="col" rowspan="2" class="col-pre">Preconditions</th><th id="th-steps" scope="colgroup" colspan="4">Ordered steps</th><th id="th-priority" scope="col" rowspan="2" class="col-priority">Priority</th><th id="th-status" scope="col" rowspan="2" class="col-status">Pass / Fail</th><th id="th-comment" scope="col" rowspan="2" class="col-comment">Comment</th></tr><tr><th id="th-step-num" scope="col" class="col-step-num">#</th><th id="th-action" scope="col" class="col-action">Action</th><th id="th-data" scope="col" class="col-data">Data</th><th id="th-expected" scope="col" class="col-expected">Expected</th></tr></thead><tbody id="table-body"></tbody></table></div></section>
<section id="view-drift" role="tabpanel" aria-label="Live drift" aria-labelledby="tab-drift" hidden><div class="columns"><div><h2>Drift issues</h2><p id="drift-status" class="drift-status"></p><div id="issues"></div><h2 class="section-gap">Workspace diagnostics &amp; dead paths</h2><div id="diagnostics"></div></div><aside class="detail"><h2>Impact preview</h2><p class="help">Find modules, scenarios and specs connected to a workspace path or glob.</p><form id="impact-form" class="impact-form"><label>Source path<input id="impact-path" required placeholder="src/auth/**" autocomplete="off"></label><button type="submit">Trace impact</button></form><div id="impact-result" role="status" aria-live="polite"></div></aside></div></section>
<section id="view-graph" role="tabpanel" aria-label="Coverage graph" aria-labelledby="tab-graph" hidden><div class="graph-toolbar"><div class="graph-toolbar-group"><label class="graph-filter-label">Module<select id="graph-module"><option value="">All modules</option></select></label><input id="graph-search" class="graph-search-input" type="search" placeholder="Search nodes…" aria-label="Filter graph nodes"></div><div class="toolbar-actions"><label class="graph-toggle"><input id="graph-isolate" type="checkbox" checked> Focus selected only</label><button id="graph-clear-sel" type="button">Clear selection</button></div></div><div class="graph-layout"><div class="graph-scroll"><div id="graph" class="graph" aria-label="Coverage nodes and relationships"></div></div><aside id="node-detail" class="detail" aria-label="Selected coverage node"></aside></div></section>
<section id="view-diff" role="tabpanel" aria-label="Semantic diff" aria-labelledby="tab-diff" hidden><p id="diff-status" class="muted"></p><div id="diff-content"></div></section></main><footer id="viewer-info" tabindex="-1">TestWeave · Read-only manual QA contract viewer · Canonical definitions from test-truth.md; pass/fail notes stay browser-local and are never written to contracts or exports.</footer></div></div>
<script>
'use strict';
const $ = id => document.getElementById(id);
const array = value => Array.isArray(value) ? value.filter(item => item != null) : [];
const str = value => typeof value === 'string' ? value : value == null ? '' : typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
const el = (tag,text,cls) => {const node=document.createElement(tag);if(text!==undefined)node.textContent=str(text);if(cls)node.className=cls;return node;};
const empty = (root,text) => root.append(el('p',text,'empty'));
const values=['module','type','priority','kind','tags','fixture','spec','search','assessment'];
const STORAGE_KEY='testweave.localAnnotations.v1';
let state={},selectedTest='',selectedNode='',view='catalog',request=0,impactRequest=0,memoryAnnotations={},annotationsMemoryOnly=false,clearArmed=false,clearTimer=0;
const nftTypes=['accessibility','security','performance','compatibility'];
const modules=()=>array(state.contract&&state.contract.modules).filter(m=>m&&typeof m==='object');
const rows=()=>modules().flatMap(module=>array(module.tests).filter(test=>test&&typeof test==='object').map(test=>({module,test})));
function readAnnotations(){
 if(annotationsMemoryOnly)return memoryAnnotations;
 try{
  if(typeof localStorage!=='undefined'&&localStorage){
   const raw=localStorage.getItem(STORAGE_KEY);
   if(raw){const parsed=JSON.parse(raw);if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))return parsed;}
  }
 }catch{}
 return memoryAnnotations;
}
function writeAnnotations(next){
 memoryAnnotations=next;
 try{if(typeof localStorage!=='undefined'&&localStorage)localStorage.setItem(STORAGE_KEY,JSON.stringify(next));}catch{annotationsMemoryOnly=true;}
}
function getAnnotation(testId){
 const all=readAnnotations(),entry=all&&typeof all==='object'?all[str(testId)]:null;
 const status=entry&&(entry.status==='pass'||entry.status==='fail')?entry.status:'';
 const comment=entry&&typeof entry.comment==='string'?entry.comment:'';
 return {status,comment};
}
function setAnnotation(testId,patch){
 const key=str(testId);if(!key)return;
 const all={...readAnnotations()},current=getAnnotation(key);
 const next={status:patch.status!==undefined?(patch.status==='pass'||patch.status==='fail'?patch.status:''):current.status,comment:patch.comment!==undefined?str(patch.comment):current.comment};
 if(!next.status&&!next.comment)delete all[key];else all[key]=next;
 writeAnnotations(all);
 updateAnnotationSummary();
}
function clearAnnotations(){
 memoryAnnotations={};
 try{if(typeof localStorage!=='undefined'&&localStorage)localStorage.removeItem(STORAGE_KEY);}catch{annotationsMemoryOnly=true;}
 renderCatalog();
}
function disarmClear(){
 clearArmed=false;
 if(clearTimer&&typeof clearTimeout==='function')clearTimeout(clearTimer);
 clearTimer=0;
 const button=$('clear-annotations');if(!button)return;
 button.textContent='Clear local notes';delete button.dataset.armed;
}
function onClearAnnotations(){
 const button=$('clear-annotations');if(!button)return;
 if(!clearArmed){
  clearArmed=true;button.textContent='Confirm clear notes?';button.dataset.armed='true';
  if(typeof setTimeout==='function')clearTimer=setTimeout(disarmClear,4000);
  return;
 }
 disarmClear();clearAnnotations();
}
function focusKey(node,key){if(node&&node.dataset)node.dataset.focusKey=str(key);return node;}
function captureView(){
 const active=typeof document!=='undefined'?document.activeElement:null;
 const scroll=['catalog-list','scenario-detail'].map(id=>[id,$(id).scrollTop]);
 if(!active||!active.dataset||!active.dataset.focusKey)return {scroll};
 return {scroll,key:active.dataset.focusKey,start:active.selectionStart,end:active.selectionEnd};
}
function restoreView(saved){
 if(!saved)return;
 for(const [id,top] of saved.scroll)if(typeof top==='number')$(id).scrollTop=top;
 if(!saved.key||typeof document.querySelectorAll!=='function')return;
 const target=Array.from(document.querySelectorAll('[data-focus-key]')).find(node=>node.dataset.focusKey===saved.key);
 if(!target||target===document.activeElement)return;
 target.focus({preventScroll:true});
 if(typeof saved.start==='number'&&typeof target.setSelectionRange==='function'){try{target.setSelectionRange(saved.start,saved.end);}catch{}}
}
function syncHash(){
 if(typeof location==='undefined')return;
 const params=new URLSearchParams({view});if(selectedTest)params.set('scenario',str(selectedTest));
 const next='#'+params;if(location.hash===next)return;
 if(typeof history!=='undefined'&&history.replaceState)history.replaceState(null,'',next);else location.hash=next;
}
function applyHash(){
 if(typeof location==='undefined'||!location.hash)return;
 const params=new URLSearchParams(location.hash.slice(1)),nextView=params.get('view'),scenario=params.get('scenario');
 if(!nextView||!copy[nextView])return;
 const changedScenario=!!scenario&&scenario!==selectedTest;
 if(scenario)selectedTest=scenario;
 if(nextView!==view)showView(nextView);else if(changedScenario&&state.contract)renderCatalog();
}
function updateAnnotationSummary(){
 const node=$('annotation-summary');if(!node)return;
 const all=readAnnotations();let pass=0,fail=0,commented=0;
 for(const {test} of rows()){const a=all[str(test.id)];if(!a)continue;if(a.status==='pass')pass++;else if(a.status==='fail')fail++;if(a.comment&&str(a.comment).trim())commented++;}
 node.textContent=(pass||fail||commented)?'Local notes: '+pass+' pass · '+fail+' fail · '+commented+' commented':'Local notes: all unassessed';
  const clearBtn=$('clear-annotations');if(clearBtn)clearBtn.disabled=!Object.keys(all).length;
}
function textList(root,items,cls){const list=el('ul',undefined,cls);array(items).forEach(item=>list.append(el('li',item)));root.append(list);}
function badge(root,text,tone){if(!text)return;const cls='badge'+(tone?' badge-'+tone:(['critical','high','medium','low'].includes(str(text))?' badge-'+str(text):''));root.append(el('span',text,cls));}
function options(id,items,first){const select=$(id),previous=select.value;select.replaceChildren();const initial=el('option',first);initial.value='';select.append(initial);for(const [value,label] of items){const option=el('option',label);option.value=str(value);select.append(option);}if(items.some(item=>str(item[0])===previous))select.value=previous;}
function setupFilters(){options('module',modules().map(m=>[m.id,m.name||m.id]),'All modules');options('type',[...new Set(rows().map(row=>row.test.type).filter(Boolean))].sort().map(type=>[type,type]),'All types');if($('graph-module'))options('graph-module',modules().map(m=>[m.id,m.name||m.id]),'All modules');}
function assessmentMatches(test,annotations){
 const wanted=$('assessment').value;if(!wanted)return true;
 const entry=annotations[str(test.id)]||{},status=entry.status==='pass'||entry.status==='fail'?entry.status:'';
 if(wanted==='unassessed')return !status;
 if(wanted==='commented')return !!str(entry.comment).trim();
 return status===wanted;
}
function filteredScenarios(){const annotations=readAnnotations()||{};return rows().filter(row=>matches(row)&&assessmentMatches(row.test,annotations));}
function matches({module,test}){
 const isNft=!!test.profile||nftTypes.includes(test.type),haystack=str(test).toLowerCase();
 const refs=[...array(state.contract&&state.contract.docs),...array(module.docs),...array(module.specs),...array(test.refs)];
 return (!$('module').value||module.id===$('module').value)&&(!$('type').value||test.type===$('type').value)&&(!$('priority').value||test.priority===$('priority').value)
 &&(!$('kind').value||($('kind').value==='nft'?isNft:!isNft))
 &&$('tags').value.split(',').map(tag=>tag.trim()).filter(Boolean).every(tag=>array(test.tags).includes(tag))
 &&(!$('fixture').value||haystack.includes($('fixture').value.toLowerCase()))
 &&(!$('spec').value||refs.some(ref=>str(ref).toLowerCase().includes($('spec').value.toLowerCase())))
 &&(!$('search').value||(str(module.name)+' '+haystack).toLowerCase().includes($('search').value.toLowerCase()));
}
function createStatusSelect(testId,title,onChange,key){
 const select=focusKey(el('select',undefined,'status-select'),key+'-status:'+str(testId));
 select.setAttribute('aria-label','Assessment for '+str(testId)+' '+str(title));
 for(const [val,label] of [['','Unassessed'],['pass','Pass'],['fail','Fail']]){const opt=el('option',label);opt.value=val;select.append(opt);}
 select.value=getAnnotation(testId).status;
 select.onchange=()=>{setAnnotation(testId,{status:select.value});if(onChange)onChange(select.value);};
 return select;
}
function createCommentInput(testId,title,key){
 const area=focusKey(el('textarea',undefined,'comment-input'),key+'-comment:'+str(testId));
 area.rows=2;
 area.placeholder='Local QA note…';
 area.setAttribute('aria-label','Comment for '+str(testId)+' '+str(title));
 area.value=getAnnotation(testId).comment;
 area.oninput=()=>{setAnnotation(testId,{comment:area.value});};
 return area;
}
function renderTable(filtered){
 const body=$('table-body');if(!body)return;body.replaceChildren();
 if(!filtered.length){
  const tr=el('tr'),td=el('td',modules().length?'No scenarios match these filters. Try clearing a filter.':'No scenarios to display. Add definitions to test-truth.md, then refresh.','empty');
  td.setAttribute('colspan','10');tr.append(td);body.append(tr);return;
 }
 let currentModule='',groupIndex=0;
 for(const {module,test} of filtered){
  const modId=str(module.id);
  if(modId!==currentModule){
   currentModule=modId;groupIndex++;
   const groupRow=el('tr',undefined,'module-group'),groupHeader=el('th');
   groupHeader.id='th-mod-'+groupIndex;
   groupHeader.setAttribute('scope','colgroup');
   groupHeader.setAttribute('colspan','10');
   groupHeader.append(el('span',str(module.name||module.id)),el('span',str(module.id)+' · '+array(module.paths).join(', '),'meta'));
   groupRow.append(groupHeader);body.append(groupRow);
  }
  const modHeaderId='th-mod-'+groupIndex,rowId='th-case-'+str(test.id).replace(/[^a-zA-Z0-9_-]/g,'_');
  const stepsList=array(test.steps).length?array(test.steps):[{action:'No steps defined',data:'',expected:'None'}];
  const span=stepsList.length,ann=getAnnotation(test.id);
  const stepRows=[];
  stepsList.forEach((step,idx)=>{
   const tr=el('tr',undefined,ann.status?'row-'+ann.status:'');
   stepRows.push(tr);
   if(idx===0){
    const idCell=el('th',test.id,'col-id');
    idCell.id=rowId;idCell.setAttribute('scope','row');idCell.setAttribute('headers',modHeaderId+' th-id');
    if(span>1)idCell.setAttribute('rowspan',String(span));
    const titleCell=el('td',undefined,'col-title');
    titleCell.setAttribute('headers',modHeaderId+' '+rowId+' th-title');
    if(span>1)titleCell.setAttribute('rowspan',String(span));
    titleCell.append(el('span',test.title,'cell-title'));
    badge(titleCell,test.type);
    for(const tag of array(test.tags))badge(titleCell,tag);
    const preCell=el('td',undefined,'col-pre');
    preCell.setAttribute('headers',modHeaderId+' '+rowId+' th-pre');
    if(span>1)preCell.setAttribute('rowspan',String(span));
    if(array(test.preconditions).length)textList(preCell,test.preconditions,'pre-list');
    else preCell.append(el('span','None','muted'));
    tr.append(idCell,titleCell,preCell);
   }
   const numCell=el('td',String(idx+1),'col-step-num');
   numCell.setAttribute('headers',modHeaderId+' '+rowId+' th-steps th-step-num');
   const actCell=el('td',step.action,'col-action');
   actCell.setAttribute('headers',modHeaderId+' '+rowId+' th-steps th-action');
   const dataCell=el('td',str(step.data)||'None','col-data');
   dataCell.setAttribute('headers',modHeaderId+' '+rowId+' th-steps th-data');
   const expCell=el('td',step.expected,'col-expected');
   expCell.setAttribute('headers',modHeaderId+' '+rowId+' th-steps th-expected');
   tr.append(numCell,actCell,dataCell,expCell);
   if(idx===0){
    const prioCell=el('td',undefined,'col-priority');
    prioCell.setAttribute('headers',modHeaderId+' '+rowId+' th-priority');
    if(span>1)prioCell.setAttribute('rowspan',String(span));
    badge(prioCell,test.priority);
    const statusCell=el('td',undefined,'col-status');
    statusCell.setAttribute('headers',modHeaderId+' '+rowId+' th-status');
    if(span>1)statusCell.setAttribute('rowspan',String(span));
    statusCell.append(createStatusSelect(test.id,test.title,nextStatus=>{
     stepRows.forEach(r=>{r.className=nextStatus?'row-'+nextStatus:'';});
    },'table'));
    const commentCell=el('td',undefined,'col-comment');
    commentCell.setAttribute('headers',modHeaderId+' '+rowId+' th-comment');
    if(span>1)commentCell.setAttribute('rowspan',String(span));
    commentCell.append(createCommentInput(test.id,test.title,'table'));
    tr.append(prioCell,statusCell,commentCell);
   }
   body.append(tr);
  });
 }
}
function setNavCount(name,value,alert){const node=$('nav-count-'+name);if(!node)return;const known=typeof value==='number';node.hidden=!known;node.textContent=known?String(value):'';node.className='nav-count'+(alert?' is-alert':'');}
function focusSelectedScenario(){const active=Array.from($('catalog-list').children).find(node=>node.getAttribute&&node.getAttribute('aria-pressed')==='true');if(!active)return;active.focus();if(typeof active.scrollIntoView==='function')active.scrollIntoView({block:'nearest'});}
function moveSelection(delta){
 const filtered=filteredScenarios();if(!filtered.length)return;
 const index=filtered.findIndex(row=>row.test.id===selectedTest);
 const next=filtered[index<0?0:Math.min(filtered.length-1,Math.max(0,index+delta))];
 selectedTest=next.test.id;renderCatalog();focusSelectedScenario();
}
function renderCatalog(){const saved=captureView();renderCatalogContent();restoreView(saved);syncHash();}
function renderCatalogContent(){
 const filtered=filteredScenarios(),list=$('catalog-list');list.replaceChildren();$('count').textContent=filtered.length+' of '+rows().length+' scenarios';
 updateAnnotationSummary();
 setNavCount('catalog',state.contract?filtered.length:undefined);setNavCount('table',state.contract?filtered.length:undefined);
 if(state.contract&&!filtered.some(row=>row.test.id===selectedTest))selectedTest=filtered[0]?filtered[0].test.id:'';
 for(const {module,test} of filtered){
  const button=focusKey(el('button',undefined,'scenario'),'scenario:'+str(test.id)),ann=getAnnotation(test.id);
  button.type='button';button.setAttribute('aria-pressed',String(selectedTest===test.id));
  button.append(el('span',str(test.id)+' · '+str(module.name),'meta scenario-index'),el('strong',test.title,'scenario-title'));
  const metadata=el('span',undefined,'scenario-footer');badge(metadata,test.priority);badge(metadata,test.type);
  if(ann.status)badge(metadata,ann.status.toUpperCase(),ann.status);
  button.append(metadata);
  button.onclick=()=>{selectedTest=test.id;renderCatalog();focusSelectedScenario();};
  list.append(button);
 }
 if(!filtered.length)empty(list,modules().length?'No scenarios match these filters. Try clearing a filter.':'No scenarios to display. Add definitions to test-truth.md, then refresh.');
 const detail=$('scenario-detail');detail.replaceChildren();const row=filtered.find(row=>row.test.id===selectedTest);renderExports();renderTable(filtered);
 if(!row){empty(detail,'Select a scenario to read its steps and expected results.');return;}
  const {module,test}=row;const header=el('div',undefined,'detail-header');header.append(el('p',str(module.name)+' / '+str(test.id),'meta'),el('h2',test.title),el('p',module.description,'muted'));
  const metadata=el('div',undefined,'detail-meta');for(const tag of [test.priority,test.type,...array(test.tags)])badge(metadata,tag);header.append(metadata);detail.append(header);
 if(array(test.preconditions).length){detail.append(el('h3','Preconditions'));textList(detail,test.preconditions);}
  detail.append(el('h3','Steps · '+array(test.steps).length,'step-heading'));
 if(array(test.steps).length){const steps=el('ol',undefined,'steps');for(const step of array(test.steps)){const li=el('li'),data=str(step.data);li.append(el('strong',step.action));if(data)li.append(el('p','Data: '+data,'step-data'));li.append(el('p','Expected: '+str(step.expected),'step-expected'));steps.append(li);}detail.append(steps);}
 else empty(detail,'No steps defined for this scenario.');
 if(test.profile){detail.append(el('h2','Non-functional testing profile','section-gap'));for(const [key,value] of Object.entries(test.profile))detail.append(el('h3',key),el('pre',value));}
 const refs=[...array(state.contract.docs),...array(module.docs),...array(module.specs),...array(test.refs)];if(refs.length){detail.append(el('h3','Specifications & references'));textList(detail,[...new Set(refs)]);}
 const fixtures=state.contract.fixtures;if(fixtures&&Object.keys(fixtures).length){const section=el('details');section.append(el('summary','Workspace fixtures'));for(const [key,value] of Object.entries(fixtures))section.append(el('h3',key),el('pre',value));detail.append(section);}
 const annBox=el('section',undefined,'annotation-box');annBox.setAttribute('aria-label','Browser-local assessment');
 const statusLabel=el('label','Local assessment');statusLabel.append(createStatusSelect(test.id,test.title,()=>renderCatalog(),'detail'));
 const commentLabel=el('label','Local comment');commentLabel.append(createCommentInput(test.id,test.title,'detail'));
 annBox.append(statusLabel,commentLabel,el('p','Saved in browser storage for '+str(test.id)+' only. Never written to test-truth.md or exported.','annotation-note'));
 detail.append(annBox);
}
function renderExports(){const root=$('exports');root.replaceChildren();for(const target of ['xray','zephyr','jira','testrail','qase','obsidian','checklist']){const params=new URLSearchParams({target,format:target==='obsidian'?'json':target==='checklist'?'markdown':'csv'});for(const name of ['module','tags','priority'])if($(name).value.trim())params.set(name,$(name).value.trim());const labels={xray:'Xray',zephyr:'Zephyr',jira:'Jira',testrail:'TestRail',qase:'Qase',obsidian:'Obsidian',checklist:'Checklist'};const link=el('a',labels[target]);link.href='/api/export?'+params;link.setAttribute('download','');root.append(link);}}
function renderDrift(){
 const drift=state.drift,issues=$('issues'),status=$('drift-status');issues.replaceChildren();status.textContent=drift?(drift.blocked?'Blocking drift detected.':'No blocking drift.')+' '+str(drift.base)+' → '+str(drift.target):'Drift unavailable. A Git repository with a usable comparison may be required.';
 status.className='drift-status '+(!drift?'is-unknown':drift.blocked?'is-blocked':'is-clear');
 const driftIssues=array(drift&&drift.issues);setNavCount('drift',drift?driftIssues.length:undefined,!!drift&&(drift.blocked||driftIssues.length>0));
 for(const issue of driftIssues){const item=el('article',undefined,'issue');item.append(el('h3',issue.message||issue.kind));badge(item,issue.kind);if(issue.moduleId)badge(item,issue.moduleId);textList(item,issue.files);issues.append(item);}if(!issues.childNodes.length)empty(issues,drift?'No drift issues in this snapshot.':'No drift snapshot available.');
 const diagnostics=$('diagnostics');diagnostics.replaceChildren();const ordered=array(state.diagnostics).slice().sort((a,b)=>Number(!!a.ok)-Number(!!b.ok));for(const diagnostic of ordered){const item=el('div',undefined,diagnostic.ok?'diagnostic-check is-ok':'issue is-attention');item.append(el('strong',(diagnostic.ok?'OK · ':'Attention · ')+str(diagnostic.id)),el(diagnostic.ok?'span':'p',diagnostic.message));diagnostics.append(item);}if(!diagnostics.childNodes.length)empty(diagnostics,'No workspace diagnostics available.');
}
function graphData(){const graph=state.graph||{};return{nodes:array(graph.nodes).filter(n=>n&&typeof n.id==='string'),edges:array(graph.edges).filter(e=>e&&typeof e.source==='string'&&typeof e.target==='string')};}
function inspectNode(id){const root=$('graph');if(selectedNode===id){selectedNode='';if(root)root.dataset.userCleared='true';}else{selectedNode=id;if(root)delete root.dataset.userCleared;}renderGraph();if(selectedNode){const button=Array.from($('graph').children).find(node=>node.dataset.nodeId===selectedNode);if(button)button.focus({preventScroll:true});}}
function renderGraph(){
 const rawData=graphData(),root=$('graph'),detail=$('node-detail');root.replaceChildren();detail.replaceChildren();
 if(!rawData.nodes.length){root.style.height='auto';setNavCount('graph',undefined);empty(root,'No coverage graph available. A valid contract is needed.');empty(detail,'Select a coverage node to inspect its relationships.');return;}
 setNavCount('graph',rawData.nodes.length);
 const modFilter=$('graph-module')?$('graph-module').value:'';
 let nodes=rawData.nodes,edges=rawData.edges;
 if(modFilter){
  const targetMod=rawData.nodes.find(n=>n.id===modFilter||n.id==='module:'+modFilter);
  if(targetMod){
   const modEdges=rawData.edges.filter(e=>e.source===targetMod.id||e.target===targetMod.id);
   const connected=new Set([targetMod.id,...modEdges.flatMap(e=>[e.source,e.target])]);
   nodes=rawData.nodes.filter(n=>connected.has(n.id));
   edges=modEdges;
  }
 }
 const query=$('graph-search')?$('graph-search').value.trim().toLowerCase():'';
 const matchingIds=query?new Set(nodes.filter(n=>str(n.label).toLowerCase().includes(query)||str(n.id).toLowerCase().includes(query)).map(n=>n.id)):null;
 if(!selectedNode&&nodes.length&&!root.dataset.userCleared)selectedNode=nodes[0].id;
 if(selectedNode&&!nodes.some(n=>n.id===selectedNode))selectedNode=nodes[0]?nodes[0].id:'';
 const activeNode=nodes.find(n=>n.id===selectedNode);
 const neighbors=activeNode?edges.filter(e=>e.source===selectedNode||e.target===selectedNode):[];
 const related=new Set(neighbors.flatMap(e=>[e.source,e.target]));
 const kinds=['spec','module','source','test'],positions=new Map();
 const colWidth=220,colPitch=300,startX=24;
 const moduleNodes=nodes.filter(n=>n.kind==='module');
 const placed=new Set();
 let currentY=55;
 moduleNodes.forEach(mod=>{
  const modSources=nodes.filter(n=>n.kind==='source'&&edges.some(e=>e.source===mod.id&&e.target===n.id));
  const modTests=nodes.filter(n=>n.kind==='test'&&edges.some(e=>e.source===mod.id&&e.target===n.id));
  const clusterCount=Math.max(1,modSources.length,modTests.length);
  const clusterHeight=clusterCount*78;
  positions.set(mod.id,{x:1*colPitch+startX,y:currentY+Math.max(0,Math.floor((clusterCount-1)/2)*78)});
  placed.add(mod.id);
  modSources.forEach((src,idx)=>{if(!placed.has(src.id)){positions.set(src.id,{x:2*colPitch+startX,y:currentY+idx*78});placed.add(src.id);}});
  modTests.forEach((tst,idx)=>{if(!placed.has(tst.id)){positions.set(tst.id,{x:3*colPitch+startX,y:currentY+idx*78});placed.add(tst.id);}});
  currentY+=clusterHeight+40;
 });
 const unplaced=nodes.filter(n=>n.kind!=='spec'&&!placed.has(n.id));
 unplaced.forEach((node,idx)=>{
  const col=kinds.indexOf(node.kind);
  positions.set(node.id,{x:(col>=0?col:1)*colPitch+startX,y:currentY+idx*78});
  placed.add(node.id);
 });
 if(unplaced.length)currentY+=unplaced.length*78;
 const specPitch=86;let lastSpecY=55-specPitch,specBottom=0;
 nodes.filter(n=>n.kind==='spec').map((spec,idx)=>{
  const targetEdge=edges.find(e=>e.source===spec.id&&positions.has(e.target));
  const targetPos=targetEdge?positions.get(targetEdge.target):null;
  return {spec,desired:targetPos?targetPos.y:Infinity,idx};
 }).sort((a,b)=>a.desired-b.desired||a.idx-b.idx).forEach(({spec,desired})=>{
  const specY=Math.max(Number.isFinite(desired)?desired:55,lastSpecY+specPitch);
  positions.set(spec.id,{x:0*colPitch+startX,y:specY});
  placed.add(spec.id);lastSpecY=specY;specBottom=specY+56;
 });
 const height=Math.max(180,currentY+30,specBottom+30);
 root.style.height=height+'px';
 kinds.forEach((kind,column)=>{
  const heading=el('span',kind==='test'?'Scenarios':kind==='spec'?'Specifications':kind==='source'?'Source paths':'Modules','graph-heading');
  heading.style.left=(column*colPitch+startX)+'px';heading.style.top='16px';root.append(heading);
 });
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.setAttribute('aria-hidden','true');
 svg.setAttribute('viewBox','0 0 1168 '+height);
 svg.setAttribute('preserveAspectRatio','none');
 root.append(svg);
 const isolate=!$('graph-isolate')||$('graph-isolate').checked!==false;
 const activeEdges=activeNode?neighbors:[];
 const activeEdgeSet=new Set(activeEdges);
 const relatedMap=new Map();
 for(const e of edges){
  if(!relatedMap.has(e.source))relatedMap.set(e.source,new Set());
  if(!relatedMap.has(e.target))relatedMap.set(e.target,new Set());
  relatedMap.get(e.source).add(e.target);
  relatedMap.get(e.target).add(e.source);
 }
 function drawEdge(edge,isActive){
  const from=positions.get(edge.source),to=positions.get(edge.target);
  if(!from||!to)return;
  const path=document.createElementNS(svg.namespaceURI,'path');
  let x1,y1,x2,y2,cx1,cx2;
  if(from.x<to.x){
   const siblingEdges=activeEdges.filter(e=>e.source===edge.source&&positions.get(e.target)?.x>from.x);
   const sIdx=siblingEdges.indexOf(edge);
   const spread=siblingEdges.length>1?-14+(sIdx/(siblingEdges.length-1))*28:0;
   x1=from.x+from.width;
   y1=from.y+from.height/2+(isActive?spread:0);
   x2=to.x;
   y2=to.y+to.height/2;
   const dx=Math.min(100,Math.max(32,(x2-x1)*0.36));
   cx1=x1+dx;cx2=x2-dx;
  }else if(from.x>to.x){
   x1=from.x;y1=from.y+from.height/2;x2=to.x+to.width;y2=to.y+to.height/2;
   const dx=Math.min(100,Math.max(32,(x1-x2)*0.36));
   cx1=x1-dx;cx2=x2+dx;
  }else{
   x1=from.x+from.width;y1=from.y+from.height/2;x2=to.x+to.width;y2=to.y+to.height/2;
   cx1=x1+40;cx2=x2+40;
  }
  path.setAttribute('d','M '+x1+' '+y1+' C '+cx1+' '+y1+', '+cx2+' '+y2+', '+x2+' '+y2);
  path.setAttribute('class','graph-edge'+(isActive?' edge-active':' edge-dimmed'));
  path.setAttribute('data-source',edge.source);
  path.setAttribute('data-target',edge.target);
   path.setAttribute('stroke',isActive?'var(--graph-active, #7a91c7)':'var(--graph-line, #c7cede)');
  path.setAttribute('stroke-width',isActive?'2.5':'1');
  path.setAttribute('stroke-opacity',isActive?'1':activeNode?'0.08':'0.22');
  svg.append(path);
 }
 const visualOrder=nodes.filter(n=>positions.has(n.id)).sort((a,b)=>{const pa=positions.get(a.id),pb=positions.get(b.id);return pa.x-pb.x||pa.y-pb.y;});
 for(const node of visualOrder){
  const pos=positions.get(node.id);
  const isSelected=node.id===selectedNode;
  const isRelated=!isSelected&&related.has(node.id);
  const isDimmed=matchingIds&&!matchingIds.has(node.id);
  const button=focusKey(el('button',undefined,'graph-node'+(isSelected?' selected':isRelated?' related':'')+(isDimmed?' node-dimmed':'')),'node:'+node.id);
  button.type='button';button.style.left=pos.x+'px';button.style.top=pos.y+'px';
  button.dataset.nodeId=node.id;button.setAttribute('aria-pressed',String(isSelected));
  button.setAttribute('aria-label',str(node.kind)+': '+str(node.label));
  button.append(el('strong',node.label));
  if(node.kind==='module'){
   const cntSources=edges.filter(e=>e.source===node.id&&e.relation==='covers').length;
   const cntTests=edges.filter(e=>e.source===node.id&&e.relation==='defines').length;
   if(cntSources||cntTests)button.append(el('span',cntSources+' paths · '+cntTests+' tests','meta'));
  }else if(node.kind==='test'&&node.priority){
   badge(button,node.priority);
  }
  if(node.driftStatus&&node.driftStatus!=='unknown')button.append(el('div',node.driftStatus));
  button.onclick=()=>inspectNode(node.id);
  button.onmouseenter=()=>{
   if(selectedNode)return;
   if(typeof svg.querySelectorAll==='function'){
    svg.querySelectorAll('path').forEach(p=>{
     if(p.dataset&&(p.dataset.source===node.id||p.dataset.target===node.id))p.classList.add('edge-hover');
    });
   }
   if(typeof root.querySelectorAll==='function'){
    root.querySelectorAll('.graph-node').forEach(b=>{
     if(b.dataset&&b.dataset.nodeId!==node.id&&relatedMap.get(node.id)?.has(b.dataset.nodeId))b.classList.add('related-hover');
    });
   }
  };
  button.onmouseleave=()=>{
   if(selectedNode)return;
   if(typeof svg.querySelectorAll==='function')svg.querySelectorAll('.edge-hover').forEach(p=>p.classList.remove('edge-hover'));
   if(typeof root.querySelectorAll==='function')root.querySelectorAll('.related-hover').forEach(b=>b.classList.remove('related-hover'));
  };
  root.append(button);
 }
 // Labels and badges determine card height; measure before spacing cards and drawing edges.
 const columnBottoms=new Map();let measuredBottom=55;
 for(const button of root.children){
  const pos=positions.get(button.dataset.nodeId);if(!pos)continue;
  pos.height=button.offsetHeight||56;pos.width=button.offsetWidth||colWidth;
  pos.y=Math.max(pos.y,columnBottoms.get(pos.x)||55);button.style.top=pos.y+'px';
  columnBottoms.set(pos.x,pos.y+pos.height+22);measuredBottom=Math.max(measuredBottom,pos.y+pos.height);
 }
 const measuredHeight=Math.max(180,measuredBottom+30);root.style.height=measuredHeight+'px';
 svg.setAttribute('viewBox','0 0 '+(root.clientWidth||1168)+' '+measuredHeight);
 if(!isolate){for(const edge of edges){if(!activeEdgeSet.has(edge))drawEdge(edge,false);}}
 for(const edge of activeEdges)drawEdge(edge,true);
 const canvas=root.parentElement,selectedPosition=positions.get(selectedNode);
 if(view==='graph'&&canvas&&selectedPosition&&canvas.clientWidth&&canvas.clientWidth<root.clientWidth){
  const {x,y,width,height}=selectedPosition;
  // Reveal selection inside the diagram without scrolling the document or changing layout.
  if(x<canvas.scrollLeft||x+width>canvas.scrollLeft+canvas.clientWidth)canvas.scrollLeft=Math.max(0,x-24);
  if(y<canvas.scrollTop||y+height>canvas.scrollTop+canvas.clientHeight)canvas.scrollTop=Math.max(0,y-55);
 }
 if(!activeNode){
  empty(detail,'Select a coverage node to inspect its definition and relationships.');
  return;
 }
 detail.append(el('p',activeNode.kind,'meta'),el('h2',activeNode.label));
 for(const value of [activeNode.type,activeNode.priority,activeNode.driftStatus,...array(activeNode.tags)])if(value!=='unknown')badge(detail,value);
 detail.append(el('pre',activeNode.content||'No additional content.'),el('h3','Connected neighbors'));
 for(const edge of neighbors){
  const other=nodes.find(n=>n.id===(edge.source===selectedNode?edge.target:edge.source));
  if(!other)continue;
  const button=el('button',str(edge.relation)+' · '+str(other.label),'neighbor');
  button.type='button';button.onclick=()=>inspectNode(other.id);
  detail.append(button);
 }
 if(!neighbors.length)empty(detail,'No connected neighbors.');
}
function pretty(value){return value==null?'Not present':typeof value==='string'?value:JSON.stringify(value,null,2);}
function renderDiff(){
 const root=$('diff-content'),diff=state.diff;root.replaceChildren();if(!diff){setNavCount('diff',undefined);$('diff-status').textContent='Semantic diff unavailable. No Git comparison is available for this workspace.';empty(root,'Your current contract is still available in the catalog.');return;}
 const changes=array(diff.changes);setNavCount('diff',changes.length);$('diff-status').textContent=str(diff.message||diff.reason||str(diff.base)+' → '+str(diff.target)+' · '+changes.length+' semantic changes');
 for(const change of changes){const item=el('article',undefined,'diff-row');item.append(el('h2',[change.moduleId,change.testId,change.field].filter(Boolean).join(' / ')||change.entity||'Contract change'));badge(item,change.kind);const columns=el('div',undefined,'diff-columns');for(const side of ['before','after']){const panel=el('section',undefined,'diff-side '+side);panel.append(el('h3',side==='before'?'Before':'After'),el('pre',pretty(change[side])));columns.append(panel);}item.append(columns);root.append(item);}if(!changes.length)empty(root,diff.available===false?'No base revision available. This can happen outside Git or before the first commit.':'No semantic contract changes.');
}
const copy={
 catalog:['Scenario catalog','Inspect manual QA scenarios, steps, profiles and linked specifications.'],
 table:['Test document','Review full scenario specifications, ordered steps and browser-local pass/fail notes in a structured table.'],
 drift:['Live drift','Inspect where tracked source files, specifications and manual checks have diverged.'],
 graph:['Coverage graph','Trace how specifications, modules, source paths and scenarios connect.'],
 diff:['Semantic diff','Compare contract definition changes side by side against the Git baseline.']
};
function showView(next){
 if(!copy[next])return;
 const previous=view;
 view=next;
 for(const name of Object.keys(copy))$('view-'+name).hidden=name!==view;
 document.querySelectorAll('[data-view]').forEach(button=>{const active=button.dataset.view===view;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;});
 const filterable=view==='catalog'||view==='table';
 $('filters').hidden=!filterable;
 if($('filter-toolbar'))$('filter-toolbar').hidden=!filterable;
 if($('export-bar'))$('export-bar').hidden=!filterable;
 $('heading').textContent=copy[view][0];
 $('description').textContent=copy[view][1];
 if(view==='graph')renderGraph();
 if(filterable&&previous!==view&&state.contract)renderCatalog();else syncHash();
}
function render(){const saved=captureView();setupFilters();$('project').textContent=state.contract?str(state.contract.project)+' · '+modules().length+' modules · '+rows().length+' scenarios':'Contract unavailable';renderCatalog();renderDrift();renderGraph();renderDiff();restoreView(saved);}
async function json(url){const response=await fetch(url,{headers:{Accept:'application/json'},cache:'no-store'});if(!response.ok){let message='Request failed ('+response.status+').';try{const payload=await response.json();message=str(payload.error||payload.message||message);}catch{}throw new Error(message);}return response.json();}
function showErrors(messages){const root=$('errors');root.replaceChildren();root.hidden=!messages.length;root.className='notice';for(const message of messages)root.append(el('p',message));}
async function load(){const current=++request;$('refresh').setAttribute('aria-busy','true');try{const data=await json('/api/state');if(current!==request)return;if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('The viewer received an invalid state response.');state=data;const errors=Array.isArray(data.errors)?data.errors.map(e=>typeof e==='string'?e:e?str(e.source?e.source+': '+str(e.message):e.message||e):'Unknown viewer error'):data.errors?Object.entries(data.errors).map(([key,value])=>key+': '+str(value)):[];if(data.contract&&!Array.isArray(data.contract.modules)){state.contract=null;errors.push('Contract is malformed: modules must be a list. Fix test-truth.md and refresh.');}showErrors(errors);render();$('connection').textContent='Updated '+new Date().toLocaleTimeString();}catch(error){if(current===request){showErrors([error.message+' Use Refresh to retry. The last loaded snapshot is retained.']);$('connection').textContent='Unable to refresh';}}finally{if(current===request)$('refresh').removeAttribute('aria-busy');}}
$('refresh').onclick=load;values.forEach(id=>$(id).addEventListener('input',renderCatalog));$('reset').onclick=()=>{values.forEach(id=>$(id).value='');renderCatalog();};if($('clear-annotations'))$('clear-annotations').onclick=onClearAnnotations;if($('graph-isolate'))$('graph-isolate').onchange=()=>renderGraph();if($('graph-module'))$('graph-module').onchange=()=>renderGraph();if($('graph-search'))$('graph-search').oninput=()=>renderGraph();if($('graph-clear-sel'))$('graph-clear-sel').onclick=()=>{const root=$('graph');if(root)root.dataset.userCleared='true';selectedNode='';renderGraph();};
document.querySelectorAll('[data-view]').forEach((button,index,buttons)=>{
 button.onclick=()=>showView(button.dataset.view);
 button.onkeydown=event=>{
  const target=event.key==='ArrowRight'?(index+1)%buttons.length:event.key==='ArrowLeft'?(index+buttons.length-1)%buttons.length:event.key==='Home'?0:event.key==='End'?buttons.length-1:-1;
  if(target<0)return;
  event.preventDefault();
  const next=buttons[target];
  if(next){next.focus();showView(next.dataset.view);}
 };
});
document.querySelectorAll('.icon-rail a').forEach(link=>{link.onclick=event=>{event.preventDefault();const target=$(link.getAttribute('href').slice(1));if(target)target.focus();};});
function typingTarget(target){const tag=target&&target.tagName;return tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||!!(target&&target.isContentEditable);}
if(typeof document.addEventListener==='function')document.addEventListener('keydown',event=>{
 if(event.defaultPrevented||event.metaKey||event.ctrlKey||event.altKey||typingTarget(event.target))return;
 if(event.key==='/'&&(view==='catalog'||view==='table')){event.preventDefault();$('search').focus();if(typeof $('search').select==='function')$('search').select();}
 else if((event.key==='j'||event.key==='k')&&view==='catalog'){event.preventDefault();moveSelection(event.key==='j'?1:-1);}
});
if(typeof window!=='undefined'&&typeof window.addEventListener==='function')window.addEventListener('hashchange',applyHash);
if(typeof window!=='undefined'&&typeof window.matchMedia==='function'){
 const wideFilters=window.matchMedia('(min-width: 601px)');
 const adaptFilters=()=>{const filters=$('secondary-filters');filters.open=wideFilters.matches;if(view==='graph')renderGraph();};
 adaptFilters();wideFilters.addEventListener('change',adaptFilters);
}
applyHash();
$('impact-form').onsubmit=async event=>{event.preventDefault();const current=++impactRequest,root=$('impact-result');root.replaceChildren(el('p','Tracing impact…'));try{const result=await json('/api/impact?'+new URLSearchParams({path:$('impact-path').value.trim()}));if(current!==impactRequest)return;root.replaceChildren();const impacted=array(result.modules);root.append(el('p',impacted.length+' connected modules'));for(const module of impacted){root.append(el('h3',module.id));textList(root,array(module.tests).map(test=>str(test.id)+' · '+str(test.title)));for(const spec of array(module.specs))root.append(el('p',str(spec.pointer)+(spec.error?' · '+str(spec.error):''),'meta'));}if(!impacted.length)empty(root,'No mapped modules match this path.');}catch(error){if(current===impactRequest)root.replaceChildren(el('p',error.message,'error'));}};
load();
if(typeof EventSource!=='undefined'){const events=new EventSource('/events');events.addEventListener('reload',()=>load());events.addEventListener('change',()=>load());events.onmessage=()=>load();events.onopen=()=>{$('connection').textContent='Live · connected';load();};events.onerror=()=>{$('connection').textContent='Reconnecting · snapshot retained';};}
</script>
</body></html>`;
