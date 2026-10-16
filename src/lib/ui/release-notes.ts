export const RELEASE_NOTES_KEY = 'parma.release-notes.seen';
type ReleaseStorage = Pick<Storage, 'getItem' | 'setItem'>;
const shownInThisTab = new Set<string>();

export function shouldShowRelease(storage: ReleaseStorage | null, releaseId: string): boolean {
 if (shownInThisTab.has(releaseId)) return false;
 try { return storage?.getItem(RELEASE_NOTES_KEY) !== releaseId; }
 catch { return true; }
}

/** Вызывается только после успешного открытия окна. */
export function markReleaseShown(storage: ReleaseStorage | null, releaseId: string): void {
 shownInThisTab.add(releaseId);
 try { storage?.setItem(RELEASE_NOTES_KEY, releaseId); }
 catch { /* Без доступа к хранилищу достаточно памяти текущей вкладки. */ }
}
