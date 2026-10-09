import * as THREE from 'https://unpkg.com/three@0.180.0/build/three.module.js';

const $ = id => document.getElementById(id);
const clamp = (n,a=0,b=100) => Math.max(a,Math.min(b,n));
const money = n => '€'+Math.max(0,Math.round(n)).toLocaleString();

let S = JSON.parse(localStorage.getItem('eurolife-life') || 'null') || {
  name:'Alex', money:1200, day:1, hour:8,
  hunger:72, energy:82, hygiene:78, fun:65, social:55, mood:70,
  xp:0, level:1, job:'Café Barista', workedToday:0,
  home:'Montmartre Apartment', friends:{Amélie:20,Luca:5,Noah:0},
  city:'Paris', inventory:[], vehicle:null, business:null, heat:0
};
S.inventory = Array.isArray(S.inventory) ? S.inventory : [];
S.friends = S.friends || {Amélie:20,Luca:5,Noah:0};
S.xp = Number(S.xp||0); S.level = Number(S.level||1);
const save = () => localStorage.setItem('eurolife-life',JSON.stringify(S));
const clock = () => String(Math.floor(S.hour)%24).padStart(2,'0')+':'+String(Math.floor((S.hour%1)*60)).padStart(2,'0');

function ui(){
  if($('money')) $('money').textContent=Math.round(S.money).toLocaleString();
  if($('day')) $('day').textContent=S.day;
  if($('clock')) $('clock').textContent=clock();
  if($('zone')) $('zone').textContent=state.zone;
  if($('place')) $('place').textContent=state.place;
}
function toast(t){
  $('toast').textContent=t; $('toast').classList.add('show');
  clearTimeout(window.__toast); window.__toast=setTimeout(()=>$('toast').classList.remove('show'),2200);
}
function modal(html){if(!$('modal')) return; $('sheet').innerHTML=html;$('modal').classList.add('show')}
function close(){ $('modal').classList.remove('show') }
window.closeModal=close;
if($('modal')) $('modal').onclick=e=>{if(e.target.id==='modal')close()};

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x9dbed0);
scene.fog=new THREE.Fog(0x9dbed0,55,125);
const camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,.1,180);
camera.position.set(10,9,12);
const renderer=new THREE.WebGLRenderer({antialias:false,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.25));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
$('game').appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xdceeff,0x4a4b54,2.2));
const sun=new THREE.DirectionalLight(0xffe4bb,3);
sun.position.set(-30,45,20); sun.castShadow=true; sun.shadow.mapSize.set(1024,1024); scene.add(sun);

const MAT = c => new THREE.MeshStandardMaterial({color:c,roughness:.8});
const mats={
  road:MAT(0x343941), sidewalk:MAT(0xb9b2a5), wall:MAT(0xd7c1a7), wall2:MAT(0xb97e69),
  roof:MAT(0x454a52), window:MAT(0x345a72), door:MAT(0x3a2925), grass:MAT(0x6e8a67),
  tree:MAT(0x416b52), trunk:MAT(0x503b2b), skin:MAT(0xb97b59), shirt:MAT(0x3c668f),
  car:MAT(0x8d4248), car2:MAT(0x42657d), gold:MAT(0xd5a83d), white:MAT(0xe7e4db)
};
function box(w,h,d,mat,x,y,z, parent=scene){
  const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat); o.position.set(x,y,z);
  o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;
}
const colliders=[];
function solid(x,z,w,d){colliders.push({x,z,w,d})}
function blocked(x,z){
  if(state.mode==='home') return false;
  return colliders.some(b=>Math.abs(x-b.x)<b.w/2+.45 && Math.abs(z-b.z)<b.d/2+.45);
}
function cyl(r,h,mat,x,y,z,parent=scene){
  const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,10),mat);o.position.set(x,y,z);o.castShadow=true;parent.add(o);return o;
}
function tree(x,z){
  box(.28,2,.28,mats.trunk,x,1,z);
  const crown=new THREE.Mesh(new THREE.DodecahedronGeometry(1.25,1),mats.tree);
  crown.position.set(x,3,z);crown.castShadow=true;scene.add(crown);
}
function label(text,x,z,color='#172534'){
  const c=document.createElement('canvas');c.width=700;c.height=150;
  const q=c.getContext('2d');q.fillStyle=color;q.fillRect(0,0,700,150);
  q.fillStyle='#fff';q.font='bold 48px sans-serif';q.textAlign='center';q.fillText(text,350,94);
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true}));
  s.scale.set(6.5,1.4,1);s.position.set(x,5.3,z);scene.add(s);
}
function building(x,z,w,d,h,mat,name){
  box(w,h,d,mat,x,h/2,z);solid(x,z,w,d);box(w+.12,.2,d+.12,mats.roof,x,h+.1,z);
  for(let xx=x-w/2+1.15;xx<x+w/2-.3;xx+=1.45)
    for(let yy=1.5;yy<h-1;yy+=2.05) box(.56,.62,.04,mats.window,xx,yy,z-d/2-.03);
  const door=box(1.05,1.8,.08,mats.door,x,0.9,z-d/2-.07);
  door.userData.door=name;
  // Leave a doorway gap in the collision wall; buildings themselves remain solid.
  colliders.pop();
  solid(x-w/2+.1,z,w-.8,d);solid(x+w/2-.1,z,w-.8,d);
  solid(x,z-d/2+.1,w,.45);solid(x,z+d/2-.1,w,.45);
  label(name.toUpperCase(),x,z-d/2-.25);
}

