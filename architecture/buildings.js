import * as THREE from 'three';
import {buildQingmingHouse,buildQingmingResidence} from './qingming-house.js?v=courtyard03';
import {roofGeometry, roofTilesGeometry, roofGableGeometry, roofSurfaceY} from './roof.js';

// Roof surfaces adapted from WITHIN (MIT); modular architecture and placement are project additions.
const material = color => new THREE.MeshStandardMaterial({color, roughness:.93});
const mats = {wall:material('#e3d5b7'),wood:material('#68503d'),dark:material('#343f39'),stone:material('#a7a48e'),tile:material('#4b6060'),tileLight:material('#748580'),cloth:material('#b79a72')};
mats.tile.side=THREE.DoubleSide;
export const styles={house:['台十茶肆','汴京酒铺','逐亚客舍','小民居','围合小院'],pavilion:['四角亭','六角亭']};
export function dimensions(type,tier){return type==='pavilion'?{w:(2.8+tier*.25)*.35,d:(2.8+tier*.25)*.35}:{w:[3.2,4.4,5.6][tier]*.55,d:2.9*.55};}
export function inspectSite(surfaceAt,p,length,others=[],ignore=null,forcedTier=null){
  const height=surfaceAt(p.x,p.z),type=height>=2.4?'pavilion':'house';
  const desired=forcedTier??(length<1.1?0:length<1.95?1:2);
  if(height<.18)return {valid:false,reason:'浅蓝是水面，请点击浅绿色岸地，那里可以直接安屋。'};
  for(let tier=desired;tier>=0;tier--){
    const dims=dimensions(type,tier),hw=dims.w/2+.1,hd=dims.d/2+.1;
    const samples=[];
    for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)samples.push(surfaceAt(p.x+i*hw,p.z+j*hd));
    const min=Math.min(...samples),max=Math.max(...samples);
    const slope=Math.hypot(surfaceAt(p.x+.4,p.z)-surfaceAt(p.x-.4,p.z),surfaceAt(p.x,p.z+.4)-surfaceAt(p.x,p.z-.4))/.8;
    if(min<.12||max-min>1.2||slope>1.0)continue;
    if(others.some(e=>e!==ignore&&e.kind==='branch'&&Math.abs(e.x-p.x)<(dims.w+e.plan.w)/2+.3&&Math.abs(e.z-p.z)<(dims.d+e.plan.d)/2+.3))continue;
    return {valid:true,type,tier,...dims,base:max,defaultStyle:type==='pavilion'?(tier===2?1:0):tier===0?3:4,shrunk:tier<desired};
  }
  return {valid:false,reason:'坡太陡、平台太窄或离建筑太近，请换个落点。'};
}
// Snap only within one small building's width, and show that exact result in the preview.
export function resolveSite(surfaceAt,p,length,others=[]){
 const exact=inspectSite(surfaceAt,p,length,others);
 if(exact.valid)return {...exact,x:p.x,z:p.z,snapped:false};
 if(surfaceAt(p.x,p.z)<.18)return exact;
 const type=surfaceAt(p.x,p.z)>=2.4?'pavilion':'house';
 for(const radius of [.3,.6,.9])for(let i=0;i<12;i++){
  const a=i*Math.PI/6,q={x:p.x+Math.cos(a)*radius,z:p.z+Math.sin(a)*radius},plan=inspectSite(surfaceAt,q,length,others);
  if(plan.valid&&plan.type===type)return {...plan,x:q.x,z:q.z,snapped:true};
 }
 return exact;
}
function box(g,w,h,d,x,y,z,mat){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
function beam(g,a,b,r=.055,mat=mats.wood){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),delta=vb.clone().sub(va),m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,delta.length(),8),mat);m.position.copy(va).add(vb).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());g.add(m);return m;}
function roof(g,w,d,base,rise){const profile={width:w,depth:d,base,rise,detailed:true};g.add(new THREE.Mesh(roofGeometry(profile),mats.tile),new THREE.Mesh(roofTilesGeometry(profile),mats.tileLight));beam(g,[-w/2,base+rise+.06,0],[w/2,base+rise+.06,0],.07,mats.tileLight);for(const side of [-1,1]){const pts=Array.from({length:17},(_,i)=>{const x=(i/16-.5)*w,z=side*d/2;return new THREE.Vector3(x,roofSurfaceY(profile,x,z)-.035,z)});g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),16,.045,5,false),mats.dark));}return profile;}
function pavilion(plan,variant){const {w,d}=plan,g=new THREE.Group(),n=variant===1?6:4,r=w*.43;const base=new THREE.Mesh(new THREE.CylinderGeometry(r+.35,r+.45,.22,n),mats.stone);base.rotation.y=n===4?Math.PI/4:0;base.position.y=.11;g.add(base);
 const points=Array.from({length:n},(_,i)=>{const a=i/n*Math.PI*2+(n===4?Math.PI/4:Math.PI/6);return [Math.cos(a)*r,Math.sin(a)*r]});
 for(let i=0;i<n;i++){const [x,z]=points[i],[nx,nz]=points[(i+1)%n];beam(g,[x,.2,z],[x,2.25,z],.075);beam(g,[x,2.15,z],[nx,2.15,nz],.085);if(i!==0){for(const y of [.55,.95])beam(g,[x,y,z],[nx,y,nz],.04);beam(g,[(x+nx)/2,.3,(z+nz)/2],[(x+nx)/2,.95,(z+nz)/2],.035);}}
 if(n===4)roof(g,w+.65,d+.65,1.95,.85);else{
   const vertices=[],indices=[],R=r+.55,rings=10,segments=6;
   for(let j=0;j<=rings;j++){const t=j/rings;for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2+Math.PI/6;vertices.push(Math.cos(a)*R*t,3.35-1.4*t+.36*t**4,Math.sin(a)*R*t);if(j<rings&&i<segments){const a0=j*(segments+1)+i,b=a0+segments+1;indices.push(a0,b,a0+1,b,b+1,a0+1);}}}
   const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();g.add(new THREE.Mesh(geo,mats.tile));for(let i=0;i<n;i++){const a=i/n*Math.PI*2+Math.PI/6;const pts=Array.from({length:15},(_,j)=>{const t=j/14;return new THREE.Vector3(Math.cos(a)*R*t,3.37-1.4*t+.36*t**4,Math.sin(a)*R*t)});g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),14,.045,6,false),mats.tileLight));}
   const finial=new THREE.Mesh(new THREE.SphereGeometry(.12,10,8),mats.tileLight);finial.position.y=3.43;g.add(finial);
 }return g;}
