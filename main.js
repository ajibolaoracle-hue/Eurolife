import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

const $=id=>document.getElementById(id), clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,n));
const JOBS={
  'Café Barista':{emoji:'☕',place:'Café des Artistes',hours:3,min:95,max:145,xp:14,energy:22,hunger:9,hygiene:7,fun:3,skill:'service',req:0,level:'Entry'},
  'Restaurant Server':{emoji:'🍽️',place:'Montmartre Bistro',hours:4,min:125,max:185,xp:18,energy:28,hunger:11,hygiene:9,fun:4,skill:'service',req:25,level:'Skilled'},
  'Delivery Rider':{emoji:'🚲',place:'Paris Centre',hours:4,min:155,max:225,xp:20,energy:32,hunger:12,hygiene:10,fun:5,skill:'delivery',req:45,level:'Skilled'},
  'Junior Developer':{emoji:'💻',place:'Tech Hub Paris',hours:5,min:250,max:360,xp:26,energy:34,hunger:10,hygiene:5,fun:2,skill:'tech',req:70,level:'Professional'},
  'Software Developer':{emoji:'🧑‍💻',place:'La Défense',hours:6,min:390,max:560,xp:32,energy:40,hunger:12,hygiene:6,fun:1,skill:'tech',req:120,level:'Professional'}
};
let S=JSON.parse(localStorage.getItem('eurolife-life')||'null')||{
  name:'Alex',money:1200,day:1,hour:8,hunger:72,energy:82,hygiene:78,fun:65,social:55,mood:70,
  job:'Café Barista',xp:0,level:1,skillPoints:0,workedToday:0,dailyCost:35,lastSummary:'',
  home:'Montmartre Apartment',friends:{Amélie:20,Luca:5,Noah:0}
};
S.xp=Number(S.xp||0);S.level=Number(S.level||1);S.skillPoints=Number(S.skillPoints||0);S.workedToday=Number(S.workedToday||0);S.dailyCost=Number(S.dailyCost||35);
const save=()=>localStorage.setItem('eurolife-life',JSON.stringify(S)), money=n=>'€'+Math.max(0,Math.round(n)).toLocaleString();
function ui(){
  ['hunger','energy','hygiene','fun','social'].forEach(k=>{$(k).textContent=Math.round(S[k]);$(k+'Fill').style.width=S[k]+'%'});
  $('money').textContent=money(S.money)+' · '+clock();
  $('day').textContent=S.day;
}
function jobLevel(){return Math.max(1,Math.floor(S.xp/50)+1)}
function xpInLevel(){return S.xp%50}
function awardXP(n){
  const before=jobLevel(); S.xp+=n; S.skillPoints+=Math.floor(n/25);
  const after=jobLevel();
  if(after>before){S.level=after;toast('⭐ Promotion! Skill level '+after);}
}
function dailyBills(){
  const cost=S.dailyCost;
  S.money-=cost;
  if(S.money<0){S.money=0;S.mood=clamp(S.mood-8);toast('⚠️ Bills due: '+money(cost)+' · You are short on cash.');}
  else toast('🏠 Daily living costs · -'+money(cost));
}
function finishDay(){
  dailyBills();
  S.workedToday=0;
  S.day++;
  S.hour=8;
  S.energy=100;
  S.hunger=clamp(S.hunger-12);
  S.hygiene=clamp(S.hygiene-10);
  S.fun=clamp(S.fun+12);
  S.social=clamp(S.social+5);
  save();ui();
  modal('<h2>🌙 Day complete</h2><p>You made it through Day '+(S.day-1)+'. Your daily living costs were '+money(S.dailyCost)+'.</p><div class="card"><b>Wallet</b><small>'+money(S.money)+' · Career XP '+S.xp+' · Level '+jobLevel()+'</small></div><div class="card"><b>Next morning</b><small>08:00 · Energy restored · New workday begins.</small></div><button class="action primary wide" onclick="window.closeModal()">START DAY '+S.day+'</button>');
}
function advance(h){
  if(h<=0)return;
  const before=S.day;
  S.hour+=h;
  S.hunger=clamp(S.hunger-h*1.8);
  S.energy=clamp(S.energy-h*1.15);
  S.hygiene=clamp(S.hygiene-h*.9);
  S.fun=clamp(S.fun-h*.45);
  S.social=clamp(S.social-h*.3);
  if(S.hour>=24){S.hour=24;save();ui();finishDay();return;}
  save();ui();
}
const toast=t=>{$('toast').textContent=t;$('toast').classList.add('show');clearTimeout(window.tt);window.tt=setTimeout(()=>$('toast').classList.remove('show'),2100)};
const modal=html=>{$('sheet').innerHTML=html;$('modal').classList.add('show')}, close=()=>$('modal').classList.remove('show');$('modal').onclick=e=>{if(e.target.id==='modal')close()};

