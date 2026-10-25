import * as THREE from 'three';
import {worldOffset,footprintSamples,footprintsOverlap,orientationCandidates,sceneScale} from './composition.js?v=compose07';
import {placementHeight} from '../ground.js?v=mist06';
import {buildDetailedPavilion} from './pavilions.js?v=pavilion04';
import {buildQingmingHouse,buildQingmingResidence} from './qingming-house.js?v=eaves05';

const mats={stone:new THREE.MeshStandardMaterial({color:'#a7a48e',roughness:1})};
export const styles={house:['台十茶肆','汴京酒铺','逐亚客舍','小民居','围合小院'],pavilion:['四角亭','六角亭']};
export function dimensions(type,tier){return type==='pavilion'?{w:(2.8+tier*.25)*.35,d:(2.8+tier*.25)*.35}:{w:[3.2,4.4,5.6][tier]*.55,d:2.9*.55};}
export function inspectSite(surfaceAt,p,length,others=[],ignore=null,forcedTier=null,context=null){
 const sample=(x,z)=>placementHeight(surfaceAt(x,z)),height=sample(p.x,p.z),type=height>=2.4?'pavilion':'house',desired=forcedTier??(length<1.1?0:length<1.95?1:2);
 for(let tier=desired;tier>=0;tier--){
  const original=dimensions(type,tier),scale=sceneScale(type,context),dims={w:original.w*scale,d:original.d*scale};
  for(const {yaw} of orientationCandidates(sample,p,dims,context)){
   const shape={...dims,yaw},samples=footprintSamples(p,shape).map(q=>sample(q.x,q.z)),min=Math.min(...samples),max=Math.max(...samples);
   const slope=Math.hypot(sample(p.x+.4,p.z)-sample(p.x-.4,p.z),sample(p.x,p.z+.4)-sample(p.x,p.z-.4))/.8;
   if(max-min>1.2||slope>1)continue;
   if(others.some(e=>e!==ignore&&e.kind==='branch'&&footprintsOverlap({x:p.x,z:p.z,plan:shape},e)))continue;
   return {valid:true,type,tier,...shape,base:max,defaultStyle:type==='pavilion'?(tier===2?1:0):tier===0?3:4,shrunk:tier<desired};
  }
 }
 return {valid:false,reason:'这里较陡或离建筑太近，请稍微移开一点。'};
}
export function resolveSite(surfaceAt,p,length,others=[],context=null){
 const exact=inspectSite(surfaceAt,p,length,others,null,null,context);
 if(exact.valid)return {...exact,x:p.x,z:p.z,snapped:false};
 const type=surfaceAt(p.x,p.z)>=2.4?'pavilion':'house';
 for(const radius of [.3,.6,.9])for(let i=0;i<12;i++){
  const a=i*Math.PI/6,q={x:p.x+Math.cos(a)*radius,z:p.z+Math.sin(a)*radius},plan=inspectSite(surfaceAt,q,length,others,null,null,context);
  if(plan.valid&&plan.type===type)return {...plan,x:q.x,z:q.z,snapped:true};
 }
 return exact;
}
export function createBuilding(plan,style=plan.defaultStyle){
 const g=new THREE.Group();let content;
 if(plan.type==='pavilion'){
  content=buildDetailedPavilion(dimensions(plan.type,plan.tier).w/.35,style);content.rotation.y=style===1?-Math.PI/6:0;const bounds=new THREE.Box3().setFromObject(content),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3()),scale=Math.min(plan.w/size.x,plan.d/size.z);content.scale.setScalar(scale);content.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
 }else{
  // Preserve the original Song street proportions; fit the whole shop, including its awning.
  content=style>=3?buildQingmingResidence([5.2,7,9][plan.tier],4.8,style===4):buildQingmingHouse([5.2,7,9][plan.tier],4.8,style===2,[1,0,7][style]);
  const bounds=new THREE.Box3().setFromObject(content),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
  const scale=Math.min(plan.w/size.x,plan.d/size.z);
  content.scale.setScalar(scale);content.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
  g.userData.source='WITHIN/qingming.ts house';
 }
 g.rotation.y=plan.yaw||0;g.add(content);g.name=styles[plan.type][style];g.userData.plan=plan;g.userData.style=style;return g;
}
export function disposeBuildingMaterials(group){const materials=new Set();group.traverse(o=>{if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.userData.buildingOwned)materials.add(m);}});materials.forEach(m=>m.dispose());}
// A continuous stone skirt follows the sampled ground instead of leaving floating corners.
export function fitFoundation(group,plan,x,z,surfaceAt){const hw=plan.w/2+.1,hd=plan.d/2+.1,points=[[-hw,-hd],[0,-hd],[hw,-hd],[hw,0],[hw,hd],[0,hd],[-hw,hd],[-hw,0]];const heights=points.map(([dx,dz])=>{const q=worldOffset(dx,dz,group.rotation.y);return placementHeight(surfaceAt(x+q.x,z+q.z));});const base=Math.max(placementHeight(surfaceAt(x,z)),...heights)+.025;group.position.set(x,base,z);let skirt=group.userData.skirt;if(!skirt){const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(8*6*3),3));skirt=new THREE.Mesh(geometry,mats.stone);group.add(skirt);group.userData.skirt=skirt;}skirt.visible=Math.max(...heights)-Math.min(...heights)>.06;const arr=skirt.geometry.attributes.position.array;let k=0;for(let i=0;i<8;i++){const j=(i+1)%8,[ax,az]=points[i],[bx,bz]=points[j],ay=heights[i]-base-.04,by=heights[j]-base-.04;for(const v of [[ax,.03,az],[bx,by,bz],[ax,ay,az],[ax,.03,az],[bx,.03,bz],[bx,by,bz]])for(const c of v)arr[k++]=c;}skirt.geometry.attributes.position.needsUpdate=true;skirt.geometry.computeVertexNormals();skirt.geometry.computeBoundingSphere();}
