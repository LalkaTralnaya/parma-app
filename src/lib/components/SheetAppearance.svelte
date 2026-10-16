<script lang="ts">
 import {sheetAppearance,type SheetAppearance} from '$lib/ui/sheet-appearance';
 let {value,onchange}:{value?:Partial<SheetAppearance>;onchange:(value:SheetAppearance)=>Promise<void>}=$props();
 const current=$derived(sheetAppearance(value));
 let saving=$state(false);let notice=$state(''); let dialog=$state<HTMLDialogElement | null>(null);
 const backgrounds=[{id:'birch' as const,name:'Береста',detail:'Фактура берёзовой коры'},{id:'parchment' as const,name:'Пергамент',detail:'Тёплый лист с мягкой фактурой'},{id:'chronicle' as const,name:'Старая летопись',detail:'Потемневшая бумага и следы старого письма'}];
 async function choose(patch:Partial<SheetAppearance>){if(saving)return;saving=true;notice='';try{await onchange({...current,...patch});}catch{notice='Не удалось сохранить оформление. Попробуйте ещё раз.';}finally{saving=false;}}
</script>
<button type="button" class="appearance-trigger px-3 py-2 border rounded print-hide" aria-haspopup="dialog" onclick={() => dialog?.showModal()}>Оформление</button>
<dialog bind:this={dialog} class="sheet-appearance-settings print-hide" aria-labelledby="sheet-appearance-title">
 <div class="appearance-heading"><h2 id="sheet-appearance-title">Оформление листа</h2><button type="button" class="appearance-close" aria-label="Закрыть оформление" onclick={() => dialog?.close()}>×</button></div>
 <div class="appearance-body">
  <fieldset><legend>Фон листа</legend><div class="appearance-options">
   {#each backgrounds as background}<button type="button" class="background-choice" aria-pressed={current.background===background.id} disabled={saving} onclick={()=>choose({background:background.id})}><span class="background-sample" data-paper={background.id} aria-hidden="true"></span><strong>{background.name}</strong><span>{background.detail}</span>{#if current.background===background.id}<span class="choice-check">✓ Выбран</span>{/if}</button>{/each}
  </div></fieldset>
  <fieldset><legend>Рамка</legend><div class="frame-options">
   {#each [{id:'carved' as const,name:'Резная рамка'},{id:'simple' as const,name:'Простой контур'},{id:'none' as const,name:'Без рамки'}] as frame}<button type="button" aria-pressed={current.frame===frame.id} disabled={saving} onclick={()=>choose({frame:frame.id})}>{frame.name}{current.frame===frame.id?' ✓':''}</button>{/each}
  </div></fieldset>
  {#if notice}<p role="alert">{notice}</p>{/if}
 </div>
</dialog>
<style>
 .sheet-appearance-settings {width:min(600px,calc(100vw - 32px));max-height:85dvh;overflow-y:auto;padding:0;margin:auto;border:1px solid var(--decay-border,#b29a74);border-radius:10px;background:var(--decay-card,#fcf3de);color:var(--decay-text,#24392e);box-shadow:0 16px 70px #0006;}
 .sheet-appearance-settings::backdrop {background:#111a16a6;}
 .appearance-heading {display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;}
 h2 {font:22px Georgia,serif;margin:0;}
 .appearance-close {width:40px;height:40px;border-radius:5px;font-size:25px;cursor:pointer;}
 .appearance-body {padding:4px 16px 16px;}
 fieldset {margin:10px 0 18px;min-width:0;}
 legend {font-weight:600;margin-bottom:10px;}
 .appearance-options {display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;}
 .background-choice {display:flex;flex-direction:column;align-items:flex-start;gap:6px;text-align:left;border:1px solid var(--decay-border,#b29a74);border-radius:7px;padding:10px;color:inherit;background:transparent;cursor:pointer;}
 .background-choice[aria-pressed="true"] {outline:2px solid currentColor;outline-offset:2px;}
 .background-choice>span:not(.background-sample) {font-size:12px;}
 .background-sample {display:block;width:100%;height:80px;border-radius:4px;background-size:cover;}
 [data-paper="birch"] {background-image:url('/birch-bark.png');}
 [data-paper="parchment"] {background-image:radial-gradient(ellipse,#fcf1d9,#d6b98a);}
 [data-paper="chronicle"] {background-color:#d9bc82;background-image:url('/old-chronicle.svg');}
 .frame-options {display:flex;gap:8px;flex-wrap:wrap;}
 .frame-options button {border:1px solid var(--decay-border,#b29a74);padding:8px 12px;border-radius:5px;cursor:pointer;}
 .frame-options button[aria-pressed="true"] {outline:2px solid currentColor;outline-offset:2px;}
 button:disabled {cursor:wait;}
 :global(#content main.character-sheet[data-decay-stage] .sheet-appearance-settings button.background-choice) {filter:none!important;}
 @media(max-width:600px){.appearance-options{grid-template-columns:1fr;}.background-sample{height:65px;}}
</style>
