'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function Core({state, lowPower=false}:{state:string,lowPower?:boolean}) {
 const mount=useRef<HTMLDivElement>(null); const stateRef=useRef(state); stateRef.current=state;
 useEffect(()=>{ const el=mount.current; if(!el)return;
  const scene=new THREE.Scene(); const camera=new THREE.PerspectiveCamera(38,1,.1,100); camera.position.z=7.6;
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'}); renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5)); renderer.setClearColor(0x000000,0); el.appendChild(renderer.domElement);
  const group=new THREE.Group(); scene.add(group);
  const sphere=new THREE.Mesh(new THREE.SphereGeometry(1.52,48,32),new THREE.MeshBasicMaterial({color:0x06151f,transparent:true,opacity:.32,side:THREE.DoubleSide})); group.add(sphere);
  const wire=new THREE.Mesh(new THREE.IcosahedronGeometry(1.54,3),new THREE.MeshBasicMaterial({color:0x258ba6,wireframe:true,transparent:true,opacity:.065})); group.add(wire);
  function points(count:number,radius:number,color:number,size:number,opacity:number){const positions=[]; for(let i=0;i<count;i++){const y=1-(i/(count-1))*2; const rad=Math.sqrt(1-y*y); const theta=i*Math.PI*(3-Math.sqrt(5)); const r=radius+(Math.random()-.5)*.07; positions.push(Math.cos(theta)*rad*r,y*r,Math.sin(theta)*rad*r);} const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3)); const p=new THREE.Points(geometry,new THREE.PointsMaterial({color,size,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false}));group.add(p);return p;}
  points(lowPower?650:2200,1.53,0x6bdcf0,.014,.8); points(lowPower?350:1100,1.3,0x197ca3,.012,.55);
  const rings:THREE.LineLoop[]=[]; for(let j=0;j<8;j++){const coords=[]; const radius=1.63+j*.035; for(let i=0;i<180;i++){const a=i/180*Math.PI*2;coords.push(new THREE.Vector3(Math.cos(a)*radius,Math.sin(a)*radius,0));} const ring=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(coords),new THREE.LineBasicMaterial({color:j%2?0x2d9fbd:0x5ad9f0,transparent:true,opacity:j<3?.29:.12,blending:THREE.AdditiveBlending}));ring.rotation.set(.45+j*.47,.25+j*.35,j*.4);group.add(ring);rings.push(ring);}
  const stars=[]; for(let i=0;i<(lowPower?70:190);i++){const r=1.8+Math.random()*1.1,a=Math.random()*Math.PI*2; stars.push(Math.cos(a)*r,(Math.random()-.5)*3.6,Math.sin(a)*r);} const starGeo=new THREE.BufferGeometry(); starGeo.setAttribute('position',new THREE.Float32BufferAttribute(stars,3)); const dust=new THREE.Points(starGeo,new THREE.PointsMaterial({color:0x3fc8e5,size:.018,transparent:true,opacity:.5,blending:THREE.AdditiveBlending}));scene.add(dust);
  const resize=()=>{const w=el.clientWidth,h=el.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();};resize();window.addEventListener('resize',resize);
  let frame=0;const clock=new THREE.Clock();const animate=()=>{frame=requestAnimationFrame(animate);const t=clock.getElapsedTime();const active=stateRef.current==='thinking'||stateRef.current==='speaking'||stateRef.current==='listening'; group.rotation.y=t*(active?.16:.065);group.rotation.z=Math.sin(t*.24)*.06;const scale=1+Math.sin(t*(active?3:1.1))*(active?.035:.012);group.scale.setScalar(scale);rings.forEach((r,i)=>{r.rotation.z+=.0008*(i%2?1:-1)*(active?3:1);});dust.rotation.y=t*.025;renderer.render(scene,camera);};animate();
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('resize',resize);renderer.dispose();scene.traverse(o=>{if(o instanceof THREE.Mesh || o instanceof THREE.Points || o instanceof THREE.Line){o.geometry.dispose(); if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose();}});el.removeChild(renderer.domElement);};
 },[lowPower]); return <div className="core-canvas" ref={mount} aria-label={`AI core: ${state}`}/>;
}