export function createBuilding(plan,style=plan.defaultStyle){
 const g=new THREE.Group();let content;
 if(plan.type==='pavilion'){
  content=pavilion({...plan,w:plan.w/.35,d:plan.d/.35},style);content.scale.setScalar(.35);
 }else{
  // Preserve the original Song street proportions; fit the whole shop, including its awning.
  content=style>=3?buildQingmingResidence([5.2,7,9][plan.tier],4.8,style===4):buildQingmingHouse([5.2,7,9][plan.tier],4.8,style===2,[1,0,7][style]);
  const bounds=new THREE.Box3().setFromObject(content),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
  const scale=Math.min(plan.w/size.x,plan.d/size.z);
  content.scale.setScalar(scale);content.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
  g.userData.source='WITHIN/qingming.ts house';
 }
 g.add(content);g.name=styles[plan.type][style];g.userData.plan=plan;g.userData.style=style;return g;
}
export function disposeBuildingMaterials(group){const materials=new Set();group.traverse(o=>{if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.userData.buildingOwned)materials.add(m);}});materials.forEach(m=>m.dispose());}
// A continuous stone skirt follows the sampled ground instead of leaving floating corners.
export function fitFoundation(group,plan,x,z,surfaceAt){const hw=plan.w/2+.1,hd=plan.d/2+.1,points=[[-hw,-hd],[0,-hd],[hw,-hd],[hw,0],[hw,hd],[0,hd],[-hw,hd],[-hw,0]];const heights=points.map(([dx,dz])=>surfaceAt(x+dx,z+dz));const base=Math.max(surfaceAt(x,z),...heights)+.025;group.position.set(x,base,z);let skirt=group.userData.skirt;if(!skirt){const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(8*6*3),3));skirt=new THREE.Mesh(geometry,mats.stone);group.add(skirt);group.userData.skirt=skirt;}const arr=skirt.geometry.attributes.position.array;let k=0;for(let i=0;i<8;i++){const j=(i+1)%8,[ax,az]=points[i],[bx,bz]=points[j],ay=heights[i]-base-.04,by=heights[j]-base-.04;for(const v of [[ax,.03,az],[bx,by,bz],[ax,ay,az],[ax,.03,az],[bx,.03,bz],[bx,by,bz]])for(const c of v)arr[k++]=c;}skirt.geometry.attributes.position.needsUpdate=true;skirt.geometry.computeVertexNormals();skirt.geometry.computeBoundingSphere();}
