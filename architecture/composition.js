export function worldOffset(x,z,yaw=0){return {x:x*Math.cos(yaw)+z*Math.sin(yaw),z:-x*Math.sin(yaw)+z*Math.cos(yaw)};}
export function footprintSamples(p,shape){const out=[];for(const u of [-1,0,1])for(const v of [-1,0,1]){const d=worldOffset(u*(shape.w/2+(shape.margin??.1)),v*(shape.d/2+(shape.margin??.1)),shape.yaw);out.push({x:p.x+d.x,z:p.z+d.z});}return out;}
export function footprintsOverlap(a,b,gap=.45){
 const aa=a.plan||a,bb=b.plan||b,ya=aa.yaw||0,yb=bb.yaw||0;
 const axes=[worldOffset(1,0,ya),worldOffset(0,1,ya),worldOffset(1,0,yb),worldOffset(0,1,yb)];
 const basisA=axes.slice(0,2),basisB=axes.slice(2),delta={x:b.x-a.x,z:b.z-a.z};
 const dot=(u,v)=>u.x*v.x+u.z*v.z;
 for(const axis of axes){const ra=Math.abs(dot(axis,basisA[0]))*(aa.w+gap)/2+Math.abs(dot(axis,basisA[1]))*(aa.d+gap)/2,rb=Math.abs(dot(axis,basisB[0]))*(bb.w+gap)/2+Math.abs(dot(axis,basisB[1]))*(bb.d+gap)/2;if(Math.abs(dot(delta,axis))>=ra+rb)return false;}
 return true;
}
export function orientationCandidates(surfaceAt,p,shape,context){
 if(!context?.cameraPosition)return [{yaw:0,score:0}];
 const camera=context.cameraPosition,focus=context.focus||{x:0,z:0},dx=camera.x-p.x,dz=camera.z-p.z,bearing=Math.atan2(dx,dz);
 const viewX=camera.x-focus.x,viewZ=camera.z-focus.z;
 // Buildings on either side turn slightly toward the composition's centre.
 const side=(p.x-focus.x)*viewZ-(p.z-focus.z)*viewX>0?-1:1;
 const candidates=[];
 for(const sign of [side,-side])for(const degrees of [30,42,20]){
  const yaw=bearing+sign*degrees*Math.PI/180,centre=surfaceAt(p.x,p.z),distance=shape.d*.65+.6;
  let blocked=0;
  for(const s of [-.5,0,.5]){const q=worldOffset(s*shape.w,distance,yaw);blocked+=Math.max(0,surfaceAt(p.x+q.x,p.z+q.z)-centre);}
  const gx=surfaceAt(p.x+.5,p.z)-surfaceAt(p.x-.5,p.z),gz=surfaceAt(p.x,p.z+.5)-surfaceAt(p.x,p.z-.5),longAxis=worldOffset(1,0,yaw);
  const terrainAlignment=Math.abs(gx*longAxis.x+gz*longAxis.z);
  const score=blocked*3+terrainAlignment*.35+(sign===side?0:.4)+Math.abs(degrees-30)*.009;
  candidates.push({yaw,score});
 }
 return candidates.sort((a,b)=>a.score-b.score);
}
export function sceneScale(type,context){return type==='pavilion'?(context?.pavilionScale||1):(context?.scale||1);}

// Balance the existing scene, while avoiding the same silhouette nearby.
// Stable scores keep pointer previews and the final placement identical.
export function chooseBuildingStyle(type,tier,p,others=[],ignore=null){
 const preference=type==='pavilion'?(tier===2?[1,0]:[0,1]):tier===0?[3,4,0,1,2]:tier===1?[4,0,3,1,2]:[2,4,0,1,3];
 const peers=others.filter(e=>e!==ignore&&e.kind==='branch'&&e.plan?.type===type);
 const last=peers.at(-1),styleOf=e=>e.style??e.plan.defaultStyle;
 let best=preference[0],bestScore=Infinity;
 for(let rank=0;rank<preference.length;rank++){
  const style=preference[rank];let score=rank*.12;
  for(const e of peers)if(styleOf(e)===style){const distance=Math.hypot(e.x-p.x,e.z-p.z);score+=10+3*Math.max(0,1-distance/14);}
  if(last&&styleOf(last)===style)score+=2;
  if(score<bestScore){bestScore=score;best=style;}
 }
 return best;
}