// Immediate visible starter scene: ensures the first frame is a world, not an empty sky.
const emergencyGround = new THREE.Mesh(new THREE.PlaneGeometry(180,180), MAT(0x6f8d68));
emergencyGround.rotation.x=-Math.PI/2; emergencyGround.position.y=-0.3; emergencyGround.receiveShadow=true; scene.add(emergencyGround);
for(let i=0;i<7;i++){
  const bx=-24+i*8, bh=5+(i%3)*2;
  const b=new THREE.Mesh(new THREE.BoxGeometry(5,bh,5),MAT([0xd7c1a7,0xb97e69,0xd5d0c4][i%3]));
  b.position.set(bx,bh/2,-25);b.castShadow=true;b.receiveShadow=true;scene.add(b);
  for(let wy=1.6;wy<bh-0.5;wy+=1.7) for(let wx=-1.5;wx<=1.5;wx+=2)
    box(.65,.7,.06,MAT(0x345a72),bx+wx,wy,-22.46);
}
box(70,.08,7,MAT(0x343941),0,-.16,0);
const starterAvatar=new THREE.Group();starterAvatar.position.set(0,0,4);scene.add(starterAvatar);
cyl(.34,.95,MAT(0x3c668f),0,.8,0,starterAvatar);
const starterHead=new THREE.Mesh(new THREE.SphereGeometry(.27,12,8),MAT(0xb97b59));starterHead.position.y=1.5;starterAvatar.add(starterHead);

const world=[];
function point(name,x,z,action,range=2.8){world.push({name,x,z,action,range})}

