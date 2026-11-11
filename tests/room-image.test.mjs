import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeRoomImage} from '../src/lib/engine/room-image.ts';
test('accepts HTTPS images and the built-in map with bounded captions',()=>{
 assert.deepEqual(normalizeRoomImage({url:'/heraldry/parma-map.jpg',kind:'map',caption:' Карта '}),{url:'/heraldry/parma-map.jpg',kind:'map',caption:'Карта'});
 assert.equal(normalizeRoomImage({url:'https://example.com/map.png?size=large',caption:'a'.repeat(200)}).caption.length,160);
 assert.equal(normalizeRoomImage({url:'https://example.com/image.jpg'}).kind,'image');
});
test('rejects executable URLs, credentials, local file access and traversal',()=>{
 for(const url of ['javascript:alert(1)','data:image/svg+xml,<svg/>','blob:https://example.com/a','file:///image.png','http://example.com/map.jpg','//example.com/map.jpg','https://name:password@example.com/map.png','/api/private.png','/art/../private.png','/art/%2e%2e/private.png','/art/map.svg','https://exa mple.com/map.jpg','https://example.com/\\map.png'])assert.equal(normalizeRoomImage({url}),null,url);
});
test('rejects malformed messages and oversized URLs without throwing',()=>{
 for(const data of [null,5,{},[],{url:5},{url:'https://example.com/'+ 'a'.repeat(2048)}])assert.equal(normalizeRoomImage(data),null);
 const image=normalizeRoomImage({url:'https://example.com/a.png',caption:{html:'script'},kind:'unknown'});
 assert.equal(image.caption,'');assert.equal(image.kind,'image');
 assert.ok(Buffer.byteLength(JSON.stringify(image))<16384);
});

test('production policy permits HTTPS images while keeping scripts and connections restricted',async()=>{
 const {default:config}=await import('../svelte.config.js');
 const policy=config.kit.csp.directives;
 assert.ok(policy['img-src'].includes('https:'));
 assert.ok(!policy['script-src'].includes('https:'));
 assert.ok(!policy['connect-src'].includes('https:'));
 assert.deepEqual(policy['object-src'],['none']);
});
