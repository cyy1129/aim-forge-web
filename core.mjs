export const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export const modes={flick:{name:'精准点射',tag:'FLICKING',count:3},track:{name:'平滑跟枪',tag:'TRACKING',count:1},switch:{name:'目标切换',tag:'SWITCHING',count:6}};
export const difficulties={easy:{radius:.9,speed:1.6},normal:{radius:.64,speed:2.8},hard:{radius:.43,speed:4.2}};
export function project(point,camera,width,height,fov){
 const {yaw,pitch}=camera,c=Math.cos(yaw),s=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
 const x=c*point.x+s*point.z,z=-s*point.x+c*point.z,y=cp*point.y+sp*z,depth=-(cp*z-sp*point.y),f=width/(2*Math.tan(fov*Math.PI/360));
 if(depth<.15)return null;
 return {x:width/2+x*f/depth,y:height/2-y*f/depth,r:(point.r||0)*f/depth,depth};
}
export function rayFromScreen(x,y,width,height,fov,camera){
 const f=width/(2*Math.tan(fov*Math.PI/360));let a=(x-width/2)/f,b=-(y-height/2)/f,c=-1;
 const cp=Math.cos(camera.pitch),sp=Math.sin(camera.pitch),cy=Math.cos(camera.yaw),sy=Math.sin(camera.yaw),by=cp*b-sp*c,bz=sp*b+cp*c;
 const v={x:cy*a-sy*bz,y:by,z:sy*a+cy*bz},len=Math.hypot(v.x,v.y,v.z);return{x:v.x/len,y:v.y/len,z:v.z/len};
}
export function hitTarget(ray,targets){let best=null,nearest=Infinity;for(const t of targets){const dot=ray.x*t.x+ray.y*t.y+ray.z*t.z,disc=dot*dot-(t.x*t.x+t.y*t.y+t.z*t.z-t.r*t.r);if(disc<0)continue;const distance=dot-Math.sqrt(disc);if(distance>0&&distance<nearest){best=t;nearest=distance}}return best;}
export function spawnTarget(targets,radius,rng=Math.random){for(let i=0;i<100;i++){const t={x:(rng()-.5)*22,y:(rng()-.5)*10,z:-20,r:radius};if(targets.every(o=>Math.hypot(o.x-t.x,o.y-t.y)>(radius+o.r)*1.9))return t;}return{x:0,y:0,z:-20,r:radius};}
export function trackingPosition(t,speed){return{x:Math.sin(t*speed*.68)*8,y:Math.sin(t*speed*.97)*3.2,z:-20};}
export class Session{
 constructor(mode,difficulty,duration){this.mode=mode;this.difficulty=difficulty;this.duration=duration;this.elapsed=0;this.shots=0;this.hits=0;this.reactions=[];this.trackOn=0;this.trackHeld=0;this.sinceHit=0;this.targets=[];this.score=0;const d=difficulties[difficulty];for(let i=0;i<modes[mode].count;i++)this.targets.push(spawnTarget(this.targets,d.radius));}
 tick(dt,ray,held){dt=Math.min(Math.max(dt,0),this.duration-this.elapsed);this.elapsed+=dt;this.sinceHit+=dt;if(this.mode==='track'){Object.assign(this.targets[0],trackingPosition(this.elapsed,difficulties[this.difficulty].speed));if(held){this.trackHeld+=dt;if(hitTarget(ray,this.targets))this.trackOn+=dt;}this.score=Math.round(this.trackOn*100);}return this.elapsed>=this.duration;}
 shoot(ray){if(this.mode==='track'||this.elapsed>=this.duration)return false;this.shots++;const target=hitTarget(ray,this.targets);if(!target)return false;this.hits++;this.reactions.push(this.sinceHit*1000);this.sinceHit=0;this.score+=100;this.targets=this.targets.filter(t=>t!==target);this.targets.push(spawnTarget(this.targets,difficulties[this.difficulty].radius));return target;}
 get accuracy(){return this.mode==='track'?(this.elapsed?this.trackOn/this.elapsed*100:0):(this.shots?this.hits/this.shots*100:0)}
 get reaction(){return this.reactions.length?this.reactions.reduce((a,b)=>a+b,0)/this.reactions.length:null}
 result(){return{mode:this.mode,difficulty:this.difficulty,duration:this.duration,score:this.score,accuracy:this.accuracy,reaction:this.reaction,date:Date.now()}}
}
