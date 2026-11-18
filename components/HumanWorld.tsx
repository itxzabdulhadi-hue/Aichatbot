'use client';
import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

type Shot='close'|'medium'|'full';
export default function HumanWorld({status,shot,modelUrl,lowPower}:{status:string,shot:Shot,modelUrl:string,lowPower:boolean}){
 const host=useRef<HTMLDivElement>(null), state=useRef(status), view=useRef(shot); const [error,setError]=useState('');state.current=status;view.current=shot;
 useEffect(()=>{const el=host.current;if(!el)return;setError('');let disposed=false, frame=0;
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x171d20);scene.fog=new THREE.Fog(0x171d20,8,19);
 const camera=new THREE.PerspectiveCamera(37,1,.1,60);camera.position.set(0,1.52,3.9);
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:lowPower?'low-power':'high-performance'});renderer.setPixelRatio(Math.min(window.devicePixelRatio,lowPower?1:1.5));renderer.shadowMap.enabled=!lowPower;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;el.appendChild(renderer.domElement);
 // A neutral environment supplies broad, indirect reflections to the physical materials.
 const pmrem=new THREE.PMREMGenerator(renderer); const room=new RoomEnvironment(); const envMap=pmrem.fromScene(room,.04); scene.environment=envMap.texture; scene.environmentIntensity=.32; room.dispose();pmrem.dispose();
 let composer:EffectComposer|null=null; let ao:SSAOPass|null=null; if(!lowPower){composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));ao=new SSAOPass(scene,camera,1,1);ao.kernelRadius=7;ao.minDistance=.002;ao.maxDistance=.13;composer.addPass(ao);composer.addPass(new OutputPass());}
 scene.add(new THREE.HemisphereLight(0xd6e3df,0x5b4c40,1.25)); const key=new THREE.DirectionalLight(0xffe9d4,2.0);key.position.set(-3,5,4);key.castShadow=true;key.shadow.mapSize.set(lowPower?512:2048,lowPower?512:2048);key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=5;key.shadow.camera.bottom=-5;key.shadow.bias=-.00015;key.shadow.normalBias=.015;key.shadow.radius=3;scene.add(key);const fill=new THREE.DirectionalLight(0xb5d0d0,.65);fill.position.set(3,2,-2);scene.add(fill);
 const mat=(color:number,roughness=.8,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});const wall=mat(0x535754),floorMat=mat(0x5e5045),wood=mat(0x493a31),dark=mat(0x242b2b),fabric=mat(0x8b8373),brass=mat(0xa98d61,.35,.7),leaf=mat(0x3c584a);
 function box(w:number,h:number,d:number,x:number,y:number,z:number,m:THREE.Material,shadow=true){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=shadow;o.receiveShadow=true;scene.add(o);return o;}
 box(18,.12,16,0,-.07,0,floorMat);box(18,6,.15,0,3,-3.5,wall);box(.15,6,16,-5,3,1,wall);box(.15,6,16,5,3,1,wall);
 // Wood floor seams, architectural trim and a softly lit window.
 for(let i=-10;i<=10;i++)box(.012,.003,12,i*.48,.002,1,wood,false);
 box(18,.12,.12,0,.12,-3.35,wood);box(18,.1,.1,0,3.4,-3.35,dark);
 box(3.2,2.65,.08,-2.95,2,-3.36,dark);box(3,2.45,.08,-2.95,2,-3.29,mat(0x91aaa5,.7));box(.055,2.45,.06,-2.95,2,-3.2,wood);box(3,.06,.06,-2.95,2,-3.2,wood);
 // A restrained sitting area gives the character a physical setting.
 box(2.8,.36,.85,2.9,.43,-2.55,fabric);box(2.8,.86,.24,2.9,.95,-2.92,fabric);box(.2,.7,.95,1.56,.73,-2.52,fabric);box(.2,.7,.95,4.24,.73,-2.52,fabric);
 for(const x of [1.75,4.05]) for(const z of [-2.83,-2.25]) box(.09,.25,.09,x,.12,z,wood);
 box(1.05,.08,.7,1.05,.5,-1.3,wood);for(const x of [.62,1.48])for(const z of [-1.55,-1.05])box(.045,.5,.045,x,.25,z,wood);
 box(.13,1.65,.13,-4.1,.82,-2.4,brass);const shade=new THREE.Mesh(new THREE.ConeGeometry(.4,.48,32,1,true),mat(0xe2d1ad));shade.position.set(-4.1,1.75,-2.4);shade.rotation.z=Math.PI;scene.add(shade);const lamp=new THREE.PointLight(0xffd39b,10,4);lamp.position.set(-4.1,1.5,-2.35);scene.add(lamp);
 box(.55,.55,.55,4.3,.28,-1.3,mat(0x6b6558));for(let i=0;i<9;i++){const stem=new THREE.Mesh(new THREE.ConeGeometry(.16,.8,7),leaf);stem.position.set(4.3+Math.sin(i*2.4)*.23,.9+Math.cos(i)*.1,-1.3+Math.cos(i*2.4)*.2);stem.rotation.z=Math.sin(i)*.35;scene.add(stem);}
 // A soft contact shadow anchors the character to the floor even in reduced quality mode.
 const shadowCanvas=document.createElement('canvas');shadowCanvas.width=128;shadowCanvas.height=128;const ctx=shadowCanvas.getContext('2d');if(ctx){const gradient=ctx.createRadialGradient(64,64,5,64,64,63);gradient.addColorStop(0,'rgba(10,10,10,0.35)');gradient.addColorStop(.45,'rgba(10,10,10,0.16)');gradient.addColorStop(1,'rgba(10,10,10,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);}const contactTexture=new THREE.CanvasTexture(shadowCanvas);const contact=new THREE.Mesh(new THREE.PlaneGeometry(1.15,.75),new THREE.MeshBasicMaterial({map:contactTexture,transparent:true,depthWrite:false}));contact.rotation.x=-Math.PI/2;contact.position.y=.006;scene.add(contact);
 let character:THREE.Group|null=null, neck:THREE.Object3D|undefined,spine:THREE.Object3D|undefined,left:THREE.Object3D|undefined,right:THREE.Object3D|undefined,hips:THREE.Object3D|undefined,leftShoulder:THREE.Object3D|undefined,rightShoulder:THREE.Object3D|undefined; let groundY=0;const original=new Map<THREE.Object3D,THREE.Euler>();
 const loader=new GLTFLoader();loader.load(modelUrl||'/models/michelle.glb',gltf=>{if(disposed)return;character=gltf.scene;const bounds=new THREE.Box3().setFromObject(character);const size=bounds.getSize(new THREE.Vector3());if(size.y>0){const scale=1.68/size.y;character.scale.multiplyScalar(scale);const newBounds=new THREE.Box3().setFromObject(character);character.position.y-=newBounds.min.y;character.position.x-=newBounds.getCenter(new THREE.Vector3()).x;}groundY=character.position.y;
 character.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true; if(!modelUrl){const materials=Array.isArray(o.material)?o.material:[o.material];for(const material of materials){if(material instanceof THREE.MeshStandardMaterial){/* The bundled material is one combined body/clothing mesh; metalness on human skin creates plastic highlights. */ material.metalness=0;material.roughness=Math.max(material.roughness,.8);material.envMapIntensity=.45;material.needsUpdate=true;}}}}const n=o.name.toLowerCase();if(n.includes('neck')&&!neck)neck=o;if((n.endsWith('spine2')||n.endsWith('chest'))&&!spine)spine=o;if(n.endsWith('leftarm'))left=o;if(n.endsWith('rightarm'))right=o;if(n.endsWith('hips'))hips=o;if(n.endsWith('leftshoulder'))leftShoulder=o;if(n.endsWith('rightshoulder'))rightShoulder=o;}); for(const bone of [neck,spine,left,right,hips,leftShoulder,rightShoulder])if(bone)original.set(bone,bone.rotation.clone());scene.add(character);},undefined,()=>{if(!disposed)setError('Could not load the 3D character. Try a valid GLB file.');});
 const resize=()=>{const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;renderer.setSize(w,h);composer?.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();};const observer=new ResizeObserver(resize);observer.observe(el);resize();const clock=new THREE.Clock();const look=new THREE.Vector3(0,1.37,0),target=new THREE.Vector3();let activity=1,thought=0,lastTime=0;
 function animate(){frame=requestAnimationFrame(animate);const t=clock.getElapsedTime();const shotTarget=view.current==='close'?{y:1.56,z:1.65,look:1.52}:view.current==='full'?{y:1.2,z:5.4,look:.95}:{y:1.45,z:3.45,look:1.27};camera.position.lerp(target.set(Math.sin(t*.15)*.025,shotTarget.y,shotTarget.z),.035);look.lerp(target.set(0,shotTarget.look,0),.035);camera.lookAt(look);
 if(character){const dt=Math.min(t-lastTime,.05);lastTime=t;const ease=1-Math.exp(-dt*2);activity+=((state.current==='speaking'?1.4:state.current==='thinking'?.75:1)-activity)*ease;thought+=((state.current==='thinking'?1:0)-thought)*ease;
 // Layer independent low-frequency motions instead of a single synchronized loop.
 const breath=Math.sin(t*.91)+.16*Math.sin(t*.31), sway=Math.sin(t*.29)+.23*Math.sin(t*.11+1.4);character.position.y=groundY+breath*.0015;
 if(neck&&original.has(neck)){const base=original.get(neck)!;neck.rotation.x=base.x+Math.sin(t*.52)*.014+thought*.025;neck.rotation.z=base.z+(Math.sin(t*.35)+.2*Math.sin(t*.17))* .016*activity;}
 if(spine&&original.has(spine)){const base=original.get(spine)!;spine.rotation.x=base.x+breath*.007;spine.rotation.z=base.z+sway*.006;}
 if(hips&&original.has(hips)){const base=original.get(hips)!;hips.rotation.z=base.z+sway*.006;}
 if(leftShoulder&&original.has(leftShoulder)){const base=original.get(leftShoulder)!;leftShoulder.rotation.z=base.z+breath*.003;}
 if(rightShoulder&&original.has(rightShoulder)){const base=original.get(rightShoulder)!;rightShoulder.rotation.z=base.z-breath*.003;}
 if(left&&original.has(left)){const base=original.get(left)!;left.rotation.z=base.z-1.1+(Math.sin(t*.55)+.2*Math.sin(t*.21))*.012*activity;}
 if(right&&original.has(right)){const base=original.get(right)!;right.rotation.z=base.z+1.1-(Math.sin(t*.47+.4)+.2*Math.sin(t*.19))*.012*activity;}}

 if(composer)composer.render();else renderer.render(scene,camera);}animate();return()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(m=>m.dispose());}});contactTexture.dispose();envMap.dispose();composer?.dispose();renderer.dispose();el.removeChild(renderer.domElement);};
 },[modelUrl,lowPower]);return <div ref={host} className="world-canvas" role="img" aria-label={`Interactive 3D room and human character, ${status}`} >{error&&<div className="world-error">{error}</div>}</div>;
}
