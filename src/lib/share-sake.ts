/** Build a share message for a sake bottle (scan result or detail). */
export function buildSakeShareMessage(opts: {
  name: string;
  tastingLine?: string | null;
  sakeId?: string | null;
}): string {
  const name = opts.name.trim() || 'Sake';
  const tasting = opts.tastingLine?.trim();
  const id = opts.sakeId?.trim();

  const lines: string[] = [name];
  if (tasting) {
    lines.push(tasting);
  }

  if (id) {
    lines.push(`sakescan://sake/${id}`);
    lines.push(`https://sakescan.com/sake/${id}`);
  } else {
    lines.push('Discover sake on SakeScan — https://sakescan.com');
  }

  return lines.join('\n');
}

/** Text list of menu top picks for sharing at the table. */
export function buildMenuTopPicksShareMessage(
  picks: Array<{
    name: string;
    price?: string | null;
    type?: string | null;
    tastingNotes?: string | null;
    valueChip?: string | null;
  }>,
): string {
  const lines: string[] = ['My SakeScan menu top picks:'];

  picks.slice(0, 5).forEach((pick, index) => {
    const bits = [pick.name.trim() || 'Sake'];
    if (pick.price?.trim()) bits.push(pick.price.trim());
    if (pick.type?.trim()) bits.push(pick.type.trim());
    if (pick.valueChip?.trim()) bits.push(pick.valueChip.trim());
    lines.push(`${index + 1}. ${bits.join(' · ')}`);
    const note = pick.tastingNotes?.trim();
    if (note) {
      lines.push(`   ${note.length > 100 ? `${note.slice(0, 97)}…` : note}`);
    }
  });

  lines.push('');
  lines.push('Scanned with SakeScan — https://sakescan.com');
  return lines.join('\n');
}
