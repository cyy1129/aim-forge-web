import {FLOOR,bodyParts,project,rotateX,viewPoint} from './core.mjs';

const palette={
  armor:['#8ca77a','#506652','#b8cf9c','#657f5e','#7e9b6d','#9db48a'],
  helmet:['#bdd39a','#71866c','#d5e9b9','#91a581','#abc98b','#b6d499'],
  dark:['#3d504c','#263a37','#62776b','#344a42','#455f52','#50685a'],
  visor:['#d8ff77','#afd754','#eaffac','#c3f86a','#d7ff91','#c3f86a'],
  plate:['#91bb55','#5c853f','#d3f991','#9fca64','#a9d16e','#b9e77c']
};
export class Renderer {
  constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.width=1;this.height=1;}
  resize(){
    const r=this.canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
    this.width=r.width;this.height=r.height;this.canvas.width=Math.round(r.width*dpr);this.canvas.height=Math.round(r.height*dpr);
    this.ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  screen(v){const f=this.width/(2*Math.tan(this.fov*Math.PI/360));return{x:this.width/2+v.x*f/v.depth,y:this.height/2-v.y*f/v.depth};}
  project(p){return project(p,this.camera,this.width,this.height,this.fov);}
  line(a,b,color,lineWidth=1){
    let p=viewPoint(a,this.camera),q=viewPoint(b,this.camera);
    if(p.depth<.15&&q.depth<.15)return;
    if(p.depth<.15||q.depth<.15){const t=(.15-p.depth)/(q.depth-p.depth),cut={x:p.x+(q.x-p.x)*t,y:p.y+(q.y-p.y)*t,depth:.15};if(p.depth<.15)p=cut;else q=cut;}
    const u=this.screen(p),v=this.screen(q),c=this.ctx;c.strokeStyle=color;c.lineWidth=lineWidth;c.beginPath();c.moveTo(u.x,u.y);c.lineTo(v.x,v.y);c.stroke();
  }
  polygon(points,fill,stroke){
    let vertices=points.map(p=>viewPoint(p,this.camera)),clipped=[];
    for(let i=0;i<vertices.length;i++){
      const a=vertices[i],b=vertices[(i+1)%vertices.length],aIn=a.depth>=.15,bIn=b.depth>=.15;
      if(aIn)clipped.push(a);
      if(aIn!==bIn){const t=(.15-a.depth)/(b.depth-a.depth);clipped.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,depth:.15});}
    }
    if(clipped.length<3)return;
    const c=this.ctx;c.beginPath();clipped.forEach((p,i)=>{const s=this.screen(p);if(i)c.lineTo(s.x,s.y);else c.moveTo(s.x,s.y)});c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=.6;c.stroke();}
  }
  room(){
    const c=this.ctx,w=this.width,h=this.height;
    c.fillStyle='#1c292a';c.fillRect(0,0,w,h);
    this.polygon([{x:-16,y:FLOOR,z:12},{x:16,y:FLOOR,z:12},{x:16,y:FLOOR,z:-30},{x:-16,y:FLOOR,z:-30}],'#26312f');
    this.polygon([{x:-16,y:FLOOR,z:-30},{x:16,y:FLOOR,z:-30},{x:16,y:9,z:-30},{x:-16,y:9,z:-30}],'#243130');
    for(const x of [-16,16])this.polygon([{x,y:FLOOR,z:12},{x,y:FLOOR,z:-30},{x,y:9,z:-30},{x,y:9,z:12}],x<0?'#202c2b':'#1e2929');
    this.polygon([{x:-16,y:FLOOR,z:12},{x:16,y:FLOOR,z:12},{x:16,y:9,z:12},{x:-16,y:9,z:12}],'#243130');
    for(let x=-16;x<=16;x+=2){this.line({x,y:FLOOR,z:-30},{x,y:FLOOR,z:12},'#819b6f22');this.line({x,y:FLOOR,z:-30},{x,y:9,z:-30},'#6e847322');}
    for(let z=-30;z<=12;z+=2)this.line({x:-16,y:FLOOR,z},{x:16,y:FLOOR,z},'#819b6f22');
    for(let y=FLOOR;y<=9;y+=2)this.line({x:-16,y,z:-30},{x:16,y,z:-30},'#6e847322');
    for(const x of [-16,16]){this.line({x,y:FLOOR+.03,z:-30},{x,y:FLOOR+.03,z:12},'#c3f86a66',2);this.line({x,y:3.5,z:-30},{x,y:3.5,z:12},'#6c886944');}
    for(const x of [-8,0,8])this.line({x,y:FLOOR+.02,z:-27},{x,y:FLOOR+.02,z:-9},'#c3f86a22',2);
    for(let i=0;i<5;i++){
      const p=this.project({x:-12+i*6,y:2.6,z:-29.95});if(!p)continue;
      c.fillStyle='#83947855';c.font='600 '+Math.max(12,120/p.depth)+'px Inter,sans-serif';c.textAlign='center';c.fillText('0'+(i+1),p.x,p.y);
    }
    const gradient=c.createRadialGradient(w*.5,h*.4,h*.1,w*.5,h*.4,w*.7);gradient.addColorStop(0,'#0b151000');gradient.addColorStop(1,'#09141277');c.fillStyle=gradient;c.fillRect(0,0,w,h);
  }
  boxFaces(box,target){
    const vertices=[];
    for(const z of [-1,1])for(const y of [-1,1])for(const x of [-1,1]){
      const p=rotateX({x:x*box.half.x,y:y*box.half.y,z:z*box.half.z},box.angle);
      vertices.push({x:box.x+p.x,y:box.y+p.y,z:box.z+p.z});
    }
    const indices=[[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]];
    return indices.map((ids,i)=>{const points=ids.map(index=>vertices[index]),center=points.reduce((a,p)=>({x:a.x+p.x/4,y:a.y+p.y/4,z:a.z+p.z/4}),{x:0,y:0,z:0});return{depth:viewPoint(center,this.camera).depth,draw:()=>this.polygon(points,target.hitFlash>0?'#f0ffce':palette[box.tone][i],box.tone==='visor'?'#e9ffa9':'#1b302a55')};});
  }
  sphere(target,active){
    const p=this.project(target);if(!p||p.r<.1)return;
    const c=this.ctx;c.save();c.shadowBlur=active?22:12;c.shadowColor=active?'#50dcff99':'#c3f86a44';
    const g=c.createRadialGradient(p.x-p.r*.3,p.y-p.r*.4,p.r*.08,p.x,p.y,p.r);
    g.addColorStop(0,target.hitFlash>0?'#f4ffe0':active?'#d0fbff':'#d6ff94');g.addColorStop(.55,active?'#4cd7f5':'#b2eb5c');g.addColorStop(1,active?'#167baf':'#739e36');
    c.fillStyle=g;c.beginPath();c.arc(p.x,p.y,p.r,0,Math.PI*2);c.fill();
    if(active){c.strokeStyle='#99f1ff';c.lineWidth=1.5;c.stroke();}
    c.restore();
  }
  targets(targets,time,hovered){
    const c=this.ctx,commands=[];
    for(const t of targets){
      if(t.model==='human'){
        const scale=Math.sqrt(t.r/.64),p=this.project({x:t.x,y:FLOOR+.02,z:t.z});
        if(p){c.fillStyle='#0e181c66';c.beginPath();c.ellipse(p.x,p.y,Math.max(1,18*scale*22/p.depth),Math.max(1,3*scale*22/p.depth),0,0,Math.PI*2);c.fill();}
        for(const part of bodyParts(t,time))commands.push(...this.boxFaces(part,t));
      }else commands.push({depth:viewPoint(t,this.camera).depth,draw:()=>this.sphere(t,hovered===t)});
    }
    commands.sort((a,b)=>b.depth-a.depth).forEach(cmd=>cmd.draw());
    for(const t of targets){
      const scale=Math.sqrt(t.r/.64),p=this.project({x:t.x,y:t.y+(t.model==='human'?2.3*scale:t.r+.45),z:t.z});
      if(!p)continue;
      const bar=Math.max(26,Math.min(56,800/p.depth));
      c.fillStyle='#0c171ada';c.fillRect(p.x-bar/2-1,p.y-1,bar+2,5);
      c.fillStyle=t.hp<40?'#ffb26b':'#c3f86a';c.fillRect(p.x-bar/2,p.y,bar*Math.max(0,t.hp/t.maxHp),3);
      c.fillStyle='#d5e4cd99';c.font='8px Inter,sans-serif';c.textAlign='center';c.fillText('BOT '+String(t.id).padStart(2,'0'),p.x,p.y-7);
    }
  }
  weapon(shot){
    const c=this.ctx,w=this.width,h=this.height,scale=Math.min(1,w/650);
    c.save();c.translate(w-110*scale,h-26);c.scale(scale,scale);
    const shape=(points,fill)=>{c.fillStyle=fill;c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();c.fill();c.strokeStyle='#91a69533';c.lineWidth=1;c.stroke();};
    shape([[-8,0],[100,0],[89,-42],[43,-65],[24,-55]],'#243734');
    shape([[8,-5],[51,-12],[41,-81],[18,-81]],'#394c44');
    shape([[-15,-74],[30,-81],[65,-51],[54,-28],[17,-44]],'#53675a');
    shape([[-37,-111],[-15,-124],[47,-76],[29,-55]],'#334a43');
    shape([[-37,-111],[-40,-125],[-20,-133],[-15,-124]],'#8a9e87');
    shape([[-18,-110],[-6,-116],[24,-89],[13,-83]],'#b3cf92');
    if(shot>0){c.fillStyle='#e8ffad';c.beginPath();c.moveTo(-34,-134);c.lineTo(-60,-157);c.lineTo(-43,-153);c.lineTo(-39,-175);c.lineTo(-26,-146);c.lineTo(-14,-145);c.closePath();c.fill();}
    c.restore();
  }
  draw({camera,fov,targets,time,running,cursor,flash,shot,particles,hovered,drawWeapon=true}){
    this.camera=camera;this.fov=fov;this.room();this.targets(targets,time,hovered);
    const c=this.ctx;
    for(const p of particles){const pos=this.project(p);if(!pos)continue;c.globalAlpha=Math.max(0,p.life/.6);c.fillStyle=p.head?'#ffd58a':'#d8ff9f';c.font='600 13px Inter,sans-serif';c.textAlign='center';c.fillText(p.text,pos.x,pos.y-(.6-p.life)*35);c.globalAlpha=1;}
    if(running){
      if(drawWeapon)this.weapon(shot);
      const x=cursor.x,y=cursor.y;c.strokeStyle=flash>0?'#c3f86a':'#f0f7ef';c.lineWidth=1.4;c.beginPath();
      for(const [a,b,d,e]of [[-9,0,-4,0],[4,0,9,0],[0,-9,0,-4],[0,4,0,9]]){c.moveTo(x+a,y+b);c.lineTo(x+d,y+e);}c.stroke();
      c.fillStyle=c.strokeStyle;c.fillRect(x-1,y-1,2,2);
      if(flash>0){c.beginPath();for(const [dx,dy]of [[-1,-1],[-1,1],[1,-1],[1,1]]){c.moveTo(x+dx*12,y+dy*12);c.lineTo(x+dx*17,y+dy*17);}c.stroke();}
    }
  }
}
