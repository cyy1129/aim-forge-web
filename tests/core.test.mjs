import assert from 'node:assert/strict';
import {modes,Session,bodyParts,project,rayFromScreen,traceTargets,movePlayer,hitTarget,FLOOR} from '../dist/core.mjs';
const near=(a,b,epsilon=1e-7)=>assert.ok(Math.abs(a-b)<epsilon,a+' should equal '+b);
const origin={x:3,y:.1,z:4};
const aim=(p,o=origin)=>{const v={x:p.x-(o.x||0),y:p.y-(o.y||0),z:p.z-(o.z||0)},len=Math.hypot(v.x,v.y,v.z);return{x:v.x/len,y:v.y/len,z:v.z/len};};
for(const yaw of [-.7,0,.7])for(const pitch of [-.4,0,.4]){
  const camera={...origin,yaw,pitch},target={x:2,y:1,z:-20,r:.64};
  const p=project(target,camera,1000,500,103),ray=rayFromScreen(p.x,p.y,1000,500,103,camera);
  assert.equal(hitTarget(ray,[target],origin),target,'Perspective and hits must agree after moving the player');
}
const target={x:0,y:-2.15,z:-16,r:.64,model:'human',hp:100,maxHp:100,phase:1,moving:true};
for(const time of [0,.1,.4,1]){
  const parts=bodyParts(target,time);
  for(const partName of ['head','body','limb']){
    const p=parts.find(p=>p.part===partName);
    const hit=traceTargets(aim(p),[target],origin,time);
    assert.ok(hit,'Visible articulated parts must be hittable');
    if(partName==='head')assert.equal(hit.part,'head');
  }
}
assert.equal(traceTargets(aim({x:0,y:4,z:-16}),[target],origin),null,'Air above the head must not hit');
assert.equal(hitTarget({x:0,y:0,z:1},[{x:0,y:0,z:-20,r:1}]),null,'Targets behind the ray must not hit');
const makeStationary=(mode,model='human')=>{
  const s=new Session(mode,'normal',30,model);s.targets=[structuredClone(target)];s.targets[0].moving=false;
  s.moveTargets=()=>{};return s;
};
const body=bodyParts({...target,moving:false},0).find(p=>p.tone==='armor'),head=bodyParts({...target,moving:false},0).find(p=>p.tone==='helmet');
const s=makeStationary('health');
assert.equal(s.fire(aim(body),origin).damage,34);assert.equal(s.targets[0].hp,66);assert.equal(s.kills,0);
s.fire(aim(body),origin);assert.equal(s.targets[0].hp,32);
s.fire(aim(body),origin);assert.equal(s.kills,1);assert.equal(s.score,100);assert.equal(s.targets[0].hp,100,'Replacement must restore full health');
const h=makeStationary('health');
assert.equal(h.fire(aim(head),origin).damage,85);assert.equal(h.targets[0].hp,15);
assert.ok(h.fire(aim(head),origin).killed);assert.equal(h.headshots,2);assert.equal(h.score,150);
const flick=makeStationary('flick');flick.tick(.25,aim(body),false,origin);assert.ok(flick.shoot(aim(body),origin));assert.equal(flick.score,100);near(flick.reaction,250);
flick.shoot({x:0,y:1,z:0},origin);assert.equal(flick.accuracy,50);
flick.tick(100,{x:0,y:0,z:-1},false);assert.equal(flick.elapsed,30);assert.equal(flick.shoot(aim(body),origin),false);
for(const fps of [30,60,144]){
  const auto=makeStationary('health');
  for(let i=0;i<fps;i++)auto.tick(1/fps,{x:0,y:1,z:0},true,origin);
  assert.equal(auto.shots,10,'Automatic fire must be independent of display frame rate');
  assert.equal(auto.events.length,10);
}
const tracking=makeStationary('track');
tracking.tick(.5,aim(body),true,origin);near(tracking.trackOn,.5);assert.equal(tracking.score,50);
tracking.tick(.5,aim(body),false,origin);near(tracking.accuracy,50);
const p={x:0,z:0};movePlayer(p,new Set(['KeyW','KeyD']),1,0);near(Math.hypot(p.x,p.z),4);
const turned={x:0,z:0};movePlayer(turned,new Set(['KeyW']),1,Math.PI/2);near(turned.x,4);near(turned.z,0);
movePlayer(p,new Set(['KeyW','KeyD','ShiftLeft']),100,0);assert.equal(p.x,12);assert.equal(p.z,-6);
let seed=1;const rng=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
for(const [id,mode]of Object.entries(modes))for(const model of ['sphere','human']){
  const run=new Session(id,'hard',30,model,rng),before=run.targets.map(t=>({...t}));
  run.tick(2,{x:0,y:0,z:-1},false,origin);
  assert.equal(run.targets.length,mode.count);
  assert.ok(run.targets.every(t=>Number.isFinite(t.x)&&t.x>=-11&&t.x<=11&&t.hp===100));
  if(mode.pattern==='static')assert.deepEqual(run.targets.map(t=>t.x),before.map(t=>t.x));
  else assert.ok(run.targets.some((t,i)=>Math.hypot(t.x-before[i].x,t.y-before[i].y,t.z-before[i].z)>.1));
  if(id==='popcorn')assert.ok(run.targets.some(t=>t.y>t.baseY+.2));
  if(model==='human'&&mode.pattern!=='bounce')assert.ok(run.targets.every(t=>t.y>FLOOR));
}

for(const model of ['sphere','human']){
  const sequential=new Session('switch','normal',30,model,rng);
  assert.equal(sequential.targets.length,1,'Sequential practice starts with one target');
  for(let i=0;i<12;i++){
    const current=sequential.targets[0],before={x:current.x,y:current.y,z:current.z};
    assert.equal(sequential.shoot({x:0,y:1,z:0},origin),false);
    assert.equal(sequential.targets.length,1);
    assert.equal(sequential.targets[0],current,'Missing must keep the current target');
    const center=model==='human'?bodyParts(current,sequential.elapsed).find(p=>p.tone==='armor'):current;
    assert.ok(sequential.shoot(aim(center),origin));
    assert.equal(sequential.targets.length,1,'Every hit replaces the target without adding extra targets');
    const next=sequential.targets[0];
    assert.notEqual(next.id,current.id);
    assert.notDeepEqual({x:next.x,y:next.y,z:next.z},before,'Next target appears at a new random position');
  }
  assert.equal(sequential.kills,12);
}

console.log('PASS: translated camera aim, articulated hitboxes, head/body damage, replacement, old click scoring, automatic-fire cadence at 30/60/144 FPS, tracking, WASD bounds, all 16 mode/model combinations.');
