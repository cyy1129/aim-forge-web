import {clamp,modes,Session,movePlayer,rayFromScreen,traceTargets} from './core.869aad20b2b0.mjs';
import {Renderer} from './render.3617cfb3fcec.mjs';

const $=id=>document.getElementById(id),canvas=$('canvas'),arena=$('arena'),renderer=new Renderer(canvas);
const freshCamera=()=>({yaw:0,pitch:0,x:0,y:0,z:3});
let state='idle',mode='strafe',session=null,preview=null,camera=freshCamera(),cursor={x:0,y:0};
let held=false,rightHeld=false,count=0,last=0,flash=0,shot=0,particles=[],audio=null,sound=true,storageAvailable=true,mouseFallback=false,starting=false;
const keys=new Set(),settings=['duration','difficulty','targetModel','movement','sensitivity','fov','lockMouse'];
const booleanSettings=new Set(['lockMouse','movement']);
let history=[];
try {
  history=JSON.parse(localStorage.getItem('aimforge-history')||'[]');
  if(!Array.isArray(history))history=[];
  history=history.filter(r=>r&&modes[r.mode]&&Number.isFinite(r.score)&&Number.isFinite(r.date)&&Number.isFinite(r.accuracy)).slice(0,20);
}catch{storageAvailable=false;}
try {
  const prefs=JSON.parse(localStorage.getItem('aimforge-settings')||'null');
  if(prefs)for(const id of settings)if(prefs[id]!==undefined){
    // Older saves also persisted the former human default; migrate that once.
    if(id==='targetModel'&&prefs.modelPreferenceVersion!==1)continue;
    if(booleanSettings.has(id))$(id).checked=!!prefs[id];
    else {const before=$(id).value;$(id).value=prefs[id];if(!$(id).value)$(id).value=before;}
  }
}catch{}
function persistSettings(){
  const prefs={modelPreferenceVersion:1};for(const id of settings)prefs[id]=booleanSettings.has(id)?$(id).checked:$(id).value;
  try{localStorage.setItem('aimforge-settings',JSON.stringify(prefs));}catch{}
}
function syncLabels(){
  $('sensitivityValue').textContent=Number($('sensitivity').value).toFixed(2);
  $('fovValue').textContent=$('fov').value+'°';
  if(state==='idle'){
    $('timer').textContent=time(Number($('duration').value));
    $('overlayHint').textContent=$('duration').value+' 秒 · '+($('targetModel').value==='human'?'头部命中加成 · ':'')+($('movement').checked?'WASD 移动已开启':'固定站位训练');
  }
}
for(const id of settings)$(id).addEventListener('input',()=>{
  persistSettings();syncLabels();
  if(id==='targetModel'||id==='difficulty')makePreview();
});
$('resetSettings').onclick=()=>{
  if(!['idle','result'].includes(state))return;
  for(const [id,val]of Object.entries({duration:60,difficulty:'normal',targetModel:'sphere',sensitivity:1,fov:103}))$(id).value=val;
  $('lockMouse').checked=true;$('movement').checked=true;persistSettings();selectMode(mode);
};
function time(s){s=Math.ceil(Math.max(0,s));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');}
function setControls(disabled){
  for(const id of settings)$(id).disabled=disabled;
  document.querySelectorAll('.mode').forEach(b=>b.disabled=disabled);
  $('resetSettings').disabled=disabled;
}
function renderHistory(){
  $('sessionCount').textContent=String(history.length).padStart(2,'0');$('emptyHistory').hidden=!!history.length;$('historyBody').replaceChildren();
  for(const r of history.slice(0,5)){
    const row=document.createElement('tr'),d=new Date(r.date);
    const config=({easy:'入门',normal:'标准',hard:'挑战'})[r.difficulty]+' · '+r.duration+'秒 · '+(r.model==='human'?'人形':'球体');
    const values=[modes[r.mode].name,d.toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}),config,Math.round(r.score).toLocaleString(),Number(r.accuracy).toFixed(1)+'%',(r.kills??'—')+' / '+(r.headshots??'—')];
    for(const value of values){const cell=document.createElement('td');cell.textContent=value;row.append(cell);}
    $('historyBody').append(row);
  }
  $('clearHistory').disabled=!history.length;
}
$('clearHistory').onclick=()=>{
  if(!history.length||!confirm('清空当前浏览器中的训练记录？'))return;
  history=[];try{localStorage.removeItem('aimforge-history');}catch{}renderHistory();
};
for(const [id,m]of Object.entries(modes)){
  const button=document.createElement('button');button.className='mode';button.dataset.mode=id;
  button.innerHTML='<span class="mode-icon">'+m.icon+'</span><span><strong>'+m.name+'</strong><em>'+m.tag+'</em><p>'+m.description+'</p></span>';
  button.onclick=()=>selectMode(id);$('modeList').append(button);
}
function makePreview(){preview=new Session(mode,$('difficulty').value,120,$('targetModel').value);}
function selectMode(next){
  mode=next;state='idle';session=null;camera=freshCamera();keys.clear();held=false;particles=[];
  document.querySelectorAll('.mode').forEach(b=>{b.classList.toggle('active',b.dataset.mode===mode);b.setAttribute('aria-pressed',String(b.dataset.mode===mode));});
  const m=modes[mode];$('modeTitle').textContent=m.name;$('modeTag').textContent=m.tag;
  $('shootHelp').textContent=m.kind==='click'?'单发点射':m.kind==='damage'?'按住连射':'按住跟随';
  $('accuracyLabel').innerHTML=m.kind==='track'?'追踪率 <small>ON TARGET</small>':'命中率 <small>ACCURACY</small>';
  $('reactionLabel').innerHTML=m.kind==='track'?'有效追踪 <small>ON TARGET TIME</small>':'平均击倒间隔 <small>ELIMINATION</small>';
  showOverlay('移动、瞄准、命中。',m.description+'。'+(m.kind==='damage'?'目标有 100 点生命，击倒后自动补充。':''),'开始训练');
  $('pausedControls').hidden=true;$('arenaStatus').textContent='准备就绪 · '+modes[mode].count+' 个目标';
  makePreview();updateStats();syncLabels();
}
function showOverlay(title,description,button){
  $('overlay').hidden=false;$('overlayTitle').textContent=title;$('overlayDescription').textContent=description;
  $('start').textContent=button+' ↗';$('countdown').hidden=true;arena.classList.remove('playing');
}
function updateStats(){
  const s=session,track=modes[mode].kind==='track';
  $('score').textContent=s?s.score.toLocaleString():'0';
  $('accuracy').innerHTML=(s&&(track?s.elapsed:s.shots)?s.accuracy.toFixed(1):'—')+'<i>%</i>';
  $('reaction').innerHTML=track?(s?s.trackOn.toFixed(1):'—')+'<i>s</i>':(s&&s.reaction!==null?Math.round(s.reaction):'—')+'<i>ms</i>';
  $('timer').textContent=time(s?s.duration-s.elapsed:Number($('duration').value));
  $('timeProgress').style.width=(s?100*(1-s.elapsed/s.duration):100)+'%';
  $('kills').textContent=s?s.kills:'0';$('headshots').textContent=s?s.headshots:'0';
  $('position').textContent='X '+camera.x.toFixed(1)+' · Z '+camera.z.toFixed(1)+($('movement').checked?' / WASD':' / 固定站位');
}
function beep(freq=700){
  if(!sound)return;
  try {
    audio??=new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();
    const o=audio.createOscillator(),g=audio.createGain();o.connect(g);g.connect(audio.destination);o.type='sine';
    o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(freq*.6,audio.currentTime+.055);
    g.gain.setValueAtTime(.035,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.07);o.start();o.stop(audio.currentTime+.08);
  }catch{}
}
$('sound').onclick=()=>{sound=!sound;$('sound').textContent='音效 '+(sound?'开':'关');$('sound').setAttribute('aria-pressed',String(sound));};
async function acquireMouse(){
  mouseFallback=false;
  if(!$('lockMouse').checked)return;
  try{await canvas.requestPointerLock();if(document.pointerLockElement!==canvas)throw Error();}
  catch{$('lockMouse').checked=false;mouseFallback=true;persistSettings();}
}
async function start(restart=false){
  if(starting||state==='countdown')return;starting=true;
  try {
    const resume=state==='paused'&&!restart;await acquireMouse();beep(400);
    if(!resume){session=new Session(mode,$('difficulty').value,Number($('duration').value),$('targetModel').value);camera=freshCamera();particles=[];cursor={x:renderer.width/2,y:renderer.height/2};}
    held=false;rightHeld=false;keys.clear();state='countdown';count=3;setControls(true);
    $('overlay').hidden=true;$('pausedControls').hidden=true;$('countdown').hidden=false;$('countdown').textContent='3';
    $('arenaStatus').textContent='训练即将开始';arena.classList.add('playing');canvas.focus();updateStats();
  }finally{starting=false;}
}
$('start').onclick=()=>start();
function pause(){
  if(state!=='running'&&state!=='countdown')return;
  state='paused';held=false;rightHeld=false;keys.clear();document.exitPointerLock?.();
  showOverlay('稍作调整，保持专注','走位和训练进度已保留。点击继续重新进入状态。','继续训练');
  $('pausedControls').hidden=false;$('overlayHint').textContent='已暂停 · 本轮进度已保留';$('arenaStatus').textContent='已暂停';
}
function finish(){
  state='result';held=false;rightHeld=false;keys.clear();document.exitPointerLock?.();setControls(false);$('pausedControls').hidden=true;
  history.unshift(session.result());history=history.slice(0,20);
  try{localStorage.setItem('aimforge-history',JSON.stringify(history));}catch{storageAvailable=false;}
  renderHistory();
  showOverlay('训练完成。继续进阶。',session.score.toLocaleString()+' 分 · '+session.kills+' 次击倒 · '+session.headshots+' 次爆头命中 · '+(modes[mode].kind==='track'?'追踪率 ':'命中率 ')+session.accuracy.toFixed(1)+'%','再练一轮');
  $('overlayHint').textContent=storageAvailable?'成绩已保存到当前浏览器。':'浏览器存储不可用，成绩仅在本次页面中保留。';
  $('arenaStatus').textContent='训练完成';beep(900);updateStats();
}
$('quit').onclick=()=>{setControls(false);selectMode(mode);};
document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement!==canvas&&(state==='running'||state==='countdown'))pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});window.addEventListener('blur',pause);
document.addEventListener('keydown',e=>{
  if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;
  if(['KeyW','KeyA','KeyS','KeyD','ShiftLeft','ShiftRight'].includes(e.code)){
    if(state==='running'){e.preventDefault();keys.add(e.code);}return;
  }
  if(e.code==='Space'){
    if(state==='running'||state==='countdown'){e.preventDefault();pause();}
    else if(state==='paused'){e.preventDefault();start();}
  }
  if(e.code==='Escape'){
    if(document.fullscreenElement===training)document.exitFullscreen().catch(()=>{});
    if(document.querySelector('.training').classList.contains('immersive'))exitImmersive();
    pause();
  }
  if(e.code==='KeyF'&&!e.repeat&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();toggleFullscreen();}
  if(e.code==='KeyR'&&!e.repeat&&['running','paused','result'].includes(state)){e.preventDefault();start(true);}
});
document.addEventListener('keyup',e=>keys.delete(e.code));
for(const button of document.querySelectorAll('[data-key]')){
  button.addEventListener('pointerdown',e=>{if(state!=='running'||!$('movement').checked)return;e.preventDefault();keys.add(button.dataset.key);button.setPointerCapture(e.pointerId);});
  const release=()=>keys.delete(button.dataset.key);
  for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,release);
}
function pointEvent(e){
  if(document.pointerLockElement===canvas||rightHeld){
    camera.yaw+=e.movementX*.0022*Number($('sensitivity').value);
    camera.pitch=clamp(camera.pitch-e.movementY*.0022*Number($('sensitivity').value),-1.15,1.15);
  }
  if(document.pointerLockElement===canvas)cursor={x:renderer.width/2,y:renderer.height/2};
  else {const r=canvas.getBoundingClientRect();cursor={x:clamp(e.clientX-r.left,0,renderer.width),y:clamp(e.clientY-r.top,0,renderer.height)};}
}
canvas.addEventListener('pointermove',e=>{if(state==='running')pointEvent(e);});
function ray(){const locked=document.pointerLockElement===canvas;return rayFromScreen(locked?renderer.width/2:cursor.x,locked?renderer.height/2:cursor.y,renderer.width,renderer.height,Number($('fov').value),camera);}
canvas.addEventListener('pointerdown',e=>{
  if(state!=='running')return;
  if(e.button===2){rightHeld=true;canvas.setPointerCapture(e.pointerId);return;}
  if(e.button!==0)return;e.preventDefault();if(document.pointerLockElement!==canvas)pointEvent(e);held=true;canvas.focus();
  if(modes[mode].kind==='click'){session.shoot(ray(),camera);collectEvents();updateStats();}
  try{canvas.setPointerCapture(e.pointerId);}catch{}
});
window.addEventListener('pointerup',e=>{if(e.button===0)held=false;if(e.button===2)rightHeld=false;});
canvas.addEventListener('pointercancel',()=>{held=false;rightHeld=false;});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
const training=document.querySelector('.training');
function syncFullscreen(){
  const native=document.fullscreenElement===training,immersive=training.classList.contains('immersive'),active=native||immersive;
  const label=active?(native?'退出全屏':'退出专注模式'):'全屏训练';
  $('fullscreenLabel').textContent=label;
  $('fullscreenIcon')?.setAttribute('d',active?'M3 8h5V3m8 0v5h5M8 21v-5H3m18 0h-5v5':'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5');
  $('fullscreen').setAttribute('aria-label',active?label:'进入全屏训练');
  $('fullscreen').setAttribute('aria-pressed',String(active));
  $('fullscreen').title=active?'退出全屏（Esc / F）':'全屏训练（F）';
  document.body.classList.toggle('training-immersive',immersive);
}
function exitImmersive(){training.classList.remove('immersive');syncFullscreen();}
async function toggleFullscreen(){
  if(training.classList.contains('immersive')){exitImmersive();return;}
  if(document.fullscreenElement){await document.exitFullscreen();return;}
  try{await training.requestFullscreen();}
  catch{training.classList.add('immersive');}
  syncFullscreen();
}
document.addEventListener('fullscreenchange',syncFullscreen);
$('fullscreen').onclick=toggleFullscreen;
function collectEvents(){
  for(const event of session.events.splice(0)){
    shot=.055;
    if(event.miss)continue;
    flash=.12;beep(event.head?1100:event.killed?850:550);
    particles.push({...event.point,life:.6,head:event.head,text:event.killed?(event.head?'HEADSHOT +150':'+100'):'−'+event.damage});
  }
}
new ResizeObserver(()=>{renderer.resize();cursor={x:renderer.width/2,y:renderer.height/2};}).observe(arena);
function frame(now){
  const dt=Math.min(.1,Math.max(0,(now-(last||now))/1000));last=now;
  if(state==='countdown'){
    count-=dt;if(count<=0){state='running';$('countdown').hidden=true;$('arenaStatus').textContent=mouseFallback?'普通光标模式 · 右键拖动转向 · WASD 移动':'训练中 · 左键射击 · WASD 移动';beep(1000);}
    else $('countdown').textContent=Math.ceil(count);
  }else if(state==='running'){
    if($('movement').checked)movePlayer(camera,keys,dt,camera.yaw);
    const done=session.tick(dt,ray(),held,camera);collectEvents();updateStats();if(done)finish();
  }else if(state==='idle'&&preview){if(preview.tick(dt,{x:0,y:0,z:-1},false))makePreview();}
  particles=particles.filter(p=>(p.life-=dt)>0);flash=Math.max(0,flash-dt);shot=Math.max(0,shot-dt);
  const active=session||preview;
  if(active){
    const locked=document.pointerLockElement===canvas,aim=locked?{x:renderer.width/2,y:renderer.height/2}:cursor;
    const tracking=modes[mode].kind==='track';
    const hovered=state==='running'&&(held||tracking)?traceTargets(ray(),active.targets,camera,active.elapsed)?.target:null;
    if(state==='running'&&tracking){
      $('arenaStatus').textContent=hovered?(held?'有效追踪中':'已瞄准 · 按住左键开始计分'):($('targetModel').value==='sphere'?'跟随目标 · 瞄准球体后变蓝':'跟随目标 · 按住左键累计分数');
    }
    renderer.draw({camera,fov:Number($('fov').value),targets:active.targets,time:active.elapsed,running:state==='running',cursor:aim,flash,shot,particles,hovered});
  }
  requestAnimationFrame(frame);
}
renderHistory();selectMode('strafe');renderer.resize();requestAnimationFrame(frame);
