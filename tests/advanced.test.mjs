import assert from 'node:assert/strict';
import {Session,modes,bodyParts,traceTargets,ellipsoidDistance,boxDistance,movePlayer,FLOOR} from '../dist/core.mjs';
const camera={x:0,y:0,z:3};
const aim=(p,o=camera)=>{const x=p.x-o.x,y=p.y-o.y,z=p.z-o.z,l=Math.hypot(x,y,z);return{x:x/l,y:y/l,z:z/l};};
const center=(session,t=session.targets[0])=>session.model==='human'?bodyParts(t,session.elapsed).find(p=>p.tone==='armor'):t;
let seed=1234;const rng=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
assert.equal(Object.keys(modes).length,14);
assert.ok(Object.values(modes).every(m=>m.count===1));

// Reflex expiration is a missed target, not a free target replacement.
const reflex=new Session('reflex','normal',30,'sphere',rng);
reflex.score=100;
const first=reflex.targets[0];
reflex.tick(first.life+.01,{x:0,y:0,z:-1},false,camera);
assert.equal(reflex.timeouts,1);assert.equal(reflex.score,75);
assert.equal(reflex.targets.length,1);assert.notEqual(reflex.targets[0].id,first.id);
assert.equal(reflex.targets[0].visible,false);
assert.equal(traceTargets(aim(reflex.targets[0]),reflex.targets,camera),null);
reflex.tick(.31,{x:0,y:0,z:-1},false,camera);
assert.equal(reflex.targets[0].visible,true);
assert.ok(reflex.shoot(aim(reflex.targets[0]),camera));assert.equal(reflex.kills,1);
assert.ok(reflex.score>175);assert.equal(reflex.accuracy,50);
assert.equal(reflex.result().timeouts,1);

// Shrinking changes the actual hittable geometry, then resets on a hit.
for(const model of ['sphere','human']){
  const shrink=new Session('shrink','normal',30,model,rng),t=shrink.targets[0],initial=t.r;
  shrink.tick(t.life/2,{x:0,y:0,z:-1},false,camera);
  assert.ok(t.r<initial*.65&&t.r>initial*.5);
  if(model==='human')assert.equal(t.y,FLOOR+2.05*Math.sqrt(t.r/.64));
  assert.ok(shrink.shoot(aim(center(shrink)),camera));
  assert.equal(shrink.targets[0].r,initial);
}
const edge=new Session('shrink','normal',30,'sphere',rng),edgeTarget=edge.targets[0];
const edgePoint={...edgeTarget,x:edgeTarget.x+edgeTarget.r*.85};
assert.ok(traceTargets(aim(edgePoint),edge.targets,camera));
edge.tick(edgeTarget.life*.7,{x:0,y:0,z:-1},false,camera);
assert.equal(traceTargets(aim(edgePoint),edge.targets,camera),null);

// Micro practice stays close but never respawns on the same spot.
for(const model of ['sphere','human']){
  const micro=new Session('micro','normal',30,model,rng);
  assert.ok(micro.targets[0].r<.4);
  for(let i=0;i<25;i++){
    const t=micro.targets[0];assert.ok(micro.shoot(aim(center(micro)),camera));
    const n=micro.targets[0],distance=Math.hypot(n.x-t.x,model==='human'?n.z-t.z:n.y-t.y);
    assert.ok(distance>=.8-1e-8&&distance<=2.4+1e-8);assert.equal(micro.targets.length,1);
  }
}

// Stop-and-click rejects movement and the settling interval after key release.
const stop=new Session('stop','normal',30,'sphere',rng),player={...camera};
movePlayer(player,new Set(['KeyD']),.1,0);
stop.tick(.1,aim(center(stop),player),false,player);
const stopId=stop.targets[0].id;
assert.equal(stop.shoot(aim(center(stop),player),player),false);
assert.equal(stop.targets[0].id,stopId);assert.equal(stop.targets[0].hp,100);
movePlayer(player,new Set(),.05,0);assert.equal(player.speed,0);assert.equal(player.moving,false);
stop.tick(.05,aim(center(stop),player),false,player);
assert.equal(stop.shoot(aim(center(stop),player),player),false);
stop.tick(.051,aim(center(stop),player),false,player);
assert.ok(stop.shoot(aim(center(stop),player),player));assert.equal(stop.kills,1);
assert.equal(stop.failures,2);

// Cover hides the target and blocks damage; alternate peeks expose the next target.
for(const model of ['sphere','human']){
  const peek=new Session('peek','normal',30,model,rng),t=peek.targets[0];
  assert.ok(traceTargets(aim(center(peek)),peek.targets,camera));
  assert.equal(traceTargets(aim(center(peek)),peek.targets,camera,0,peek.obstacles),null);
  assert.equal(peek.shoot(aim(center(peek)),camera),false);assert.equal(t.hp,100);
  const right={x:3.5,y:0,z:3};
  assert.ok(peek.shoot(aim(center(peek),right),right));assert.equal(peek.kills,1);
  assert.ok(peek.targets[0].x<0);
  assert.equal(peek.shoot(aim(center(peek),right),right),false);
  const left={x:-3.5,y:0,z:3};
  assert.ok(peek.shoot(aim(center(peek),left),left));assert.equal(peek.kills,2);
}

// Headshot mode enforces human targets and refuses body damage.
const headshot=new Session('headshot','normal',30,'sphere',rng);
assert.equal(headshot.model,'human');
const human=headshot.targets[0];
assert.equal(headshot.shoot(aim(center(headshot)),camera),false);
assert.equal(human.hp,100);assert.equal(headshot.hits,0);
const head=bodyParts(human,0).find(p=>p.part==='head');
assert.ok(headshot.shoot(aim(head),camera));assert.equal(headshot.score,150);assert.equal(headshot.headshots,1);

// The rounded model cannot be hit in the empty corners of its old box bounds.
const dummy={x:0,y:FLOOR+2.05,z:-16,r:.64,model:'human',moving:true,phase:0};
const headPart=bodyParts(dummy,0).find(p=>p.part==='head');
const corner={x:headPart.x+headPart.half.x*.95,y:headPart.y+headPart.half.y*.95,z:headPart.z};
const cornerRay=aim(corner);
assert.ok(Number.isFinite(boxDistance(cornerRay,headPart,camera)));
assert.equal(ellipsoidDistance(cornerRay,headPart,camera),Infinity);
assert.equal(traceTargets(cornerRay,[dummy],camera,0),null);
const poseA=bodyParts(dummy,0),poseB=bodyParts(dummy,.4);
assert.equal(poseA.find(p=>p.part==='head').y,poseB.find(p=>p.part==='head').y);
assert.ok(poseA.some((p,i)=>Math.abs(p.z-poseB[i].z)>.1));
assert.ok(poseA.every(p=>p.shape==='ellipsoid'&&Object.values(p.half).every(v=>v>0)));

// All modes stay single-target under extended idle motion, including timed refreshes.
for(const id of Object.keys(modes))for(const model of ['sphere','human']){
  const run=new Session(id,'hard',30,model,rng);
  for(let i=0;i<120;i++){run.tick(.05,{x:0,y:0,z:-1},false,camera);assert.equal(run.targets.length,1);}
}
console.log('PASS: six advanced rules, timed misses, shrink hit geometry, micro spacing, settling gates, cover and alternate peeks, head-only damage, rounded hitboxes, animation, and all 28 single-target combinations.');
