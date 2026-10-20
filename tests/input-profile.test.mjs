import assert from 'node:assert/strict';
import {inputConfig,horizontalFov,fitViewport,radiansPerUnit} from '../dist/input-profile.mjs';
import {project,rayFromScreen} from '../dist/core.mjs';
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9,`${actual} != ${expected}`);
const c=inputConfig({inputProfile:'delta',gameSensitivity:2});
near(radiansPerUnit(c),.044*Math.PI/180);
near(radiansPerUnit({...c,gameSensitivity:4}),radiansPerUnit(c)*2);
near(radiansPerUnit({...c,matchTweak:.8}),radiansPerUnit(c)*.8);
near(radiansPerUnit(inputConfig({sensitivity:1.345})),.0022*1.345);
// Old physical-calibration settings must have no effect after removal.
near(radiansPerUnit(inputConfig({...c,dpi:6400,cm360:200,calibration:{countsPerCm:3}})),radiansPerUnit(c));
for(const ratio of ['16:9','16:10','4:3','21:9','auto']){
  const size=fitViewport(1920,1080,ratio);
  assert.ok(size.width<=1920&&size.height<=1080);
  if(ratio!=='auto'){const [x,y]=ratio.split(':').map(Number);near(size.width/size.height,x/y);}
  const fov=horizontalFov(103,size.width,size.height,'delta');
  // A 16:9-base FOV must retain vertical framing at every actual aspect ratio.
  near(Math.tan(fov*Math.PI/360)/(size.width/size.height),Math.tan(103*Math.PI/360)/(16/9));
  const camera={x:0,y:0,z:0,yaw:0,pitch:0},p={x:2,y:1,z:-10};
  const screen=project(p,camera,size.width,size.height,fov);
  const ray=rayFromScreen(screen.x,screen.y,size.width,size.height,fov,camera);
  near(ray.x/-ray.z,p.x/10);near(ray.y/-ray.z,p.y/10);
}
near(horizontalFov(103,1920,1080,'delta'),103);
near(horizontalFov(103,1200,900,'custom'),103);
const malformed=inputConfig({matchTweak:'invalid',fov:Infinity,axisX:-1,viewAspect:'broken'});
assert.equal(malformed.matchTweak,1);assert.equal(malformed.fov,103);assert.equal(malformed.axisX,.1);assert.equal(malformed.viewAspect,'auto');
console.log('PASS: reference sensitivity and fine-tuning, ignored legacy calibration, legacy generic sensitivity, five viewport ratios, aspect-correct FOV and matching shot rays.');
