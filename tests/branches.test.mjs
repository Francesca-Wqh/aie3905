import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createWoodyBranch} from '../plants/branch.js';

test('natural branches reach chosen endpoints, taper and stay finite in different poses',()=>{
 for(const endpoint of [new THREE.Vector3(-1.2,1.1,0),new THREE.Vector3(1.4,.35,0),new THREE.Vector3(.1,1.8,0),new THREE.Vector3(-.65,-.1,0)]){
  const branch=createWoodyBranch(endpoint,4);assert.deepEqual(branch.userData.endpoint,endpoint.toArray());
  const main=branch.getObjectByName('branch-main'),position=main.geometry.attributes.position;
  const centre=new THREE.Vector3();for(let j=0;j<9;j++)centre.add(new THREE.Vector3().fromBufferAttribute(position,position.count-10+j));centre.divideScalar(9);
  assert.ok(centre.distanceTo(endpoint)<1e-5);assert.ok(main.userData.baseRadius>main.userData.tipRadius*8);
  let side=0,buds=0;branch.traverse(o=>{if(o.name==='branch-side')side++;if(o.name==='branch-bud')buds++;if(o.geometry)assert.ok([...o.geometry.attributes.position.array].every(Number.isFinite));});
  assert.ok(side>=2&&side<=3);assert.ok(buds>=5);assert.ok(new THREE.Box3().setFromObject(branch).getSize(new THREE.Vector3()).length()<5);
 }
});
test('branch poses are stable for one seed and vary between repeated insertions',()=>{
 const end=new THREE.Vector3(-1,1,0),points=seed=>createWoodyBranch(end,seed).getObjectByName('branch-main').geometry.attributes.position.array;
 assert.deepEqual(points(7),points(7));assert.notDeepEqual(points(7),points(8));
});
