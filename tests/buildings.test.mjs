import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectSite,resolveSite,createBuilding,fitFoundation,styles} from '../architecture/buildings.js';
import {roofSurfaceY,roofGeometry,roofTilesGeometry} from '../architecture/roof.js';
test('water, steep slopes, narrow platforms and occupied footprints are rejected',()=>{
 assert.equal(inspectSite(()=>-.5,{x:0,z:0},1).valid,false);
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
 const narrow=inspectSite((x)=>Math.abs(x)<=1.2?1:-1,{x:0,z:0},2.4);
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

test('nearby safe placement is deterministic and never snaps from open water',()=>{const terrain=x=>x>0?1:-1;const plan=resolveSite(terrain,{x:.5,z:0},.8);assert.equal(plan.valid,true);assert.equal(plan.snapped,true);assert.ok(Math.abs(plan.x-.5)<=.9);assert.deepEqual(resolveSite(terrain,{x:.5,z:0},.8),plan);assert.equal(resolveSite(terrain,{x:-.1,z:0},.8).valid,false);});

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

import {bankHeight,groundHeight} from '../ground.js';
test('visible lowland exists before drawing and remains when mountains are cleared',()=>{let buildable=0;for(let x=-10;x<=6;x+=2)for(let z=-5;z<=7;z+=2){const plan=inspectSite(bankHeight,{x,z},1.5);if(plan.valid&&plan.type==='house')buildable++;}assert.ok(buildable>=45);assert.ok(bankHeight(-3,2)>.4);assert.ok(bankHeight(28,28)<0);assert.equal(groundHeight(-3,2,-1.2),bankHeight(-3,2));assert.equal(groundHeight(-3,2,7),7);assert.equal(inspectSite(bankHeight,{x:-3,z:2},.8).defaultStyle,3);assert.equal(inspectSite(bankHeight,{x:-3,z:2},1.5).defaultStyle,4);});
