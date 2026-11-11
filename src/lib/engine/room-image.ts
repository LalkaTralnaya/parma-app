export interface RoomImage { url: string; caption: string; kind: 'image' | 'map' }
export function normalizeRoomImage(value: unknown): RoomImage | null {
 if (!value || typeof value !== 'object') return null;
 const raw = value as Partial<RoomImage>;
 if (typeof raw.url !== 'string' || raw.url.length > 2048) return null;
 const url = raw.url.trim();
 if (/[\u0000-\u0020\\]/.test(url)) return null;
 if (url.startsWith('/') && !url.startsWith('//')) {
  if (!/^\/(?:heraldry|adventures|art)\/[a-zA-Z0-9_/.-]+\.(?:png|jpe?g|webp)$/i.test(url) || url.includes('..')) return null;
 } else {
  try {
   const parsed = new URL(url);
   if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return null;
  } catch { return null; }
 }
 return { url, caption: typeof raw.caption === 'string' ? raw.caption.trim().slice(0,160) : '', kind: raw.kind === 'map' ? 'map' : 'image' };
}
