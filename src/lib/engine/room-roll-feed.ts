import type { Room, RoomRoll } from './rooms';

export interface RoomRollFeedState {
 code: string | null;
 room: Room | null;
 rolls: RoomRoll[];
 loading: boolean;
 error: string;
}

interface Dependencies {
 findRoom: (code: string, signal?: AbortSignal) => Promise<Room | null>;
 getRolls: (roomId: string) => Promise<RoomRoll[]>;
 subscribe: (roomId: string, onRoll: (roll: RoomRoll) => void) => () => void;
 onChange: (state: RoomRollFeedState) => void;
 onRoll?: () => void;
 requestTimeoutMs?: number;
}

export function mergeRoomRolls(rolls: RoomRoll[], limit: number): RoomRoll[] {
 return [...new Map(rolls.map(roll => [roll.id, roll])).values()]
  .sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit);
}

export function createRoomRollFeed(deps: Dependencies) {
 let state: RoomRollFeedState = { code: null, room: null, rolls: [], loading: false, error: '' };
 let revision = 0;
 let disposed = false;
 let lookup: AbortController | undefined;
 let unsubscribe: (() => void) | undefined;
 const current = (request: number) => !disposed && revision === request;
 function update(patch: Partial<RoomRollFeedState>) {
  state = { ...state, ...patch };
  deps.onChange(state);
 }
 async function waitForResponse<T>(pending: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
   return await Promise.race([pending, new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Нет ответа от сервера комнат. Проверьте соединение и повторите загрузку.')), deps.requestTimeoutMs ?? 15000);
   })]);
  } finally { clearTimeout(timer); }
 }
 async function load(code: string, resolvedRoom?: Room) {
  const request = ++revision;
  lookup?.abort();
  const controller = new AbortController();
  lookup = controller;
  unsubscribe?.();
  unsubscribe = undefined;
  update({ code, room: null, rolls: [], loading: true, error: '' });
  try {
   const room = resolvedRoom?.code.toLowerCase() === code.toLowerCase()
    ? resolvedRoom
    : await waitForResponse(deps.findRoom(code, controller.signal));
   if (!current(request)) return;
   if (!room) throw new Error('Комната не найдена. Откройте новое приглашение или выберите другую комнату.');
   update({ room });
   unsubscribe = deps.subscribe(room.id, (roll) => {
    if (!current(request)) return;
    update({ rolls: mergeRoomRolls([roll, ...state.rolls], 50) });
    deps.onRoll?.();
   });
   const history = await waitForResponse(deps.getRolls(room.id));
   if (current(request)) update({ rolls: mergeRoomRolls([...state.rolls, ...history], 50), loading: false });
  } catch (error) {
   if (current(request)) update({ loading: false, error: error instanceof Error ? error.message : 'Не удалось загрузить броски комнаты. Повторите попытку.' });
  } finally {
   controller.abort();
   if (lookup === controller) lookup = undefined;
  }
 }
 return {
  setCode(code: string | null, resolvedRoom?: Room) {
   if (disposed || (state.code === code && !(resolvedRoom && state.error))) return Promise.resolve();
   if (code) return load(code, resolvedRoom);
   revision++;
   lookup?.abort();
   lookup = undefined;
   unsubscribe?.();
   unsubscribe = undefined;
   update({ code: null, room: null, rolls: [], loading: false, error: '' });
   return Promise.resolve();
  },
  retry() {
   return !disposed && state.code && !state.loading ? load(state.code) : Promise.resolve();
  },
  dispose() {
   disposed = true;
   revision++;
   lookup?.abort();
   lookup = undefined;
   unsubscribe?.();
   unsubscribe = undefined;
  }
 };
}