function buildCity(){
  box(90,.25,90,mats.sidewalk,0,-.16,0);
  for(let x=-40;x<=40;x+=16) box(5,.07,90,mats.road,x,-.01,0);
  for(let z=-40;z<=40;z+=16) box(90,.07,5,mats.road,0,-.01,z);
  for(let x=-40;x<=40;x+=16) for(let z=-40;z<=40;z+=16){
    if(Math.abs(x)<8&&Math.abs(z)<8) continue;
    if(Math.random()>.42) tree(x+(Math.random()-.5)*4,z+(Math.random()-.5)*4);
  }

  building(-32,-32,11,11,10,mats.wall,'Apartment');
  building(-16,-32,11,11,13,mats.wall2,'Haussmann');
  building(32,-32,11,11,10,mats.wall,'Hotel');
  building(32,-16,11,11,13,mats.wall2,'Tech Hub');
  building(-32,32,11,11,10,mats.wall2,'Bakery');
  building(-16,32,11,11,8,mats.wall,'Market');
  building(32,32,11,11,10,mats.wall,'Cinema');
  building(-8,-8,10,10,8,mats.wall2,'Café');

  label('METRO · ABBESSES',8,8);
  label('MONTMARTRE',0,-22);
  point('Enter Café',-8,-2.2,()=>enterInterior('Café des Artistes','cafe'),3);
  point('Enter Apartment',-32,-25.7,()=>enterApartment(),3);
  point('Enter Tech Hub',32,-9.7,()=>enterInterior('Tech Hub Paris','tech'),3);
  point('Enter Bakery',-32,38.3,()=>enterInterior('Bakery','bakery'),3);
  point('Enter Market',-16,38.3,()=>market(),3);
  point('Enter Cinema',32,38.3,()=>cinema(),3);
  point('Enter Hotel',32,-25.7,()=>hotel(),3);
  point('Metro Abbesses',8,8,()=>metro());

  createCars();
  createNPCs();
}
function createCars(){
  const specs=[{z:-24,m:mats.car,spd:3.2},{z:24,m:mats.car2,spd:-2.5},{x:-24,m:mats.gold,spd:2.2}];
  cars.forEach(c=>scene.remove(c.g));cars.length=0;
  for(const s of specs){
    const g=new THREE.Group();const x=s.x??-42,z=s.z??-42;
    box(2.5,.62,1.1,s.m,x,.42,z,g);box(1.15,.45,.85,s.m,x,.82,z,g);
    [-.8,.8].forEach(dx=>[-.48,.48].forEach(dz=>cyl(.2,.12,MAT(0x202328),x+dx,.25,z+dz,g)));
    g.position.set(0,0,0);scene.add(g);cars.push({g,axis:s.x!=null?'z':'x',base:s.x??s.z,spd:s.spd});
  }
}
function createNPCs(){
  npcs.forEach(n=>scene.remove(n.g));npcs.length=0;
  [['Amélie',-3,-9,0xa45b75],['Luca',-7,5,0x6c5a94],['Noah',5,-8,0x4f7d68],['Mila',7,7,0x9b7040],['Sofia',-20,0,0x54759a]]
    .forEach(([name,x,z,c])=>{
      const g=new THREE.Group();cyl(.36,1.05,MAT(c),x,.72,z,g);
      const h=new THREE.Mesh(new THREE.SphereGeometry(.35,12,8),mats.skin);h.position.y=1.48;g.add(h);
      scene.add(g);npcs.push({name,g,x,z,t:Math.random()*6});
      point(name,x,z,()=>talk(name),2.7);
    });
}
const cars=[],npcs=[];
buildCity();

const player=new THREE.Group();player.position.set(-1,0,-18);scene.add(player);
const torso=box(.68,.85,.38,mats.shirt,0,1.05,0,player);
const head=new THREE.Mesh(new THREE.SphereGeometry(.27,14,10),mats.skin);head.position.y=1.68;player.add(head);
const hair=new THREE.Mesh(new THREE.SphereGeometry(.29,14,8,0,Math.PI*2,0,Math.PI*.5),MAT(0x2b211e));hair.position.y=1.79;player.add(hair);
const armL=box(.18,.65,.2,mats.skin,-.46,1.03,0,player),armR=box(.18,.65,.2,mats.skin,.46,1.03,0,player);
const legL=box(.22,.62,.25,MAT(0x242b38),-.2,.32,0,player),legR=box(.22,.62,.25,MAT(0x242b38),.2,.32,0,player);
const playerParts=[armL,armR,legL,legR];

const state={zone:'MONTMARTRE',place:'Paris · France',mode:'city'};
const keys={},joy={x:0,y:0,on:false};
addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if(e.key.toLowerCase()==='e')interact()});
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);

const pad=$('joystick'),knob=$('knob');
function joyMove(e){
  const r=pad.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),max=42,l=Math.hypot(dx,dy);
  const x=l>max?dx/l*max:dx,y=l>max?dy/l*max:dy;joy.x=x/max;joy.y=y/max;knob.style.transform='translate('+x+'px,'+y+'px)';
}
pad.onpointerdown=e=>{joy.on=true;pad.setPointerCapture(e.pointerId);joyMove(e)};
pad.onpointermove=e=>joy.on&&joyMove(e);
pad.onpointerup=()=>{joy.on=false;joy.x=joy.y=0;knob.style.transform='translate(0,0)'};

