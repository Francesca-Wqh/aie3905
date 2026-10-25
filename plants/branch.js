import * as THREE from 'three';

const noise=n=>{const x=Math.sin(n*127.1+41.7)*43758.5453;return x-Math.floor(x);};
// Longitudinal bark grain; shared by all vase branches, with no external assets.
const pixels=new Uint8Array(64*256*4);
for(let y=0;y<256;y++)for(let x=0;x<64;x++){
 const grain=Math.sin(x*.94+Math.sin(y*.035)*.8)*.10+Math.sin(x*2.4+y*.012)*.06+(noise(x+y*64)-.5)*.12;
 const crack=Math.sin(x*.57+Math.sin(y*.017))>.94?-.18:0,v=1+grain+crack,i=(y*64+x)*4;
 pixels[i]=Math.min(255,112*v);pixels[i+1]=Math.min(255,88*v);pixels[i+2]=Math.min(255,65*v);pixels[i+3]=255;
}
const bark=new THREE.DataTexture(pixels,64,256,THREE.RGBAFormat);bark.colorSpace=THREE.SRGBColorSpace;bark.wrapS=bark.wrapT=THREE.RepeatWrapping;bark.needsUpdate=true;
const wood=new THREE.MeshStandardMaterial({map:bark,bumpMap:bark,bumpScale:.007,color:'#b9b1a0',roughness:.96});
const budMaterial=new THREE.MeshStandardMaterial({color:'#927458',roughness:.9});
const scarMaterial=new THREE.MeshStandardMaterial({color:'#665543',roughness:1});
const up=new THREE.Vector3(0,1,0);

function stem(points,baseRadius,tipRadius,seed,name){
 const curve=new THREE.CatmullRomCurve3(points,false,'centripetal',.25),segments=Math.max(18,points.length*8),radial=9;
 const geo=new THREE.TubeGeometry(curve,segments,1,radial,false),pos=geo.attributes.position,frames=curve.computeFrenetFrames(segments,false);
 for(let i=0;i<=segments;i++){
  const t=i/segments,centre=curve.getPointAt(t),radius=tipRadius+(baseRadius-tipRadius)*Math.pow(1-t,1.25);
  for(let j=0;j<=radial;j++){
   const a=j/radial*Math.PI*2,r=radius*(1+.055*Math.sin(a*3+seed+t*5));
   const p=centre.clone().addScaledVector(frames.normals[i],-Math.cos(a)*r).addScaledVector(frames.binormals[i],Math.sin(a)*r);
   pos.setXYZ(i*(radial+1)+j,p.x,p.y,p.z);
  }
 }
 geo.computeVertexNormals();geo.computeBoundingSphere();
 const mesh=new THREE.Mesh(geo,wood);mesh.name=name;mesh.userData.baseRadius=baseRadius;mesh.userData.tipRadius=tipRadius;return {mesh,curve};
}
function bud(root,p,tangent,size){
 const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,8,6),budMaterial);mesh.scale.set(size*.68,size,size*.60);mesh.quaternion.setFromUnitVectors(up,tangent.clone().normalize());mesh.position.copy(p);mesh.name='branch-bud';root.add(mesh);
}

// Local origin is inside the vase mouth. The main tip always reaches the selected endpoint.
export function createWoodyBranch(endpoint,seed=1){
 const root=new THREE.Group(),end=endpoint.clone(),length=end.length(),reach=Math.min(2.5,Math.max(.35,length)),sign=end.x<0?-1:1;
 const direction=end.clone().normalize(),across=new THREE.Vector3(-direction.y,direction.x,.12).normalize();
 const sway=(noise(seed+8)-.5)*.16;
 const main=stem([
  new THREE.Vector3(0,-.16,0),
  new THREE.Vector3(sign*.045,.21,-.035),
  end.clone().multiplyScalar(.37).addScaledVector(across,reach*(.055+sway)),
  end.clone().multiplyScalar(.71).addScaledVector(across,-reach*.045).add(new THREE.Vector3(0,.025,.035)),end
 ],.031+reach*.007,.003,seed,'branch-main');root.add(main.mesh);
 const sites=length<.95?[.39,.70]:[.31,.53,.76];
 sites.forEach((t,j)=>{
  const p=main.curve.getPoint(t),tangent=main.curve.getTangent(t),side=j===1?-sign:sign;
  const fan=new THREE.Vector3(side*.80,.65,(noise(seed+j*7)-.5)*.65).normalize();
  const shootDirection=tangent.clone().multiplyScalar(.40).addScaledVector(fan,.82).normalize();
  const span=reach*(j===0?.37:j===1?.27:.19)*( .88+noise(seed+j*13)*.20);
  const tip=p.clone().addScaledVector(shootDirection,span),radius=(.031+reach*.007)*Math.pow(1-t,1.2)*.66;
  const shoot=stem([p,p.clone().addScaledVector(tangent,span*.20).addScaledVector(fan,span*.14),p.clone().lerp(tip,.63).add(new THREE.Vector3(0,-span*.065,.025)),tip],radius,.002,seed+j*9,'branch-side');root.add(shoot.mesh);
  const knot=new THREE.Mesh(new THREE.SphereGeometry(1,8,6),scarMaterial);knot.scale.set(radius*1.12,radius*1.65,radius*.92);knot.position.copy(p);knot.quaternion.setFromUnitVectors(up,shootDirection);knot.name='branch-joint';root.add(knot);
  bud(root,tip,shootDirection,.015+reach*.003);
  if(j<2&&span>.17){
   const forkAt=.55+noise(seed+j)*.16,q=shoot.curve.getPoint(forkAt),forkDirection=shootDirection.clone().add(new THREE.Vector3(-side*.65,.55,.25)).normalize(),forkEnd=q.clone().addScaledVector(forkDirection,span*.42);
   const fork=stem([q,q.clone().lerp(forkEnd,.5).add(new THREE.Vector3(0,span*.045,0)),forkEnd],radius*.43,.0016,seed+j+30,'branch-twig');root.add(fork.mesh);bud(root,forkEnd,forkDirection,.012+reach*.002);
  }
  const b=shoot.curve.getPoint(.82);bud(root,b,shootDirection.clone().add(new THREE.Vector3(0,.5,.1)),.012);
 });
 bud(root,end,main.curve.getTangent(1),.016);
 root.name='疏枝';root.userData.endpoint=end.toArray();root.userData.seed=seed;return root;
}
