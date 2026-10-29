import test from 'node:test';
import assert from 'node:assert/strict';
import { Script, createContext } from 'node:vm';
import { viewerPage } from '../src/ui/page.js';
import { generateExport } from '../src/integrations/exporters.js';
import { contractFixture } from './helpers.js';

test('viewer embeds valid standalone browser JavaScript and no remote assets', () => {
  const scripts = [...viewerPage.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 1);
  assert.doesNotThrow(() => new Script(scripts[0]![1]!));
  assert.doesNotMatch(viewerPage, /(?:src|href)=["']https?:\/\//);
  assert.doesNotMatch(scripts[0]![1]!, /innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(/);
  assert.match(scripts[0]![1]!, /textContent/);
  assert.match(scripts[0]![1]!, /addEventListener\('reload'/);
});

test('viewer provides the redesigned local shell and five accessible views with compact filters', () => {
  assert.match(viewerPage, /<html lang="en">/);
  assert.match(viewerPage, /class="skip" href="#main"/);
  assert.match(viewerPage, /aria-label="Workspace shortcuts"/);
  assert.match(viewerPage, /:focus-visible/);
  assert.match(viewerPage, /prefers-reduced-motion/);
  assert.match(viewerPage, /aria-live="polite"/);
  assert.match(viewerPage, /role="alert"/);
  assert.match(viewerPage, /<nav aria-label="Viewer sections" role="tablist">/);
  assert.match(viewerPage, /<details id="secondary-filters" class="advanced-filters" open><summary>Filters<\/summary>/);
  assert.match(viewerPage, /<div class="filter-primary"><label>Search<input id="search"/);
  assert.match(viewerPage, /<caption>Ordered steps with browser-local Pass\/Fail and comments\./);
  assert.doesNotMatch(viewerPage, /<div class="view-heading"><div><h2>(?:Manual QA test document|Contract changes)<\/h2>/);
  assert.match(viewerPage, /<details id="export-bar"/);
  for (const view of ['catalog', 'table', 'drift', 'graph', 'diff']) {
    assert.match(viewerPage, new RegExp('<button type="button" role="tab" id="tab-' + view + '" aria-controls="view-' + view + '"[^>]*data-view="' + view + '"'));
    assert.match(viewerPage, new RegExp('id="view-' + view + '"'));
  }
  for (const id of ['module', 'type', 'priority', 'kind', 'tags', 'fixture', 'spec', 'search', 'assessment']) {
    assert.match(viewerPage, new RegExp('<label>[^<]+<(?:input|select) id="' + id + '"'));
  }
  assert.match(viewerPage, /<select id="assessment"><option value="">All assessments<\/option><option value="unassessed">Unassessed<\/option><option value="pass">Pass<\/option><option value="fail">Fail<\/option><option value="commented">Commented<\/option><\/select>/);
  assert.match(viewerPage, /class="table-wrap" role="region" aria-label="Test document table" tabindex="0"/);
  for (const headerId of ['th-id', 'th-title', 'th-pre', 'th-steps', 'th-step-num', 'th-action', 'th-data', 'th-expected', 'th-priority', 'th-status', 'th-comment']) {
    assert.match(viewerPage, new RegExp('id="' + headerId + '"'));
  }
  assert.match(viewerPage, /aria-pressed/);
  assert.match(viewerPage, /id="impact-form"/);
  assert.match(viewerPage, /'xray','zephyr','jira','testrail','qase','obsidian','checklist'/);
  assert.match(viewerPage, /snapshot retained/);
});

test('viewer renders hostile text, semantic diff, neighbors, test-document table and persistent filters without HTML parsing', async () => {
  const measuredHeights: Record<string, number> = {};
  let graphVisible = true;
  class Node {
    tag = '';
    id = '';
    children: Node[] = [];
    dataset: Record<string, string> = {};
    style: Record<string, string> = {};
    attributes: Record<string, string> = {};
    value = '';
    textContent = '';
    className = '';
    hidden = false;
    disabled = false;
    tabIndex = 0;
    open = false;
    clientWidth = 0;
    clientHeight = 0;
    scrollLeft = 0;
    scrollTop = 0;
    parentElement?: Node;
    namespaceURI = 'http://www.w3.org/2000/svg';
    onchange?: () => void;
    oninput?: () => void;
    onclick?: () => void;
    onkeydown?: (event: { key: string; preventDefault(): void }) => void;
    constructor(tag = 'div') { this.tag = tag; }
    append(...nodes: Node[]) { this.children.push(...nodes); }
    replaceChildren(...nodes: Node[]) { this.children = nodes; }
    setAttribute(key: string, value: string) { this.attributes[key] = value; }
    getAttribute(key: string) { return this.attributes[key]; }
    removeAttribute(key: string) { delete this.attributes[key]; }
    addEventListener() {}
    focus() {}
    get offsetHeight() { return graphVisible ? measuredHeights[this.dataset.nodeId ?? ''] ?? 56 : 0; }
    get offsetWidth() { return 220; }
    get childNodes() { return this.children; }
  }
  const nodes = new Map<string, Node>();
  const storage = new Map<string, string>();
  const localStorage = {
    getItem(key: string) { return storage.get(key) ?? null; },
    setItem(key: string, value: string) { storage.set(key, value); },
    removeItem(key: string) { storage.delete(key); },
  };
  const navButtons = ['catalog', 'table', 'drift', 'graph', 'diff'].map((view) => {
    const button = new Node('button');
    button.dataset.view = view;
    return button;
  });
  const graphCanvas = new Node('div');
  graphCanvas.clientWidth = 480;
  graphCanvas.clientHeight = 360;
  let wideViewport = false;
  let onMediaChange: (() => void) | undefined;
  const mediaQuery = {
    get matches() { return wideViewport; },
    addEventListener(_event: string, listener: () => void) { onMediaChange = listener; },
  };
  const document = {
    getElementById(id: string) {
      if (!nodes.has(id)) {
        const node = new Node();
        node.id = id;
        if (id === 'graph') { node.clientWidth = 1168; node.parentElement = graphCanvas; }
        nodes.set(id, node);
      }
      return nodes.get(id)!;
    },
    createElement(tag: string) { return new Node(tag); },
    createElementNS(_ns: string, tag: string) { return new Node(tag); },
    querySelectorAll(selector: string) { return selector === '[data-view]' ? navButtons : []; },
  };
  const script = viewerPage.match(/<script>([\s\S]*?)<\/script>/)![1]!;
  const context = createContext({ document, URLSearchParams, localStorage, window: { matchMedia: () => mediaQuery, addEventListener() {} } });
  new Script(script.slice(0, script.indexOf('load();'))).runInContext(context);
  const hostile = '<img src=x onerror=alert(1)>';
  const canonicalContract = contractFixture();
  const snapshotBefore = JSON.stringify(canonicalContract);
  context.fixture = {
    contract: { project: hostile, modules: [{ id: 'auth', name: hostile, paths: ['src/auth.ts'], tests: [{
      id: 'AUTH-1', title: hostile, priority: 'high', type: 'security', tags: ['smoke'],
      preconditions: [hostile, 'Second precondition'],
      steps: [
        { action: hostile, data: 'fixture:user', expected: hostile },
        { action: 'Second step action', data: '', expected: 'Second step expected' },
      ],
      refs: ['docs/auth.md#login'], profile: { checklist: [hostile] },
    }] }] },
    graph: { nodes: [{ id: 'module:auth', kind: 'module', label: hostile }, { id: 'test:AUTH-1', kind: 'test', label: 'Login' }],
      edges: [{ source: 'module:auth', target: 'test:AUTH-1', relation: 'defines' }] },
    drift: { issues: [{ kind: 'stale-module', message: hostile, files: ['src/auth.ts'] }] },
    diagnostics: [{ id: 'dead-path', ok: false, message: hostile }],
    diff: { base: 'HEAD', target: 'working-tree', changes: [{ kind: 'modified', entity: 'test', moduleId: 'auth', testId: 'AUTH-1', field: 'steps', before: 'old', after: hostile }] },
  };
  new Script('state=fixture;render();').runInContext(context);
  const disclosure = nodes.get('secondary-filters')!;
  assert.equal(disclosure.open, false, 'secondary filters start collapsed at narrow widths');
  nodes.get('module')!.value = 'auth';
  nodes.get('tags')!.value = 'smoke';
  wideViewport = true;
  onMediaChange!();
  assert.equal(disclosure.open, true, 'secondary filters open at desktop widths');
  assert.equal(nodes.get('module')!.value, 'auth');
  assert.equal(nodes.get('tags')!.value, 'smoke');
  wideViewport = false;
  onMediaChange!();
  assert.equal(disclosure.open, false, 'secondary filters collapse on return to narrow widths');
  assert.equal(nodes.get('module')!.value, 'auth');
  assert.equal(nodes.get('tags')!.value, 'smoke');
  const texts = (node: Node): string => node.textContent + node.children.map(texts).join('\n');
  for (const id of ['scenario-detail', 'table-body', 'issues', 'diagnostics', 'node-detail', 'diff-content']) {
    assert.ok(texts(nodes.get(id)!).includes(hostile), id);
  }
  const findAll = (root: Node, predicate: (node: Node) => boolean): Node[] =>
    [...(predicate(root) ? [root] : []), ...root.children.flatMap((child) => findAll(child, predicate))];

  const tableBody = nodes.get('table-body')!;
  assert.equal(tableBody.children.length, 3, '1 module group header row + 2 ordered step rows');
  const groupHeader = tableBody.children[0]!.children[0]!;
  assert.equal(groupHeader.getAttribute('scope'), 'colgroup');
  assert.equal(groupHeader.getAttribute('colspan'), '10');
  const firstStepRow = tableBody.children[1]!;
  const secondStepRow = tableBody.children[2]!;
  const idHeader = firstStepRow.children[0]!;
  assert.equal(idHeader.tag, 'th');
  assert.equal(idHeader.getAttribute('scope'), 'row');
  assert.equal(idHeader.getAttribute('rowspan'), '2');
  assert.equal(idHeader.getAttribute('headers'), 'th-mod-1 th-id');
  assert.match(firstStepRow.children[4]!.getAttribute('headers')!, /th-steps th-action/);
  assert.match(firstStepRow.children[5]!.getAttribute('headers')!, /th-steps th-data/);
  assert.match(firstStepRow.children[6]!.getAttribute('headers')!, /th-steps th-expected/);
  assert.equal(secondStepRow.children.length, 4, 'continuation step row contains only step #, action, data, expected');
  assert.equal(secondStepRow.children[2]!.textContent, 'None');

  // Verify Pass/Fail and comment controls start unassessed and remain isolated in browser-local storage
  const selects = findAll(tableBody, (node) => node.tag === 'select');
  const textareas = findAll(tableBody, (node) => node.tag === 'textarea');
  assert.equal(selects.length, 1);
  assert.equal(textareas.length, 1);
  assert.equal(selects[0]!.value, '', 'starts unassessed');
  assert.deepEqual(selects[0]!.children.map((opt) => [opt.value, opt.textContent]), [
    ['', 'Unassessed'],
    ['pass', 'Pass'],
    ['fail', 'Fail'],
  ]);
  assert.match(texts(nodes.get('annotation-summary')!), /all unassessed/);

  selects[0]!.value = 'pass';
  selects[0]!.onchange!();
  textareas[0]!.value = 'Verified on local loopback build';
  textareas[0]!.oninput!();

  assert.equal(firstStepRow.className, 'row-pass');
  assert.equal(secondStepRow.className, 'row-pass');
  assert.match(texts(nodes.get('annotation-summary')!), /1 pass · 0 fail · 1 commented/);
  const stored = JSON.parse(storage.get('testweave.localAnnotations.v1')!) as Record<string, { status: string; comment: string }>;
  assert.deepEqual(stored, { 'AUTH-1': { status: 'pass', comment: 'Verified on local loopback build' } });

  // Contract state in memory, canonical fixture, and exports are never mutated by local annotations
  const contractInState = new Script('JSON.stringify(state.contract)').runInContext(context) as string;
  assert.doesNotMatch(contractInState, /Verified on local loopback build|"status":"pass"/);
  assert.equal(JSON.stringify(canonicalContract), snapshotBefore);
  const exportedChecklist = generateExport(canonicalContract, { target: 'checklist', format: 'markdown' });
  assert.doesNotMatch(exportedChecklist.content, /Verified on local loopback build|pass/i);
  const exportHrefs = nodes.get('exports')!.children.map((link) => link.attributes.href ?? '').join('\n');
  assert.doesNotMatch(exportHrefs, /status|comment|pass|fail/i);

  const assessment = nodes.get('assessment')!;
  const checkAssessment = (value: string, visible: boolean) => {
    assessment.value = value;
    new Script('renderCatalog();').runInContext(context);
    assert.equal(tableBody.children.length, visible ? 3 : 1, `${value} table filter`);
    assert.equal(nodes.get('catalog-list')!.children.length, 1, `${value} catalog filter`);
    assert.match(texts(nodes.get('catalog-list')!), visible ? /AUTH-1/ : /No scenarios match/);
  };
  checkAssessment('pass', true);
  checkAssessment('fail', false);
  checkAssessment('unassessed', false);
  checkAssessment('commented', true);
  selects[0]!.value = 'fail';
  selects[0]!.onchange!();
  checkAssessment('fail', true);
  checkAssessment('pass', false);
  selects[0]!.value = '';
  selects[0]!.onchange!();
  checkAssessment('unassessed', true);
  textareas[0]!.value = '';
  textareas[0]!.oninput!();
  checkAssessment('commented', false);
  assessment.value = '';
  new Script('renderCatalog();').runInContext(context);
  textareas[0]!.value = 'Verified on local loopback build';
  textareas[0]!.oninput!();

  // Every tab selects its matching panel; filters and exports stay with catalog/table views.
  const views = ['catalog', 'table', 'drift', 'graph', 'diff'];
  for (const view of views) {
    new Script(`showView('${view}');`).runInContext(context);
    for (const name of views) assert.equal(nodes.get('view-' + name)!.hidden, name !== view, name + ' panel');
    const activeTab = navButtons.find((button) => button.dataset.view === view)!;
    assert.equal(activeTab.getAttribute('aria-selected'), 'true', view + ' selected tab');
    assert.equal(activeTab.tabIndex, 0, view + ' tab stop');
    assert.equal(nodes.get('filters')!.hidden, !['catalog', 'table'].includes(view), view + ' filter visibility');
    assert.equal(nodes.get('export-bar')!.hidden, !['catalog', 'table'].includes(view), view + ' export visibility');
  }
  navButtons[1]!.onkeydown!({ key: 'ArrowRight', preventDefault() {} });
  assert.equal(nodes.get('view-drift')!.hidden, false);
  assert.equal(navButtons[2]!.getAttribute('aria-selected'), 'true');
  assert.equal(nodes.get('filters')!.hidden, true, 'filters hide in non-catalog/table views');

  // First click arms confirmation; only the second click removes local notes.
  const clearButton = nodes.get('clear-annotations')!;
  clearButton.onclick!();
  assert.ok(storage.has('testweave.localAnnotations.v1'));
  assert.equal(clearButton.dataset.armed, 'true');
  assert.match(clearButton.textContent, /Confirm clear notes/);
  clearButton.onclick!();
  assert.equal(storage.get('testweave.localAnnotations.v1'), undefined);
  assert.equal(clearButton.dataset.armed, undefined);
  assert.equal(clearButton.textContent, 'Clear local notes');
  assert.match(texts(nodes.get('annotation-summary')!), /all unassessed/);

  assert.match(texts(nodes.get('diff-content')!), /auth \/ AUTH-1 \/ steps/);
  assert.match(texts(nodes.get('node-detail')!), /defines · Login/);

  // Coverage graph uses spacious layout, smooth Bézier curves, and line isolation
  const graphNode = nodes.get('graph')!;
  const svgNode = graphNode.children.find((c) => c.tag === 'svg')!;
  assert.match(svgNode.getAttribute('viewBox')!, /^0 0 [1-9]\d*(?:\.\d+)? [1-9]\d*(?:\.\d+)?$/);
  const paths = findAll(svgNode, (c) => c.tag === 'path');
  assert.equal(paths.length, 1);
  assert.match(paths[0]!.getAttribute('d')!, /^M \d+ \d+ C \d+(?:\.\d+)? \d+, \d+(?:\.\d+)? \d+, \d+ \d+$/);
  assert.equal(paths[0]!.getAttribute('class'), 'graph-edge edge-active');

  // Clearing selection isolates view and removes all confusing lines
  nodes.get('graph-clear-sel')!.onclick!();
  assert.match(texts(nodes.get('node-detail')!), /Select a coverage node to inspect/);
  const svgAfterClear = graphNode.children.find((c) => c.tag === 'svg')!;
  const pathsAfterClear = findAll(svgAfterClear, (c) => c.tag === 'path');
  assert.equal(pathsAfterClear.length, 0, 'zero confusing lines rendered when nothing is selected in isolate mode');

  // Clicking a node selects it; clicking again deselects it
  const authNodeButton = graphNode.children.find((c) => c.dataset.nodeId === 'module:auth')!;
  authNodeButton.onclick!();
  assert.match(texts(nodes.get('node-detail')!), /defines · Login/);
  authNodeButton.onclick!();
  assert.match(texts(nodes.get('node-detail')!), /Select a coverage node to inspect/);
  authNodeButton.onclick!();

  // Graph module filter and node search
  nodes.get('graph-module')!.value = 'auth';
  nodes.get('graph-module')!.onchange!();
  assert.equal(graphNode.children.filter((c) => c.dataset.nodeId).length, 2);
  nodes.get('graph-search')!.value = 'Login';
  nodes.get('graph-search')!.oninput!();
  const loginBtn = graphNode.children.find((c) => c.dataset.nodeId === 'test:AUTH-1')!;
  assert.doesNotMatch(loginBtn.className, /node-dimmed/);
  nodes.get('graph-search')!.value = '';
  nodes.get('graph-search')!.oninput!();
  nodes.get('graph-module')!.value = '';
  nodes.get('graph-module')!.onchange!();
  new Script("selectedNode='test:AUTH-1';showView('graph');").runInContext(context);
  assert.ok(graphCanvas.scrollLeft > 0, 'narrow graph scroll reveals selected node in the later column');
  assert.equal(graphNode.children.find((node) => node.dataset.nodeId === 'test:AUTH-1')!.getAttribute('aria-pressed'), 'true');
  // Browser measurements can exceed the original 78px slot in every column.
  const longLabel = 'A long multiline graph label that includes the complete scenario title and its metadata without clipping';
  const tallNodes = ['spec', 'module', 'source', 'test'].flatMap((kind) => [1, 2].map((index) => ({
    id: kind + ':long-' + index, kind, label: longLabel + index, priority: 'high',
  })));
  tallNodes.forEach((node, index) => { measuredHeights[node.id] = 120 + index * 16; });
  context.tallGraph = {
    nodes: tallNodes,
    edges: [
      { source: 'spec:long-1', target: 'module:long-1', relation: 'specifies' },
      { source: 'spec:long-2', target: 'module:long-1', relation: 'specifies' },
      { source: 'module:long-1', target: 'source:long-1', relation: 'covers' },
      { source: 'module:long-1', target: 'source:long-2', relation: 'covers' },
      { source: 'module:long-1', target: 'test:long-1', relation: 'defines' },
      { source: 'module:long-1', target: 'test:long-2', relation: 'defines' },
    ],
  };
  graphVisible = false;
  new Script("state.graph=tallGraph;selectedNode='module:long-1';renderGraph();").runInContext(context);
  graphVisible = true;
  new Script("showView('graph');").runInContext(context);
  const cards = graphNode.children.filter((node) => node.dataset.nodeId);
  for (let index = 1; index < cards.length; index++) {
    const previous = cards[index - 1]!, current = cards[index]!;
    const previousX = Number.parseFloat(previous.style.left!), currentX = Number.parseFloat(current.style.left!);
    assert.ok(currentX >= previousX, 'DOM order follows graph columns');
    if (currentX === previousX) {
      assert.ok(Number.parseFloat(current.style.top!) >= Number.parseFloat(previous.style.top!) + previous.offsetHeight,
        current.dataset.nodeId + ' must not overlap the preceding multiline card');
    }
  }
  const measuredSvg = graphNode.children.find((node) => node.tag === 'svg')!;
  for (const edge of measuredSvg.children) {
    const source = cards.find((node) => node.dataset.nodeId === edge.getAttribute('data-source'))!;
    const target = cards.find((node) => node.dataset.nodeId === edge.getAttribute('data-target'))!;
    const points = edge.getAttribute('d')!.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    assert.equal(points.at(-1), Number.parseFloat(target.style.top!) + target.offsetHeight / 2, 'edge lands at measured target center');
    assert.ok(points[1]! >= Number.parseFloat(source.style.top!) && points[1]! <= Number.parseFloat(source.style.top!) + source.offsetHeight,
      'edge starts within the measured source card');
  }
  assert.ok(Number.parseFloat(graphNode.style.height!) >= Math.max(...cards.map((node) => Number.parseFloat(node.style.top!) + node.offsetHeight)));
  new Script('state.graph=fixture.graph;renderGraph();').runInContext(context);
  document.getElementById('module').value = 'auth';
  document.getElementById('tags').value = 'smoke';
  new Script('render();').runInContext(context);
  assert.equal(nodes.get('module')!.value, 'auth');
  assert.equal(nodes.get('tags')!.value, 'smoke');
  document.getElementById('search').value = 'does-not-match';
  new Script('renderCatalog();').runInContext(context);
  assert.match(texts(nodes.get('catalog-list')!), /No scenarios match/);
  assert.match(texts(nodes.get('table-body')!), /No scenarios match/);
  new Script('state={contract:null,drift:null,graph:null,diff:null,diagnostics:null};render();').runInContext(context);
  assert.match(texts(nodes.get('project')!), /Contract unavailable/);
  assert.match(texts(nodes.get('diff-content')!), /catalog/);
  context.fetch = async () => ({ ok: true, json: async () => ({ contract: { modules: 'invalid' }, errors: [{ source: 'git', message: 'No HEAD' }] }) });
  await new Script('load();').runInContext(context);
  assert.match(texts(nodes.get('errors')!), /git: No HEAD/);
  assert.match(texts(nodes.get('errors')!), /Contract is malformed/);
  context.fetch = async () => { throw new Error('Connection lost'); };
  await new Script('load();').runInContext(context);
  assert.match(texts(nodes.get('errors')!), /Connection lost.*Refresh to retry/);
  assert.match(texts(nodes.get('connection')!), /Unable to refresh/);

  storage.set('testweave.localAnnotations.v1', JSON.stringify({ 'REMOVED-1': { status: 'pass', comment: 'Old note' } }));
  new Script('state.contract={modules:[]};updateAnnotationSummary();').runInContext(context);
  assert.equal(clearButton.disabled, false, 'notes for removed IDs can still be cleared');
  clearButton.onclick!();
  assert.ok(storage.has('testweave.localAnnotations.v1'), 'orphan clear still requires confirmation');
  clearButton.onclick!();
  assert.equal(storage.has('testweave.localAnnotations.v1'), false);

  storage.set('testweave.localAnnotations.v1', JSON.stringify({ 'AUTH-1': { status: 'pass', comment: 'Old note' } }));
  localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
  new Script("setAnnotation('AUTH-1',{status:'fail',comment:'New note'});").runInContext(context);
  assert.equal(new Script("getAnnotation('AUTH-1').comment").runInContext(context), 'New note');
  assert.equal(new Script("getAnnotation('AUTH-1').status").runInContext(context), 'fail');
  new Script("setAnnotation('AUTH-2',{comment:'Another note'});").runInContext(context);
  assert.equal(new Script("getAnnotation('AUTH-1').comment").runInContext(context), 'New note', 'later writes retain memory edits');
  localStorage.removeItem = () => { throw new Error('Storage unavailable'); };
  clearButton.onclick!();
  clearButton.onclick!();
  assert.equal(new Script('Object.keys(readAnnotations()).length').runInContext(context), 0, 'failed removal clears the session copy');
});
