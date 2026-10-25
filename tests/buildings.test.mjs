import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectSite,resolveSite,createBuilding,fitFoundation,styles} from '../architecture/buildings.js';
import {roofSurfaceY,roofGeometry,roofTilesGeometry} from '../architecture/roof.js';
test('cloud ground allows placement while steep slopes, narrow platforms and occupied footprints are rejected',()=>{
 assert.equal(inspectSite(()=>-.5,{x:0,z:0},1).valid,true);
 assert.equal(inspectSite(x=>3+x*2,{x:0,z:0},1).valid,false);
 assert.equal(inspectSite((x,z)=>Math.abs(x)<.5&&Math.abs(z)<.5?3:-1,{x:0,z:0},1).valid,false);
 const occupied={kind:'branch',x:0,z:0,plan:{w:3.2,d:2.9}};
 assert.equal(inspectSite(()=>1,{x:0,z:0},1,[occupied]).valid,false);
 assert.equal(inspectSite(()=>1,{x:0,z:0},1,[occupied],occupied).valid,true);
});
test('elevation picks architecture and length picks discrete width without stretching parts',()=>{
 assert.equal(inspectSite(()=>3,{x:0,z:0},1).type,'pavilion');
 const plans=[.8,1.5,2.4].map(length=>inspectSite(()=>1,{x:0,z:0},length));
 assert.deepEqual(plans.map(p=>p.tier),[0,1,2]);
 assert.deepEqual(plans.map(p=>p.w),[3.2*.55,4.4*.55,5.6*.55]);
 const narrow=inspectSite((x)=>Math.abs(x)<=1.2?1:5,{x:0,z:0},2.4);
 assert.equal(narrow.valid,true);assert.equal(narrow.tier,0);assert.equal(narrow.shrunk,true);
});
test('all seven styles contain finite geometry and a ground-fitting foundation',()=>{
 for(const height of [1,3])for(const length of [.8,1.5,2.4]){
  const plan=inspectSite(()=>height,{x:0,z:0},length);
  for(let style=0;style<styles[plan.type].length;style++){
   const group=createBuilding(plan,style);fitFoundation(group,plan,0,0,(x,z)=>height+.02*x-.03*z);
   assert.equal(group.name,styles[plan.type][style]);let triangles=0;
   group.traverse(o=>{if(o.geometry){const pos=o.geometry.attributes.position;assert.ok([...pos.array].every(Number.isFinite));triangles+=pos.count/3;}});
   assert.ok(triangles>100);assert.ok(group.userData.skirt);
   const skirt=group.userData.skirt.geometry.attributes.position.array;
   for(let i=0;i<skirt.length;i+=3)if(skirt[i+1]<0)assert.ok(Math.abs(group.position.y+skirt[i+1]-(height+.02*skirt[i]-.03*skirt[i+2])+.04)<1e-5);
  }
 }
});
test('WITHIN roof tiles meet the same curved roof surface',()=>{
 const p={width:5,depth:3,base:2,rise:1,detailed:true};
 assert.ok(roofSurfaceY(p,0,0)>roofSurfaceY(p,0,1.5));
 for(const geo of [roofGeometry(p),roofTilesGeometry(p)]){assert.ok([...geo.attributes.position.array].every(Number.isFinite));assert.ok(geo.index.count>0);}
});

test('nearby platform placement remains deterministic beside a steep cliff',()=>{const terrain=x=>x>0?3:0;const plan=resolveSite(terrain,{x:.5,z:0},.8);assert.equal(plan.valid,true);assert.equal(plan.snapped,true);assert.ok(Math.abs(plan.x-.5)<=.9);assert.deepEqual(resolveSite(terrain,{x:.5,z:0},.8),plan);assert.equal(resolveSite(()=>-1.45,{x:-10,z:0},.8).valid,true);});

test('houses use ported Qingming storefronts with distinct trade furnishings and textured tiled roofs',()=>{
 const expected=['tea-food','wine','inn'];
 for(let style=0;style<3;style++){
  const plan=inspectSite(()=>1,{x:0,z:0},1.5),group=createBuilding(plan,style);
  assert.equal(group.userData.source,'WITHIN/qingming.ts house');
  let shop,roof,rafters=0,lanterns=0,pointLights=0;
  group.traverse(o=>{if(o.userData.shopKind)shop=o;if(o.name==='qingming-roof-surface')roof=o;if(o.name==='qingming-eave-rafter')rafters++;if(o.name==='qingming-hanging-lantern')lanterns++;if(o.isPointLight)pointLights++;});
  assert.equal(shop.userData.shopKind,expected[style]);assert.ok(shop.userData.features.length>=3);assert.ok(roof.material.bumpMap);assert.ok(roof.material.map);assert.equal(rafters,23);assert.ok(lanterns>=1);assert.equal(pointLights,0);
 }
});


