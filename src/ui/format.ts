// Display helpers. No game rules here.
export function num(n: number): string {
  if (!Number.isFinite(n)) return '∞';
  if (Math.abs(n) >= 1e11) return n.toExponential(3).replace('e+', 'e');
  return Math.floor(n).toLocaleString('en-US');
}

export function mult(n: number): string {
  if (Number.isInteger(n)) return num(n);
  return n >= 1000 ? num(n) : n.toFixed(n < 10 ? 2 : 1).replace(/\.?0+$/, '');
}

export function potch(n: number): string {
  return `${n < 0 ? '-' : ''}${num(Math.abs(n))}P`;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Roster text -> HTML with colored keywords. "$3" becomes "3P" (Potch). */
export function richText(text: string): string {
  return esc(text)
    .replace(/\$(\d+)/g, '$1P')
    .replace(/(\+?X\s?\d+(?:\.\d+)?\s?Mult|X\d+(?:\.\d+)?)/g, '<b class="t-x">$1</b>')
    .replace(/(\+\d+(?:\.\d+)?\s?Mult)/g, '<b class="t-mult">$1</b>')
    .replace(/(\+\d+\s?Chips)/g, '<b class="t-chips">$1</b>')
    .replace(/(\+?\d+P\b)/g, '<b class="t-money">$1</b>');
}

export function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  return (parts[0][0] + (parts[1]?.[0] ?? parts[0][1] ?? '')).toUpperCase();
}

/** Stable hue from a string, for placeholder portraits. */
export function hue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}