let near=null;
function nearest(){
  let best=null,d=999;
  const list=state.mode==='home'?homePoints:state.mode==='interior'?interiorPoints:world;
  for(const p of list){const dd=Math.hypot(player.position.x-p.x,player.position.z-p.z);if(dd<(p.range||2.8)&&dd<d){d=dd;best=p}}
  return best;
}
function interact(){
  const p=nearest();
  if(p)p.action();else toast('Walk closer to an entrance or person.');
}
$('prompt').onclick=interact;

function advance(hours){
  if(hours<=0)return;
  S.hour+=hours;
  S.hunger=clamp(S.hunger-hours*1.8);S.energy=clamp(S.energy-hours*1.15);
  S.hygiene=clamp(S.hygiene-hours*.9);S.fun=clamp(S.fun-hours*.45);S.social=clamp(S.social-hours*.3);
  while(S.hour>=24){S.hour-=24;newDay()}
  save();ui();
}
function newDay(){
  S.day++;S.hour=8;S.workedToday=0;
  S.energy=100;S.hunger=clamp(S.hunger-12);S.hygiene=clamp(S.hygiene-10);S.fun=clamp(S.fun+12);S.social=clamp(S.social+5);
  S.money=Math.max(0,S.money-35);toast('🌅 Day '+S.day+' · €35 living costs paid');
}
function xp(n){S.xp+=n;const old=S.level;S.level=Math.floor(S.xp/50)+1;if(S.level>old)toast('⭐ Career level '+S.level+'!')}
const JOBS={
 'Café Barista':{pay:[95,145],hours:3,energy:22,req:0,xp:14},
 'Restaurant Server':{pay:[125,185],hours:4,energy:28,req:25,xp:18},
 'Delivery Rider':{pay:[155,225],hours:4,energy:32,req:45,xp:20},
 'Junior Developer':{pay:[250,360],hours:5,energy:34,req:70,xp:26}
};
function doWork(name=S.job){
  const j=JOBS[name];
  if(S.xp<j.req)return toast('🔒 Need '+j.req+' career XP.');
  if(S.energy<j.energy)return toast('⚡ Not enough energy.');
  if(S.workedToday+j.hours>10)return toast('You have reached today’s 10-hour work limit.');
  const pay=Math.round(j.pay[0]+Math.random()*(j.pay[1]-j.pay[0]));
  S.job=name;S.money+=pay;S.workedToday+=j.hours;S.energy=clamp(S.energy-j.energy);S.hunger=clamp(S.hunger-j.hours*3);S.hygiene=clamp(S.hygiene-j.hours*2);S.fun=clamp(S.fun-j.hours*.5);advance(j.hours);xp(j.xp);save();ui();
  toast('💼 Shift complete · +'+money(pay));
}
function jobCards(){
  return Object.entries(JOBS).map(([n,j])=>{
    const ok=S.xp>=j.req;
    return '<div class="card"><b>💼 '+n+'</b><small>'+j.hours+'h · '+money(j.pay[0])+'–'+money(j.pay[1])+' · +'+j.xp+' XP</small><small>'+(ok?'Available':'Requires '+j.req+' XP')+'</small><button class="action '+(ok?'primary':'')+' wide" '+(ok?'onclick="window.startWork(\\''+n+'\\')"':'disabled')+'>START SHIFT</button></div>';
  }).join('');
}
function jobs(){modal('<h2>💼 Work</h2><p>Walk into workplaces and take shifts. Your career level changes what you can afford.</p><div class="grid">'+jobCards()+'</div><button class="action wide" onclick="closeModal()">CLOSE</button>')}
window.startWork=n=>{close();doWork(n)};

