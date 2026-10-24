import * as THREE from 'three';
import {mergeGeometries} from '../vendor/BufferGeometryUtils.js';
import {createQingmingMaterials} from './qingming-materials.js';

// Pavilion geometry is a project addition, using the same textured materials as the Qingming houses.
const material=createQingmingMaterials();
const wood=material('#736051','wood'),darkWood=material('#494238','wood'),stone=material('#a8a698','stone'),stoneDark=material('#8f9385','stone'),tile=material('#555e5b','tile'),tileEdge=material('#69716a','tile');
tile.side=THREE.DoubleSide;
function mesh(g,geometry,mat,name=''){const m=new THREE.Mesh(geometry,mat);m.name=name;m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
function box(g,size,p,mat=wood){const m=mesh(g,new THREE.BoxGeometry(...size),mat);m.position.set(...p);return m;}
function rod(g,a,b,r=.035,mat=wood){a=new THREE.Vector3(...a);b=new THREE.Vector3(...b);const delta=b.clone().sub(a),m=mesh(g,new THREE.CylinderGeometry(r,r,delta.length(),8),mat);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;}
function curve(g,points,r,mat){return mesh(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),16,r,6,false),mat);}
function batch(group){group.updateMatrixWorld(true);const buckets=new Map(),old=new Set();for(const m of [...group.children]){if(!m.isMesh)continue;const geom=m.geometry.clone().applyMatrix4(m.matrix);if(!buckets.has(m.material))buckets.set(m.material,[]);buckets.get(m.material).push(geom);old.add(m.geometry);group.remove(m);}for(const [mat,parts] of buckets){mesh(group,mergeGeometries(parts,false),mat);parts.forEach(g=>g.dispose());}old.forEach(g=>g.dispose());}
function namedGroup(parent,name){const g=new THREE.Group();g.name=name;parent.add(g);return g;}

function roofPoint(n,r,face,u,t){const offset=n===4?Math.PI/4:Math.PI/6,a=offset+face*2*Math.PI/n,b=a+2*Math.PI/n;return new THREE.Vector3(r*t*((1-u)*Math.cos(a)+u*Math.cos(b)),3.65-1.45*t+.26*t**5+.14*Math.abs(u*2-1)**6*t**5,r*t*((1-u)*Math.sin(a)+u*Math.sin(b)));}
function geometry(positions,uv,indices){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;}
function tiledRoof(root,n,r){
 const g=namedGroup(root,'pavilion-roof'),positions=[],uv=[],indices=[],rows=20,cols=24,tileCount=14;
 const barrels=[],buv=[],bi=[],edgeLength=2*r*Math.sin(Math.PI/n);
 for(let face=0;face<n;face++){
  let offset=positions.length/3;
  for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){const t=.025+.975*j/rows,u=i/cols,p=roofPoint(n,r,face,u,t);positions.push(...p.toArray());uv.push(u,t);if(j<rows&&i<cols){const a=offset+j*(cols+1)+i,b=a+cols+1;indices.push(a,a+1,b,a+1,b+1,b);}}
  // Raised half-round tile rows converge toward the crown and meet the same curved surface.
  for(let k=0;k<tileCount;k++){
   offset=barrels.length/3;
   for(let j=0;j<=rows;j++)for(let i=0;i<=4;i++){
    const t=.13+.87*j/rows,angle=i*Math.PI/4,center=(k+.5)/tileCount,width=Math.min(.033/(edgeLength*t),.39/tileCount),u=center-Math.cos(angle)*width,p=roofPoint(n,r,face,u,t);
    p.y+=Math.sin(angle)*Math.min(.033,edgeLength*t*width)+.004;barrels.push(...p.toArray());buv.push(u,t);
    if(j<rows&&i<4){const a=offset+j*5+i,b=a+5;bi.push(a,a+1,b,a+1,b+1,b);}
   }
  }
 }
 mesh(g,geometry(positions,uv,indices),tile,'pavilion-curved-roof');
 mesh(g,geometry(barrels,buv,bi),tileEdge,'pavilion-raised-tiles');
 const trims=namedGroup(g,'pavilion-ridges-and-eaves'),rafters=namedGroup(g,'pavilion-eave-rafters');
 for(let face=0;face<n;face++){
  curve(trims,Array.from({length:25},(_,i)=>roofPoint(n,r,face,i/24,1).add(new THREE.Vector3(0,-.045,0))),.045,darkWood);
  curve(trims,Array.from({length:21},(_,i)=>roofPoint(n,r,face,0,.04+.96*i/20).add(new THREE.Vector3(0,.055,0))),.043,tileEdge);
  for(let k=0;k<tileCount;k++){
   const u=(k+.5)/tileCount,p=roofPoint(n,r,face,u,1),radial=new THREE.Vector3(p.x,0,p.z).normalize();
   const cap=mesh(trims,new THREE.CylinderGeometry(.031,.031,.025,8),tileEdge);cap.position.copy(p).addScaledVector(radial,.006);cap.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),radial);
   const line=Array.from({length:9},(_,j)=>roofPoint(n,r,face,u,.32+.66*j/8).add(new THREE.Vector3(0,-.085,0)));curve(rafters,line,.025,wood);
  }
 }
 const finialProfile=[[.11,0],[.14,.05],[.09,.12],[.065,.18],[.09,.24],[.055,.30],[0,.42]].map(([x,y])=>new THREE.Vector2(x,y));
 const finial=mesh(trims,new THREE.LatheGeometry(finialProfile,16),tileEdge);finial.position.y=3.62;
 batch(trims);batch(rafters);
 g.userData={faces:n,tileRows:n*tileCount,rafters:n*tileCount};return g;
}