test('residential variants are closed dwellings and include a separate courtyard and gate',()=>{for(const style of [3,4]){const plan=inspectSite(()=>.5,{x:0,z:0},1.5),group=createBuilding(plan,style);let residence,gate,sideRoom;group.traverse(o=>{if(o.userData.residential)residence=o;if(o.name==='residence-gate')gate=o;if(o.name==='residence-side-room')sideRoom=o;});assert.ok(residence);assert.equal(residence.userData.courtyard,style===4);if(style===4){assert.ok(gate);assert.ok(sideRoom);}}});

import {placementHeight} from '../ground.js';
test('mist plane supports houses everywhere without creating raised land or underwater foundations',()=>{for(const p of [{x:-25,z:-20},{x:0,z:0},{x:28,z:28}]){const plan=inspectSite(()=>-1.45,p,1.5);assert.equal(plan.valid,true);assert.equal(plan.type,'house');assert.equal(plan.base,0);const group=createBuilding(plan);fitFoundation(group,plan,p.x,p.z,()=>-1.45);assert.equal(group.position.y,.025);const a=group.userData.skirt.geometry.attributes.position;for(let i=0;i<a.count;i++)assert.ok(a.getY(i)>-.1);}assert.equal(placementHeight(-1.45),0);assert.equal(placementHeight(7),7);});

import * as THREE from 'three';
import {buildDetailedPavilion} from '../architecture/pavilions.js';
test('pavilions have textured raised tiles, and timber brackets remain beneath the actual roof mesh',()=>{
 for(const variant of [0,1]){
  const pavilion=buildDetailedPavilion(3.05,variant);pavilion.updateMatrixWorld(true);
  const roof=pavilion.getObjectByName('pavilion-curved-roof'),tiles=pavilion.getObjectByName('pavilion-raised-tiles'),frame=pavilion.getObjectByName('pavilion-timber-frame');
  assert.ok(roof.material.map);assert.ok(roof.material.bumpMap);assert.ok(tiles.geometry.attributes.uv);assert.equal(pavilion.userData.roofFaces,variant===0?4:6);
  assert.ok(pavilion.getObjectByName('pavilion-eave-rafters'));assert.ok(pavilion.getObjectByName('pavilion-lattice-and-seating'));
  const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);let checked=0;
  frame.traverse(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){if(a.getY(i)<2.3)continue;ray.set(new THREE.Vector3(a.getX(i),10,a.getZ(i)),down);const hit=ray.intersectObject(roof,false)[0];assert.ok(hit,'upper timber must be covered by roof');assert.ok(a.getY(i)<hit.point.y-.01,'timber must not pierce curved tiles');checked++;}});
  assert.ok(checked>100);
 }
});

test('residential beams, column heads and wall caps stay below the roof at every size',()=>{
 const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);
 for(const length of [.8,1.5,2.4])for(const style of [3,4]){
  const group=createBuilding(inspectSite(()=>.5,{x:0,z:0},length),style);group.updateMatrixWorld(true);
  const rooms=[];group.traverse(o=>{if(o.userData.residentialRoom)rooms.push(o);});assert.ok(rooms.length);
  for(const room of rooms){const roof=room.getObjectByName('qingming-roof-surface'),inverse=room.matrixWorld.clone().invert();let checked=0;
   room.traverse(o=>{if(!o.isMesh||o.geometry.type!=='BoxGeometry'||!['wood','plaster'].includes(o.material.userData.surfaceKind))return;
    const a=o.geometry.attributes.position;
    for(let i=0;i<a.count;i++){const p=new THREE.Vector3().fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld),local=p.clone().applyMatrix4(inverse);if(local.y<2.3)continue;ray.set(new THREE.Vector3(p.x,10,p.z),down);const hit=ray.intersectObject(roof,false)[0];assert.ok(hit,'upper frame must lie within the roof footprint');assert.ok(p.y<hit.point.y-.001,'frame and plaster must not project through roof');checked++;}
    if(o.userData.residenceColumn){o.geometry.computeBoundingBox();assert.ok(Math.abs(o.position.y+o.geometry.boundingBox.min.y-.22)<1e-6,'column feet must remain on the original base');}
   });assert.ok(checked>30);
  }
 }
});

