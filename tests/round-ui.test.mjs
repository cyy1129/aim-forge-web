import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as core from '../dist/core.mjs';

// Exercise the application handlers without a browser, controlling animation time.
const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
const elements=new Map(),listeners=new Map(),storage=new Map();
let document,frameCallback,now=0;
class Element {
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attrs={};this.style={};this.hidden=false;this.disabled=false;this.checked=false;this.value='';this.className='';this.textContent='';}
  get classList(){const el=this;return {
    contains:name=>el.className.split(/\s+/).includes(name),
    toggle(name,force){const values=new Set(el.className.split(/\s+/).filter(Boolean)),on=force??!values.has(name);if(on)values.add(name);else values.delete(name);el.className=[...values].join(' ');return on;},
    add(name){this.toggle(name,true);},remove(name){this.toggle(name,false);}
  };}
  setAttribute(name,value){this.attrs[name]=String(value);}
  getAttribute(name){return this.attrs[name]??null;}
  append(...items){this.children.push(...items);}
  replaceChildren(...items){this.children=[...items];}
  addEventListener(type,handler){(this.events??={})[type]=handler;}
  focus(){document.activeElement=this;}
  setPointerCapture(){}
  getBoundingClientRect(){return {left:0,top:0,width:1000,height:500};}
}
for(const match of html.matchAll(/<(\w+)\b[^>]*\bid="([^"]+)"[^>]*>/g)){
  assert.ok(!elements.has(match[2]),'Duplicate element ID '+match[2]);
  const el=new Element(match[1]);el.id=match[2];el.hidden=/\shidden(?:\s|>)/.test(match[0]);elements.set(el.id,el);
}
const get=id=>{assert.ok(elements.has(id),'Missing UI element '+id);return elements.get(id);};
for(const [id,value]of Object.entries({duration:'30',difficulty:'normal',targetModel:'sphere',sensitivity:'1',fov:'103'}))get(id).value=value;
get('movement').checked=true;get('lockMouse').checked=false;
const training=new Element();training.className='training';
const body=new Element('body'),movement=['KeyA','KeyW','KeyS','KeyD'].map(key=>{const e=new Element('button');e.dataset.key=key;return e;});
document={
  body,activeElement:body,pointerLockElement:null,fullscreenElement:null,
  getElementById:id=>get(id),createElement:tag=>new Element(tag),
  querySelector:selector=>selector==='.training'?training:null,
  querySelectorAll:selector=>selector==='.mode'?get('modeList').children:selector==='[data-key]'?movement:[],
  addEventListener(type,handler){(listeners.get(type)||listeners.set(type,[]).get(type)).push(handler);},
  exitPointerLock(){this.pointerLockElement=null;}
};
class Renderer {constructor(){this.width=1000;this.height=500;}resize(){}draw(){}}
const context=vm.createContext({
  ...core,Renderer,document,window:{addEventListener(){}},
  localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},
  confirm:()=>true,ResizeObserver:class{observe(){}},
  requestAnimationFrame:callback=>{frameCallback=callback;return 1;},console
});
const source=readFileSync(new URL('../dist/app.mjs',import.meta.url),'utf8').replace(/^import .+;\n/gm,'');
vm.runInContext(source,context,{filename:'app.mjs'});
const advance=steps=>{for(let i=0;i<steps;i++){now+=100;frameCallback(now);}};
const choose=id=>get('modeList').children.find(e=>e.dataset.mode===id).onclick();
const title=()=>get('modeTitle').textContent;
assert.equal(get('endRound').hidden,true);
assert.equal(get('modeLockHint').hidden,true);
await get('start').onclick();
assert.equal(get('endRound').hidden,false,'Ending a round is available from countdown onwards');
assert.equal(get('modeLockHint').hidden,false);
assert.match(get('modeLockMessage').textContent,/结束本轮/);
assert.ok(get('difficulty').disabled);
assert.ok(get('modeList').children.every(e=>!e.disabled&&e.getAttribute('aria-disabled')==='true'),'Locked modes remain clickable to explain why');
advance(35);
const original=title();
choose('flick');
assert.equal(title(),original,'Trying another mode cannot silently discard an active round');
assert.match(get('overlayTitle').textContent,/先结束本轮/);
assert.match(get('modeLockMessage').textContent,/精准点射/);
assert.equal(get('quit').textContent,'结束并切换');
assert.equal(get('pausedControls').hidden,false);
assert.equal(get('roundExitNote').hidden,false);
await get('start').onclick();
assert.equal(title(),original,'Continue keeps the same round');
assert.equal(get('quit').textContent,'结束本轮','Continue cancels a pending switch');
choose('track');
get('quit').onclick();
assert.equal(title(),'平滑跟枪','Explicitly ending performs the requested mode switch');
assert.equal(get('endRound').hidden,true);
assert.equal(get('modeLockHint').hidden,true);
assert.equal(get('roundExitNote').hidden,true);
assert.ok(!get('difficulty').disabled);
assert.ok(get('modeList').children.every(e=>e.getAttribute('aria-disabled')==='false'));
assert.equal(storage.has('aimforge-history'),false,'Abandoning a round must not save a completed score');
await get('start').onclick();advance(35);
for(const handler of listeners.get('keydown'))handler({code:'Space',preventDefault(){}});
assert.equal(get('pausedControls').hidden,false);
assert.equal(get('quit').textContent,'结束本轮');
get('quit').onclick();
assert.equal(get('modeLockHint').hidden,true);
await get('start').onclick();
get('endRound').onclick();
assert.equal(get('modeLockHint').hidden,true,'Toolbar exit also unlocks settings');
await get('start').onclick();advance(340);
assert.equal(get('endRound').hidden,true,'Completing the timer removes the exit action');
assert.equal(get('modeLockHint').hidden,true);
assert.equal(JSON.parse(storage.get('aimforge-history')).length,1);
choose('switch');
assert.equal(title(),'单靶切换','Completed rounds allow immediate mode selection');
console.log('PASS: round lock explanation, prominent exit visibility, pause/continue, explicit end-and-switch, early-exit scoring, toolbar exit, natural completion, and mode unlocking.');