const scene=new THREE.Scene();scene.background=new THREE.Color(0x9dbed0);scene.fog=new THREE.Fog(0x9dbed0,45,115);
const camera=new THREE.OrthographicCamera(-14,14,10,-10,.1,160);camera.position.set(20,25,20);camera.lookAt(0,0,0);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;$('game').appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xe7f3ff,0x45515c,2));const sun=new THREE.DirectionalLight(0xffe9c2,3.2);sun.position.set(-25,40,15);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);
const M=c=>new THREE.MeshStandardMaterial({color:c,roughness:.82}), ground=M(0xb9b3a8), road=M(0x30363d), wall=M(0xd8c2a5), wall2=M(0xb88470), roof=M(0x454b55), glass=M(0x385f78), dark=M(0x20272e), green=M(0x4d7a5a), gold=M(0xd5a93d);
const box=(w,h,d,m,x,y,z)=>{let o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;scene.add(o);return o};
function tree(x,z){box(.28,2,.28,dark,x,1,z);let a=new THREE.Mesh(new THREE.DodecahedronGeometry(1.25,0),green);a.position.set(x,3,z);a.castShadow=true;scene.add(a)}
function building(x,z,w,d,h,m,name){box(w,h,d,m,x,h/2,z);box(w+.08,.18,d+.08,roof,x,h+.08,z);for(let xx=x-w/2+1.1;xx<x+w/2;xx+=1.45)for(let y=1.5;y<h-1;y+=2.05)box(.55,.55,.035,glass,xx,y,z-d/2-.04);labels.push({name,x,z,w,d})}
const labels=[];box(90,.3,90,ground,0,-.15,0);
for(let x=-40;x<=40;x+=18)box(5,.08,90,road,x,-.01,0);for(let z=-40;z<=40;z+=18)box(90,.08,5,road,0,-.01,z);
building(-30,-30,12,11,9,wall,'Apartment');building(-14,-30,12,11,12,wall2,'Haussmann House');building(30,-30,12,11,10,wall,'Hotel');building(30,-14,12,11,13,wall2,'Office');building(-30,30,12,11,11,wall2,'Bakery');building(-14,30,12,11,8,wall,'Market');building(30,30,12,11,10,wall,'Cinema');
[[-10,-10],[-10,10],[10,-10],[10,10],[-27,-8],[-27,9],[27,-8],[27,9]].forEach(p=>tree(...p));
function sign(t,x,z){let c=document.createElement('canvas');c.width=600;c.height=130;let q=c.getContext('2d');q.fillStyle='#172534';q.fillRect(0,0,600,130);q.fillStyle='#fff';q.font='bold 48px sans-serif';q.textAlign='center';q.fillText(t,300,82);let s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c)}));s.scale.set(5.5,1.2,1);s.position.set(x,5,z);scene.add(s)}
sign('CAFÉ DES ARTISTES',-8,-8);sign('METRO · ABBESSES',8,8);sign('MARKET',-8,26);sign('CINÉMA',30,30);
function car(x,z,c){box(2.5,.65,.95,M(c),x,.42,z);box(1.1,.42,.8,M(c),x,.82,z);[-.75,.75].forEach(dx=>[-.43,.43].forEach(dz=>{let w=new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,.12,10),dark);w.rotation.z=Math.PI/2;w.position.set(x+dx,.25,z+dz);scene.add(w)}))}
car(-7,-2,0x7d3f45);car(7,-2,0x3d6177);car(2,25,0xd0a63b);

