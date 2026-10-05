import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

const root=document.getElementById('game');
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x8bb7d2);
scene.fog=new THREE.Fog(0x8bb7d2,38,105);
const camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.1,180);
camera.position.set(0,15,18);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;root.appendChild(renderer.domElement);
const hemi=new THREE.HemisphereLight(0xdbeeff,0x334455,2.1);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff1d0,3);sun.position.set(-20,35,10);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);

let S=JSON.parse(localStorage.getItem('eurolife-3d')||'null')||{name:'Alex',money:1200,energy:82,mood:68,day:1,job:'',home:'Apartment 4B',friends:{Amelie:15,Luca:0},hair:0,skin:0};
const save=()=>localStorage.setItem('eurolife-3d',JSON.stringify(S));
const money=n=>'€'+Math.max(0,Math.round(n)).toLocaleString();
const toast=t=>{const e=document.getElementById('toast');e.textContent=t;e.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>e.classList.remove('show'),2200)};
const ui=()=>{moneyEl.textContent=money(S.money);energyEl.textContent=S.energy;moodEl.textContent=S.mood;dayEl.textContent=S.day};
const moneyEl=document.getElementById('money'),energyEl=document.getElementById('energy'),moodEl=document.getElementById('mood'),dayEl=document.getElementById('day');

function mat(c,rough=1){return new THREE.MeshStandardMaterial({color:c,roughness:rough})}
const road=mat(0x303841),sidewalk=mat(0xb7b3aa),brick=mat(0xc59b82),cream=mat(0xd9c7a9),roof=mat(0x39404b),window=mat(0x31566b),green=mat(0x4d7657),dark=mat(0x202832),red=mat(0x9b3f35);
function box(w,h,d,m,x,y,z){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;scene.add(o);return o}
function cyl(r,h,m,x,y,z,seg=10){const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,seg),m);o.position.set(x,y,z);o.castShadow=true;scene.add(o);return o}

box(90,.25,90,sidewalk,0,-.15,0);
for(let x=-40;x<=40;x+=16)box(5,.08,90,road,x,-.02,0);
for(let z=-40;z<=40;z+=16)box(90,.08,5,road,0,-.02,z);
for(let x=-40;x<=40;x+=16)for(let z=-40;z<=40;z+=16){for(const s of [-1,1]){box(1.2,.16,4,sidewalk,x+s*3.15,.02,z);box(4,.16,1.2,sidewalk,x,z+s*3.15)}}
function building(x,z,w,d,h,m,roofType='flat'){
 box(w,h,d,m,x,h/2,z); box(w+.08,.16,d+.08,roof,x,h+.08,z);
 for(let xx=-w/2+1.2;xx<w/2-.3;xx+=1.7)for(let yy=1.4;yy<h-.5;yy+=2.2){
   const sideFront=new THREE.Mesh(new THREE.BoxGeometry(.72,.72,.035),window);sideFront.position.set(x+xx,yy,z-d/2-.03);scene.add(sideFront);
   const sideBack=sideFront.clone();sideBack.position.z=z+d/2+.03;scene.add(sideBack);
 }
}
building(-30,-30,11,10,8,brick);building(-14,-30,11,10,11,cream);building(30,-30,11,10,9,brick);building(30,-14,11,10,12,cream);
building(-30,30,11,10,10,cream);building(-14,30,11,10,8,brick);building(30,30,11,10,11,cream);
function tree(x,z){cyl(.22,2, dark,x,1,z);cyl(1.35,2.4,green,x,3,z,12);cyl(.9,1.6,green,x+.3,4.1,z+.2,12)}
for(const p of [[-11,-10],[-11,10],[11,-10],[11,10],[-27,-7],[-27,9],[27,-7],[27,9]])tree(...p);
function lamp(x,z){cyl(.07,2.7,dark,x,1.35,z);cyl(.22,.12,mat(0xffd27d),x,2.72,z)}
for(const p of [[-5,-7],[-5,7],[5,-7],[5,7]])lamp(...p);

