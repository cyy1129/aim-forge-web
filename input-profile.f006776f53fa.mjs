// Reference preset, not an official Delta Force input profile. See README for scope and source.
export const inputDefaults={inputProfile:'custom',sensitivity:1,fov:103,matchTweak:1,axisX:1,axisY:1,gameSensitivity:1,viewAspect:'auto'};
const number=(value,min,max,fallback)=>value!==''&&Number.isFinite(Number(value))?Math.max(min,Math.min(max,Number(value))):fallback;
export function inputConfig(values={}){
  return {
    inputProfile:values.inputProfile==='delta'?'delta':'custom',
    sensitivity:number(values.sensitivity,.001,20,1),fov:number(values.fov,60,120,103),
    matchTweak:number(values.matchTweak,.05,10,1),
    axisX:number(values.axisX,.1,5,1),axisY:number(values.axisY,.1,5,1),
    gameSensitivity:number(values.gameSensitivity,.001,1000,1),
    viewAspect:['auto','16:9','16:10','4:3','21:9'].includes(values.viewAspect)?values.viewAspect:'auto'
  };
}
export function horizontalFov(fov,width,height,profile='custom'){
  if(profile!=='delta')return fov;
  return 2*Math.atan(Math.tan(fov*Math.PI/360)*(width/Math.max(1,height))/(16/9))*180/Math.PI;
}
export function fitViewport(width,height,aspect='auto'){
  if(aspect==='auto')return {width,height};
  const [x,y]=aspect.split(':').map(Number),ratio=x/y;
  if(!Number.isFinite(ratio)||ratio<=0)return {width,height};
  return width/height>ratio?{width:height*ratio,height}:{width,height:width/ratio};
}
export function radiansPerUnit(config){
  if(config.inputProfile==='custom')return .0022*config.sensitivity;
  // PSA Method's community conversion uses 0.022 degrees/count. Monitor-distance
  // behavior and ADS are not verified here; expose a hand-feel adjustment.
  return .022*Math.PI/180*config.gameSensitivity*config.matchTweak;
}
