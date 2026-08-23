/** Pastel tag colors, hashed by name so the same label always gets the same
 *  color (matching the "Web design / Mobile design / Invoice / …" chips in
 *  the reference design). */
const COLORS = [
  'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300',
  'bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300',
  'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300',
  'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300',
  'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300',
];

export function tagColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  }
  return COLORS[h % COLORS.length];
}

/** First label (or the repo name) for a card's category chip. */
export function primaryTag(issue: { labels: string[]; repoFullName: string }): string {
  return issue.labels[0] ?? issue.repoFullName.split('/')[1] ?? 'Issue';
}

/** Coerce a markdown body into a short plain-text preview. */
export function previewText(md: string | null): string {
  if (!md) return '';
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`#>~|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
