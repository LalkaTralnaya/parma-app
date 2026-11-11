<script lang="ts">
  import type { Snippet } from 'svelte';
  import { findRoomByCode, getCurrentRoom, publishRoll } from '$lib/engine/rooms';
  import { normalizeRoomImage, type RoomImage } from '$lib/engine/room-image';
  import { getPlayerName } from '$lib/supabase/client';

  let {
    src, caption, kind = 'image', previewLabel, preview
  }: {
    src: string;
    caption: string;
    kind?: RoomImage['kind'];
    previewLabel?: string;
    preview?: Snippet<[() => void]>;
  } = $props();

  const image = $derived(normalizeRoomImage({ url: src, caption, kind }));
  let dialog = $state<HTMLDialogElement>();
  let previewOpen = $state(false);
  let sending = $state(false);
  let sent = $state(false);
  let error = $state('');
  let needsRoom = $state(false);

  function openPreview() {
    previewOpen = true;
    dialog?.showModal();
  }

  async function share() {
    if (!image || sending) return;
    const attachment = image;
    sending = true;
    sent = false;
    error = '';
    needsRoom = false;
    try {
      const code = getCurrentRoom();
      if (!code) {
        needsRoom = true;
        return;
      }
      const room = await findRoomByCode(code);
      if (getCurrentRoom() !== code) {
        error = 'Активная комната сменилась. Нажмите кнопку ещё раз.';
        return;
      }
      if (!room) {
        error = 'Комната недоступна. Проверьте приглашение.';
        needsRoom = true;
        return;
      }
      await publishRoll(room.id, getPlayerName() || 'Участник', 'image', { ...attachment });
      sent = true;
    } catch {
      error = 'Не удалось отправить изображение. Проверьте подключение к комнате и повторите попытку.';
    } finally {
      sending = false;
    }
  }
</script>

{#snippet shareAction()}
  <button class="share-button" type="button" onclick={share} disabled={sending} aria-label={'Показать в чате: ' + caption}>
    {sending ? 'Отправляем…' : 'Показать в чате'}
  </button>
  {#if sent}<span class="feedback" role="status">Отправлено в чат комнаты.</span>{/if}
  {#if error}<span class="feedback error" role="alert">{error}</span>{/if}
  {#if needsRoom}
    <span class="feedback"><a href="/room" onclick={() => dialog?.close()}>Войти в комнату</a>, чтобы показать изображение.</span>
  {/if}
{/snippet}

{#if image}
  {@render preview?.(openPreview)}
  <div class="image-actions">
    {@render shareAction()}
    {#if previewLabel}<button class="preview-button" type="button" onclick={openPreview}>{previewLabel}</button>{/if}
  </div>
  {#if preview || previewLabel}
    <dialog bind:this={dialog} aria-label={caption} onclose={() => previewOpen = false}>
      <header>
        <strong>{caption}</strong>
        <button class="preview-button" type="button" onclick={() => dialog?.close()}>Закрыть</button>
      </header>
      {#if previewOpen}
        <img src={src} alt={caption} />
      {/if}
      <div class="image-actions">{@render shareAction()}</div>
    </dialog>
  {/if}
{/if}

<style>
  .image-actions { display:flex; flex-wrap:wrap; align-items:center; gap:6px 12px; margin-top:8px; }
  .share-button { padding:7px 11px; border:1px solid #586c55; border-radius:5px; color:#294637; background:#fffaf0; font-size:13px; cursor:pointer; }
  .share-button:hover { background:#edf0e1; }
  .share-button:disabled { opacity:.6; cursor:wait; }
  .preview-button { color:#294637; padding:6px 0; text-decoration:underline; cursor:pointer; }
  .feedback { flex-basis:100%; color:#294637; font-size:12px; }
  .feedback a { text-decoration:underline; }
  .error { color:#a12626; }
  dialog { width:min(96vw, 1440px); max-width:none; max-height:95vh; margin:auto; padding:16px; border:1px solid #b59b72; border-radius:8px; background:#fffaf0; color:#263e32; }
  dialog::backdrop { background:#0009; }
  header { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:8px; }
  dialog img { display:block; max-width:100%; max-height:74vh; margin:auto; object-fit:contain; }
  @media print { .image-actions { display:none; } }
</style>
