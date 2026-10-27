import * as THREE from 'three';
import {worldOffset,footprintSamples,footprintsOverlap,orientationCandidates,sceneScale,chooseBuildingStyle} from './composition.js?v=mountain09';
import {placementHeight} from '../ground.js?v=mist06';
import {buildDetailedPavilion} from './pavilions.js?v=pavilion04';
import {buildQingmingHouse,buildQingmingResidence} from './qingming-house.js?v=eaves05';
import {applyBuildingTheme} from '../model-theme.js?v=modeltheme1';

const mats={stone:new THREE.MeshStandardMaterial({color:'#a7a48e',roughness:1})};
export const styles={house:['台十茶肆','汴京酒铺','逐亚客舍','小民居','围合小院'],pavilion:['四角亭','六角亭']};
export function dimensions(type,tier){return type==='pavilion'?{w:(2.8+tier*.25)*.35,d:(2.8+tier*.25)*.35}:{w:[3.2,4.4,5.6][tier]*.55,d:2.9*.55};}
export function inspectSite(surfaceAt,p,length,others=[],ignore=null,forcedTier=null,context=null){
 const sample=(x,z)=>placementHeight(surfaceAt(x,z)),height=sample(p.x,p.z),type=height>=2.4?'pavilion':'house',desired=forcedTier??(length<1.1?0:length<1.95?1:2);
 let blocked=false;
 for(const fit of type==='pavilion'?[1,.8,.65,.5]:[1])for(let tier=desired;tier>=0;tier--){
  const original=dimensions(type,tier),scale=sceneScale(type,context)*fit,dims={w:original.w*scale,d:original.d*scale};
  for(const {yaw} of orientationCandidates(sample,p,dims,context)){
   const shape={...dims,yaw,margin:type==='pavilion'?.03:.1},samples=footprintSamples(p,shape).map(q=>sample(q.x,q.z)),min=Math.min(...samples),max=Math.max(...samples);
   const slope=Math.hypot(sample(p.x+.4,p.z)-sample(p.x-.4,p.z),sample(p.x,p.z+.4)-sample(p.x,p.z-.4))/.8;
   // Small hillside pavilions tolerate a stepped foundation; houses still need level ground.
   if(type==='pavilion'?(max-min>1.05||min<1.4):(max-min>1.2||slope>1))continue;
   if(others.some(e=>e!==ignore&&e.kind==='branch'&&footprintsOverlap({x:p.x,z:p.z,plan:shape},e,type==='pavilion'?.18:.06))){blocked=true;continue;}
   return {valid:true,type,tier,...shape,base:max,relief:max-min,fitScale:fit,defaultStyle:chooseBuildingStyle(type,tier,p,others,ignore),shrunk:tier<desired||fit<1};
  }
 }
 return {valid:false,reason:blocked?'这里已有建筑，请稍微拉开距离。':type==='pavilion'?'这处山壁高差太大，请移向附近山脊或缓坡。':'这里坡面较陡，请移向平地。'};
}
export function resolveSite(surfaceAt,p,length,others=[],context=null){
 const exact=inspectSite(surfaceAt,p,length,others,null,null,context);
 const type=surfaceAt(p.x,p.z)>=2.4?'pavilion':'house';
 if(exact.valid&&(!exact.shrunk||type==='house'))return {...exact,x:p.x,z:p.z,snapped:false};
 let best=exact.valid?{...exact,x:p.x,z:p.z,snapped:false}:null;
 let score=best?(1-(best.fitScale||1))*2+(best.relief||0)*.25:Infinity;
 const radii=type==='pavilion'?[.3,.6,.9,1.3,1.8,2.4]:[.3,.6,.9];
 for(const radius of radii)for(let i=0;i<12;i++){
  const a=i*Math.PI/6,q={x:p.x+Math.cos(a)*radius,z:p.z+Math.sin(a)*radius},plan=inspectSite(surfaceAt,q,length,others,null,null,context);
  if(!plan.valid||plan.type!==type)continue;
  if(type==='house')return {...plan,x:q.x,z:q.z,snapped:true};
  const candidateScore=radius*.75+(1-(plan.fitScale||1))*2+(plan.relief||0)*.25;
  if(candidateScore<score){best={...plan,x:q.x,z:q.z,snapped:true};score=candidateScore;}
 }
 return best||exact;
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
 g.rotation.y=plan.yaw||0;g.add(content);g.name=styles[plan.type][style];g.userData.plan=plan;g.userData.style=style;applyBuildingTheme(g);return g;
}
export function disposeBuildingMaterials(group){const materials=new Set();group.traverse(o=>{if(o.material){for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.userData.buildingOwned)materials.add(m);}});materials.forEach(m=>m.dispose());}
// A continuous stone skirt follows the sampled ground instead of leaving floating corners.
export function fitFoundation(group,plan,x,z,surfaceAt){const hw=plan.w/2+(plan.margin??.1),hd=plan.d/2+(plan.margin??.1),points=[[-hw,-hd],[0,-hd],[hw,-hd],[hw,0],[hw,hd],[0,hd],[-hw,hd],[-hw,0]];const heights=points.map(([dx,dz])=>{const q=worldOffset(dx,dz,group.rotation.y);return placementHeight(surfaceAt(x+q.x,z+q.z));});const base=Math.max(placementHeight(surfaceAt(x,z)),...heights)+.025;group.position.set(x,base,z);
 if(plan.type==='pavilion'){
  // Seat the stone platform into the hill, using its footprint rather than the roof overhang.
  const support=footprintSamples({x,z},{w:plan.w*.76,d:plan.d*.76,margin:0,yaw:group.rotation.y});
  group.position.y=Math.max(...support.map(q=>placementHeight(surfaceAt(q.x,q.z))))-Math.max(.025,plan.w*.08);
  return;
 }
 let skirt=group.userData.skirt;if(!skirt){const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(8*6*3),3));skirt=new THREE.Mesh(geometry,mats.stone);group.add(skirt);group.userData.skirt=skirt;}skirt.visible=plan.type!=='pavilion'&&Math.max(...heights)-Math.min(...heights)>.06;const arr=skirt.geometry.attributes.position.array;let k=0;for(let i=0;i<8;i++){const j=(i+1)%8,[ax,az]=points[i],[bx,bz]=points[j],ay=heights[i]-base-.04,by=heights[j]-base-.04;for(const v of [[ax,.03,az],[bx,by,bz],[ax,ay,az],[ax,.03,az],[bx,.03,bz],[bx,by,bz]])for(const c of v)arr[k++]=c;}skirt.geometry.attributes.position.needsUpdate=true;skirt.geometry.computeVertexNormals();skirt.geometry.computeBoundingSphere();}
