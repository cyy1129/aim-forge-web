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
  strafe: {name:'移动对枪',tag:'STRAFE ARENA',count:1,kind:'damage',pattern:'reactive',icon:'⇄',description:'WASD 走位，追击不断变向的目标'}
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
  const len=Math.hypot(forward,side);if(!len)return false;
  const speed=keys.has('ShiftLeft')||keys.has('ShiftRight')?6:4;
  forward=forward/len*speed*dt;side=side/len*speed*dt;
  player.x=clamp((player.x||0)+Math.sin(yaw)*forward+Math.cos(yaw)*side,-12,12);
  player.z=clamp((player.z||0)-Math.cos(yaw)*forward+Math.sin(yaw)*side,-6,8);
  return true;
}
export function rotateX(p,angle) {
  return {x:p.x,y:p.y*Math.cos(angle)-p.z*Math.sin(angle),z:p.y*Math.sin(angle)+p.z*Math.cos(angle)};
}
// Rendering and collision use the same articulated box geometry.
export function bodyParts(target,time=0) {
  const scale=Math.sqrt(target.r/.64),walk=target.moving?Math.sin(time*8+target.phase)*.55:0;
  const result=[];
  const add=(part,x,y,z,w,h,d,angle=0,tone='armor')=>result.push({part,x:target.x+x*scale,y:target.y+y*scale,z:target.z+z*scale,half:{x:w*scale/2,y:h*scale/2,z:d*scale/2},angle,tone});
  add('body',0,.55,0,1.02,1.25,.58,0,'armor');
  add('body',0,-.22,0,.82,.38,.5,0,'dark');
  add('head',0,1.55,0,.73,.78,.69,0,'helmet');
  add('head',0,1.58,.36,.55,.2,.04,0,'visor');
  add('body',0,.75,.305,.5,.32,.04,0,'plate');
  for(const sign of [-1,1]) {
    const leg=walk*sign,arm=-walk*sign;
    add('limb',sign*.27,-.26-.8*Math.cos(leg),-.8*Math.sin(leg),.34,1.6,.39,leg,'dark');
    add('limb',sign*.27,-.26-1.6*Math.cos(leg),-1.6*Math.sin(leg)+.12,.4,.24,.65,leg,'armor');
    add('limb',sign*.72,.95-.65*Math.cos(arm),-.65*Math.sin(arm),.3,1.3,.34,arm,'armor');
    add('limb',sign*.72,.95-1.3*Math.cos(arm),-1.3*Math.sin(arm),.31,.29,.36,arm,'dark');
  }
  return result;
}
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
export function traceTargets(ray,targets,origin={},time=0) {
  let best=null,nearest=Infinity;
  for(const target of targets) {
    const parts=target.model==='human'?bodyParts(target,time):[{...target,part:'body'}];
    for(const part of parts) {
      const distance=target.model==='human'?boxDistance(ray,part,origin):sphereDistance(ray,part,origin);
      if(distance<nearest){nearest=distance;best={target,part:part.part,distance,point:{x:(origin.x||0)+ray.x*distance,y:(origin.y||0)+ray.y*distance,z:(origin.z||0)+ray.z*distance}};}
    }
  }
  return best;
}
export function hitTarget(ray,targets,origin={},time=0){return traceTargets(ray,targets,origin,time)?.target||null;}
export function spawnTarget(targets,radius,rng=Math.random) {
  for(let i=0;i<100;i++){const t={x:(rng()-.5)*22,y:(rng()-.5)*8,z:-20,r:radius};if(targets.every(o=>Math.hypot(o.x-t.x,o.y-t.y)>(radius+o.r)*1.9))return t;}
  return{x:0,y:0,z:-20,r:radius};
}
export function trackingPosition(t,speed){return{x:Math.sin(t*speed*.68)*8,y:Math.sin(t*speed*.97)*3.2,z:-20};}
export class Session {
  constructor(mode,difficulty,duration,model='sphere',rng=Math.random) {
    this.mode=mode;this.difficulty=difficulty;this.duration=duration;this.model=model;this.rng=rng;
    this.elapsed=0;this.shots=0;this.hits=0;this.headshots=0;this.kills=0;this.reactions=[];this.trackOn=0;this.trackHeld=0;this.sinceHit=0;this.score=0;this.nextShot=0;this.targets=[];this.events=[];this.sequence=0;
    for(let i=0;i<modes[mode].count;i++)this.targets.push(this.makeTarget());
  }
  makeTarget() {
    const d=difficulties[this.difficulty],t=spawnTarget(this.targets,d.radius,this.rng);
    if(this.model==='human') {
      const scale=Math.sqrt(d.radius/.64);t.y=FLOOR+2.05*scale;
      for(let n=0;n<80;n++){t.x=(this.rng()-.5)*21;t.z=-13-this.rng()*12;if(this.targets.every(o=>Math.hypot(t.x-o.x,t.z-o.z)>3))break;}
    }
    return {...t,model:this.model,id:++this.sequence,hp:100,maxHp:100,phase:this.rng()*Math.PI*2,baseY:t.y,baseZ:t.z,moving:modes[this.mode].pattern!=='static',vx:(this.rng()>.5?1:-1)*d.speed,turnIn:.2+this.rng()*.6,hitFlash:0};
  }
  moveTargets(dt) {
    const pattern=modes[this.mode].pattern,speed=difficulties[this.difficulty].speed;
    for(const t of this.targets) {
      t.hitFlash=Math.max(0,t.hitFlash-dt);
      if(pattern==='static')continue;
      if(pattern==='smooth') {
        const p=trackingPosition(this.elapsed,speed);t.x=p.x;t.y=this.model==='human'?t.baseY+Math.sin(this.elapsed*2)*.08:p.y;
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
      const step=Math.min(remaining,1/120);remaining-=step;this.elapsed+=step;this.sinceHit+=step;this.moveTargets(step);
      const kind=modes[this.mode].kind;
      if(kind==='track'&&held){this.trackHeld+=step;if(hitTarget(ray,this.targets,origin,this.elapsed))this.trackOn+=step;}
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
    this.shots++;const hit=traceTargets(ray,this.targets,origin,this.elapsed);
    if(!hit){this.events.push({miss:true});return false;}
    const {target,part}=hit,head=target.model==='human'&&part==='head';
    this.hits++;if(head)this.headshots++;target.hitFlash=.1;
    const damage=modes[this.mode].kind==='damage'?(head?85:part==='limb'?25:34):100;
    target.hp-=damage;const killed=target.hp<=0;
    if(killed){this.kills++;this.score+=head?150:100;this.reactions.push(this.sinceHit*1000);this.sinceHit=0;this.targets=this.targets.filter(t=>t!==target);this.targets.push(this.makeTarget());}
    const event={...hit,head,killed,damage};this.events.push(event);return event;
  }
  shoot(ray,origin={}) {
    if(modes[this.mode].kind!=='click'||this.elapsed>=this.duration)return false;
    return this.fire(ray,origin)?.target||false;
  }
  get accuracy(){return modes[this.mode].kind==='track'?(this.elapsed?this.trackOn/this.elapsed*100:0):(this.shots?this.hits/this.shots*100:0);}
  get reaction(){return this.reactions.length?this.reactions.reduce((a,b)=>a+b,0)/this.reactions.length:null;}
  result(){return {mode:this.mode,model:this.model,difficulty:this.difficulty,duration:this.duration,score:this.score,accuracy:this.accuracy,reaction:this.reaction,kills:this.kills,headshots:this.headshots,date:Date.now()};}
}
