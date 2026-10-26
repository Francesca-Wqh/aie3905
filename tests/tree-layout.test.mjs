import test from 'node:test';
import assert from 'node:assert/strict';
import {ALL_TREE_SPECIES,MOUNTAIN_TREE_SPECIES,treeSpeciesFor,treeClusterCount,treeClusterLayout,terrainLocalY} from '../tree-layout.js';

test('ground placements can generate any of the four tree species',()=>{
 const generated=new Set(Array.from({length:200},(_,seed)=>treeSpeciesFor('ground',seed)));
 assert.deepEqual([...generated].sort(),[...ALL_TREE_SPECIES].sort());
});

test('mountain groves exclude willow and keep one selected species',()=>{
 for(let seed=0;seed<100;seed++)assert.ok(MOUNTAIN_TREE_SPECIES.includes(treeSpeciesFor('mountain',seed)));
});

test('ground clusters stay small while mountain groves contain more trees',()=>{
 for(let seed=0;seed<100;seed++){
  assert.ok(treeClusterCount('ground',seed)>=1&&treeClusterCount('ground',seed)<=3);
  assert.ok(treeClusterCount('mountain',seed)>=4&&treeClusterCount('mountain',seed)<=7);
 }
});

test('cluster layout is deterministic and respects compatible terrain offsets',()=>{
 const accept=offset=>Math.hypot(offset.x,offset.z)<.5;
 const first=treeClusterLayout('mountain',23,accept),second=treeClusterLayout('mountain',23,accept);
 assert.deepEqual(first,second);
 assert.equal(first.length,treeClusterCount('mountain',23));
 assert.ok(first.slice(1).every(accept));
});

test('each tree root resolves back to its sampled terrain height after cluster scaling',()=>{
 const clusterBase=.82,clusterScale=.68,surfaceHeight=1.37;
 const localY=terrainLocalY(surfaceHeight,clusterBase,clusterScale);
 assert.ok(Math.abs(clusterBase+clusterScale*localY-surfaceHeight)<1e-12);
});