function cafe(){
  modal('<h2>☕ Café des Artistes</h2><p>People chat, work and find opportunities here.</p><div class="grid"><div class="card"><b>💼 Barista shift</b><small>3 hours · earn money + career XP.</small><button class="action primary wide" onclick="window.startWork(\\'Café Barista\\')">WORK</button></div><div class="card"><b>🥐 Have breakfast</b><small>€12 · +28 hunger.</small><button class="action wide" onclick="window.eatCafe()">EAT</button></div></div><button class="action wide" onclick="closeModal()">LEAVE</button>');
}
window.eatCafe=()=>{if(S.money<12)return toast('You need €12.');S.money-=12;S.hunger=clamp(S.hunger+28);S.energy=clamp(S.energy+5);S.fun=clamp(S.fun+3);save();ui();close();toast('🥐 Breakfast · -€12')};

function jobHub(){jobs()}
function bakery(){modal('<h2>🥖 Bakery</h2><p>A quick meal restores hunger and a little energy.</p><button class="action primary wide" onclick="window.buyFood()">BUY FOOD · €20</button><button class="action wide" onclick="closeModal()">LEAVE</button>')}
window.buyFood=()=>{if(S.money<20)return toast('You need €20.');S.money-=20;S.hunger=clamp(S.hunger+45);S.energy=clamp(S.energy+8);save();ui();close();toast('🥖 Fresh bakery meal')};

function market(){modal('<h2>🛍️ Market</h2><p>Buy everyday upgrades.</p><div class="grid"><div class="card"><b>👕 Outfit · €90</b><small>Fun +10 · reputation boost.</small><button class="action primary wide" onclick="window.buy(90,\\'Outfit\\')">BUY</button></div><div class="card"><b>🎧 Headphones · €120</b><small>Fun +18.</small><button class="action primary wide" onclick="window.buy(120,\\'Headphones\\')">BUY</button></div><div class="card"><b>🚲 Bike · €260</b><small>Faster travel.</small><button class="action primary wide" onclick="window.buy(260,\\'Bike\\')">BUY</button></div></div><button class="action wide" onclick="closeModal()">LEAVE</button>')}
window.buy=(cost,item)=>{if(S.money<cost)return toast('Not enough money.');S.money-=cost;S.inventory.push(item);if(item==='Outfit')S.fun=clamp(S.fun+10);if(item==='Headphones')S.fun=clamp(S.fun+18);save();ui();close();toast(item+' purchased')};

function cinema(){modal('<h2>🎬 Cinema</h2><p>Take a break from work and meet people.</p><button class="action primary wide" onclick="window.film()">WATCH FILM · €18</button><button class="action wide" onclick="closeModal()">LEAVE</button>')}
window.film=()=>{if(S.money<18)return toast('You need €18.');S.money-=18;advance(2);S.fun=clamp(S.fun+32);S.social=clamp(S.social+8);save();ui();close();toast('🎬 Great film · fun +32')};

function hotel(){modal('<h2>🏨 Hotel</h2><p>Emergency rest when your apartment is too far away.</p><button class="action primary wide" onclick="window.hotelRest()">REST · €45</button><button class="action wide" onclick="closeModal()">LEAVE</button>')}
window.hotelRest=()=>{if(S.money<45)return toast('You need €45.');S.money-=45;S.energy=clamp(S.energy+25);S.hygiene=clamp(S.hygiene+10);advance(1);close();toast('🏨 You rested')};

function metro(){modal('<h2>🚇 Abbesses Metro</h2><p>Travel around Europe. Paris is open now; other cities unlock through progression.</p><div class="card"><b>🇫🇷 Paris · OPEN</b><small>Montmartre is your first district.</small></div><div class="card"><b>🇬🇧 London · LOCKED</b><small>Requires 120 career XP and €220 travel money.</small></div><div class="card"><b>🇳🇱 Amsterdam · LOCKED</b><small>Requires 170 career XP and €180 travel money.</small></div><button class="action wide" onclick="closeModal()">CLOSE</button>')}

