/** Omit only fields whose contract defaults can be restored without information loss. */
export function wireJson(value: unknown, compact = false): string {
  return JSON.stringify(value, compact ? (key, entry: unknown) => {
    if ((key === 'preconditions' || key === 'tags') && Array.isArray(entry) && !entry.length) return undefined;
    if (key === 'type' && entry === 'regression') return undefined;
    return entry;
  } : undefined, compact ? undefined : 2);
}
