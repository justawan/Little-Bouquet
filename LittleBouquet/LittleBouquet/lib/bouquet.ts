import * as T from 'three';
import {colors, type Config} from './gift';

const material = (color: T.ColorRepresentation) =>
  new T.MeshStandardMaterial({color, roughness:.76, side:T.DoubleSide});
const phi = Math.PI * (3 - Math.sqrt(5));

function petal(length: number, width: number, lift: number, curl: number, pointed: boolean) {
  const points: number[] = [], indices: number[] = [];
  const rows = 12, columns = 8;
  for (let row=0;row<=rows;row++) {
    const t = row/rows;
    const profile = Math.pow(Math.sin(Math.PI*t*.98),pointed ? 1.12 : .53);
    for (let col=0;col<=columns;col++) {
      const u = col/columns*2-1;
      points.push(u*width*profile, lift*t + curl*t*t + u*u*profile*width*.46, length*t);
      if (row && col) {
        const i = row*(columns+1)+col;
        indices.push(i,i-1,i-columns-2,i,i-columns-2,i-columns-1);
      }
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(points,3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

const styles = {
  Roses:[[3,.24,.115,.26,.19],[5,.39,.16,.23,.12],[7,.55,.21,.18,.04],[8,.66,.24,.08,.04]],
  Tulips:[[3,.39,.224,.32,.26],[3,.55,.255,.33,.20]],
  Peonies:[[5,.28,.14,.18,.19],[7,.44,.19,.20,.13],[9,.60,.24,.15,.11],[11,.72,.27,.08,.045]],
  Lilies:[[3,.69,.145,.19,-.15],[3,.76,.17,.15,-.13]],
};

function ellipsoid(parent: T.Object3D, mat: T.Material, x:number,y:number,z:number,sx:number,sy:number,sz:number) {
  const mesh = new T.Mesh(new T.SphereGeometry(1,16,12),mat);
  mesh.position.set(x,y,z);
  mesh.scale.set(sx,sy,sz);
  parent.add(mesh);
  return mesh;
}

function line(parent:T.Object3D, points:T.Vector3[], thickness:number, mat:T.Material) {
  const mesh = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),10,thickness,6,false),mat);
  parent.add(mesh);
}

export function makeBouquet(config: Config) {
  const bouquet = new T.Group();
  const blooms: T.Group[] = [];
  const base = new T.Group();
  bouquet.add(base);
  let state = config.seed;
  const random = () => {
    state = (Math.imul(state,1664525)+1013904223) >>> 0;
    return state / 4294967296;
  };
  const stalk = material('#47714e'), foliage = material('#679464'), sage = material('#8ba77b');
  const pollen = material('#f3bd58');
  const color = new T.Color(colors[config.color]);
  const rings = styles[config.flower].map(([count,length,width,lift,curl],index,all) => ({
    count, geometry:petal(length,width,lift,curl,config.flower==='Lilies'),
    mat:material(color.clone().lerp(new T.Color(index ? '#fff4ed' : '#8e425a'), index/all.length*.22+.07)),
  }));
  const leaf = petal(.68,.16,.25,-.09,true);
  const spread = config.count === 5 ? .83 : config.count === 9 ? 1.15 : 1.43;
  const petalTransform = new T.Object3D();
  for (let i=0;i<config.count;i++) {
    const angle = i*phi;
    const radius = Math.sqrt(i/(config.count-1))*spread;
    const x = Math.cos(angle)*radius, z = Math.sin(angle)*radius*.78;
    const y = 1.06 + (1-radius/spread)*.56 - z*.28 + random()*.17;
    const bloom = new T.Group();
    bloom.position.set(x,y,z);
    bloom.rotation.set(.26 + z*.32 + (random()-.5)*.29,angle,-x*.25,'ZXY');
    blooms.push(bloom);
    bouquet.add(bloom);
    ellipsoid(bloom,stalk,0,-.04,0,.17,.13,.17);
    const headScale = config.count===15 ? .62 : .71;
    for (const [ring,{count,geometry,mat}] of rings.entries()) {
      const mesh = new T.InstancedMesh(geometry,mat,count);
      for (let p=0;p<count;p++) {
        petalTransform.rotation.y = p/count*Math.PI*2 + ring*.77 + random()*.15;
        petalTransform.rotation.x = (random()-.5)*.09;
        petalTransform.scale.setScalar(headScale*(.89+random()*.16));
        petalTransform.updateMatrix();
        mesh.setMatrixAt(p,petalTransform.matrix);
      }
      bloom.add(mesh);
    }
    if (config.flower==='Lilies') {
      for (let j=0;j<6;j++) {
        const a = j*Math.PI/3;
        const tip = new T.Vector3(Math.cos(a)*.15,.29,Math.sin(a)*.15);
        line(bloom,[new T.Vector3(),tip.clone().multiplyScalar(.64),tip],.012,foliage);
        ellipsoid(bloom,pollen,tip.x,tip.y,tip.z,.044,.025,.031);
      }
    }
    line(base,[new T.Vector3(x*.12,-1.71,z*.15),new T.Vector3(x*.4,-.44,z*.3),bloom.position],.027,stalk);
    for(let j=0;j<2;j++) {
      const mesh = new T.Mesh(leaf,j ? foliage : sage);
      mesh.position.set(x*.78,.38+j*.34,z*.72);
      mesh.rotation.set(-.42,Math.PI/2-angle+j*2.7,-.13);
      mesh.scale.setScalar(.85+random()*.42);
      base.add(mesh);
    }
  }
  const tissue = [material('#fae5d7'),material('#edc4c3'),material('#fff0da'),material('#e8aeb7')];
  for (let j=0;j<6;j++) {
    const vertices:number[]=[], indices:number[]=[];
    for (let row=0;row<=13;row++) {
      const v=row/13;
      for(let col=0;col<=11;col++) {
        const u=col/11, angle=j*Math.PI/3+(u-.5)*1.62;
        const radius=.17+v*(.47+spread*.36)+Math.sin(u*Math.PI*3)*.09*v;
        const height=.40 + (1-Math.sin(angle))*.23 + Math.cos(u*Math.PI*2+j)*.19;
        vertices.push(Math.cos(angle)*radius,-1.8+v*(height+1.8),Math.sin(angle)*radius);
        if(row&&col){const n=row*12+col;indices.push(n,n-1,n-13,n,n-13,n-12);}
      }
    }
    const g=new T.BufferGeometry();
    g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
    g.setIndex(indices); g.computeVertexNormals();
    base.add(new T.Mesh(g,tissue[j%tissue.length]));
  }
  const accessory = new T.Group();
  accessory.position.set(.05,-.87,.54+spread*.16);
  base.add(accessory);
  const velvet = material('#ba466a');
  if(config.decoration==='A Ribbon') {
    const loop = new T.TorusGeometry(.22,.067,10,25);
    for(const sign of [-1,1]) {
      const mesh = new T.Mesh(loop,velvet);
      mesh.scale.set(1.15,.64,.66);
      mesh.position.set(sign*.22,.05,.025);
      mesh.rotation.z=sign*.35;
      accessory.add(mesh);
      const tail=new T.Mesh(petal(.53,.09,.05,.02,false),velvet);
      tail.rotation.set(1.22,0,sign*.38);
      accessory.add(tail);
    }
    ellipsoid(accessory,velvet,0,.015,.065,.115,.09,.06);
  } else if(config.decoration==='A Tiny Heart') {
    const heart = new T.Shape();
    heart.moveTo(0,-.25); heart.bezierCurveTo(-.09,-.13,-.45,.08,-.27,.25);
    heart.bezierCurveTo(-.17,.34,-.05,.27,0,.17);
    heart.bezierCurveTo(.05,.27,.17,.34,.27,.25);
    heart.bezierCurveTo(.45,.08,.09,-.13,0,-.25);
    accessory.add(new T.Mesh(new T.ExtrudeGeometry(heart,{depth:.055,bevelSize:.025,bevelThickness:.025,bevelSegments:3}),velvet));
  } else if(config.decoration==='A Little Teddy Bear') {
    const fur=material('#b78059'), muzzle=material('#f0caa0'), face=material('#402a2a');
    ellipsoid(accessory,fur,0,.02,.055,.21,.24,.13);
    ellipsoid(accessory,fur,0,.27,.08,.24,.20,.15);
    for(const sign of [-1,1]) {
      ellipsoid(accessory,fur,sign*.174,.42,.08,.083,.087,.069);
      ellipsoid(accessory,muzzle,sign*.174,.42,.13,.045,.051,.022);
      ellipsoid(accessory,fur,sign*.19,-.11,.115,.1,.11,.087);
      ellipsoid(accessory,fur,sign*.19,.065,.11,.092,.123,.073);
      ellipsoid(accessory,face,sign*.083,.30,.212,.025,.03,.016);
    }
    ellipsoid(accessory,muzzle,0,.207,.206,.103,.062,.055);
    ellipsoid(accessory,face,0,.232,.252,.043,.023,.016);
  } else {
    const envelope = new T.Mesh(new T.BoxGeometry(.65,.43,.046), material('#fff8e7'));
    const flap = new T.Shape();
    flap.moveTo(-.32,.21); flap.lineTo(.32,.21); flap.lineTo(0,-.02); flap.closePath();
    const face=new T.Mesh(new T.ShapeGeometry(flap),material('#ebbdc2'));
    face.position.z=.026;
    accessory.add(envelope,face);
    ellipsoid(accessory,velvet,0,-.02,.04,.063,.061,.018);
    accessory.rotation.z=-.18;
  }
  return {bouquet,blooms,base,accessory};
}
