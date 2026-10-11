import { getStaticTOMLValue, parseTOML } from 'toml-eslint-parser';
import { z } from 'zod';

export function parseMcpToml(text: string, file: string, arrayTable = false) {
  try {
    const ast = parseTOML(text);
    const server = z.record(z.string(), z.unknown());
    const data = z.object({ mcp_servers: (arrayTable ? z.array(server) : server).optional() })
      .passthrough().parse(getStaticTOMLValue(ast));
    if (Array.isArray(data.mcp_servers) && data.mcp_servers.filter((entry) => entry.name === 'testweave').length > 1) {
      throw new Error('Duplicate TestWeave MCP servers');
    }
    return { ast, data };
  } catch {
    throw new Error(`Invalid ${file}; repair TOML syntax and the mcp_servers table before installing TestWeave`);
  }
}

export function tomlServerEntry(server: Record<string, unknown>, arrayTable = false): string {
  const header = arrayTable ? '[[mcp_servers]]' : '[mcp_servers.testweave]';
  return `${header}\n${Object.entries(server).map(([key, value]) => `${key} = ${JSON.stringify(value)}`).join('\n')}\n`;
}

export function mergeMcpToml(text: string, file: string, server: Record<string, unknown>, arrayTable = false): string {
  const { ast, data } = parseMcpToml(text, file, arrayTable);
  const servers = data.mcp_servers;
  const index = Array.isArray(servers) ? servers.findIndex((entry) => entry.name === 'testweave') : -1;
  const table = ast.body[0].body.find((node) => node.type === 'TOMLTable'
    && node.kind === (arrayTable ? 'array' : 'standard')
    && JSON.stringify(node.resolvedKey) === JSON.stringify(['mcp_servers', arrayTable ? index : 'testweave']));
  if (!table || table.type !== 'TOMLTable') {
    if (Array.isArray(servers) ? index !== -1 : servers?.testweave !== undefined) {
      throw new Error(`Cannot update ${file}; express TestWeave as a ${arrayTable ? '[[mcp_servers]]' : '[mcp_servers.testweave]'} table first`);
    }
    const output = `${text}${text && !text.endsWith('\n') ? '\n' : ''}\n${tomlServerEntry(server, arrayTable)}`;
    parseMcpToml(output, file, arrayTable);
    return output;
  }

  const edits: { start: number; end: number; value: string }[] = [];
  for (const entry of table.body) {
    if (JSON.stringify(getStaticTOMLValue(entry.key)) === JSON.stringify(['url'])) {
      edits.push({ start: entry.range[0], end: entry.range[1], value: '' });
    }
  }
  const missing: string[] = [];
  for (const [key, value] of Object.entries(server)) {
    const entry = table.body.find((node) => JSON.stringify(getStaticTOMLValue(node.key)) === JSON.stringify([key]));
    if (entry) edits.push({ start: entry.value.range[0], end: entry.value.range[1], value: JSON.stringify(value) });
    else missing.push(`${key} = ${JSON.stringify(value)}\n`);
  }
  if (missing.length) {
    const newline = text.indexOf('\n', table.key.range[1]);
    const start = newline === -1 ? text.length : newline + 1;
    edits.push({ start, end: start, value: `${newline === -1 ? '\n' : ''}${missing.join('')}` });
  }
  let output = text;
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    output = output.slice(0, edit.start) + edit.value + output.slice(edit.end);
  }
  parseMcpToml(output, file, arrayTable);
  return output;
}
