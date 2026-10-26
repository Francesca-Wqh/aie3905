import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createVaseLeafSprig} from '../plants/vase-leaf.js';

test('vase foliage is a full three-dimensional sprig with sculpted leaves',()=>{
 const sprig=createVaseLeafSprig(new THREE.Vector3(.75,1.25,.1),2);
 assert.equal(sprig.userData.vaseLeafSprig,true);
 assert.equal(sprig.userData.leafCount,11);
 let meshCount=0,depthfulLeaves=0;
 sprig.traverse(object=>{
  if(!object.isMesh)return;
  meshCount++;
  object.geometry.computeBoundingBox();
  const size=new THREE.Vector3();object.geometry.boundingBox.getSize(size);
  if(size.x>1.5&&size.y>.8&&size.z>.08)depthfulLeaves++;
 });
 assert.ok(meshCount>=20,'stem, twigs, leaves and veins should all be modeled');
 assert.ok(depthfulLeaves>=11,'every leaf should have a curved, thick 3D surface');
});

test('vase foliage follows the chosen endpoint with deterministic geometry',()=>{
 const endpoint=new THREE.Vector3(-.62,1.08,.14),first=createVaseLeafSprig(endpoint,4),second=createVaseLeafSprig(endpoint,4);
 assert.equal(first.children.length,second.children.length);
 const stems=first.children.filter(child=>child.isMesh&&child.geometry.type==='TubeGeometry');
 assert.equal(stems.length,1);
 const position=stems[0].geometry.attributes.position;
 assert.ok(position.count>100);
});
