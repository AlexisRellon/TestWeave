import type { TestTruth } from '../schema/test-truth.js';
import { createHash } from 'node:crypto';

export interface GraphNode {
  id: string; kind: 'spec' | 'module' | 'source' | 'test'; label: string;
  priority?: string; type?: string; tags?: string[]; driftStatus: string; content: string;
}
export interface ContractGraph { nodes: GraphNode[]; edges: { source: string; target: string; relation: string }[] }
export function contractGraph(contract: TestTruth, drift: Record<string, string> = {}): ContractGraph {
  const nodes = new Map<string, GraphNode>();
  const edges: ContractGraph['edges'] = [];
  const add = (kind: GraphNode['kind'], key: string, label = key, content = ''): string => {
    const id = `${kind}:${key}`;
    if (!nodes.has(id)) nodes.set(id, { id, kind, label, content, driftStatus: 'unknown' });
    return id;
  };
  const link = (source: string, target: string, relation: string) => {
    if (!edges.some((edge) => edge.source === source && edge.target === target && edge.relation === relation)) edges.push({ source, target, relation });
  };
  for (const pointer of contract.docs ?? []) add('spec', pointer);
  for (const module of contract.modules) {
    const id = add('module', module.id, module.name, module.description);
    nodes.get(id)!.driftStatus = drift[module.id] ?? 'unknown';
    for (const pointer of [...contract.docs ?? [], ...module.docs ?? [], ...module.specs ?? []]) link(add('spec', pointer), id, 'specifies');
    for (const source of module.paths) link(id, add('source', source), 'covers');
    for (const test of module.tests) {
      const testId = add('test', test.id, test.title,
        [...test.preconditions.map((value) => `Precondition: ${value}`), ...test.steps.map((step, index) =>
          `${index + 1}. ${step.action}\n   Data: ${step.data}\n   Expected: ${step.expected}`),
        ...(test.profile ? [`Profile: ${JSON.stringify(test.profile)}`] : [])].join('\n\n'));
      Object.assign(nodes.get(testId)!, { priority: test.priority, type: test.type, tags: test.tags, driftStatus: drift[module.id] ?? 'unknown' });
      link(id, testId, 'defines');
      for (const ref of test.refs ?? []) if (/\.md(?:#|$)/i.test(ref)) link(add('spec', ref), testId, 'verifies');
    }
  }
  return { nodes: [...nodes.values()], edges };
}
// Encoded identities avoid collisions and make all note names safe on Windows.
export function noteName(id: string): string { return createHash('sha256').update(id).digest('hex'); }
export function obsidianNotes(graph: ContractGraph): Record<string, string> {
  return Object.fromEntries(graph.nodes.map((node) => [`${noteName(node.id)}.md`,
    '---\n' + Object.entries({ id: node.id, priority: node.priority ?? null, type: node.type ?? node.kind,
      tags: node.tags ?? [], driftStatus: node.driftStatus }).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join('\n') +
    `\n---\n\n# ${node.label.replace(/[\r\n]/g, ' ')}\n\n${node.content}\n\n` +
    graph.edges.filter((edge) => edge.source === node.id || edge.target === node.id).map((edge) => {
      const other = edge.source === node.id ? edge.target : edge.source;
      return `- ${edge.relation}: [[${noteName(other)}]]`;
    }).join('\n') + '\n']));
}
export function canvasGraph(graph: ContractGraph): unknown {
  const kinds = ['spec', 'module', 'source', 'test'];
  const groups = kinds.map((kind, index) => ({ id: `group-${kind}`, type: 'group', label: kind,
    x: index * 460, y: -60, width: 440, height: Math.max(1, graph.nodes.filter((node) => node.kind === kind).length) * 260 + 80,
  }));
  return { nodes: [...groups, ...graph.nodes.map((node) => ({
    id: noteName(node.id), type: 'text', text: `${node.label}\n\n${node.content}`, x: kinds.indexOf(node.kind) * 460 + 20,
    y: graph.nodes.filter((entry) => entry.kind === node.kind).indexOf(node) * 260, width: 400, height: 240,
    color: node.driftStatus.startsWith('stale') ? '1' : ({ critical: '1', high: '2', medium: '3', low: '4' }[node.priority ?? ''] ?? '5'),
  }))], edges: graph.edges.map((edge, index) => ({ id: `edge-${index}`, fromNode: noteName(edge.source),
    toNode: noteName(edge.target), fromSide: 'right', toSide: 'left', label: edge.relation })) };
}
export function graphDiagram(graph: ContractGraph, format: 'mermaid' | 'dot'): string {
  const quote = (value: string) => JSON.stringify(value.replace(/[<>]/g, '').replace(/\r?\n/g, ' '));
  const ids = new Map(graph.nodes.map((node, index) => [node.id, `n${index}`]));
  return (format === 'dot' ? 'digraph TestWeave {\n' : 'flowchart LR\n') +
    graph.nodes.map((node) => format === 'dot' ? `  ${ids.get(node.id)} [label=${quote(node.label)}];`
      : `  ${ids.get(node.id)}[${quote(node.label.replaceAll('"', "'"))}]`).join('\n') + '\n' +
    graph.edges.map((edge) => format === 'dot' ? `  ${ids.get(edge.source)} -> ${ids.get(edge.target)} [label=${quote(edge.relation)}];`
      : `  ${ids.get(edge.source)} -->|${edge.relation}| ${ids.get(edge.target)}`).join('\n') + (format === 'dot' ? '\n}\n' : '\n');
}