const player=new THREE.Group();player.position.set(0,0,0);scene.add(player);const body=new THREE.Mesh(new THREE.CapsuleGeometry(.42,1.0,5,10),M(0x385f83));body.position.y=1.05;player.add(body);const head=new THREE.Mesh(new THREE.SphereGeometry(.42,14,10),M(0xb87b58));head.position.y=1.9;player.add(head);const hair=new THREE.Mesh(new THREE.SphereGeometry(.44,14,8,0,Math.PI*2,0,Math.PI*.48),M(0x2a211e));hair.position.y=2.03;player.add(hair);
const npcs=[];function npc(name,x,z,c){let g=new THREE.Group();g.position.set(x,0,z);let b=new THREE.Mesh(new THREE.CapsuleGeometry(.36,.85,4,8),M(c));b.position.y=.9;g.add(b);let h=new THREE.Mesh(new THREE.SphereGeometry(.35,12,8),M(0xc58a69));h.position.y=1.62;g.add(h);scene.add(g);npcs.push({name,g,x,z,t:Math.random()*7})}
npc('Amélie',-3,-9,0xa35b74);npc('Luca',-7,5,0x6c5a94);npc('Noah',5,-8,0x4d7965);npc('Mila',7,7,0x9c7040);npc('Sofia',-20,0,0x52769a);

