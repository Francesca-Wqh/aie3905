// Adapted from WITHIN, copyright (c) 2026 WITHIN contributors, MIT.
// Original sources and adaptation notes: architecture/UPSTREAM.md.
import * as THREE from 'three';
import { createQingmingMaterials } from './qingming-materials.js?v=courtyard03';
import { buildQingmingShopFront } from './qingming-commerce.js?v=courtyard03';
import { clothCanopy, potteryJar, wovenBasket } from './qingming-details.js?v=courtyard03';
import { roofGeometry, roofTilesGeometry, roofGableGeometry, roofSurfaceY } from './roof.js?v=courtyard03';
const v = p => new THREE.Vector3(...p), mat = createQingmingMaterials();
const wood = mat('#736051', 'wood'), dark = mat('#494238', 'wood'), plaster = mat('#d9d2c2', 'plaster'), tile = mat('#555e5b', 'tile'), tileLight = mat('#6a726c', 'tile'), stone = mat('#94958b', 'stone'), earth = mat('#9f9787', 'earth'), linen = mat('#c5bdab', 'plaster'), red = mat('#775951', 'plaster'), blue = mat('#526d6a', 'plaster'), ochre = mat('#a58b59', 'plaster');
const streetMaterials = { wood, dark, linen, earth, stone, blue, clay: red };
const shared = new Set(Object.values(streetMaterials).concat([plaster, tile, tileLight, ochre]));
const signMaterials = new Map();
function box(g, size, p, m) { const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), m); mesh.position.set(...p); g.add(mesh); return mesh; }
function beam(g, a, b, r = .09, m = wood) { const aa = v(a), bb = v(b), delta = bb.clone().sub(aa), mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, delta.length(), 6, 1, r < .1), m); mesh.position.copy(aa).add(bb).multiplyScalar(.5); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()); g.add(mesh); return mesh; }
function curveRod(g, points, r, m, segments = 16) { const mesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), segments, r, 6, false), m); g.add(mesh); return mesh; }
function roof(g, w, d, y, h, detail = true) { const profile = { width: w, depth: d, base: y - .2, rise: h, detailed: detail }, roofMat = tile.clone(); roofMat.side = THREE.DoubleSide; const surface = new THREE.Mesh(roofGeometry(profile), roofMat); surface.name = 'qingming-roof-surface'; g.add(surface); const tiles = new THREE.Mesh(roofTilesGeometry(profile), tileLight); tiles.name = 'qingming-roof-cover-tiles'; g.add(tiles); beam(g, [-w / 2, y - .2 + h + .08, 0], [w / 2, y - .2 + h + .08, 0], .1, tileLight); for (const side of [-1, 1])
    curveRod(g, Array.from({ length: 9 }, (_, i) => { const x = (i / 8 - .5) * w, z = side * d / 2; return v([x, roofSurfaceY(profile, x, z) - .065, z]); }), .055, dark, 8); return profile; }
