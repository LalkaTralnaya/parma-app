export type SheetBackground = 'birch' | 'parchment' | 'chronicle';
export type SheetFrame = 'carved' | 'simple' | 'none';
export interface SheetAppearance { background: SheetBackground; frame: SheetFrame }
export function sheetAppearance(value?: Partial<SheetAppearance> | null): SheetAppearance {
 return {
  background: value?.background && ['birch','parchment','chronicle'].includes(value.background) ? value.background : 'birch',
  frame: value?.frame && ['carved','simple','none'].includes(value.frame) ? value.frame : 'carved'
 };
}