function talk(name){
  const f=S.friends[name]||0;
  modal('<h2>❤️ '+name+'</h2><p>Friendship: <b>'+Math.round(f)+'%</b></p><div class="card"><b>Spend time together</b><small>1 hour · €25 · friendship +15 · fun +22.</small><button class="action primary wide" onclick="window.hang(\\''+name+'\\')">HANG OUT</button></div><button class="action wide" onclick="closeModal()">LEAVE</button>');
}
window.hang=name=>{if(S.money<25)return toast('You need €25.');if(S.energy<5)return toast('You are too tired.');S.money-=25;S.energy=clamp(S.energy-5);S.fun=clamp(S.fun+22);S.social=clamp(S.social+20);S.friends[name]=clamp((S.friends[name]||0)+15);advance(1);save();ui();close();toast('❤️ You spent time with '+name)};


function enterInterior(name,type){
  state.mode='interior';state.zone=name.toUpperCase();state.place=name+' · interior';
  // Hide the outdoor city while inside; build a small walkable room with furniture.
  scene.children.forEach(o=>{if(o!==player && o!==sun && !(o.isLight) && o!==scene.fog) o.visible=false});
  player.visible=true;player.position.set(0,0,5);
  const room=new THREE.Group();room.name='activeInterior';scene.add(room);
  box(22,.2,18,MAT(0x9a8978),0,-.15,0,room);
  box(22,5,.3,MAT(0xe4d4bd),0,2.5,-9,room);box(.3,5,18,MAT(0xe4d4bd),-11,2.5,0,room);box(.3,5,18,MAT(0xe4d4bd),11,2.5,0,room);
  box(22,5,.3,MAT(0xe4d4bd),0,2.5,9,room);
  box(3,1,1.5,MAT(type==='cafe'?0x79513d:0x566c7e),-3,.5,-2,room);
  box(1.2,1.2,1.2,MAT(0x6a4432),3,.6,-3,room);
  box(2,.12,1.2,MAT(0x44312a),3,1.25,-3,room);
  box(1.2,2,.12,MAT(0x8ac0ce),8,2,-8.7,room);
  label(name.toUpperCase(),0,-7);
  interiorGroup=room;
  interiorPoints.length=0;
  if(type==='cafe')interiorPoints.push({name:'Order counter',x:-3,z:-2,action:()=>cafe(),range:2.5},{name:'Exit to street',x:0,z:7,action:exitInterior,range:3});
  else if(type==='tech')interiorPoints.push({name:'Work station',x:3,z:-3,action:jobs,range:2.5},{name:'Exit to street',x:0,z:7,action:exitInterior,range:3});
  else interiorPoints.push({name:'Buy food',x:-3,z:-2,action:bakery,range:2.5},{name:'Exit to street',x:0,z:7,action:exitInterior,range:3});
  toast('Entered '+name+' · walk to the counter or exit');
}
let interiorGroup=null;
const interiorPoints=[];
function exitInterior(){
  if(interiorGroup){scene.remove(interiorGroup);interiorGroup=null}
  scene.children.forEach(o=>o.visible=true);
  state.mode='city';state.zone='MONTMARTRE';state.place='Paris · France';player.position.set(-8,0,-3);
  ui();toast('Back on the street');
}