// Only the sign atlas is replaced: self-contained browser canvas lettering, no remote assets.
function sign(g, x, y, z, index) { box(g, [2, .68, .13], [x, y, z], dark); const names = ['陈酿酒坊', '台十茶肆', '本草药铺', '锦绣布庄', '竹木作坊', '文墨纸铺', '五谷粮行', '逐亚客舍']; let m = signMaterials.get(index); if (!m) {
    if (typeof document !== 'undefined') {
        const c = document.createElement('canvas');
        c.width = 1024;
        c.height = 256;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#e4d7b1';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 164px "Songti SC", "Noto Serif CJK SC", serif';
        ctx.fillText(names[index % 8], 512, 138);
        ctx.strokeStyle = '#ad9874';
        ctx.lineWidth = 9;
        ctx.strokeRect(18, 18, 988, 220);
        const texture = new THREE.CanvasTexture(c);
        texture.colorSpace = THREE.SRGBColorSpace;
        m = new THREE.MeshStandardMaterial({ map: texture, transparent: true, roughness: 1 });
    }
    else
        m = linen;
    signMaterials.set(index, m);
    shared.add(m);
} const face = new THREE.Mesh(new THREE.PlaneGeometry(1.86, .54), m); face.position.set(x, y, z + .073); face.name = 'qingming-shop-sign'; g.add(face); }
function hangingLantern(x,y,z){const g=new THREE.Group();g.name='qingming-hanging-lantern';g.position.set(x,y,z);const paper=new THREE.MeshStandardMaterial({color:'#aa6247',emissive:'#d98a45',emissiveIntensity:.17,roughness:.95});const body=new THREE.Mesh(new THREE.SphereGeometry(.21,12,8),paper);body.scale.set(1,1.25,1);g.add(body);beam(g,[0,.24,0],[0,.52,0],.018,dark);for(const side of [-1,1]){const cap=new THREE.Mesh(new THREE.CylinderGeometry(.105,.105,.045,10),dark);cap.position.y=side*.245;g.add(cap);}for(let i=0;i<8;i++){const a=i*Math.PI/4,pts=Array.from({length:9},(_,j)=>{const b=j/8*Math.PI,r=Math.sin(b)*.214;return new THREE.Vector3(Math.cos(a)*r,Math.cos(b)*.264,Math.sin(a)*r)});g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),8,.007,3,false),linen));}beam(g,[0,-.28,0],[0,-.47,0],.022,paper);return g;}
export function buildQingmingHouse(w, d, tall = false, index = 1) {
    const x = -20, z = 10, facing = 0;
    const g = new THREE.Group();
    const lightSites = [];
    // Anchor the complete house (including its roof) to the local bank height.
    // The riverbanks are not perfectly level, so a fixed 2.8m lift makes roofs
    // visibly float when a house crosses the shore transition.
    g.position.set(0, 0, 0);
    g.rotation.y = facing;
    const h = tall ? 6.4 : 3.9;
    const hero = Math.abs(x + 20) < 27;
    const openShop = z > -60 && x > -66;
    const lightSite = (px, py, pz, kind, size) => {
        lightSites.push({
            position: [
                x + Math.cos(facing) * px + Math.sin(facing) * pz,
                g.position.y + py,
                z - Math.sin(facing) * px + Math.cos(facing) * pz,
            ],
            yaw: facing,
            kind,
            size,
        });
    };
    if (openShop) {
        for (const side of index % 3 === 0 ? [-1, 1] : [index % 2 ? -1 : 1]) {
            lightSite(side * w * 0.36, 3.1, d / 2 + 0.9, 'lantern');
            beam(g, [side * w * 0.36, 3.65, d / 2], [side * w * 0.36, 3.65, d / 2 + 0.9], 0.035, dark);
        }
    }
    if (tall)
        for (let j = -1; j <= 1; j++)
            lightSite(j * w * 0.29, 4.6, d / 2 + 0.025, 'window', [w * 0.215, 1.17]);
    box(g, [w + 0.5, 0.3, d + 0.45], [0, 0.15, 0], stone);
    if (openShop) {
        // Real recessed storefront, not a door painted onto a solid building.
        box(g, [w - 0.3, h, 0.2], [0, h / 2 + 0.3, -d / 2 + 0.25], plaster);
        for (const side of [-1, 1])
            box(g, [0.2, h, d - 0.3], [side * (w / 2 - 0.25), h / 2 + 0.3, 0], plaster);
        box(g, [w - 0.3, Math.max(0.3, h - 2.5), 0.18], [0, 2.8 + Math.max(0.3, h - 2.5) / 2, d / 2 - 0.12], plaster);
        box(g, [w - 0.5, 0.08, d - 0.5], [0, 0.34, 0], earth);
        box(g, [w - 0.5, 0.12, d - 0.5], [0, 2.82, 0], wood);
        const furnishing = buildQingmingShopFront(index, w - 0.65, d - 0.15, streetMaterials);
        furnishing.position.y = 0.38;
        g.add(furnishing);
        g.userData.shopKind = furnishing.userData.shopKind;
        for (const side of [-1, 1]) {
            const shutter = box(g, [0.42, 2.28, 0.09], [side * (w / 2 - 0.56), 1.5, d / 2 + 0.14], wood);
            shutter.rotation.y = side * 0.5;
        }
    }
    else
        box(g, [w - 0.3, h, d - 0.3], [0, h / 2 + 0.3, 0], plaster);
    for (const s of [-1, 1])
        for (const q of [-1, 1])
            box(g, [0.18, h, 0.18], [s * (w / 2 - 0.12), h / 2 + 0.3, q * (d / 2 - 0.12)], wood);
    box(g, [w, 0.16, 0.18], [0, 3.1, d / 2], wood);
    box(g, [w, 0.11, 0.1], [0, 2.9, -d / 2], wood);
    for (const s of [-1, 1]) {
        box(g, [0.13, h, 0.12], [s * w * 0.23, h / 2 + 0.3, -d / 2], wood);
        box(g, [1.05, 0.85, 0.06], [s * w * 0.24, 2.15, -d / 2 - 0.04], dark);
        for (let k = -2; k <= 2; k++)
            box(g, [0.04, 0.85, 0.04], [s * w * 0.24 + k * 0.2, 2.15, -d / 2 - 0.09], linen);
    }
    for (let j = 0; j < 3; j++) {
        const xx = (j - 1) * w * 0.29;
        if (!openShop)
            box(g, [w * 0.23, 1.8, 0.04], [xx, 1.35, d / 2], j === 1 ? dark : wood);
        if (j !== 1 && !openShop)
            for (let k = -2; k <= 2; k++)
                box(g, [0.045, 1.5, 0.05], [xx + k * w * 0.035, 1.45, d / 2 + 0.05], linen);
        if (tall) {
            box(g, [w * 0.22, 1.2, 0.04], [xx, 4.6, d / 2], dark);
            for (let k = -2; k <= 2; k++)
                box(g, [0.055, 1.3, 0.06], [xx + k * w * 0.04, 4.6, d / 2 + 0.08], dark);
            box(g, [w * 0.25, 0.08, 0.06], [xx, 4.6, d / 2 + 0.08], dark);
        }
    }
    // Seat the roof against the actual wall edge, not its lower, overhanging eave.
    // Otherwise the wall cap cuts a bright horizontal line through the shallow slope.
    const roofHeight = w * 0.34;
    const wallT = (d - 0.3) / (d + 1.5);
    const roofBase = h + 0.365 - roofHeight * (1 - wallT + 0.23 * wallT ** 4);
    const mainRoof = roof(g, w + 1.3, d + 1.5, roofBase + 0.2, roofHeight, hero);
    const gable = new THREE.Mesh(roofGableGeometry(mainRoof, w - 0.3, d - 0.3, h + 0.3), plaster);
    gable.name = 'qingming-roof-gable';
    g.add(gable);
    if (tall) {
        // Omit the scroll scene's intersecting lower roof; the balcony and textile canopy remain.
        box(g, [w + 0.6, 0.15, 1], [0, 3.5, d / 2 + 0.25], wood);
        for (let i = 0; i < 11; i++)
            box(g, [0.065, 0.7, 0.065], [(i / 10 - 0.5) * w, 3.9, d / 2 + 0.7], wood);
        box(g, [w + 0.2, 0.09, 0.08], [0, 4.25, d / 2 + 0.7], wood);
    }
    const awning = box(g, [w - 0.7, 0.09, 2.5], [0, 2.9, d / 2 + 0.85], index % 3 ? linen : blue);
    awning.rotation.x = 0.1;
    if (openShop) {
        // A few folds and a hanging edge replace the rigid solid awning slab.
        g.remove(awning);
        awning.geometry.dispose();
        const fabric = (index % 3 ? linen : blue).clone();
        fabric.side = THREE.DoubleSide;
        const geo = new THREE.PlaneGeometry(w - 0.7, 2.5, 8, 2);
        const p = geo.getAttribute('position');
        for (let j = 0; j < p.count; j++) {
            const xx = p.getX(j), zz = p.getY(j);
            p.setXYZ(j, xx, 2.95 - Math.cos((xx / (w - 0.7)) * Math.PI) * 0.12 - zz * 0.075, d / 2 + 0.85 + zz);
        }
        geo.computeVertexNormals();
        g.add(new THREE.Mesh(geo, fabric));
        const trim = new THREE.PlaneGeometry(w - 0.7, 0.25, 8, 1);
        const tp = trim.getAttribute('position');
        for (let j = 0; j < tp.count; j++)
            tp.setZ(j, Math.sin(tp.getX(j) * 7) * 0.025);
        trim.computeVertexNormals();
        const edge = new THREE.Mesh(trim, fabric);
        edge.position.set(0, 2.69, d / 2 + 2.1);
        g.add(edge);
    }
    for (const s of [-1, 1])
        beam(g, [s * (w / 2 - 0.5), 0, d / 2 + 1.9], [s * (w / 2 - 0.5), 2.9, d / 2 + 1.9]);
    sign(g, 0, tall ? 5.9 : 3.2, d / 2 + 0.15, index);
    // Eave rafters and brackets from the source's detailed street construction.
    for(let i=0;i<23;i++){
      const xx=(i/22-.5)*(w+.8),innerZ=d/2-.05,outerZ=d/2+.68;
      beam(g,[xx,roofSurfaceY(mainRoof,xx,innerZ)-.13,innerZ],[xx,roofSurfaceY(mainRoof,xx,outerZ)-.13,outerZ],.045,dark).name='qingming-eave-rafter';
    }
    for(const side of [-1,1]){
      const xx=side*(w/2-.15);
      box(g,[.62,.16,.4],[xx,3.16,d/2+.03],wood);
      beam(g,[xx,2.67,d/2+.03],[xx-side*.43,3.2,d/2+.03],.065,wood);
      // Add the exterior timber bands that would otherwise be obscured by adjacent shops in the scroll.
      box(g,[.12,.13,d-.2],[side*(w/2-.06),.67,0],wood);
      box(g,[.12,.12,d-.2],[side*(w/2-.06),3.13,0],wood);
    }
    g.add(hangingLantern(-w*.39,tall?5.45:3.68,d/2+.64));
    if(tall||index===0)g.add(hangingLantern(w*.39,tall?5.45:3.68,d/2+.64));
    if (hero && !openShop) {
        // Street-level construction: stone footings, beam shoulders and diagonal brackets.
        for (const side of [-1, 1]) {
            const xx = side * (w / 2 - 0.38);
            box(g, [0.52, 0.18, 0.52], [xx, 0.39, d / 2 + 0.3], stone);
            beam(g, [xx, 0.48, d / 2 + 0.3], [xx, 3.2, d / 2 + 0.3], 0.12);
            box(g, [0.7, 0.15, 0.28], [xx, 3.1, d / 2 + 0.3], wood);
            beam(g, [xx, 2.65, d / 2 + 0.3], [xx - side * 0.48, 3.18, d / 2 + 0.3], 0.07);
            box(g, [0.7, 0.12, 0.4], [side * 0.68, 0.38, d / 2 + 0.55], stone);
        }
        // Open shutters fold beside the recessed doorway; no texture-painted fake openings.
        for (const side of [-1, 1]) {
            const shutter = new THREE.Group();
            shutter.position.set(side * 0.86, 0.4, d / 2 + 0.12);
            shutter.rotation.y = side * 0.55;
            g.add(shutter);
            box(shutter, [0.55, 1.95, 0.055], [side * 0.27, 0.98, 0], wood);
            for (let k = 0; k < 7; k++)
                box(shutter, [0.48, 0.035, 0.075], [side * 0.27, 0.15 + k * 0.27, 0.045], dark);
            for (let k = 0; k < 4; k++)
                box(g, [w * 0.23, 0.035, 0.06], [side * w * 0.29, 0.8 + k * 0.29, d / 2 + 0.07], linen);
        }
        for (let i = 0; i < 17; i++) {
            const xx = (i / 16 - 0.5) * (w + 0.7);
            const innerZ = d / 2 - 0.05, outerZ = d / 2 + 0.68;
            beam(g, [xx, roofSurfaceY(mainRoof, xx, innerZ) - 0.14, innerZ], [xx, roofSurfaceY(mainRoof, xx, outerZ) - 0.14, outerZ], 0.045).name = 'qingming-eave-rafter';
        }
        // Replace the rigid awning board with sagging woven cloth and a loose valance.
        g.remove(awning);
        awning.geometry.dispose();
        const clothMat = (index % 3 ? linen : blue).clone();
        clothMat.side = THREE.DoubleSide;
        const canopy = clothCanopy(w - 0.7, 2.5, clothMat);
        canopy.position.set(0, 3.04, d / 2 + 0.85);
        g.add(canopy);
        const valance = new THREE.PlaneGeometry(w - 0.7, 0.34, 20, 2);
        const vp = valance.attributes.position;
        for (let j = 0; j < vp.count; j++)
            vp.setZ(j, Math.sin(vp.getX(j) * 14) * 0.035);
        valance.computeVertexNormals();
        const clothEdge = new THREE.Mesh(valance, clothMat);
        clothEdge.position.set(0, 2.69, d / 2 + 2.1);
        g.add(clothEdge);
        // The fabric merchant displays cloth, while food and wine shops keep earthenware.
        const basket = wovenBasket(0.35, 0.46, ochre);
        basket.position.set(w * 0.31, 0.31, d / 2 + 0.9);
        g.add(basket);
        for (let k = 0; k < 3; k++) {
            if (index % 8 === 4) {
                box(g, [0.95, 0.12, 0.6], [-w * 0.23, 0.38 + k * 0.13, d / 2 + 0.8], k % 2 ? blue : linen);
                for (let j = 0; j < 3; j++)
                    box(g, [0.015, 0.014, 0.59], [-w * 0.23 - 0.32 + j * 0.3, 0.45 + k * 0.13, d / 2 + 0.8], wood);
                const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.72, 10), k % 2 ? linen : blue);
                bolt.position.set(-w * 0.23 + k * 0.25, 0.9, d / 2 + 0.8);
                g.add(bolt);
                continue;
            }
            const jar = potteryJar(red);
            jar.position.set(-w * 0.29 + k * 0.38, 0.32, d / 2 + 0.8);
            jar.scale.setScalar(1.4);
            g.add(jar);
        }
    }
    if (x > 60 && index % 2 === 0) {
        const rear = new THREE.Group();
        rear.position.set(w * 0.12, 0, -d / 2 - 1.6);
        g.add(rear);
        box(rear, [w * 0.72, 2.5, 3.1], [0, 1.25, 0], plaster);
        const rearRoof = roof(rear, w * 0.72 + 1, 4, 2.565, 0.65, false);
        rear.add(new THREE.Mesh(roofGableGeometry(rearRoof, w * 0.72, 3.1, 2.5), plaster));
        for (let k = 0; k < 5; k++)
            box(rear, [0.1, 1.3, 0.1], [(k - 2) * w * 0.12, 1.7, 1.6], wood);
    }
    g.traverse(o => { if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        if (!shared.has(o.material))
            o.material.userData.buildingOwned = true;
    } });
    g.userData.source = "WITHIN/qingming.ts house";
    return g;
}

