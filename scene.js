// Photoreal PBR jar: lacquered wood base, brass plate, leather collar with chrome studs,
// reflective glass cylinder. Orthographic camera tilted so 3D lines up with the 2D layers (px units).
import * as THREE from './vendor/three.module.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

const TILT=6*Math.PI/180, C=Math.cos(TILT), S=Math.sin(TILT);
const Y=py=>(240-py)/C;                     // screen py of an axis point -> world y
const OX=-170;                              // world x = px - 170

const canvas=document.getElementById('gl');
const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,premultipliedAlpha:true});
renderer.setPixelRatio(window.devicePixelRatio||1); renderer.setSize(340,480,false);
renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.05;
renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.setClearColor(0x000000,0);

const scene=new THREE.Scene();
const pmrem=new THREE.PMREMGenerator(renderer);
scene.environment=pmrem.fromScene(new RoomEnvironment(),0.02).texture;
scene.environmentIntensity=0.8;
const cam=new THREE.OrthographicCamera(-170,170,240,-240,1,3000);
cam.position.set(0,1000*S,1000*C); cam.lookAt(0,0,0);

const key=new THREE.DirectionalLight(0xfff0dd,2.2); key.position.set(-300,500,400); scene.add(key);
const rim=new THREE.DirectionalLight(0xbfd8ff,0.9); rim.position.set(350,200,-200); scene.add(rim);