const homePoints=[];
function clearHome(){scene.children.filter(o=>o.userData.home).forEach(o=>scene.remove(o))}
function buildHome(){
  clearHome();
  box(26,.25,20,MAT(0x765d4e),0,-.15,0).userData.home=true;
  const walls=[[0,9,26,.3],[0,-9,26,.3],[-12,0,.3,18],[12,0,.3,18]];
  walls.forEach(([x,z,w,d])=>{const q=box(w,3,d,MAT(0xd8c3a9),x,1.5,z);q.userData.home=true});
  [['BED',-7,3,0x5d4562],['SOFA',2,3,0x526170],['KITCHEN',4,-4,0x68705c],['DESK',-6,-4,0x7a573e],['SHOWER',8,-4,0x426b79]].forEach(([n,x,z,c])=>{const q=box(2.8,.8,1.4,MAT(c),x,.4,z);q.userData.home=true;label(n,x,z,'#23313c')});
  homePoints.length=0;
  homePoints.push({name:'Bed',x:-7,z:3,action:sleep,range:2.5},{name:'Kitchen',x:4,z:-4,action:eatHome,range:2.5},{name:'Shower',x:8,z:-4,action:shower,range:2.5},{name:'Desk',x:-6,z:-4,action:computer,range:2.5});
}
function enterApartment(){state.mode='home';state.zone='HOME';state.place='Montmartre Apartment · your space';player.position.set(0,0,0);buildHome();ui();toast('🏠 Home · walk to furniture to interact')}
function leaveApartment(){state.mode='city';state.zone='MONTMARTRE';state.place='Paris · France';clearHome();player.position.set(-1,0,-18);ui();toast('🚪 Back on the street')}
function sleep(){S.day++;S.hour=8;S.workedToday=0;S.energy=100;S.hunger=clamp(S.hunger-10);S.hygiene=clamp(S.hygiene-8);S.fun=clamp(S.fun+15);S.social=clamp(S.social+5);S.money=Math.max(0,S.money-35);save();ui();toast('🌅 Morning · Day '+S.day)}
function eatHome(){if(S.money<8)return toast('You need €8.');S.money-=8;S.hunger=clamp(S.hunger+38);S.energy=clamp(S.energy+6);save();ui();toast('🍳 You cooked at home')}
function shower(){S.hygiene=100;S.fun=clamp(S.fun+3);save();ui();toast('🚿 Fresh and clean')}
function computer(){if(S.energy<8)return toast('Too tired to study.');S.energy=clamp(S.energy-8);S.fun=clamp(S.fun-2);xp(10);save();ui();toast('💻 You studied and gained 10 XP')}
function phone(){
  modal('<h2>📱 Life Hub</h2><p>'+S.city+' · Day '+S.day+' · '+clock()+' · '+money(S.money)+'</p><div class="grid"><div class="card" onclick="window.jobs()"><b>💼 Career</b><small>'+S.job+' · Level '+S.level+'</small></div><div class="card" onclick="window.map()"><b>🗺️ Europe</b><small>Explore and unlock cities.</small></div><div class="card" onclick="window.social()"><b>❤️ Social</b><small>Friendships: Amélie '+Math.round(S.friends.Amélie)+'%</small></div><div class="card"><b>🏠 Home</b><small>Montmartre Apartment</small></div><div class="card"><b>💰 Bank</b><small>'+money(S.money)+' · Career XP '+S.xp+'</small></div><div class="card"><b>🎒 Inventory</b><small>'+ (S.inventory.length?S.inventory.join(', '):'Empty')+'</small></div></div><button class="action wide" onclick="closeModal()">CLOSE PHONE</button>');
}
function social(){modal('<h2>❤️ Social life</h2><p>Meet people physically in the city and build relationships.</p><div class="grid">'+Object.keys(S.friends).map(n=>'<div class="card"><b>'+n+'</b><small>'+Math.round(S.friends[n])+'% friendship</small><button class="action primary wide" onclick="window.hang(\\''+n+'\\')">HANG OUT</button></div>').join('')+'</div><button class="action wide" onclick="closeModal()">CLOSE</button>')}
function map(){modal('<h2>🗺️ Europe</h2><div class="card"><b>🇫🇷 Paris · OPEN</b><small>Montmartre · cafés · metro · work</small></div><div class="card"><b>🇬🇧 London · LOCKED</b><small>120 career XP + €220 travel</small></div><div class="card"><b>🇩🇪 Berlin · LOCKED</b><small>210 career XP + €160 travel</small></div><div class="card"><b>🇮🇹 Rome · LOCKED</b><small>310 career XP + €150 travel</small></div><button class="action wide" onclick="closeModal()">RETURN</button>')}
window.jobs=jobs;window.phone=phone;window.social=social;window.map=map;
$('phone').onclick=phone;
$('work').onclick=jobs;