function sign(text,x,z,color=0x263d52){const c=document.createElement('canvas');c.width=512;c.height=128;const q=c.getContext('2d');q.fillStyle='#102033';q.fillRect(0,0,512,128);q.fillStyle='#fff';q.font='bold 42px sans-serif';q.textAlign='center';q.fillText(text,256,78);const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true}));sp.scale.set(6,1.5,1);sp.position.set(x,5,z);scene.add(sp)}
sign('CAFÉ PARISIEN',-8,-8);sign('METRO • ABBESSES',8,8);sign('APPARTMENT 4B',-8,8);
function car(x,z,c){const b=box(2.4,.65,.95,mat(c),x,.42,z);box(1.1,.45,.8,mat(c),x,.85,z);for(const dx of [-.75,.75])for(const dz of [-.42,.42])cyl(.2,.15,dark,x+dx,.25,z+dz,12).rotation.z=Math.PI/2}
car(-8,-2,0x3b536b);car(8,-2,0x9a473c);car(2,24,0xe0b642);

const player=new THREE.Group();scene.add(player);player.position.set(0,0,0);
const body= new THREE.Mesh(new THREE.CapsuleGeometry(.42,1.0,5,10),mat(0x345d82));body.position.y=1.05;body.castShadow=true;player.add(body);
const head=new THREE.Mesh(new THREE.SphereGeometry(.42,14,10),mat([0xb87a55,0x7c4d36,0xe0a07c][S.skin]));head.position.y=1.9;head.castShadow=true;player.add(head);
const hair=new THREE.Mesh(new THREE.SphereGeometry(.44,14,8,0,Math.PI*2,0,Math.PI*.48),mat([0x241c19,0x5b3622,0xbda06c][S.hair]));hair.position.y=2.02;player.add(hair);
const shadow=new THREE.Mesh(new THREE.CircleGeometry(.55,20),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.25}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.02;player.add(shadow);

const npcs=[];
function npc(name,x,z,c,pace){const g=new THREE.Group();g.position.set(x,0,z);const b=new THREE.Mesh(new THREE.CapsuleGeometry(.36,.85,4,8),mat(c));b.position.y=.9;b.castShadow=true;g.add(b);const h=new THREE.Mesh(new THREE.SphereGeometry(.35,12,8),mat(0xc58b68));h.position.y=1.65;g.add(h);scene.add(g);npcs.push({g,name,origin:new THREE.Vector3(x,0,z),t:Math.random()*8,pace})}
npc('Amélie',-3,-9,0xa75c74,.45);npc('Noah',4,-8,0x527b68,.38);npc('Luca',-7,5,0x735f9c,.32);npc('Mila',7,7,0x9d713c,.42);npc('Sofia',-20,0,0x496e91,.35);

