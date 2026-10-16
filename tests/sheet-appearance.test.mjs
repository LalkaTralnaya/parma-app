import test from 'node:test';import assert from 'node:assert/strict';
import {sheetAppearance} from '../src/lib/ui/sheet-appearance.ts';
import {characterSnapshot} from '../src/lib/db/characterSnapshot.ts';
test('old character records retain birch and carving; invalid options fall back',()=>{assert.deepEqual(sheetAppearance(),{background:'birch',frame:'carved'});assert.deepEqual(sheetAppearance({background:'invalid',frame:'invalid'}),{background:'birch',frame:'carved'});});
test('appearance survives snapshots without changing game data',()=>{const character={id:'example',abilities:['RE.base1'],abilityPoints:2,appearance:{background:'chronicle',frame:'carved'}};const saved=characterSnapshot(character);assert.deepEqual(saved,character);assert.notEqual(saved.appearance,character.appearance);for(const background of ['birch','parchment','chronicle'])assert.equal(sheetAppearance({background}).background,background);});