// Residential compositions reuse the source's roof, textured materials and timber proportions.
export function buildQingmingResidence(w=6,d=4.5,courtyard=false){
 const root=new THREE.Group();root.userData.residential=true;root.userData.courtyard=courtyard;
 function window(g,x,y,z,width=1.1,height=1.25){box(g,[width,height,.075],[x,y,z],dark);for(let i=0;i<=6;i++)box(g,[.035,height+.08,.045],[x-width/2+i*width/6,y,z+.06],wood);for(let i=0;i<=3;i++)box(g,[width+.08,.04,.05],[x,y-height/2+i*height/3,z+.065],wood);box(g,[width+.18,.11,.18],[x,y-height/2-.06,z],stone);}
 function dwelling(width,depth,h){const g=new THREE.Group();g.name='residence-main-room';box(g,[width+.45,.24,depth+.45],[0,.12,0],stone);box(g,[width-.2,h,.18],[0,h/2+.24,-depth/2+.1],plaster);for(const side of [-1,1])box(g,[.18,h,depth],[side*(width/2-.09),h/2+.24,0],plaster);
  // Front is framed around a recessed two-leaf doorway, instead of a solid wall with a painted door.
  const front=depth/2;for(const side of [-1,1]){box(g,[(width-1.5)/2,h,.18],[side*(width/4+.375),h/2+.24,front],plaster);window(g,side*width*.31,1.78,front+.12,Math.min(1.35,width*.21));}
  box(g,[1.5,h-2.4,.18],[0,2.64+(h-2.4)/2,front],plaster);box(g,[1.5,2.4,.12],[0,1.44,front-.15],dark);
  for(const side of [-1,1]){const door=new THREE.Group();door.position.set(side*.72,.25,front+.12);door.rotation.y=side*.2;g.add(door);box(door,[.68,2.33,.09],[-side*.34,1.165,0],wood);for(let j=0;j<4;j++)box(door,[.55,.035,.035],[-side*.34,.3+j*.52,.065],dark);const ring=new THREE.Mesh(new THREE.TorusGeometry(.065,.014,5,12),ochre);ring.position.set(-side*.55,1.13,.07);door.add(ring);}
  for(const x of [-width/2,-width*.16,width*.16,width/2])for(const z of [-depth/2,front+.13])box(g,[.13,h+.1,.14],[x,h/2+.27,z],wood);
  for(const y of [.47,h+.2])box(g,[width+.2,.14,.16],[0,y,front+.15],wood);
  const roofWidth=width+1.15,roofDepth=depth+1.3,rise=width*.29,t=(depth-.15)/roofDepth,base=h+.28-rise*(1-t+.23*t**4),profile=roof(g,roofWidth,roofDepth,base+.2,rise,true);g.add(new THREE.Mesh(roofGableGeometry(profile,width-.15,depth-.15,h+.24),plaster));
  for(let i=0;i<18;i++){const x=(i/17-.5)*roofWidth;beam(g,[x,roofSurfaceY(profile,x,front-.1)-.1,front-.1],[x,roofSurfaceY(profile,x,front+.6)-.1,front+.6],.035,dark);}
  for(const side of [-1,1]){box(g,[.14,.13,depth],[side*width/2,1,0],wood);box(g,[.14,.13,depth],[side*width/2,h+.12,0],wood);}
  for(let i=0;i<2;i++)box(g,[1.85,.12,.4],[0,.06+i*.1,front+.6-i*.25],stone);return g;
 }
 if(!courtyard){root.add(dwelling(w,d,3.1));const jar=potteryJar(red);jar.scale.setScalar(1.5);jar.position.set(w*.38,.24,d/2+.3);root.add(jar);const basket=wovenBasket(.25,.4,ochre);basket.position.set(-w*.37,.24,d/2+.3);root.add(basket);}
 else{
  root.name='residence-courtyard';box(root,[10,.12,9.6],[0,.06,0],earth);
  const main=dwelling(7,3.3,3.3);main.position.z=-2.65;root.add(main);
  const wing=dwelling(4.6,2.5,2.6);wing.rotation.y=Math.PI/2;wing.position.set(-3.55,0,.8);wing.name='residence-side-room';root.add(wing);
  // Low tiled walls define a real empty courtyard and a separate roofed entrance.
  for(const x of [-4.8,4.8]){box(root,[.2,1.45,8.9],[x,.8,.15],plaster);box(root,[.34,.1,9.1],[x,1.56,.15],tile);}
  for(const side of [-1,1]){box(root,[3.95,1.45,.2],[side*2.88,.8,4.65],plaster);box(root,[4.05,.12,.38],[side*2.88,1.56,4.65],tile);}
  const gate=new THREE.Group();gate.name='residence-gate';gate.position.z=4.65;for(const side of [-1,1])box(gate,[.25,2.2,.3],[side*.87,1.1,0],wood);box(gate,[2,.18,.35],[0,2.18,0],wood);roof(gate,2.65,1.45,2.15,.55,true);root.add(gate);
  for(let i=0;i<7;i++)box(root,[1.12,.04,.49],[0,.14,4.2-i*.57],stone);
  const planter=new THREE.Mesh(new THREE.CylinderGeometry(.49,.38,.55,10),stone);planter.position.set(2.9,.35,1.6);root.add(planter);beam(root,[2.9,.5,1.6],[2.93,2.3,1.6],.065,wood);for(let i=0;i<7;i++){const a=i*2.4,leaf=new THREE.Mesh(new THREE.SphereGeometry(.46,7,5),mat('#738468'));leaf.scale.set(1,.65,.8);leaf.position.set(2.9+Math.cos(a)*.45,1.9+i*.09,1.6+Math.sin(a)*.42);root.add(leaf);}
  box(root,[1.75,.1,.45],[2.5,.55,-.6],wood);for(const x of [1.85,3.15])box(root,[.12,.5,.35],[x,.3,-.6],wood);
 }
 root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(!shared.has(o.material))o.material.userData.buildingOwned=true;}});return root;
}