import {worldOffset,footprintsOverlap,orientationCandidates} from '../architecture/composition.js';
test('scene buildings are larger in all dimensions and keep a fixed three-quarter orientation',()=>{
 const context={cameraPosition:{x:0,y:25,z:40},focus:{x:0,z:0},scale:2.3,pavilionScale:1.8};
 for(const [height,factor] of [[0,2.3],[3,1.8]]){
  const original=inspectSite(()=>height,{x:-8,z:0},1.5),plan=inspectSite(()=>height,{x:-8,z:0},1.5,[],null,null,context),a=createBuilding(original),b=createBuilding(plan);
  assert.ok(Math.abs(plan.w-original.w*factor)<1e-8);const ah=new THREE.Box3().setFromObject(a).getSize(new THREE.Vector3()).y,bh=new THREE.Box3().setFromObject(b).getSize(new THREE.Vector3()).y;assert.ok(Math.abs(bh/ah-factor)<1e-6);assert.equal(b.rotation.y,plan.yaw);
  assert.equal(createBuilding(plan,(plan.defaultStyle+1)%styles[plan.type].length).rotation.y,plan.yaw);
 }
 const left=resolveSite(()=>0,{x:-8,z:0},1.5,[],context),right=resolveSite(()=>0,{x:8,z:0},1.5,[],context);
 assert.ok(left.yaw>0&&right.yaw<0);assert.deepEqual(resolveSite(()=>0,{x:-8,z:0},1.5,[],context),left);
 const bearing=Math.atan2(8,40);assert.ok(Math.abs(left.yaw-bearing)>=20*Math.PI/180-.001&&Math.abs(left.yaw-bearing)<=42*Math.PI/180+.001);
 const candidates=orientationCandidates(x=>x>1?3:0,{x:0,z:0},{w:1,d:4},context);assert.ok(candidates[0].yaw<0,'entrance should turn away from the nearby uphill obstruction');
});
test('rotated footprints use oriented overlap checks and foundations sample their actual world locations',()=>{
 assert.equal(footprintsOverlap({x:0,z:0,w:6,d:1,yaw:Math.PI/4},{x:1.1,z:1.1,w:6,d:1,yaw:Math.PI/4},0),false);
 assert.equal(footprintsOverlap({x:0,z:0,w:6,d:1,yaw:Math.PI/4},{x:0,z:0,w:6,d:1,yaw:-Math.PI/4},0),true);
 const plan={...inspectSite(()=>.5,{x:0,z:0},1.5),yaw:Math.PI/4},group=createBuilding(plan),surface=(x,z)=>1+.12*x+.08*z;fitFoundation(group,plan,2,3,surface);
 const a=group.userData.skirt.geometry.attributes.position;
 for(let i=0;i<a.count;i++){if(a.getY(i)>=0)continue;const q=worldOffset(a.getX(i),a.getZ(i),plan.yaw);assert.ok(Math.abs(group.position.y+a.getY(i)-(surface(2+q.x,3+q.z)-.04))<1e-5);}
 fitFoundation(group,plan,2,3,()=>0);assert.equal(group.userData.skirt.visible,false);
});

test('repeated short branches automatically use all five house silhouettes and both pavilions',()=>{
 for(const height of [0,3]){
  const entries=[],count=height===0?5:2,sequence=[];
  for(let i=0;i<count*3;i++){
   const p={x:i*8,z:0},plan=resolveSite(()=>height,p,.8,entries);
   assert.equal(plan.valid,true);assert.deepEqual(resolveSite(()=>height,p,.8,entries),plan);
   if(i)assert.notEqual(plan.defaultStyle,sequence.at(-1));
   sequence.push(plan.defaultStyle);entries.push({kind:'branch',...p,plan,style:plan.defaultStyle});
  }
  for(let i=0;i<sequence.length;i+=count)assert.equal(new Set(sequence.slice(i,i+count)).size,count);
 }
});
test('automatic variety respects swapped styles, removal and non-building entries',()=>{
 const p={x:0,z:0},plan=resolveSite(()=>0,p,.8),entry={kind:'branch',...p,plan,style:4};
 assert.equal(plan.defaultStyle,3);
 assert.equal(resolveSite(()=>0,{x:8,z:0},.8,[entry]).defaultStyle,3);
 entry.style=3;assert.equal(resolveSite(()=>0,{x:8,z:0},.8,[entry]).defaultStyle,4);
 assert.equal(resolveSite(()=>0,p,.8,[{kind:'leaf',...p}]).defaultStyle,3);
 assert.equal(resolveSite(()=>0,p,.8,[]).defaultStyle,3);
});