export function buildDetailedPavilion(width=2.8,variant=0){
 const n=variant===1?6:4,r=width*.43,root=new THREE.Group(),offset=n===4?Math.PI/4:Math.PI/6,points=Array.from({length:n},(_,i)=>new THREE.Vector3(Math.cos(offset+i*2*Math.PI/n)*r,0,Math.sin(offset+i*2*Math.PI/n)*r));
 const floor=namedGroup(root,'pavilion-stone-platform');
 for(const [radius,height,y,mat] of [[r+.35,.12,.06,stoneDark],[r+.29,.13,.185,stone],[r+.22,.06,.28,stone]]){const m=mesh(floor,new THREE.CylinderGeometry(radius,radius+.025,height,n),mat);m.rotation.y=Math.PI/2-offset;m.position.y=y;}
 const frame=namedGroup(root,'pavilion-timber-frame'),rails=namedGroup(root,'pavilion-lattice-and-seating');
 for(let i=0;i<n;i++){
  const p=points[i],q=points[(i+1)%n],delta=q.clone().sub(p),direction=delta.clone().normalize(),span=delta.length();
  const foot=mesh(frame,new THREE.CylinderGeometry(.13,.15,.15,8),stone);foot.position.set(p.x,.36,p.z);
  rod(frame,[p.x,.42,p.z],[p.x,2.53,p.z],.074,wood);
  rod(frame,[p.x,2.45,p.z],[q.x,2.45,q.z],.07,wood);rod(frame,[p.x,2.58,p.z],[q.x,2.58,q.z],.045,darkWood);
  // Stepped bracket blocks connect the column heads to both adjacent beams.
  for(let layer=0;layer<3;layer++){const bracket=box(frame,[.26+layer*.10,.075,.17],[p.x,2.36+layer*.065,p.z]);bracket.rotation.y=-Math.atan2(direction.z,direction.x);const cross=box(frame,[.17,.065,.25+layer*.08],[p.x,2.37+layer*.065,p.z]);cross.rotation.y=bracket.rotation.y;}
  for(const [origin,dir] of [[p,direction],[q,direction.clone().negate()]]){const end=origin.clone().addScaledVector(dir,.36);rod(frame,[origin.x,2.08,origin.z],[end.x,2.45,end.z],.043,wood);}
  if(i===0)continue; // Keep the front entrance open, aligned with the stone steps.
  for(const y of [.54,1.03])rod(rails,[p.x,y,p.z],[q.x,y,q.z],.035,wood);
  const bays=3;
  for(let j=0;j<=bays;j++){const a=p.clone().lerp(q,j/bays);rod(rails,[a.x,.37,a.z],[a.x,1.03,a.z],.026,darkWood);}
  for(let j=0;j<bays;j++){
   const a=p.clone().lerp(q,(j+.13)/bays),b=p.clone().lerp(q,(j+.87)/bays),c=p.clone().lerp(q,(j+.5)/bays);
   for(const [aa,ay,bb,by] of [[a,.79,c,.98],[c,.98,b,.79],[b,.79,c,.59],[c,.59,a,.79]])rod(rails,[aa.x,ay,aa.z],[bb.x,by,bb.z],.018,darkWood);
  }
  const mid=p.clone().lerp(q,.5).multiplyScalar(.91),seat=box(rails,[span-.15,.075,.23],[mid.x,.49,mid.z]);seat.rotation.y=-Math.atan2(direction.z,direction.x);
 }
 const entry=points[0].clone().add(points[1]).multiplyScalar(.5),normal=entry.clone().normalize(),stepAngle=Math.atan2(normal.x,normal.z);
 for(let i=0;i<2;i++){const p=entry.clone().addScaledVector(normal,.40-i*.16),m=box(floor,[points[0].distanceTo(points[1])*.63,.10,.25],[p.x,.05+i*.10,p.z],stone);m.rotation.y=stepAngle;}
 batch(floor);batch(frame);batch(rails);tiledRoof(root,n,r+.65);
 root.userData.detailedPavilion=true;root.userData.roofFaces=n;return root;
}
