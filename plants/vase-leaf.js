import * as THREE from 'three';

function cylinderBetween(a,b,radius,material,segments=10){
 const delta=b.clone().sub(a),mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius*.58,radius,delta.length(),segments),material);
 mesh.position.copy(a).add(b).multiplyScalar(.5);
 mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
 return mesh;
}

function sculptedLeafGeometry(){
 const positions=[],indices=[],steps=10,thickness=.045;
 for(let i=0;i<=steps;i++){
  const t=i/steps,width=Math.pow(Math.sin(Math.PI*t),.72)*(1-.12*t),camber=Math.sin(Math.PI*t)*.16;
  positions.push(-width,t,camber+thickness,width,t,camber+thickness,-width,t,camber-thickness,width,t,camber-thickness);
 }
 for(let i=0;i<steps;i++){
  const a=i*4,b=a+4;
  indices.push(a,b,a+1,a+1,b,b+1,a+2,a+3,b+2,a+3,b+3,b+2,a,a+2,b,a+2,b+2,b,a+1,b+1,a+3,a+3,b+1,b+3);
 }
 indices.push(0,1,2,1,3,2,steps*4,steps*4+2,steps*4+1,steps*4+1,steps*4+2,steps*4+3);
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setIndex(indices);geometry.computeVertexNormals();
 return geometry;
}

function addLeaf(group,geometry,leafMaterial,veinMaterial,base,direction,width,length,roll){
 const leafRoot=new THREE.Group(),leaf=new THREE.Mesh(geometry,leafMaterial);
 leaf.scale.set(width,length,width);leaf.castShadow=true;leaf.receiveShadow=true;leafRoot.add(leaf);
 const vein=cylinderBetween(new THREE.Vector3(0,.03,.055),new THREE.Vector3(0,.88,.16),.012,veinMaterial,7);
 vein.scale.y=length;vein.scale.x=vein.scale.z=width;leafRoot.add(vein);
 leafRoot.position.copy(base);leafRoot.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.clone().normalize());
 leafRoot.rotateOnAxis(new THREE.Vector3(0,1,0),roll);group.add(leafRoot);
}

export function createVaseLeafSprig(endpoint,variation=0){
 const group=new THREE.Group(),end=endpoint.clone(),height=Math.max(.72,end.length());
 if(end.length()<.72)end.set(end.x,height,end.z);
 const stemMaterial=new THREE.MeshStandardMaterial({color:'#586b45',roughness:.82}),veinMaterial=new THREE.MeshStandardMaterial({color:'#9eb27a',roughness:.7});
 const leafMaterials=[new THREE.MeshStandardMaterial({color:'#5f7f4c',roughness:.72,side:THREE.DoubleSide}),new THREE.MeshStandardMaterial({color:'#78965d',roughness:.68,side:THREE.DoubleSide}),new THREE.MeshStandardMaterial({color:'#496c45',roughness:.78,side:THREE.DoubleSide})];
 const geometry=sculptedLeafGeometry(),curve=new THREE.CatmullRomCurve3([new THREE.Vector3(),new THREE.Vector3(end.x*.08,Math.max(.34,end.y*.3),.03),new THREE.Vector3(end.x*.42,Math.max(.62,end.y*.7),-.04),end]);
 const stem=new THREE.Mesh(new THREE.TubeGeometry(curve,48,.014,10,false),stemMaterial);stem.castShadow=true;group.add(stem);
 const count=8;
 for(let i=0;i<count;i++){
  const t=.2+i*.085,p=curve.getPoint(t),side=i%2?-1:1,depth=((i%3)-1)*.11+(variation%3-1)*.025;
  const outward=new THREE.Vector3(side*(.18+.025*(i%3)),.105+.018*i,depth),twigEnd=p.clone().add(outward);
  group.add(cylinderBetween(p,twigEnd,.0065,stemMaterial,8));
  const direction=new THREE.Vector3(side*(.7+.08*(i%2)),.68+.04*i,depth*2.2).normalize();
  addLeaf(group,geometry,leafMaterials[i%leafMaterials.length],veinMaterial,twigEnd,direction,.085+.007*(i%3),.27+.018*(i%2),side*.22+depth);
 }
 const tip=curve.getPoint(.93),tipDirections=[new THREE.Vector3(-.38,.92,.12),new THREE.Vector3(.38,.92,-.1),new THREE.Vector3(.06,1,.16)];
 tipDirections.forEach((direction,index)=>addLeaf(group,geometry,leafMaterials[(index+1)%leafMaterials.length],veinMaterial,tip,direction,.072,.23,(index-1)*.34));
 group.userData.vaseLeafSprig=true;group.userData.leafCount=count+tipDirections.length;
 return group;
}
