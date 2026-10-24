import * as THREE from 'three';
import {buildDetailedPavilion} from './pavilions.js?v=pavilion04';
import {buildQingmingHouse,buildQingmingResidence} from './qingming-house.js?v=courtyard03';

const mats={stone:new THREE.MeshStandardMaterial({color:'#a7a48e',roughness:1})};
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
export function createBuilding(plan,style=plan.defaultStyle){
 const g=new THREE.Group();let content;
 if(plan.type==='pavilion'){
  content=buildDetailedPavilion(plan.w/.35,style);const bounds=new THREE.Box3().setFromObject(content),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3()),scale=Math.min(plan.w/size.x,plan.d/size.z);content.scale.setScalar(scale);content.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
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