const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();
renderer.domElement.addEventListener('dblclick',e=>{
  if(state.mode!=='city')return;
  const r=renderer.domElement.getBoundingClientRect();mouse.x=(e.clientX-r.left)/r.width*2-1;mouse.y=-(e.clientY-r.top)/r.height*2+1;
  ray.setFromCamera(mouse,camera);const hit=ray.intersectObjects(scene.children,true)[0];
  if(hit){player.position.x=clamp(hit.point.x,-40,40);player.position.z=clamp(hit.point.z,-40,40)}
});

let last=performance.now(),saveTimer=0;
function animate(t){
  const dt=Math.min(.05,(t-last)/1000);last=t;
  let mx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0)+joy.x;
  let mz=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0)+joy.y;
  const len=Math.hypot(mx,mz);if(len>1){mx/=len;mz/=len}
  if(len>.05){
    const speed=state.mode==='interior'?3.6:5.2;
    const nx=player.position.x+mx*speed*dt,nz=player.position.z+mz*speed*dt;
    if(!blocked(nx,player.position.z))player.position.x=nx;
    if(!blocked(player.position.x,nz))player.position.z=nz;
    player.rotation.y=Math.atan2(mx,mz);
    playerParts[0].rotation.x=Math.sin(t*.015)*.65;playerParts[1].rotation.x=-Math.sin(t*.015)*.65;
    playerParts[2].rotation.x=-Math.sin(t*.015)*.55;playerParts[3].rotation.x=Math.sin(t*.015)*.55;
    S.energy=clamp(S.energy-dt*.22);S.hunger=clamp(S.hunger-dt*.1);
  } else {playerParts.forEach(p=>p.rotation.x*=.72)}
  const lim=state.mode==='home'||state.mode==='interior'?10:42;player.position.x=clamp(player.position.x,-lim,lim);player.position.z=clamp(player.position.z,-lim,lim);
  near=nearest();
  $('prompt').classList.toggle('show',!!near);if(near)$('prompt').textContent='E · '+near.name;
  for(const n of npcs){
    n.t+=dt*.55;
    if(state.mode==='city'){n.g.visible=true;const tx=n.x+Math.sin(n.t)*2.8,tz=n.z+Math.cos(n.t*.8)*2.4;n.g.position.x+=(tx-n.g.position.x)*dt;n.g.position.z+=(tz-n.g.position.z)*dt}else n.g.visible=false;
  }
  for(const c of cars){
    if(c.axis==='x'){c.g.position.x+=c.spd*dt;if(c.g.position.x>44)c.g.position.x=-44;if(c.g.position.x<-44)c.g.position.x=44}
    else{c.g.position.z+=c.spd*dt;if(c.g.position.z>44)c.g.position.z=-44;if(c.g.position.z<-44)c.g.position.z=44}
  }
  const target=new THREE.Vector3(player.position.x,0.8,player.position.z);
  const desired=state.mode==='interior'?new THREE.Vector3(target.x+7,target.y+6,target.z+8):new THREE.Vector3(target.x+9,target.y+8,target.z+10);
  camera.position.lerp(desired,.09);camera.lookAt(target);
  sun.intensity=.8+Math.max(0,Math.sin((S.hour-6)/24*Math.PI*2))*2.2;
  scene.background.set(S.hour<7||S.hour>20?0x17253a:0x9dbed0);
  scene.fog.color.copy(scene.background);
  saveTimer+=dt;if(saveTimer>8){save();saveTimer=0}
  ui();renderer.render(scene,camera);requestAnimationFrame(animate);
}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
ui();
window.addEventListener('error',e=>{const el=document.createElement('div');el.style='position:fixed;inset:90px 12px auto;background:#401b20;color:white;padding:14px;border-radius:12px;z-index:99999;font:14px system-ui';el.textContent='EURO LIFE could not start: '+(e.message||'rendering error');document.body.appendChild(el)});
window.addEventListener('unhandledrejection',e=>{const el=document.createElement('div');el.style='position:fixed;inset:90px 12px auto;background:#401b20;color:white;padding:14px;border-radius:12px;z-index:99999;font:14px system-ui';el.textContent='EURO LIFE loading error: '+(e.reason?.message||e.reason||'unknown');document.body.appendChild(el)});
requestAnimationFrame(animate);
