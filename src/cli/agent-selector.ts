import pc from 'picocolors';
import { ADDITIONAL_AGENTS, type AgentDefinition } from '../integrations/agents.js';

export function formatSelectedSummary(selectedIds: Set<string>): string {
  const selectedNames: string[] = [];

  if (selectedIds.has('universal')) {
    selectedNames.push('Amp', 'Cline', 'Codex');
  }

  for (const agent of ADDITIONAL_AGENTS) {
    if (selectedIds.has(agent.id) || (agent.id === 'claude-code' && selectedIds.has('claude'))) {
      selectedNames.push(agent.displayName);
    }
  }

  if (selectedNames.length === 0) {
    return 'None';
  }

  if (selectedIds.has('universal')) {
    const additionalCount = selectedNames.length - 3;
    const remainder = 11 + additionalCount;
    return `Amp, Cline, Codex +${remainder} more`;
  }

  if (selectedNames.length <= 3) {
    return selectedNames.join(', ');
  }

  const preview = selectedNames.slice(0, 3).join(', ');
  const remainder = selectedNames.length - 3;
  return `${preview} +${remainder} more`;
}

export async function promptAgentSelection(
  initialSelected: string[],
  isInteractive = Boolean(process.stdin.isTTY && process.stdout.isTTY)
): Promise<string[]> {
  const selectedSet = new Set<string>(['universal']);

  for (const id of initialSelected) {
    if (id === 'claude') {
      selectedSet.add('claude-code');
      selectedSet.add('claude');
    } else {
      selectedSet.add(id);
    }
  }

  if (!isInteractive) {
    const summary = formatSelectedSummary(selectedSet);
    process.stdout.write(`  ${pc.green(pc.bold('Selected:'))} ${pc.green(summary)}\n\n`);
    return Array.from(selectedSet);
  }

  let searchQuery = '';
  let cursorIndex = 0;
  const pageSize = 8;
  let lastRenderedLines = 0;

  const getFiltered = (): AgentDefinition[] => {
    if (!searchQuery.trim()) return ADDITIONAL_AGENTS;
    const q = searchQuery.toLowerCase().trim();
    return ADDITIONAL_AGENTS.filter(
      (a) =>
        a.displayName.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q) ||
        a.skillsDir.toLowerCase().includes(q)
    );
  };

  const render = (): void => {
    const filtered = getFiltered();
    if (cursorIndex >= filtered.length) {
      cursorIndex = Math.max(0, filtered.length - 1);
    }

    const lines: string[] = [];
    lines.push(pc.dim('── ') + pc.white('Additional agents') + pc.dim(' ──────────────────────────────────────────'));
    lines.push(` Search: ${pc.cyan(searchQuery)}${searchQuery ? '' : pc.dim(' ')}`);
    lines.push(` ${pc.dim('↑↓ move, space select, enter confirm')}`);
    lines.push('');

    let scrollOffset = 0;
    if (filtered.length > pageSize) {
      scrollOffset = Math.max(0, Math.min(cursorIndex - Math.floor(pageSize / 2), filtered.length - pageSize));
    }
    const visible = filtered.slice(scrollOffset, scrollOffset + pageSize);

    if (visible.length === 0) {
      lines.push(`  ${pc.dim('No agents matching "' + searchQuery + '"')}`);
    } else {
      for (let i = 0; i < visible.length; i++) {
        const item = visible[i]!;
        const actualIndex = scrollOffset + i;
        const isPointer = actualIndex === cursorIndex;
        const isSelected = selectedSet.has(item.id) || (item.id === 'claude-code' && selectedSet.has('claude'));

        const pointer = isPointer ? pc.cyan('❯') : ' ';
        const check = isSelected ? pc.green('●') : pc.dim('o');
        const name = isPointer ? pc.bold(pc.white(item.displayName)) : item.displayName;
        const dir = pc.dim(`(${item.skillsDir})`);

        lines.push(`${pointer} ${check} ${name} ${dir}`);
      }
    }

    const remainingBelow = filtered.length - (scrollOffset + pageSize);
    const remainingAbove = scrollOffset;
    if (remainingBelow > 0 && remainingAbove > 0) {
      lines.push(`  ${pc.dim(`↑ ${remainingAbove} more / ↓ ${remainingBelow} more`)}`);
    } else if (remainingBelow > 0) {
      lines.push(`  ${pc.dim(`↓ ${remainingBelow} more`)}`);
    } else if (remainingAbove > 0) {
      lines.push(`  ${pc.dim(`↑ ${remainingAbove} more`)}`);
    } else {
      lines.push('');
    }

    lines.push('');
    const summary = formatSelectedSummary(selectedSet);
    lines.push(`  ${pc.green(pc.bold('Selected:'))} ${pc.green(summary)}`);

    // Clear previous output
    if (lastRenderedLines > 0) {
      process.stdout.write(`\x1b[${lastRenderedLines}A\r`);
      for (let i = 0; i < lastRenderedLines; i++) {
        process.stdout.write('\x1b[2K\n');
      }
      process.stdout.write(`\x1b[${lastRenderedLines}A\r`);
    }

    process.stdout.write(lines.join('\n') + '\n');
    lastRenderedLines = lines.length;
  };

  return new Promise((resolve, reject) => {
    // Hide terminal cursor
    process.stdout.write('\x1b[?25l');
    render();

    const cleanup = () => {
      process.stdout.write('\x1b[?25h');
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      process.stdin.removeListener('data', onData);
    };

    const onData = (chunk: Buffer) => {
      const input = chunk.toString();

      // Ctrl+C
      if (input === '\u0003') {
        cleanup();
        reject(new Error('Setup cancelled'));
        return;
      }

      // Enter
      if (input === '\r' || input === '\n') {
        cleanup();
        process.stdout.write('\n');
        resolve(Array.from(selectedSet));
        return;
      }

      // Up arrow
      if (input === '\u001b[A') {
        cursorIndex = Math.max(0, cursorIndex - 1);
        render();
        return;
      }

      // Down arrow
      if (input === '\u001b[B') {
        const filtered = getFiltered();
        cursorIndex = Math.min(filtered.length - 1, cursorIndex + 1);
        render();
        return;
      }

      // Spacebar
      if (input === ' ') {
        const filtered = getFiltered();
        const current = filtered[cursorIndex];
        if (current) {
          if (selectedSet.has(current.id)) {
            selectedSet.delete(current.id);
            if (current.id === 'claude-code') selectedSet.delete('claude');
          } else {
            selectedSet.add(current.id);
            if (current.id === 'claude-code') selectedSet.add('claude');
          }
        }
        render();
        return;
      }

      // Backspace
      if (input === '\x7f' || input === '\b' || input === '\x08') {
        if (searchQuery.length > 0) {
          searchQuery = searchQuery.slice(0, -1);
          cursorIndex = 0;
          render();
        }
        return;
      }

      // Alphanumeric or normal printable characters
      if (input.length === 1 && input >= ' ' && input <= '~') {
        searchQuery += input;
        cursorIndex = 0;
        render();
      }
    };

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', onData);
  });
}