const interactables=[
 {name:'Café Parisien',pos:new THREE.Vector3(-8,0,-8),action:()=>work()},
 {name:'Apartment 4B',pos:new THREE.Vector3(-8,0,8),action:()=>sleep()},
 {name:'Metro Abbesses',pos:new THREE.Vector3(8,0,8),action:()=>metro()},
 {name:'Amélie',pos:new THREE.Vector3(-3,0,-9),action:()=>meet('Amélie')},
 {name:'Luca',pos:new THREE.Vector3(-7,0,5),action:()=>meet('Luca')},
];
let near=null;
function dist(a,b){return Math.hypot(a.x-b.x,a.z-b.z)}
function work(){if(S.energy<20){toast('Too tired for a shift. Rest or eat first.');return}const pay=125+Math.floor(Math.random()*65);S.money+=pay;S.energy-=20;S.mood=Math.max(0,S.mood-2);S.day++;S.job='Café worker';save();ui();toast('Shift complete: +'+money(pay)+' 💶');}
function sleep(){S.day++;S.money=Math.max(0,S.money-38);S.energy=Math.min(100,S.energy+55);S.mood=Math.min(100,S.mood+12);save();ui();toast('You slept well. New day in Paris.');}
function eat(){if(S.money<12){toast('Not enough money.');return}S.money-=12;S.energy=Math.min(100,S.energy+10);S.mood=Math.min(100,S.mood+8);save();ui();toast('Fresh pastry and coffee. +energy +mood');}
function meet(n){S.energy=Math.max(0,S.energy-5);S.mood=Math.min(100,S.mood+12);S.friends[n]=Math.min(100,(S.friends[n]||0)+15);save();ui();toast(n+' enjoyed talking with you. ❤️');}
function metro(){showMetro()}
function interact(){if(near)near.action();else toast('Walk closer to a café, apartment, metro or person.')}
function showMetro(){openModal('<h2>🚇 Paris Metro</h2><p>Choose your next destination. Travel will be expanded into a full Europe network.</p><button class="btn gold wide" onclick="closeModal();toast(\'Next city expansion: London 🇬🇧\')">Stay in Paris</button><button class="btn wide" onclick="closeModal();toast(\'London is coming in the next city build.\')">🇬🇧 London — Coming next</button>')}
function showSocial(){openModal('<h2>❤️ Social life</h2><p>Amélie: '+(S.friends.Amélie||0)+'% · Luca: '+(S.friends.Luca||0)+'%</p><p>Walk up to people in the world and press <b>E</b> to build relationships.</p><button class="btn gold wide" onclick="closeModal()">Back to Paris</button>')}
function openModal(html){document.getElementById('modalBox').innerHTML=html;document.getElementById('modal').classList.add('show')}
function closeModal(){document.getElementById('modal').classList.remove('show')}
window.closeModal=closeModal;
function creator(){openModal('<h2>Create your Paris life</h2><p>Choose your character. This is saved locally on this device.</p><div class="field"><label>NAME</label><input id="charname" value="'+S.name+'"></div><div class="field"><label>SKIN</label><div class="choices">'+[0,1,2].map(i=>'<button class="choice '+(S.skin===i?'active':'')+'" onclick="S.skin='+i+';creator()">'+['Warm','Deep','Light'][i]+'</button>').join('')+'</div></div><div class="field"><label>HAIR</label><div class="choices">'+[0,1,2].map(i=>'<button class="choice '+(S.hair===i?'active':'')+'" onclick="S.hair='+i+';creator()">'+['Dark','Brown','Blonde'][i]+'</button>').join('')+'</div></div><button class="btn gold wide" onclick="S.name=document.getElementById(\'charname\').value||\'Alex\';save();closeModal();location.reload()">Start my life</button>')}
document.getElementById('interact').onclick=interact;document.getElementById('sleep').onclick=sleep;document.getElementById('work').onclick=work;document.getElementById('eat').onclick=eat;document.getElementById('metro').onclick=metro;document.getElementById('social').onclick=showSocial;
document.getElementById('modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal()});

const keys={};addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if(e.key.toLowerCase()==='e')interact();if(e.key.toLowerCase()==='c')creator()});addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
const joy={x:0,y:0,active:false};const touch=document.getElementById('touch'),stick=document.getElementById('stick');
function joyMove(e){const r=touch.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=e.clientX-cx,dy=e.clientY-cy;const max=46,l=Math.hypot(dx,dy);if(l>max){dx=dx/l*max;dy=dy/l*max}joy.x=dx/max;joy.y=dy/max;stick.style.transform='translate('+dx+'px,'+dy+'px)'}
touch.addEventListener('pointerdown',e=>{joy.active=true;touch.setPointerCapture(e.pointerId);joyMove(e)});touch.addEventListener('pointermove',e=>{if(joy.active)joyMove(e)});touch.addEventListener('pointerup',()=>{joy.active=false;joy.x=joy.y=0;stick.style.transform='translate(0,0)'});

function update(dt,t){
 let mx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0)+joy.x;
 let mz=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0)+joy.y;
 const l=Math.hypot(mx,mz);if(l>1){mx/=l;mz/=l}
 const speed=5.2*dt;player.position.x+=mx*speed;player.position.z+=mz*speed;
 player.position.x=Math.max(-39,Math.min(39,player.position.x));player.position.z=Math.max(-39,Math.min(39,player.position.z));
 if(l>.05){player.rotation.y=Math.atan2(mx,mz);S.energy=Math.max(0,S.energy-.012);if(Math.random()<.008)ui()}
 npcs.forEach(n=>{n.t+=dt*n.pace;n.g.position.x=n.origin.x+Math.sin(n.t)*2.5;n.g.position.z=n.origin.z+Math.cos(n.t*.8)*2.2;n.g.lookAt(player.position.x,n.g.position.y,n.g.position.z)});
 near=null;let best=2.8;interactables.forEach(i=>{const d=dist(player.position,i.pos);if(d<best){best=d;near=i}});
 document.getElementById('prompt').classList.toggle('show',!!near);if(near)document.getElementById('prompt').textContent='E · '+near.name;
 const target=new THREE.Vector3(player.position.x,0,player.position.z);const camTarget=new THREE.Vector3(target.x,12,target.z+15);camera.position.lerp(camTarget,.09);camera.lookAt(target.x,0,target.z);
}
let last=performance.now();function loop(now){const dt=Math.min(.04,(now-last)/1000);last=now;update(dt,now/1000);renderer.render(scene,camera);requestAnimationFrame(loop)}requestAnimationFrame(loop);
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
ui();if(!localStorage.getItem('eurolife-3d-seen')){localStorage.setItem('eurolife-3d-seen','1');setTimeout(creator,350)}
