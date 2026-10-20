export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
export const FLOOR = -4.2;
export const modes = {
  flick: {name:'精准点射',tag:'FLICKING',count:1,kind:'click',pattern:'static',icon:'⌖',description:'快速定位，头部命中获得额外分数'},
  track: {name:'平滑跟枪',tag:'TRACKING',count:1,kind:'track',pattern:'smooth',icon:'◎',description:'按住左键，平稳追踪目标'},
  switch: {name:'单靶切换',tag:'SEQUENTIAL',count:1,kind:'click',pattern:'static',icon:'⌖',description:'一次只出现一个目标，命中后随机刷新下一个'},
  dynamic: {name:'移动靶点射',tag:'DYNAMIC CLICK',count:1,kind:'click',pattern:'linear',icon:'↗',description:'目标横向移动，抓住开枪时机'},
  reactive: {name:'急变向跟枪',tag:'REACTIVE',count:1,kind:'track',pattern:'reactive',icon:'⌁',description:'读取突然变向，迅速修正准星'},
  popcorn: {name:'跳跃靶挑战',tag:'POPCORN',count:1,kind:'click',pattern:'bounce',icon:'↟',description:'瞄准弹跳目标，掌握垂直节奏'},
  health: {name:'击杀切换',tag:'ELIMINATION',count:1,kind:'damage',pattern:'linear',icon:'⚡',description:'按住连射，击倒一个再切换下一个'},
  strafe: {name:'移动对枪',tag:'STRAFE ARENA',count:1,kind:'damage',pattern:'reactive',icon:'⇄',description:'WASD 走位，追击不断变向的目标'},
  reflex: {name:'闪现反应',tag:'REFLEX',count:1,kind:'click',pattern:'static',icon:'ϟ',isNew:true,timed:'reflex',description:'目标短暂出现，及时定位并命中',hint:'超时记漏靶并扣 25 分；瞄准越快，命中奖励越高。'},
  micro: {name:'微甩精修',tag:'MICRO FLICK',count:1,kind:'click',pattern:'static',icon:'⊙',isNew:true,description:'小靶在附近刷新，练习细微修正',hint:'新目标在上一目标附近出现；用小幅度微调完成命中。'},
  stop: {name:'急停点射',tag:'STOP & CLICK',count:1,kind:'click',pattern:'static',icon:'⊣',isNew:true,requiresMovement:true,description:'边移动边预瞄，停稳后再射击',hint:'WASD 走位后松开方向键，停稳 0.10 秒才能有效命中。'},
  peek: {name:'掩体探头',tag:'PEEK',count:1,kind:'click',pattern:'static',icon:'◧',isNew:true,requiresMovement:true,description:'从掩体侧面探头，寻找射击角度',hint:'A/D 侧移越过掩体边缘；目标在左右两侧交替出现，掩体会挡住子弹。'},
  headshot: {name:'爆头限定',tag:'HEADSHOT ONLY',count:1,kind:'click',pattern:'linear',icon:'◉',isNew:true,requiresHuman:true,description:'只接受头部命中，身体命中记失误',hint:'自动使用人形靶；只有头部命中有效，身体命中不会造成伤害。'},
  shrink: {name:'缩靶挑战',tag:'SHRINK',count:1,kind:'click',pattern:'static',icon:'⊚',isNew:true,timed:'shrink',description:'目标逐渐缩小，在消失前完成命中',hint:'越晚瞄准目标越小；消失前命中，否则记漏靶并扣 25 分。'}
};
export const difficulties = {easy:{radius:.9,speed:1.6},normal:{radius:.64,speed:2.8},hard:{radius:.43,speed:4.2}};
export function viewPoint(point,camera) {
  const dx=point.x-(camera.x||0),dy=point.y-(camera.y||0),dz=point.z-(camera.z||0);
  const c=Math.cos(camera.yaw),s=Math.sin(camera.yaw),cp=Math.cos(camera.pitch),sp=Math.sin(camera.pitch);
  const x=c*dx+s*dz,z=-s*dx+c*dz;
  return {x,y:cp*dy+sp*z,depth:-(cp*z-sp*dy)};
}
export function project(point,camera,width,height,fov) {
  const p=viewPoint(point,camera),f=width/(2*Math.tan(fov*Math.PI/360));
  if(p.depth<.15)return null;
  return {x:width/2+p.x*f/p.depth,y:height/2-p.y*f/p.depth,r:(point.r||0)*f/p.depth,depth:p.depth};
}
export function rayFromScreen(x,y,width,height,fov,camera) {
  const f=width/(2*Math.tan(fov*Math.PI/360)),a=(x-width/2)/f,b=-(y-height/2)/f,c=-1;
  const cp=Math.cos(camera.pitch),sp=Math.sin(camera.pitch),cy=Math.cos(camera.yaw),sy=Math.sin(camera.yaw),by=cp*b-sp*c,bz=sp*b+cp*c;
  const v={x:cy*a-sy*bz,y:by,z:sy*a+cy*bz},len=Math.hypot(v.x,v.y,v.z);
  return {x:v.x/len,y:v.y/len,z:v.z/len};
}
export function movePlayer(player,keys,dt,yaw) {
  let forward=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0),side=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0);
  const len=Math.hypot(forward,side);player.moving=!!len;player.speed=0;if(!len)return false;
  const speed=keys.has('ShiftLeft')||keys.has('ShiftRight')?6:4;
  forward=forward/len*speed*dt;side=side/len*speed*dt;
  const beforeX=player.x||0,beforeZ=player.z||0;
  player.x=clamp(beforeX+Math.sin(yaw)*forward+Math.cos(yaw)*side,-12,12);
  player.z=clamp(beforeZ-Math.cos(yaw)*forward+Math.sin(yaw)*side,-6,8);
  player.speed=dt>0?Math.hypot(player.x-beforeX,player.z-beforeZ)/dt:0;
  return true;
}
export function rotateX(p,angle) {
  return {x:p.x,y:p.y*Math.cos(angle)-p.z*Math.sin(angle),z:p.y*Math.sin(angle)+p.z*Math.cos(angle)};
}
// Rendering and collision share the same rounded, articulated mannequin parts.
export function bodyParts(target,time=0) {
  const scale=Math.sqrt(target.r/.64),phase=time*7+(target.phase||0),stride=target.moving ? .5 : 0;
  const result=[];
  const add=(part,x,y,z,rx,ry,rz,angle=0,tone='armor')=>result.push({part,shape:'ellipsoid',x:target.x+x*scale,y:target.y+y*scale,z:target.z+z*scale,half:{x:rx*scale,y:ry*scale,z:rz*scale},angle,tone});
  const segment=(a,b,rx,rz,tone='armor')=>add('limb',(a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2,rx,Math.hypot(b.y-a.y,b.z-a.z)/2+rx*.3,rz,Math.atan2(b.z-a.z,b.y-a.y),tone);
  add('body',0,.72,0,.46,.62,.27);
  add('body',0,.15,0,.3,.39,.22);
  add('body',0,-.22,0,.38,.3,.25);
  add('body',0,1.3,0,.14,.2,.14,0,'dark');
  add('head',0,1.7,0,.265,.34,.26,0,'helmet');
  add('body',0,.84,.285,.075,.15,.025,0,'plate');
  for(const sign of [-1,1]) {
    const swing=Math.sin(phase+(sign>0?0:Math.PI)),leg=swing*stride,kneeAngle=leg+(target.moving?Math.max(0,-swing)*.65:.05);
    const hip={x:sign*.24,y:-.35,z:0},knee={x:sign*.24,y:hip.y-.77*Math.cos(leg),z:-.77*Math.sin(leg)},ankle={x:sign*.24,y:knee.y-.76*Math.cos(kneeAngle),z:knee.z-.76*Math.sin(kneeAngle)};
    segment(hip,knee,.185,.21);segment(knee,ankle,.13,.15);
    add('limb',knee.x,knee.y,knee.z,.145,.145,.145,0,'dark');
    add('limb',ankle.x,ankle.y-.05,ankle.z+.11,.16,.12,.27,0,'dark');
    const arm=-swing*stride*.7,shoulder={x:sign*.5,y:1.02,z:0},elbow={x:sign*.56,y:shoulder.y-.64*Math.cos(arm),z:-.64*Math.sin(arm)},wrist={x:sign*.57,y:elbow.y-.6*Math.cos(arm-.2),z:elbow.z-.6*Math.sin(arm-.2)};
    add('limb',shoulder.x,shoulder.y,shoulder.z,.18,.22,.21);
    segment(shoulder,elbow,.135,.15);segment(elbow,wrist,.115,.13);
    add('limb',elbow.x,elbow.y,elbow.z,.12,.12,.12,0,'dark');
    add('limb',wrist.x,wrist.y-.13,wrist.z,.1,.18,.11,0,'dark');
  }
  return result;
}
export function ellipsoidDistance(ray,part,origin={}) {
  const o=rotateX({x:(origin.x||0)-part.x,y:(origin.y||0)-part.y,z:(origin.z||0)-part.z},-part.angle),d=rotateX(ray,-part.angle);
  let a=0,b=0,c=-1;
  for(const axis of ['x','y','z']){const r=part.half[axis];a+=d[axis]*d[axis]/(r*r);b+=o[axis]*d[axis]/(r*r);c+=o[axis]*o[axis]/(r*r);}
  const disc=b*b-a*c;if(disc<0||a===0)return Infinity;
  const near=(-b-Math.sqrt(disc))/a,far=(-b+Math.sqrt(disc))/a;
  return near>0?near:far>0?far:Infinity;
}
export function obstaclesForMode(mode){return mode==='peek'?[{x:0,y:FLOOR+3,z:-8.5,half:{x:1.6,y:3,z:.35},angle:0,tone:'cover'}]:[];}
export function obstacleDistance(ray,obstacles,origin={}){return Math.min(Infinity,...obstacles.map(box=>boxDistance(ray,box,origin)));}
export function sphereDistance(ray,t,origin) {
  const x=t.x-(origin.x||0),y=t.y-(origin.y||0),z=t.z-(origin.z||0),dot=ray.x*x+ray.y*y+ray.z*z;
  const disc=dot*dot-(x*x+y*y+z*z-t.r*t.r);
  if(disc<0)return Infinity;const d=dot-Math.sqrt(disc);return d>0?d:Infinity;
}
export function boxDistance(ray,box,origin) {
  const o=rotateX({x:(origin.x||0)-box.x,y:(origin.y||0)-box.y,z:(origin.z||0)-box.z},-box.angle),d=rotateX(ray,-box.angle);
  let near=0,far=Infinity;
  for(const axis of ['x','y','z']) {
    if(Math.abs(d[axis])<1e-9){if(Math.abs(o[axis])>box.half[axis])return Infinity;continue;}
    let a=(-box.half[axis]-o[axis])/d[axis],b=(box.half[axis]-o[axis])/d[axis];
    if(a>b)[a,b]=[b,a];near=Math.max(near,a);far=Math.min(far,b);if(near>far)return Infinity;
  }
  return far>0?near:Infinity;
}
export function traceTargets(ray,targets,origin={},time=0,obstacles=[]) {
  let best=null,nearest=Infinity;
  for(const target of targets) {
    if(target.visible===false)continue;
    const parts=target.model==='human'?bodyParts(target,time):[{...target,part:'body'}];
    for(const part of parts) {
      const distance=target.model==='human'?ellipsoidDistance(ray,part,origin):sphereDistance(ray,part,origin);
      if(distance<nearest){nearest=distance;best={target,part:part.part,distance,point:{x:(origin.x||0)+ray.x*distance,y:(origin.y||0)+ray.y*distance,z:(origin.z||0)+ray.z*distance}};}
    }
  }
  return obstacleDistance(ray,obstacles,origin)<nearest?null:best;
}
export function hitTarget(ray,targets,origin={},time=0){return traceTargets(ray,targets,origin,time)?.target||null;}
export function spawnTarget(targets,radius,rng=Math.random) {
  for(let i=0;i<100;i++){const t={x:(rng()-.5)*22,y:(rng()-.5)*8,z:-20,r:radius};if(targets.every(o=>Math.hypot(o.x-t.x,o.y-t.y)>(radius+o.r)*1.9))return t;}
  return{x:0,y:0,z:-20,r:radius};
}
export function trackingPosition(t,speed){return{x:Math.sin(t*speed*.68)*8,y:Math.sin(t*speed*.97)*3.2,z:-20};}
export class Session {
  constructor(mode,difficulty,duration,model='sphere',rng=Math.random) {
    this.mode=mode;this.difficulty=difficulty;this.duration=duration;this.model=modes[mode].requiresHuman?'human':model;this.rng=rng;
    this.elapsed=0;this.shots=0;this.hits=0;this.headshots=0;this.kills=0;this.reactions=[];this.trackOn=0;this.trackHeld=0;this.sinceHit=0;this.score=0;this.nextShot=0;this.targets=[];this.events=[];this.sequence=0;this.timeouts=0;this.stillTime=1;
    this.obstacles=obstaclesForMode(mode);
    for(let i=0;i<modes[mode].count;i++)this.targets.push(this.makeTarget());
  }
  makeTarget(previous=null) {
    const d=difficulties[this.difficulty],radius=d.radius*(this.mode==='micro'?.55:this.mode==='shrink'?1.2:1),t=spawnTarget(this.targets,radius,this.rng);
    if(this.model==='human') {
      const scale=Math.sqrt(radius/.64);t.y=FLOOR+2.05*scale;t.z=-12-this.rng()*8;t.x=(this.rng()-.5)*20;
    }
    if(this.mode==='micro'&&previous){
      for(let attempt=0;attempt<40;attempt++){
        const angle=this.rng()*Math.PI*2,distance=1.2+this.rng()*1.2;
        t.x=clamp(previous.x+Math.cos(angle)*distance,-10,10);
        if(this.model==='human')t.z=clamp(previous.z+Math.sin(angle)*distance,-22,-12);
        else t.y=clamp(previous.y+Math.sin(angle)*distance,-3.5,3.5);
        if(Math.hypot(t.x-previous.x,this.model==='human'?t.z-previous.z:t.y-previous.y)>=.8)break;
        if(attempt===39){t.x=previous.x+(previous.x>0?-1.5:1.5);if(this.model==='human')t.z=previous.z;else t.y=previous.y;}
      }
    }
    if(this.mode==='peek'){t.x=(this.sequence%2===0?1:-1)*(1.6+this.rng()*.12);t.z=-20;if(this.model==='sphere')t.y=-.65;}
    const life=modes[this.mode].timed==='reflex'?({easy:1.2,normal:.85,hard:.55})[this.difficulty]:modes[this.mode].timed==='shrink'?({easy:2.2,normal:1.6,hard:1.1})[this.difficulty]:Infinity;
    return {...t,r:radius,baseRadius:radius,model:this.model,id:++this.sequence,hp:100,maxHp:100,phase:this.rng()*Math.PI*2,baseY:t.y,baseZ:t.z,moving:modes[this.mode].pattern!=='static',vx:(this.rng()>.5?1:-1)*d.speed,turnIn:.2+this.rng()*.6,hitFlash:0,bornAt:this.elapsed,appearAt:this.elapsed,life,visible:true};
  }
  replaceTarget(target,delay=0) {
    this.targets=this.targets.filter(t=>t!==target);
    const next=this.makeTarget(target);
    if(delay){next.visible=false;next.appearAt=this.elapsed+delay;next.bornAt=next.appearAt;}
    this.targets.push(next);return next;
  }
  moveTargets(dt) {
    const pattern=modes[this.mode].pattern,speed=difficulties[this.difficulty].speed;
    for(const t of this.targets) {
      t.hitFlash=Math.max(0,t.hitFlash-dt);
      if(this.elapsed<t.appearAt){t.visible=false;continue;}
      t.visible=true;
      const age=this.elapsed-t.bornAt;
      if(modes[this.mode].timed&&age>=t.life){
        this.timeouts++;this.score=Math.max(0,this.score-25);
        this.events.push({expired:true,notice:'漏靶 −25',miss:true});
        this.replaceTarget(t,.3);continue;
      }
      if(this.mode==='shrink'){
        t.r=t.baseRadius*(1-.82*clamp(age/t.life,0,1));
        if(this.model==='human')t.y=FLOOR+2.05*Math.sqrt(t.r/.64);
      }
      if(pattern==='static')continue;
      if(pattern==='smooth') {
        const p=trackingPosition(this.elapsed,speed);t.x=p.x;t.y=this.model==='human'?t.baseY:p.y;
        t.z=this.model==='human'?t.baseZ+Math.sin(this.elapsed*speed*.35)*1.5:p.z;continue;
      }
      if(pattern==='reactive') {
        t.turnIn-=dt;
        if(t.turnIn<=0){t.vx=(this.rng()>.5?1:-1)*speed*(1.2+this.rng());t.turnIn=.25+this.rng()*.55;}
        t.z=t.baseZ+Math.sin(this.elapsed*1.1+t.phase)*1.5;
        if(this.model!=='human')t.y=t.baseY+Math.sin(this.elapsed*1.8+t.phase)*1.5;
      }
      t.x+=t.vx*dt;
      if(t.x>11){t.x=11;t.vx=-Math.abs(t.vx);}if(t.x<-11){t.x=-11;t.vx=Math.abs(t.vx);}
      if(pattern==='bounce')t.y=t.baseY+Math.abs(Math.sin(this.elapsed*(1.6+speed*.2)+t.phase))*4.7;
    }
  }
  tick(dt,ray,held,origin={}) {
    let remaining=Math.min(Math.max(dt,0),this.duration-this.elapsed);
    while(remaining>1e-8) {
      const step=Math.min(remaining,1/120);remaining-=step;this.elapsed+=step;this.sinceHit+=step;
      this.stillTime=origin.moving||origin.speed>.08?0:Math.min(1,this.stillTime+step);
      this.moveTargets(step);
      const kind=modes[this.mode].kind;
      if(kind==='track'&&held){this.trackHeld+=step;if(traceTargets(ray,this.targets,origin,this.elapsed,this.obstacles))this.trackOn+=step;}
      if(kind==='damage') {
        this.nextShot=Math.max(0,this.nextShot-step);
        if(held&&this.nextShot<=1e-8){this.fire(ray,origin);this.nextShot=.1;}
      }
    }
    if(modes[this.mode].kind==='track')this.score=Math.round(this.trackOn*100);
    if(this.duration-this.elapsed<1e-7)this.elapsed=this.duration;
    return this.elapsed>=this.duration;
  }
  fire(ray,origin={}) {
    if(this.elapsed>=this.duration)return false;
    this.shots++;
    const miss=(reason,notice)=>{this.events.push({miss:true,reason,notice});return false;};
    if(this.mode==='stop'&&(origin.moving||origin.speed>.08||this.stillTime<.1-1e-7))return miss('moving','请先松开方向键，停稳后再射击');
    const hit=traceTargets(ray,this.targets,origin,this.elapsed);
    const obstacle=obstacleDistance(ray,this.obstacles,origin);
    if(Number.isFinite(obstacle)&&(!hit||obstacle<hit.distance))return miss('covered','目标被掩体挡住了，试着 A/D 侧移');
    if(!hit)return miss('miss');
    const {target,part}=hit,head=target.model==='human'&&part==='head';
    if(this.mode==='headshot'&&!head)return miss('body-shot','仅头部命中有效，身体命中记失误');
    this.hits++;if(head)this.headshots++;target.hitFlash=.1;
    const damage=modes[this.mode].kind==='damage'?(head?85:part==='limb'?25:34):100;
    target.hp-=damage;const killed=target.hp<=0;let points=0;
    if(killed){
      this.kills++;
      const bonus=this.mode==='reflex'?Math.round(100*(1-clamp((this.elapsed-target.bornAt)/target.life,0,1))):0;
      points=(head?150:100)+bonus;this.score+=points;
      this.reactions.push(this.sinceHit*1000);this.sinceHit=0;this.replaceTarget(target);
    }
    const event={...hit,head,killed,damage,points};this.events.push(event);return event;
  }
  shoot(ray,origin={}) {
    if(modes[this.mode].kind!=='click'||this.elapsed>=this.duration)return false;
    return this.fire(ray,origin)?.target||false;
  }
  get failures(){return this.shots-this.hits+this.timeouts;}
  get accuracy(){return modes[this.mode].kind==='track'?(this.elapsed?this.trackOn/this.elapsed*100:0):((this.shots+this.timeouts)?this.hits/(this.shots+this.timeouts)*100:0);}
  get reaction(){return this.reactions.length?this.reactions.reduce((a,b)=>a+b,0)/this.reactions.length:null;}
  result(){return {mode:this.mode,model:this.model,difficulty:this.difficulty,duration:this.duration,score:this.score,accuracy:this.accuracy,reaction:this.reaction,kills:this.kills,headshots:this.headshots,timeouts:this.timeouts,failures:this.failures,date:Date.now()};}
}
