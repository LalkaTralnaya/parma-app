import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { SPELLS } from '../src/lib/rules/spells.ts';
import { SPELL_PATTERNS } from '../src/lib/ui/spell-patterns.ts';

test('each spell has its own continuous gesture with valid endpoints and no stray patterns', () => {
  assert.deepEqual(Object.keys(SPELL_PATTERNS).sort(), SPELLS.map(spell => spell.id).sort());
  const paths = new Set();
  for (const spell of SPELLS) {
    const pattern = SPELL_PATTERNS[spell.id];
    assert.ok(pattern.cue.trim(), spell.id);
    const commands = pattern.path.match(/[a-z]/gi);
    assert.equal(commands.filter(command => command === 'M').length, 1, `${spell.id}: one continuous stroke`);
    assert.equal(commands[0], 'M');
    assert.ok(commands.length <= 12, `${spell.id}: gesture remains simple`);
    assert.ok(commands.every(command => ['M','L','Q','C'].includes(command)), spell.id);
    const coordinates = pattern.path.match(/-?\d+(?:\.\d+)?/g).map(Number);
    assert.ok(coordinates.every(value => value >= 20 && value <= 205), `${spell.id}: margins`);
    assert.deepEqual(pattern.start, coordinates.slice(0, 2), spell.id);
    assert.deepEqual(pattern.end, coordinates.slice(-2), spell.id);
    assert.ok(!paths.has(pattern.path), `${spell.id}: distinct drawing`);
    paths.add(pattern.path);
  }
});

test('the three accepted basic elemental gestures stay unchanged', () => {
  assert.equal(SPELL_PATTERNS.fire_chaos.path, 'M 65 182 C 28 136 52 103 105 110 C 169 119 153 171 111 148 C 80 131 100 82 123 39');
  assert.equal(SPELL_PATTERNS.ice_chaos.path, 'M 65 182 L 65 110 L 120 55 L 175 110 L 120 165 L 120 200');
  assert.equal(SPELL_PATTERNS.sparks.path, 'M 145 40 L 85 100 L 145 100 L 85 165 L 135 165 L 105 200');
});

test('pattern dialog uses matching Decay foreground and surface with readable strokes', () => {
  const component = fs.readFileSync(new URL('../src/lib/components/SpellPattern.svelte', import.meta.url), 'utf8');
  const css = fs.readFileSync(new URL('../src/app.css', import.meta.url), 'utf8');
  assert.match(component, /\.spell-pattern-shell :global\(dialog\)\s*\{[^}]*background:var\(--decay-card,[^}]*color:var\(--decay-text,/);
  assert.match(component, /path\s*\{[^}]*stroke:currentColor/);
  const luminance = hex => {
    const rgb = hex.match(/[a-f\d]{2}/gi).map(value => parseInt(value, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
    return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
  };
  for (const stage of [2, 3, 4]) {
    const block = css.match(new RegExp('main\\.character-sheet\\[data-decay-stage="' + stage + '"\\]\\s*\\{([^}]+)'))?.[1];
    const text = block.match(/--decay-text:\s*#([a-f\d]{6})/i)[1];
    const surface = block.match(/--decay-card:\s*#([a-f\d]{6})/i)[1];
    const a = luminance(text), b = luminance(surface);
    assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05) >= 4.5, `stage ${stage}: readable drawing and text`);
  }
});
