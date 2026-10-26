const ALL_TREE_SPECIES=['pine','maple','willow','flowering'];
const MOUNTAIN_TREE_SPECIES=['pine','maple','flowering'];

const seeded=n=>{const a=Math.sin(n*127.1+93.7)*43758.5453;return a-Math.floor(a)};

export function treeSpeciesFor(habitat,seed){
 const choices=habitat==='mountain'?MOUNTAIN_TREE_SPECIES:ALL_TREE_SPECIES;
 return choices[Math.floor(seeded(seed+83)*choices.length)];
}

export function treeClusterCount(habitat,seed){
 return habitat==='mountain'?4+Math.floor(seeded(seed+121)*4):1+Math.floor(seeded(seed+121)*3);
}

export function treeClusterLayout(habitat,seed,acceptOffset=()=>true){
 const target=treeClusterCount(habitat,seed),maxRadius=habitat==='mountain'?1.15:.72;
 const layout=[{x:0,z:0,scale:.92+seeded(seed+211)*.14,rotation:seeded(seed+313)*Math.PI*2}];
 for(let i=1;i<target;i++){
  let chosen=null;
  for(let attempt=0;attempt<40;attempt++){
   const angle=seeded(seed+i*53+attempt*7)*Math.PI*2;
   const shrink=attempt<24?1:.22;
   const radius=(.25+Math.sqrt(seeded(seed+i*79+attempt*11))*(maxRadius-.25))*shrink;
   const candidate={x:Math.cos(angle)*radius,z:Math.sin(angle)*radius};
   const separated=layout.every(existing=>Math.hypot(candidate.x-existing.x,candidate.z-existing.z)>.16);
   if(separated&&acceptOffset(candidate)){chosen=candidate;break;}
  }
  if(!chosen)continue;
  layout.push({...chosen,scale:.84+seeded(seed+i*97)*.28,rotation:seeded(seed+i*131)*Math.PI*2});
 }
 return layout;
}

export {ALL_TREE_SPECIES,MOUNTAIN_TREE_SPECIES};
