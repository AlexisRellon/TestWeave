import { readFile, stat } from 'node:fs/promises';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { specPointerSchema, type TestModule, type TestTruth } from '../schema/test-truth.js';
import { workspacePath } from './files.js';

interface MarkdownNode { type: string; value?: string; depth?: number; children?: MarkdownNode[]; position?: { start: { offset?: number }; end: { offset?: number } } }
function textOf(node: MarkdownNode): string { return node.value ?? node.children?.map(textOf).join('') ?? ''; }
export function specFile(pointer: string): string { return pointer.split('#')[0]!; }
export function specPointers(contract: TestTruth, module?: TestModule): string[] {
  return [...new Set([...(contract.docs ?? []), ...(module?.docs ?? []), ...(module?.specs ?? [])])];
}
export function sliceMarkdown(markdown: string, pointer: string): string {
  specPointerSchema.parse(pointer);
  const anchor = pointer.split('#')[1];
  if (!anchor) return markdown;
  const tree = unified().use(remarkParse).parse(markdown);
  const nodes = tree.children as MarkdownNode[];
  const used = new Set<string>();
  for (const [index, node] of nodes.entries()) {
    if (node.type !== 'heading') continue;
    const base = textOf(node).toLowerCase().replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, '').replace(/\s/g, '-');
    let slug = base;
    for (let suffix = 1; used.has(slug); suffix++) slug = `${base}-${suffix}`;
    used.add(slug);
    if (slug !== anchor) continue;
    const next = nodes.slice(index + 1).find((entry) => entry.type === 'heading' && entry.depth! <= node.depth!);
    return markdown.slice(node.position!.start.offset, next?.position?.start.offset ?? markdown.length);
  }
  throw new Error(`Missing heading: ${pointer}`);
}
export async function readSpecSlice(root: string, pointer: string): Promise<string> {
  specPointerSchema.parse(pointer);
  const file = await workspacePath(root, specFile(pointer));
  const info = await stat(file);
  if (!info.isFile() || info.size > 1_000_000) throw new Error(`Spec must be a file no larger than 1 MB: ${pointer}`);
  return sliceMarkdown(await readFile(file, 'utf8'), pointer);
}