let near=null, mode='city', interactRadius=3.2;
const points=[{name:'Café des Artistes',x:-8,z:-8,fn:()=>work()},{name:'Your Apartment',x:-8,z:8,fn:()=>home()},{name:'Metro Abbesses',x:8,z:8,fn:()=>map()},{name:'Amélie',x:-3,z:-9,fn:()=>meet('Amélie')},{name:'Luca',x:-7,z:5,fn:()=>meet('Luca')}];
function clock(){return String(Math.floor(S.hour)).padStart(2,'0')+':'+String(Math.floor((S.hour%1)*60)).padStart(2,'0')}
function advance(h){S.hour+=h;while(S.hour>=24){S.hour-=24;S.day++}S.hunger=clamp(S.hunger-h*2);S.energy=clamp(S.energy-h*1.4);S.hygiene=clamp(S.hygiene-h*1.2);S.fun=clamp(S.fun-h*.5);S.social=clamp(S.social-h*.4);save();ui()}
function work(jobName=S.job){
  const j=JOBS[jobName];
  if(!j)return;
  if(S.xp<j.req)return toast('You need '+j.req+' career XP for this job.');
  if(S.energy<j.energy)return toast('Not enough energy for this shift.');
  if(S.workedToday>=10)return toast('You have worked 10 hours today. Rest before another shift.');
  if(S.hour+j.hours>=24)return toast('That shift runs past midnight. Sleep or choose a shorter shift.');
  S.job=jobName;
  const fatigue=(S.workedToday>=7)?1.15:1;
  const pay=Math.round((j.min+Math.random()*(j.max-j.min))*fatigue);
  S.money+=pay;
  S.workedToday+=j.hours;
  S.energy=clamp(S.energy-j.energy);
  S.hunger=clamp(S.hunger-j.hunger);
  S.hygiene=clamp(S.hygiene-j.hygiene);
  S.fun=clamp(S.fun-j.fun);
  S.mood=clamp(S.mood+(S.energy>35?3:-5));
  S.hour+=j.hours;
  awardXP(j.xp);
  save();ui();
  toast(j.emoji+' Shift complete · +'+money(pay)+' · '+clock());
}
function eat(){if(S.money<12)return toast('You need €12.');S.money-=12;S.hunger=clamp(S.hunger+28);S.energy=clamp(S.energy+5);S.mood=clamp(S.mood+4);save();ui();toast('Croissant + coffee · €12')}
function shower(){advance(.5);S.hygiene=100;S.fun=clamp(S.fun+3);toast('Fresh and clean.')}
function sleep(){
  if(S.hour>=24){finishDay();return;}
  dailyBills();
  S.day++;
  S.hour=8;
  S.workedToday=0;
  S.energy=100;
  S.hunger=clamp(S.hunger-12);
  S.hygiene=clamp(S.hygiene-10);
  S.fun=clamp(S.fun+15);
  S.social=clamp(S.social+5);
  save();ui();
  toast('🌅 Good morning, '+S.name+' · Day '+S.day);
}
function meet(n){S.social=clamp(S.social+16);S.fun=clamp(S.fun+9);S.energy=clamp(S.energy-4);S.friends[n]=clamp((S.friends[n]||0)+12);save();ui();toast(n+' liked spending time with you ❤️')}
function home(){mode='home';player.position.set(0,0,0);$('zone').textContent='HOME';$('place').textContent='Your Montmartre apartment';buildHome();toast('Home · tap furniture to interact')}
function buildHome(){scene.children.filter(o=>o.userData.home).forEach(o=>scene.remove(o));let floor=box(22,.25,18,M(0x806653),0,-.1,0);floor.userData.home=true;[[ -7,-5,5,4],[0,-5,8,4],[7,-5,5,4],[-7,4,5,5],[0,4,8,5],[7,4,5,5]].forEach(([x,z,w,d])=>{let q=box(w,.15,d,M(0xb99a7b),x,.03,z);q.userData.home=true});[['BED',-7,4],['BATH',7,4],['KITCHEN',0,-5],['LIVING',0,4],['DESK',7,-5]].forEach(([t,x,z])=>{let q=box(2,.8,1.2,M(t==='BED'?0x5f4562:t==='KITCHEN'?0x68705c:0x4b5865),x,.4,z);q.userData.home=true;q.userData.label=t});pointsHome=[{name:'Bed',x:-7,z:4,fn:sleep},{name:'Shower',x:7,z:4,fn:shower},{name:'Kitchen',x:0,z:-5,fn:eat},{name:'TV',x:0,z:4,fn:()=>{S.fun=clamp(S.fun+20);advance(1);toast('You watched TV.')}}]}
let pointsHome=[];
function city(){mode='city';scene.children.filter(o=>o.userData.home).forEach(o=>scene.remove(o));player.position.set(0,0,0);$('zone').textContent='MONTMARTRE';$('place').textContent='Paris · France';toast('Back in the city')}
function map(){modal('<h2>🗺️ Europe</h2><p>Your life starts in Paris. Cities unlock as your career and savings grow.</p><div class="grid"><div class="card"><b>🇫🇷 Paris</b><small>OPEN · Montmartre, cafés, metro, jobs</small></div><div class="card"><b>🇬🇧 London</b><small>COMING · rent, Underground, finance</small></div><div class="card"><b>🇳🇱 Amsterdam</b><small>COMING · bikes, canals, tech</small></div><div class="card"><b>🇩🇪 Berlin</b><small>COMING · nightlife, startups</small></div><div class="card"><b>🇮🇹 Rome</b><small>COMING · food, tourism, history</small></div><div class="card"><b>🇪🇸 Madrid</b><small>COMING · culture, sport, nightlife</small></div></div><button class="action primary wide" onclick="window.closeModal()">RETURN TO PARIS</button>')}
function phone(){modal('<h2>📱 Your phone</h2><p>Life is managed through your phone, just like a modern social simulation.</p><div class="grid"><div class="card" onclick="jobApp()"><b>💼 Jobs</b><small>Find work and improve your income.</small></div><div class="card" onclick="map()"><b>🗺️ Europe</b><small>Travel and unlock cities.</small></div><div class="card"><b>🏠 Housing</b><small>'+S.home+' · Rent due weekly.</small></div><div class="card"><b>🏦 Bank</b><small>Balance '+money(S.money)+'.</small></div><div class="card"><b>🛍️ Shop</b><small>Clothes, furniture and upgrades.</small></div><div class="card"><b>💬 Messages</b><small>Amélie sent: “Coffee later?”</small></div></div>')}
function jobApp(){
  const cards=Object.entries(JOBS).map(([name,j])=>{
    const unlocked=S.xp>=j.req;
    const current=S.job===name;
    return '<div class="card"><b>'+j.emoji+' '+name+(current?' · CURRENT':'')+'</b><small>'+j.place+' · '+j.hours+'h shift · '+money(j.min)+'–'+money(j.max)+' · +'+j.xp+' XP</small><small>'+ (unlocked?'✅ Unlocked':'🔒 Requires '+j.req+' XP') +'</small><button class="action '+(unlocked?'primary':'')+' wide" '+(unlocked?'onclick="window.startShift(\\''+name.replace(/'/g,"\\\\'")+'\\')"':'disabled')+'>'+(current?'START SHIFT':'CHOOSE JOB')+'</button></div>';
  }).join('');
  modal('<h2>💼 Work & Career</h2><p><b>'+S.job+'</b> · Level '+jobLevel()+' · '+xpInLevel()+'/50 XP · Worked today '+S.workedToday+'h</p><p>Work shifts to earn money and career XP. Energy, hunger, hygiene and mood change with every shift.</p><div class="grid">'+cards+'</div><button class="action wide" onclick="window.endDay()">🌙 END DAY & SLEEP</button>');
}
function social(){modal('<h2>❤️ Social life</h2><p>Amélie '+S.friends.Amélie+'% · Luca '+S.friends.Luca+'% · Noah '+(S.friends.Noah||0)+'%</p><p>Meet people in the world, build friendships and eventually date, move in together or create a family.</p>')}
function creator(){modal('<h2>Build your character</h2><p>Make a new European life.</p><label>Name</label><input id="nameInput" value="'+S.name+'"><div class="grid"><button class="action" onclick="toast('Style presets coming with the clothing system')">👤 Appearance</button><button class="action" onclick="toast('Traits: Ambitious · Social · Creative')">⭐ Traits</button></div><button class="action primary wide" onclick="S.name=document.getElementById('nameInput').value||'Alex';save();close();toast('Welcome to Paris, '+S.name+'!')">START LIFE</button>')}
window.closeModal=close;window.jobApp=jobApp;window.startShift=(name)=>{close();work(name);};window.endDay=()=>{close();sleep();};
$('home').onclick=()=>mode==='home'?city():home();$('phone').onclick=phone;$('phoneFloat').onclick=phone;$('map').onclick=map;$('job').onclick=jobApp;$('eat').onclick=eat;$('socialBtn').onclick=social;
const keys={},joy={x:0,y:0,on:false};addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=1;if(e.key.toLowerCase()==='e')interact()});addEventListener('keyup',e=>keys[e.key.toLowerCase()]=0);
const pad=$('joystick'),knob=$('knob');function jm(e){let r=pad.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),l=Math.hypot(dx,dy),m=42;if(l>m){dx=dx/l*m;dy=dy/l*m}joy.x=dx/m;joy.y=dy/m;knob.style.transform='translate('+dx+'px,'+dy+'px)'}pad.onpointerdown=e=>{joy.on=true;pad.setPointerCapture(e.pointerId);jm(e)};pad.onpointermove=e=>joy.on&&jm(e);pad.onpointerup=()=>{joy.on=false;joy.x=joy.y=0;knob.style.transform='translate(0,0)'};
function interact(){let list=mode==='home'?pointsHome:points;near=list.reduce((a,p)=>{let d=Math.hypot(player.position.x-p.x,player.position.z-p.z);return d<a.d?{p,d}:a},{p:null,d:99});if(near.d<interactRadius)near.p.fn();else toast('Walk closer to something interesting.')}
function loop(t){let dt=Math.min(.04,(t-(loop.last||t))/1000);loop.last=t;let mx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0)+joy.x,mz=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0)+joy.y,l=Math.hypot(mx,mz);if(l>1){mx/=l;mz/=l}if(l>.05){player.position.x+=mx*5*dt;player.position.z+=mz*5*dt;advance(dt*.15)}player.position.x=clamp(player.position.x,-39,39);player.position.z=clamp(player.position.z,-39,39);near=null;let list=mode==='home'?pointsHome:points,best=3;list.forEach(p=>{let d=Math.hypot(player.position.x-p.x,player.position.z-p.z);if(d<best){best=d;near=p}});$('hint').classList.toggle('show',!!near);if(near)$('hint').textContent='E · '+near.name;npcs.forEach(n=>{if(mode==='city'){n.t+=dt*.7;n.g.position.x=n.x+Math.sin(n.t)*2.4;n.g.position.z=n.z+Math.cos(n.t*.8)*2.1}else n.g.visible=false});if(mode==='city')npcs.forEach(n=>n.g.visible=true);let target=new THREE.Vector3(player.position.x,0,player.position.z);camera.position.lerp(new THREE.Vector3(target.x+20,25,target.z+20),.08);camera.lookAt(target);renderer.render(scene,camera);requestAnimationFrame(loop)}

