/** 把代號變成固定的顏色編號 1 到 6(同一個代號在每個人的畫面上顏色一樣) */
export function nickColorClass(nickname: string): string {
  let hash = 0;
  for (const ch of nickname) hash = (hash * 31 + (ch.codePointAt(0) ?? 0)) >>> 0;
  return `c${(hash % 6) + 1}`;
}

/** 頭像上顯示的字:代號的第一個字(emoji 也算一個字) */
export function initialOf(nickname: string): string {
  return Array.from(nickname)[0] ?? '?';
}

/** 訊息時間,例如 21:42 */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
