'use client';
import {useEffect,useRef,useState} from 'react';
import * as T from 'three';
import {makeBouquet} from '../lib/bouquet';
import {colors,type Config} from '../lib/gift';

export default function Bouquet({config,assembling=false}:{config:Config;assembling?:boolean}) {
  const container=useRef<HTMLDivElement>(null);
  const rotation=useRef({value:.05,target:.05});
  const drag=useRef<{id:number;x:number}|null>(null);
  const [fallback,setFallback]=useState(false);
  useEffect(()=>{
    const el=container.current;
    if(!el) return;
    let renderer:T.WebGLRenderer;
    try {renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}
    catch {queueMicrotask(()=>setFallback(true));return;}
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.65));
    renderer.setClearColor(0,0);
    renderer.outputColorSpace=T.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    const scene=new T.Scene();
    const camera=new T.PerspectiveCamera(31,1,.1,50);
    camera.position.set(0,3,8.6);
    camera.lookAt(0,.02,0);
    const sky=new T.HemisphereLight(0xfff4ec,0xb990a2,2.0);
    const key=new T.DirectionalLight(0xffebdf,2.2);
    key.position.set(-4,5,4);
    const rim=new T.DirectionalLight(0xffdff2,1.0);
    rim.position.set(3,1,-4);
    scene.add(sky,key,rim);
    const {bouquet,blooms,base,accessory}=makeBouquet(config);
    scene.add(bouquet);
    let frame=0, dirty=true;
    const resize=new ResizeObserver(()=>{
      const {clientWidth:w,clientHeight:h}=el;
      if(!w || !h) return;
      camera.aspect=w/h;
      camera.fov=camera.aspect<.9 ? 37 : 31;
      camera.updateProjectionMatrix();
      renderer.setSize(w,h);
      dirty=true;
    });
    resize.observe(el);
    const motion=matchMedia('(prefers-reduced-motion: reduce)');
    const start=performance.now();
    function draw(now:number) {
      const elapsed=now-start;
      const active=assembling && !motion.matches && elapsed<1550;
      const scale=(raw:number)=>T.MathUtils.smoothstep(raw,0,1);
      blooms.forEach((bloom,i)=>bloom.scale.setScalar(active ? scale((elapsed-i*36)/540) : 1));
      base.scale.setScalar(active ? scale((elapsed-450)/760) : 1);
      accessory.scale.setScalar(active ? scale((elapsed-900)/520) : 1);
      const delta=rotation.current.target-rotation.current.value;
      rotation.current.value+=motion.matches || Math.abs(delta)<.002 ? delta : delta*.19;
      if(active || dirty || Math.abs(delta)>0) {
        bouquet.rotation.y=rotation.current.value+(active ? .45*(1-elapsed/1550) : 0);
        renderer.render(scene,camera);
      }
      dirty=active;
      frame=requestAnimationFrame(draw);
    }
    frame=requestAnimationFrame(draw);
    const lost=(event:Event)=>{event.preventDefault();setFallback(true);};
    renderer.domElement.addEventListener('webglcontextlost',lost);
    return ()=>{
      cancelAnimationFrame(frame);resize.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost',lost);
      const geometries=new Set<T.BufferGeometry>(), materials=new Set<T.Material>();
      scene.traverse(obj=>{
        if(obj instanceof T.Mesh){
          geometries.add(obj.geometry);
          for(const mat of [obj.material].flat()) materials.add(mat);
          if(obj instanceof T.InstancedMesh) obj.dispose();
        }
      });
      geometries.forEach(g=>g.dispose()); materials.forEach(m=>m.dispose());
      renderer.dispose();renderer.domElement.remove();
    };
  },[config,assembling]);
  return <div className="bouquet-view">
    <div className="canvas" ref={container} aria-label={`${config.count} ${config.color.toLowerCase()} ${config.flower.toLowerCase()} with ${config.decoration.toLowerCase()}`}
      onPointerDown={e=>{
        if(assembling || fallback || e.button!==0) return;
        e.currentTarget.setPointerCapture(e.pointerId); drag.current={id:e.pointerId,x:e.clientX};
      }} onPointerMove={e=>{
        if(drag.current?.id!==e.pointerId) return;
        rotation.current.target+=(e.clientX-drag.current.x)*.017; drag.current.x=e.clientX;
      }} onLostPointerCapture={()=>{drag.current=null;}} />
    {fallback && <div className="bouquet-fallback" role="status"><span style={{color:colors[config.color]}}>✿</span><strong>{config.count} {config.color.toLowerCase()} {config.flower.toLowerCase()}</strong><span>{config.decoration}</span><small>3D is unavailable on this device.</small></div>}
    {!assembling && !fallback && <div className="rotate"><button type="button" aria-label="Rotate bouquet left" onClick={()=>rotation.current.target-=.6}>↶</button><span>Drag to turn</span><button type="button" aria-label="Rotate bouquet right" onClick={()=>rotation.current.target+=.6}>↷</button></div>}
  </div>;
}