// ===== EURO LIFE PHASE 2: PROGRESSION, HOUSING, CITIES, CONSEQUENCES & SAVE =====
const CITY_DATA={
  Paris:{flag:'🇫🇷',cost:0,req:0,wage:1.0,rent:245,desc:'Your starting city. Cafés, service work and the Montmartre district.'},
  London:{flag:'🇬🇧',cost:220,req:120,wage:1.65,rent:520,desc:'Higher wages and rent. Unlock professional opportunities.'},
  Amsterdam:{flag:'🇳🇱',cost:180,req:170,wage:1.45,rent:430,desc:'Bikes, canals and a growing tech economy.'},
  Berlin:{flag:'🇩🇪',cost:160,req:210,wage:1.35,rent:360,desc:'Affordable compared with London, with a strong startup scene.'},
  Madrid:{flag:'🇪🇸',cost:140,req:260,wage:1.22,rent:300,desc:'Culture, nightlife and tourism jobs.'},
  Rome:{flag:'🇮🇹',cost:150,req:310,wage:1.18,rent:325,desc:'Tourism, hospitality and a slower Mediterranean rhythm.'}
};
const HOMES={
  'Montmartre Room':{rent:90,comfort:0,energy:0,desc:'A basic room. Cheap, but noisy and cramped.'},
  'Montmartre Apartment':{rent:245,comfort:10,energy:8,desc:'Your current starter apartment.'},
  'Paris Studio':{rent:390,comfort:18,energy:14,desc:'A private studio with better rest and comfort.'},
  'Paris Apartment':{rent:650,comfort:28,energy:20,desc:'A serious upgrade. Expensive, but life gets easier.'}
};
S.city=S.city||'Paris';S.home=S.home||'Montmartre Apartment';S.rentDay=Number(S.rentDay||0);S.totalEarned=Number(S.totalEarned||0);S.totalWorked=Number(S.totalWorked||0);S.unlockedCities=Array.isArray(S.unlockedCities)?S.unlockedCities:['Paris'];S.daysSurvived=Number(S.daysSurvived||S.day||1);
function city(){mode='city';scene.children.filter(o=>o.userData.home).forEach(o=>scene.remove(o));player.position.set(0,0,0);$('zone').textContent=S.city.toUpperCase();$('place').textContent=(CITY_DATA[S.city]||CITY_DATA.Paris).desc;toast(CITY_DATA[S.city].flag+' '+S.city+' · life continues');}
function housing(){
  const cards=Object.entries(HOMES).map(([name,h])=>{
    const current=S.home===name, affordable=S.money>=Math.max(0,h.rent-S.rentForCurrent());
    return '<div class="card"><b>🏠 '+name+(current?' · CURRENT':'')+'</b><small>'+h.desc+'</small><small>Weekly rent · '+money(h.rent)+' · Comfort +'+h.comfort+' · Rest +'+h.energy+'</small><button class="action '+(!current?'primary':'')+' wide" '+(current?'disabled':'onclick="window.chooseHome(\''+name.replace(/'/g,"\\'")+'\')"')+'>'+ (current?'YOUR HOME':'MOVE HERE')+'</button></div>';
  }).join('');
  modal('<h2>🏠 Housing</h2><p>Better homes improve recovery, but increase your weekly rent. Current: <b>'+S.home+'</b>.</p><div class="grid">'+cards+'</div><button class="action wide" onclick="window.closeModal()">CLOSE</button>');
}
S.rentForCurrent=function(){return (HOMES[S.home]||HOMES['Montmartre Apartment']).rent};
function chooseHome(name){const h=HOMES[name];if(!h)return;if(S.money<Math.min(100,h.rent*.25))return toast('You need enough cash for the move-in cost.');S.home=name;S.dailyCost=Math.max(25,35+(h.rent-245)*.08);S.money-=Math.min(100,h.rent*.25);save();ui();close();toast('🏠 Moved into '+name+' · weekly rent '+money(h.rent));}
function travel(cityName){
  const c=CITY_DATA[cityName];if(!c)return;
  if(cityName===S.city)return toast('You are already in '+cityName+'.');
  if(!S.unlockedCities.includes(cityName))return toast('🔒 Requires '+c.req+' career XP.');
  if(S.money<c.cost)return toast('You need '+money(c.cost)+' for this journey.');
  S.money-=c.cost;S.city=cityName;S.dailyCost=Math.round(35*(c.wage?1:1));S.workedToday=0;S.hour=8;S.day++;save();ui();close();city();toast(c.flag+' Arrived in '+cityName+' · Day '+S.day);
}
function map(){
  const cards=Object.entries(CITY_DATA).map(([name,c])=>{
    const open=S.unlockedCities.includes(name), here=S.city===name;
    return '<div class="card"><b>'+c.flag+' '+name+(here?' · HERE':'')+'</b><small>'+c.desc+'</small><small>'+(open?'✅ Unlocked':'🔒 Requires '+c.req+' XP')+(c.cost?' · Travel '+money(c.cost):'')+'</small><button class="action '+(open&&!here?'primary':'')+' wide" '+(open&&!here?'onclick="window.travelTo(\''+name+'\')"':'disabled')+'>'+ (here?'CURRENT CITY':open?'TRAVEL':'LOCKED') +'</button></div>';
  }).join('');
  modal('<h2>🗺️ Europe</h2><p>Build career XP to unlock new cities. Every move changes the opportunities and cost of living.</p><div class="grid">'+cards+'</div><button class="action wide" onclick="window.closeModal()">CLOSE MAP</button>');
}
function progressUnlocks(){
  Object.entries(CITY_DATA).forEach(([name,c])=>{if(!S.unlockedCities.includes(name)&&S.xp>=c.req){S.unlockedCities.push(name);toast('🗺️ New city unlocked: '+c.flag+' '+name);}});
}
function consequences(){
  let hit=false;
  if(S.hunger<20){S.energy=clamp(S.energy-8);S.mood=clamp(S.mood-8);hit=true;}
  if(S.energy<15){S.mood=clamp(S.mood-10);hit=true;}
  if(S.hygiene<15){S.social=clamp(S.social-8);S.mood=clamp(S.mood-6);hit=true;}
  if(S.money<=0){S.mood=clamp(S.mood-5);hit=true;}
  if(hit)toast('⚠️ Your choices are catching up with you. Eat, rest or earn before things get worse.');
}
function finishDay(){
  dailyBills();
  const h=HOMES[S.home]||HOMES['Montmartre Apartment'];
  const weekly=(S.day%7===0);
  if(weekly){const rent=h.rent;if(S.money>=rent){S.money-=rent;toast('🏠 Weekly rent paid · -'+money(rent));}else{S.mood=clamp(S.mood-15);toast('🚨 Rent missed · '+money(rent)+' due');}}
  consequences();progressUnlocks();
  S.workedToday=0;S.daysSurvived++;S.day++;S.hour=8;
  S.energy=clamp(100+(h.energy||0));S.hunger=clamp(S.hunger-12);S.hygiene=clamp(S.hygiene-10);S.fun=clamp(S.fun+12);S.social=clamp(S.social+5);
  save();ui();
  modal('<h2>🌙 Day complete</h2><p>Day '+(S.day-1)+' is over. You earned '+money(S.totalEarned)+' total across '+S.totalWorked+' work hours.</p><div class="card"><b>Wallet</b><small>'+money(S.money)+' · Career XP '+S.xp+' · Level '+jobLevel()+'</small></div><div class="card"><b>Life</b><small>'+S.home+' · '+S.city+' · '+S.job+'</small></div><button class="action primary wide" onclick="window.closeModal()">START DAY '+S.day+'</button>');
}
function advance(h){
  if(h<=0)return;const prev=S.hour;S.hour+=h;
  S.hunger=clamp(S.hunger-h*1.8);S.energy=clamp(S.energy-h*1.15);S.hygiene=clamp(S.hygiene-h*.9);S.fun=clamp(S.fun-h*.45);S.social=clamp(S.social-h*.3);
  if(S.hour>=24){S.hour=24;save();ui();finishDay();return;}save();ui();
}
function work(jobName=S.job){
  const j=JOBS[jobName];if(!j)return;
  if(S.xp<j.req)return toast('You need '+j.req+' career XP for this job.');
  if(S.energy<j.energy)return toast('Not enough energy for this shift.');
  if(S.workedToday>=10)return toast('You have worked 10 hours today. Rest before another shift.');
  if(S.hour+j.hours>=24)return toast('That shift runs past midnight. Sleep or choose a shorter shift.');
  S.job=jobName;const c=CITY_DATA[S.city]||CITY_DATA.Paris;
  const pay=Math.round((j.min+Math.random()*(j.max-j.min))*c.wage*(S.workedToday>=7?1.15:1));
  S.money+=pay;S.totalEarned+=pay;S.workedToday+=j.hours;S.totalWorked+=j.hours;
  S.energy=clamp(S.energy-j.energy);S.hunger=clamp(S.hunger-j.hunger);S.hygiene=clamp(S.hygiene-j.hygiene);S.fun=clamp(S.fun-j.fun);S.mood=clamp(S.mood+(S.energy>35?3:-5));S.hour+=j.hours;
  awardXP(j.xp);progressUnlocks();consequences();save();ui();toast(j.emoji+' Shift complete · +'+money(pay)+' · '+clock());
}
function sleep(){
  if(S.hour>=24){finishDay();return;}
  const remaining=Math.max(1,24-S.hour);S.hour=24;advance(0);finishDay();
}
function social(){
  modal('<h2>❤️ Social life</h2><p>Relationships now affect your mood and social stat. Stronger friendships unlock better events later.</p><div class="grid">'+Object.entries(S.friends).map(([n,v])=>'<div class="card"><b>'+n+'</b><small>Friendship '+Math.round(v)+'%</small><button class="action primary wide" onclick="window.hangout(\''+n+'\')">MEET · 1 HOUR</button></div>').join('')+'</div><button class="action wide" onclick="window.closeModal()">CLOSE</button>');
}
function hangout(n){if(S.energy<4)return toast('You are too tired to socialise.');S.social=clamp(S.social+16);S.fun=clamp(S.fun+9);S.energy=clamp(S.energy-4);S.hour+=1;S.friends[n]=clamp((S.friends[n]||0)+12);save();ui();close();toast(n+' liked spending time with you ❤️');}
function saveGame(){save();toast('💾 Game saved on this device.');}
function resetGame(){if(confirm('Start a new EURO LIFE? Your current save will be erased.')){localStorage.removeItem('eurolife-life');location.reload();}}
function phone(){
  modal('<h2>📱 Your phone</h2><p>'+S.city+' · Day '+S.day+' · '+clock()+' · Wallet '+money(S.money)+'</p><div class="grid"><div class="card" onclick="jobApp()"><b>💼 Jobs</b><small>'+S.job+' · Level '+jobLevel()+'</small></div><div class="card" onclick="map()"><b>🗺️ Europe</b><small>'+S.unlockedCities.length+' cities unlocked</small></div><div class="card" onclick="housing()"><b>🏠 Housing</b><small>'+S.home+' · Weekly rent '+money((HOMES[S.home]||HOMES['Montmartre Apartment']).rent)+'</small></div><div class="card"><b>🏦 Bank</b><small>Balance '+money(S.money)+' · Earned '+money(S.totalEarned)+'</small></div><div class="card" onclick="saveGame()"><b>💾 Save</b><small>Autosave is active. Save manually too.</small></div><div class="card" onclick="resetGame()"><b>↻ New Life</b><small>Reset this device and start again.</small></div></div><button class="action wide" onclick="window.closeModal()">CLOSE PHONE</button>');
}
window.travelTo=travel;window.chooseHome=chooseHome;window.hangout=hangout;window.saveGame=saveGame;window.resetGame=resetGame;window.housing=housing;window.map=map;
$('home').onclick=()=>mode==='home'?city():home();$('phone').onclick=phone;$('phoneFloat').onclick=phone;$('map').onclick=map;$('job').onclick=jobApp;$('eat').onclick=eat;$('socialBtn').onclick=social;

ui();progressUnlocks();if(!localStorage.getItem('eurolife-life-seen')){localStorage.setItem('eurolife-life-seen','1');setTimeout(creator,500)}requestAnimationFrame(loop);addEventListener('resize',()=>{let a=innerWidth/innerHeight,c=10*a;camera.left=-c;camera.right=c;camera.top=10;camera.bottom=-10;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