// ---------- procedural textures ----------
function rnd(seed){ let s=seed; return ()=>((s=Math.imul(s^s>>>15,2246822519)>>>0)/4294967296); }
function woodTex(){
  const c=document.createElement('canvas'); c.width=1024; c.height=512; const g=c.getContext('2d'), r=rnd(7);
  g.fillStyle='#7b2a14'; g.fillRect(0,0,c.width,c.height);
  for(let i=0;i<700;i++){                       // grain lines along the vertical (v) axis
    const x0=r()*c.width, w=0.5+r()*2.2, a=0.05+r()*0.22, dark=r()<0.65;
    g.strokeStyle=dark?`rgba(40,10,3,${a})`:`rgba(210,110,60,${a*0.7})`; g.lineWidth=w; g.beginPath();
    const ph=r()*6.28, amp=2+r()*7, fr=0.004+r()*0.01;
    for(let y=0;y<=c.height;y+=8){ const x=x0+Math.sin(y*fr+ph)*amp; y?g.lineTo(x,y):g.moveTo(x,y); }
    g.stroke();
  }
  for(let i=0;i<40;i++){                        // broad tonal bands
    const x=r()*c.width, w=20+r()*80; const gr=g.createLinearGradient(x,0,x+w,0);
    gr.addColorStop(0,'rgba(0,0,0,0)'); gr.addColorStop(.5,r()<.5?'rgba(30,5,0,.18)':'rgba(190,80,40,.12)'); gr.addColorStop(1,'rgba(0,0,0,0)');
    g.fillStyle=gr; g.fillRect(x,0,w,c.height);
  }
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; t.wrapS=THREE.RepeatWrapping; t.offset.x=0.5; t.anisotropy=8; return t;
}
function noiseTex(n,amt){
  const c=document.createElement('canvas'); c.width=c.height=256; const g=c.getContext('2d'), r=rnd(n);
  const im=g.createImageData(256,256); for(let i=0;i<im.data.length;i+=4){ const v=128+(r()-0.5)*amt; im.data[i]=im.data[i+1]=im.data[i+2]=v; im.data[i+3]=255; }
  g.putImageData(im,0,0); const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; return t;
}
function plateTex(){
  const W=1024,H=160, mk=(f)=>{const c=document.createElement('canvas'); c.width=W; c.height=H; f(c.getContext('2d')); return c;};
  const rr=(g,pad)=>{ g.beginPath(); g.roundRect(pad,pad,W-2*pad,H-2*pad,(H-2*pad)/2); };
  const col=mk(g=>{
    const gr=g.createLinearGradient(0,0,0,H); gr.addColorStop(0,'#ffe9a8'); gr.addColorStop(.45,'#d49a3a'); gr.addColorStop(1,'#8a5517');
    g.fillStyle=gr; rr(g,2); g.fill();
    g.fillStyle='rgba(255,255,255,.28)'; g.beginPath(); g.roundRect(30,14,W-60,34,17); g.fill();
    g.strokeStyle='rgba(90,50,10,.55)'; g.lineWidth=6; rr(g,12); g.stroke();
    g.font='italic 92px Georgia, serif'; g.textAlign='center'; g.textBaseline='middle';
    g.fillStyle='rgba(60,25,5,.85)'; g.fillText('Eric',W/2,H/2+4); g.fillStyle='rgba(255,230,170,.35)'; g.fillText('Eric',W/2-2,H/2+1);
  });
  const alpha=mk(g=>{ g.fillStyle='#000'; g.fillRect(0,0,W,H); g.fillStyle='#fff'; rr(g,2); g.fill(); });
  const bump=mk(g=>{ g.fillStyle='#808080'; g.fillRect(0,0,W,H); g.strokeStyle='#fff'; g.lineWidth=8; rr(g,12); g.stroke();
    g.font='italic 92px Georgia, serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillStyle='#000'; g.fillText('Eric',W/2,H/2+4); });
  const t=c=>{const x=new THREE.CanvasTexture(c); x.anisotropy=8; return x;};
  const m=t(col); m.colorSpace=THREE.SRGBColorSpace; return {map:m,alphaMap:t(alpha),bumpMap:t(bump)};
}

// ---------- materials ----------
const wood=new THREE.MeshPhysicalMaterial({map:woodTex(),roughness:0.45,metalness:0,clearcoat:0.55,clearcoatRoughness:0.18,bumpMap:noiseTex(3,60),bumpScale:0.4});
const brassT=plateTex();
const brass=new THREE.MeshStandardMaterial({color:0xffffff,map:brassT.map,alphaMap:brassT.alphaMap,alphaTest:0.5,bumpMap:brassT.bumpMap,bumpScale:2.2,metalness:1,roughness:0.28});
const leatherBump=noiseTex(11,120); leatherBump.repeat.set(6,1);
const leather=new THREE.MeshPhysicalMaterial({color:0x151515,roughness:0.5,metalness:0,sheen:0.4,sheenRoughness:0.5,bumpMap:leatherBump,bumpScale:1.2,clearcoat:0.25,clearcoatRoughness:0.4,side:THREE.DoubleSide});
const chrome=new THREE.MeshStandardMaterial({color:0xf2f2f2,metalness:1,roughness:0.12});
const pedMat=new THREE.MeshStandardMaterial({color:0x2a2a2d,metalness:0.85,roughness:0.38});
function glassStreaks(){
  const c=document.createElement('canvas'); c.width=1024; c.height=256; const g=c.getContext('2d');
  g.fillStyle='#000'; g.fillRect(0,0,1024,256);
  const band=(deg,w,a)=>{ for(const off of [0,1024,-1024]){ const x=((deg%360)+360)%360/360*1024+off; const gr=g.createLinearGradient(x-w,0,x+w,0);
    gr.addColorStop(0,'rgba(255,255,255,0)'); gr.addColorStop(.5,`rgba(255,255,255,${a})`); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(x-w,0,2*w,256); } };
  band(-58,34,.55); band(-70,6,.9); band(52,18,.28); band(76,5,.55); band(-84,4,.7); band(18,60,.05);
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; t.wrapS=THREE.RepeatWrapping; return t;
}
const glassMat=new THREE.MeshStandardMaterial({color:0x000000,emissive:0xffffff,emissiveMap:glassStreaks(),emissiveIntensity:0.9,metalness:0,roughness:0.015,envMapIntensity:1.5,side:THREE.DoubleSide,
  transparent:true,depthWrite:false,blending:THREE.CustomBlending,blendEquation:THREE.AddEquation,
  blendSrc:THREE.OneFactor,blendDst:THREE.OneFactor,blendSrcAlpha:THREE.ZeroFactor,blendDstAlpha:THREE.OneFactor});
const glassRim=glassMat.clone(); glassRim.color=new THREE.Color(0x303030); glassRim.roughness=0.08;

// ---------- geometry (everything on the jar axis x = 0) ----------
const jar=new THREE.Group(); scene.add(jar);
const yBase=Y(402);

// wooden base: lathed profile with bevels and a groove for the glass
const prof=[[0,-52],[148,-52],[157,-49],[161,-42],[162,-10],[160,-3],[154,0],[146,0],[143,-3],[139,-3],[137,-1],[0,-1]]
  .map(([x,y])=>new THREE.Vector2(x,y));
const base=new THREE.Mesh(new THREE.LatheGeometry(prof,160),wood); base.position.y=yBase; jar.add(base);

// brass nameplate on a curved patch of the base side
const PR=162.6, PA=2*Math.asin(88/PR);
const plate=new THREE.Mesh(new THREE.CylinderGeometry(PR,PR,30,64,1,true,-PA/2,PA),brass);
plate.position.y=yBase-27; jar.add(plate);

// pedestal + leather collar (front half only; the video neck covers the back)
const yCollar=Y(336);
const ped=new THREE.Mesh(new THREE.CylinderGeometry(48,50,yCollar-yBase,64),pedMat); ped.position.y=(yCollar+yBase)/2; jar.add(ped);
const collar=new THREE.Mesh(new THREE.CylinderGeometry(66,67,32,64,1,true,-Math.PI/2,Math.PI),leather); collar.position.set(2,yCollar,0); jar.add(collar);
const stud=new THREE.SphereGeometry(4.3,24,16);
for(let a=-80;a<=80;a+=20){ const t=a*Math.PI/180; const s=new THREE.Mesh(stud,chrome); s.scale.z=0.7;
  s.position.set(2+Math.sin(t)*67.5,yCollar,Math.cos(t)*67.5); s.rotation.y=t; jar.add(s); }

// glass cylinder (additive reflection-only shader => no darkening of what is inside)
const yTop=Y(44), yGl=Y(403);
const glass=new THREE.Mesh(new THREE.CylinderGeometry(140,140,yTop-yGl,128,1,true),glassMat); glass.position.y=(yTop+yGl)/2; jar.add(glass);
for(const y of [yTop,yGl]){ const t=new THREE.Mesh(new THREE.TorusGeometry(140,2.4,12,128),glassRim); t.rotation.x=Math.PI/2; t.position.y=y; jar.add(t); }

renderer.render(scene,cam);
