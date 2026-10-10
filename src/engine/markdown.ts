import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { z } from 'zod';
import { testTruthSchema, type TestTruth } from '../schema/test-truth.js';

export interface MarkdownNode {
  type: string;
  lang?: string | null | undefined;
  meta?: string | null | undefined;
  value?: string | undefined;
  children?: MarkdownNode[] | undefined;
}
export const markdownNodeSchema: z.ZodType<MarkdownNode> = z.lazy(() => z.object({
  type: z.string(),
  lang: z.string().nullable().optional(),
  meta: z.string().nullable().optional(),
  value: z.string().optional(),
  children: z.array(markdownNodeSchema).optional(),
}).passthrough());

export function parseTestTruth(markdown: string): TestTruth {
  const ast = markdownNodeSchema.parse(unified().use(remarkParse).parse(markdown));
  const blocks: MarkdownNode[] = [];
  const visit = (node: MarkdownNode): void => {
    if (node.type === 'code' && node.lang === 'json' && node.meta === 'testweave') blocks.push(node);
    node.children?.forEach(visit);
  };
  visit(ast);
  if (blocks.length !== 1) throw new Error('Expected exactly one fenced `json testweave` contract block');
  if (!ast.children?.includes(blocks[0]!)) throw new Error('The contract block must be at the top level of the Markdown document');
  const value: unknown = JSON.parse(blocks[0]?.value ?? '');
  return testTruthSchema.parse(value);
}

export function serializeTestTruth(value: TestTruth): string {
  const contract = testTruthSchema.parse(value);
  // Tilde fences cannot be closed by JSON string content containing backticks.
  return '# TestWeave Living Test Contract\n\n' +
    'The JSON block below is authoritative. Update affected modules and test steps with source changes.\n\n' +
    '~~~json testweave\n' + JSON.stringify(contract, null, 2) + '\n~~~\n';
}

export function replaceContractBlock(markdown: string, value: TestTruth): string {
  parseTestTruth(markdown);
  const ast = unified().use(remarkParse).parse(markdown);
  const nodes = (node: typeof ast | (typeof ast.children)[number]): void => {
    if (node.type === 'code' && node.lang === 'json' && node.meta === 'testweave') {
      start = node.position?.start.offset;
      end = node.position?.end.offset;
    }
    if ('children' in node) for (const child of node.children) nodes(child as (typeof ast.children)[number]);
  };
  let start: number | undefined;
  let end: number | undefined;
  nodes(ast);
  if (start === undefined || end === undefined) throw new Error('Contract block has no source position');
  return markdown.slice(0, start) + '~~~json testweave\n' +
    JSON.stringify(testTruthSchema.parse(value), null, 2) + '\n~~~' + markdown.slice(end);
}
