const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');
const elements = new Map(), storage = new Map(), documentEvents={}, windowEvents={};let connectedPads=[],portraitMode=false;
const gradient = {addColorStop(){}};
const ctx = new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
function element(id){if(!elements.has(id))elements.set(id,{id,style:{},dataset:{},hidden:false,classList:{toggle(){},add(){},remove(){}},textContent:'',innerHTML:'',events:{},addEventListener(type,fn){this.events[type]=fn;},setPointerCapture(){},setAttribute(){},getContext:()=>ctx,focus(){}});return elements.get(id);}
const sandbox={document:{getElementById:element,createElement:()=>element('offscreen'),querySelectorAll:()=>[],addEventListener(type,fn){documentEvents[type]=fn;}},navigator:{getGamepads:()=>connectedPads},window:{addEventListener(type,fn){windowEvents[type]=fn;},matchMedia:q=>({matches:q.includes('portrait')&&portraitMode})},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v))},performance:{now:()=>0},requestAnimationFrame(){},console};
vm.createContext(sandbox);for(const file of ['music.js','gamepad.js','scenery.js'])vm.runInContext(fs.readFileSync(file,'utf8'),sandbox);
const source=fs.readFileSync('runner.js','utf8').replace(/\}\)\(\);\s*$/,`
 globalThis.game={begin,update,draw,pressJump,shoot,resetGame,togglePause,hurt,generateAhead,trimBehind,dive,dash,flipGravity,charge,collectPowerup,damageEnemy,parry,ultimate,award,difficultyAt,updateEnemy,spawnBoss,parrySuccess,reflect,syncMusic,roomKind,updateDifficulty,updateProjectiles,chargeUltimate,growPower,
 snapshot:()=>({state,parryTimer,parryCooldown,parryFlash,ultimateTimer,ultimateCharge,ultimatePending,lastUltimateDistance,seed,musicMode,inputDevice,tier:currentTier,targetTier:difficultyAt(score),ceilings:ceilings.map(g=>({...g})),hazards:hazards.map(g=>({...g,owner:undefined})),player:{...player,platform:undefined,trail:undefined},score,kills,pickups,combo,comboTimer,chapter,runTime,cameraX,energy,rushTimer,gravity,gravityTimer,gravityCooldown,dashTimer,dashCooldown,weapon,weaponTimer,magnetTimer,airChain,bossKills,hitstop,grounds:grounds.map(g=>({...g})),stones:stones.map(g=>({...g})),enemies:enemies.map(g=>({...g})),shots:shots.map(g=>({...g,hits:undefined})),bolts:bolts.map(g=>({...g,owner:undefined})),relics:relics.map(g=>({...g}))}),
 position(x,y=438,values={}){Object.assign(player,{x,y,vx:3.8,vy:0,hp:3,onGround:true,jumps:0,coyote:7,inv:99999,diving:false,platform:null},values);maxDistance=x;lastUltimateDistance=x;cameraX=x-(portrait()?365:245);gravity=1;gravityTimer=0;gravityCooldown=0;dashCooldown=0;dashTimer=0;rushTimer=0;energy=0;hitstop=0;state='playing';},
 isolate(){enemies=[];hazards=[];springs=[];stones=[];motes=[];relics=[];shots=[];bolts=[];},
 arena(){this.isolate();nextEdge=Infinity;grounds=[{x:-500,y:470,w:100000,h:70,type:'ground'}];ceilings=[{x:-500,y:105,w:100000,h:25,type:'ceiling'}];},
 growth:()=>({power,powerXP}),
 enemy(x,y,type='crawler',hp=1){const e=addEnemy(x,x,x,type,0,y);e.hp=hp;e.y=y;return e;},
 hazard(x){thorns(x,50);return hazards[hazards.length-1];},spring,ledge,
 boss(x,type='guardian'){const e=spawnBoss(type,x-350,currentTier);e.x=x;e.cooldown=28;return e;},
 bolt(x,y,vx=-4,vy=0,owner){const b={x,y,w:12,h:10,vx,vy,life:180,reflected:false,owner};bolts.push(b);return b;},
 roof:addRoof,roofRoute,fireFan,clearRoof:()=>{ceilings=[];},
 setScore(v){score=v;bonus=v-Math.floor((maxDistance-96)/4);},
 setUltimate(v){ultimateCharge=v;},
 setTier(v){currentTier=v;},setRuntime(v){runTime=v;},config:()=>({weapons,tierThresholds,tierSpeeds,ULTIMATE_COST,TIER_INTERVAL}),
 setHitstop(v){hitstop=v;},
 setWeapon(type){weapon=type;weaponTimer=99999;shotCooldown=0;},
 counts:()=>({grounds:grounds.length,ceilings:ceilings.length,enemies:enemies.length,motes:motes.length,particles:particles.length,hazards:hazards.length,bolts:bolts.length}),
 setPlayer:v=>Object.assign(player,v),setCombo:v=>{combo=v;comboTimer=270;},setRelic:type=>relics=[{x:player.x+12,y:player.y+16,type,got:false}],
 heldFire:v=>held.shoot=v
 };
})();`);
vm.runInContext(source,sandbox,{filename:'runner.js'});
const g=sandbox.game,step=n=>{for(let i=0;i<n;i++)g.update();};
function fresh(){connectedPads=[];portraitMode=false;g.resetGame(3);g.begin();g.arena();g.position(100);}
g.draw();fresh();g.pressJump();step(1);assert(g.snapshot().player.vy<0);step(17);g.pressJump();step(1);assert.equal(g.snapshot().player.jumps,2);assert(g.snapshot().player.vy< -8);g.pressJump();step(1);assert.equal(g.snapshot().player.jumps,2);
let crossings=0;
for(let seed=0;seed<20;seed++){
 g.resetGame(seed);g.begin();g.generateAhead(22000);const map=g.snapshot();g.isolate();
 for(let i=1;i<map.grounds.length;i++){
  const prev=map.grounds[i-1],next=map.grounds[i],edge=prev.x+prev.w,gap=next.x-edge;if(gap>170)continue;
  g.position(edge-20);g.pressJump();step(20);g.pressJump();let landed=false;
  for(let f=0;f<90;f++){g.update();const p=g.snapshot().player;assert.equal(p.hp,3,`gap fall: seed ${seed}, edge ${edge}`);if(p.x>=next.x&&p.onGround){landed=true;break;}}
  assert(landed,`unreachable gap: seed ${seed}, edge ${edge}`);crossings++;
 }
}
fresh();g.flipGravity();step(70);assert.equal(g.snapshot().gravity,-1);assert.equal(g.snapshot().player.y,130);assert(g.snapshot().player.onGround,'must land on ceiling underside');g.pressJump();step(1);assert(g.snapshot().player.vy>0,'inverted jump goes away from ceiling');step(180);assert.equal(g.snapshot().gravity,-1,'gravity stays inverted');g.flipGravity();assert.equal(g.snapshot().gravity,1);g.flipGravity();assert.equal(g.snapshot().gravity,1,'cooldown blocks fast repeat');step(18);g.flipGravity();assert.equal(g.snapshot().gravity,-1,'0.3 second reactivation');
fresh();g.dash();step(1);assert(g.snapshot().player.vx>10);assert(g.snapshot().player.inv>0);const cd=g.snapshot().dashCooldown;g.dash();assert.equal(g.snapshot().dashCooldown,cd);step(160);assert.equal(g.snapshot().dashCooldown,0);
fresh();g.position(100,350,{onGround:false,coyote:0,jumps:2,vy:8});g.enemy(130,410);step(8);assert.equal(g.snapshot().kills,1);assert(g.snapshot().player.vy<0,'stomp bounces');assert.equal(g.snapshot().player.jumps,1,'stomp replenishes jump');
fresh();g.position(100,330,{onGround:false,coyote:0,jumps:2});g.dive();assert(g.snapshot().player.diving);assert(g.snapshot().player.vy>0);g.enemy(155,445,'charger',2);const spike=g.hazard(160);step(20);assert.equal(g.snapshot().kills,1,'slam shockwave hits nearby armor');assert(spike.dead,'slam destroys thorns');
fresh();g.spring(136);step(9);assert(g.snapshot().player.vy< -10,'walking onto spring launches player');
fresh();const fragile=g.ledge(100,350,250,true);g.position(110,300,{onGround:false,coyote:0,vy:4});step(45);assert(fragile.gone>0,'stepped bridge collapses');
fresh();const mobile=g.ledge(80,320,500);Object.assign(mobile,{moving:true,baseY:320,phase:0});g.position(100,180,{onGround:false,coyote:0,vy:3});step(25);assert.equal(g.snapshot().player.y+32,mobile.y,'rider must follow moving platform');
for(const type of ['scatter','seeker','boomerang']){fresh();g.collectPowerup({type,x:100,y:438});g.enemy(220,445);g.shoot();assert.equal(g.snapshot().shots.length,type==='scatter'?3:1);step(48);assert(g.snapshot().kills>0,`${type} must actually hit`);g.draw();}
fresh();g.setPlayer({hp:2});g.setRelic('heart');step(1);assert.equal(g.snapshot().player.hp,3);g.collectPowerup({type:'magnet',x:100,y:438});assert(g.snapshot().magnetTimer>0);g.setRelic('shield');step(1);g.setPlayer({inv:0});g.hurt();assert.equal(g.snapshot().player.hp,3);assert.equal(g.snapshot().player.shield,0);
fresh();g.charge(100);assert(g.snapshot().rushTimer>0);g.shoot();assert(g.snapshot().shots[0].pierce,'burst changes combat');g.draw();
fresh();g.position(500);const boss=g.boss(780);step(40);assert(boss.active);assert(g.snapshot().bolts.length>0,'guardian must attack');g.draw();for(let i=0;i<boss.maxHp;i++){boss.hit=0;g.damageEnemy(boss,1);}assert.equal(g.snapshot().bossKills,1);assert.equal(g.snapshot().player.hp,3);
fresh();g.setCombo(20);g.hurt(true);assert.equal(g.snapshot().player.hp,2);assert.equal(g.snapshot().combo,0);g.togglePause();const before=g.snapshot();step(120);assert.equal(g.snapshot().runTime,before.runTime);assert.equal(g.snapshot().player.x,before.player.x);g.togglePause();g.setPlayer({hp:1});g.hurt(true);assert.equal(g.snapshot().state,'over');g.draw();g.begin();assert.equal(g.snapshot().player.hp,3);assert.equal(g.snapshot().score,0);
g.generateAhead(80000);g.position(78000);g.trimBehind();assert(g.counts().grounds<10&&g.counts().ceilings<25);

// Input bindings use the same event handlers and controller adapter as the game.
const event=(extra={})=>({preventDefault(){this.prevented=true;},repeat:false,button:0,pointerId:1,pointerType:'mouse',...extra});
fresh();const startX=g.snapshot().player.x;documentEvents.keydown(event({code:'KeyR'}));assert.equal(g.snapshot().player.x,startX);assert.equal(g.snapshot().state,'playing');
element('game').events.pointerdown(event());assert.equal(g.snapshot().shots.length,1);assert.equal(g.snapshot().player.slash,0,'default ranged shot must not slash');
step(24);assert(g.snapshot().shots.length>=1);element('game').events.pointerup(event({type:'pointerup'}));const shotCount=g.snapshot().shots.length;step(30);assert(g.snapshot().shots.length<=shotCount,'mouse release stops fire');
element('game').events.pointerdown(event({button:2}));assert.equal(g.snapshot().gravity,-1);
for(const code of ['KeyE','KeyC']){const retired=event({code});documentEvents.keydown(retired);assert(!retired.prevented,'retired echo key stays unbound');}
const menu=event();element('game').events.contextmenu(menu);assert(menu.prevented);
const pad={index:0,connected:true,axes:[0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
const button=(i,value)=>{pad.buttons[i]={pressed:value===1,value};};
fresh();connectedPads=[pad];button(6,1);step(1);assert(g.snapshot().dashCooldown>0,'LT dash');assert.equal(g.snapshot().gravity,1);button(6,0);
button(7,.8);step(1);assert.equal(g.snapshot().gravity,-1,'RT gravity');step(40);assert.equal(g.snapshot().gravity,-1,'held trigger must not toggle repeatedly');button(7,0);step(1);button(7,1);step(1);assert.equal(g.snapshot().gravity,1);button(7,0);
button(4,1);step(1);assert(g.snapshot().parryTimer>0,'LB parry');button(4,0);
button(5,1);step(1);assert.equal(g.snapshot().parryCooldown>0,true,'RB remains unbound');button(5,0);
button(2,1);step(1);assert(g.snapshot().shots.length>0,'X held attack');button(2,0);
button(0,1);step(1);assert(g.snapshot().player.vy<0,'A jump');button(0,0);
button(1,1);step(1);assert(g.snapshot().player.diving,'B dive');button(1,0);
g.setUltimate(12000);button(3,1);step(1);assert(g.snapshot().ultimateTimer>0,'Y ultimate');button(3,0);
button(9,1);step(1);assert.equal(g.snapshot().state,'paused','Start pause');const pauseX=g.snapshot().player.x;step(20);assert.equal(g.snapshot().player.x,pauseX);button(9,0);step(1);button(9,1);step(1);assert.equal(g.snapshot().state,'playing','Start resume');button(9,0);
button(2,1);step(1);connectedPads=[];step(1);assert.equal(g.snapshot().inputDevice,'keyboard','disconnect restores keyboard hints');
const actions=[],adapter=new sandbox.window.GrottoGamepad({device(){},jump(){actions.push('jump')},releaseJump(){actions.push('release')},pause(){},dash(){actions.push('dash')},gravity(){actions.push('gravity')},dive(){},parry(){},ultimate(){}});
pad.buttons.forEach((b,i)=>button(i,0));connectedPads=[pad];pad.axes[0]=.15;button(6,.3);adapter.poll();assert(!adapter.held.right&&!actions.includes('dash'),'analog dead zones');pad.axes[0]=.8;adapter.poll();assert(adapter.held.right);connectedPads=[];adapter.poll();assert(!adapter.held.right);

// Score gates enemy behaviors; traversal distance alone cannot raise difficulty.
fresh();g.position(50000);assert.equal(g.snapshot().tier,0);
for(const [points,tier] of [[7999,0],[8000,1],[19999,1],[20000,2],[40000,3],[70000,4],[110000,5],[999999,5]]){g.setScore(points);assert.equal(g.snapshot().targetTier,tier);}
fresh();g.setScore(999999);g.updateDifficulty();assert.equal(g.snapshot().tier,0,'score spike cannot skip grace period');
g.setRuntime(2700);g.updateDifficulty();assert.equal(g.snapshot().tier,1);g.updateDifficulty();assert.equal(g.snapshot().tier,1,'cannot jump several tiers at once');
g.setRuntime(5399);g.updateDifficulty();assert.equal(g.snapshot().tier,1);g.setRuntime(5400);g.updateDifficulty();assert.equal(g.snapshot().tier,2);
fresh();g.setScore(0);g.setRuntime(99999);g.updateDifficulty();assert.equal(g.snapshot().tier,0,'time alone cannot raise difficulty');
fresh();step(20);const slowSpeed=g.snapshot().player.vx;assert(slowSpeed>=3.79,'opening pace restored');g.setTier(5);step(30);assert(g.snapshot().player.vx<4.31&&g.snapshot().player.vx>slowSpeed,'running speed is capped');
fresh();g.setTier(3);const runner=g.enemy(300,445);step(1);assert(runner.windup>0);step(45);assert(runner.charge>0,'late crawler still rushes with longer warning');
fresh();g.setTier(5);const shooter=g.enemy(350,280,'bat');shooter.fireClock=1;g.updateEnemy(shooter);assert.equal(g.snapshot().bolts.length,3);
fresh();g.setScore(8000);g.roofRoute(500,620,550,3,5);const roof=g.snapshot();assert(roof.hazards.some(h=>h.down));assert(roof.enemies.some(e=>e.type==='clinger'));assert(roof.stones.some(p=>p.ceiling));g.draw();
fresh();const ceiling=g.roof(100,200,450,'crumble');g.position(120,270,{onGround:false});g.flipGravity();step(45);assert(ceiling.gone>0,'inverted ceiling collapses');
fresh();g.setTier(5);const turret=g.enemy(300,130,'turret');turret.cooldown=1;g.updateEnemy(turret);assert.equal(g.snapshot().bolts.length,3);assert(g.snapshot().bolts.every(b=>b.vy>0),'ceiling turret aims downward');g.draw();

// Ceiling gaps at every score tier support an inverted jump.
for(let tier=1;tier<=5;tier++){
 fresh();const points=g.config().tierThresholds[tier];g.setTier(tier);g.setScore(points);g.clearRoof();g.roofRoute(500,620,550,tier,5);
 const gap=70+tier*13,start=620+135-28;
 g.isolate();g.position(start,130,{onGround:true});g.setScore(points);g.flipGravity();step(18);
 g.position(start,130,{onGround:true});g.flipGravity();step(1);g.pressJump();
 let invertedCrossed=false;
 for(let i=0;i<90;i++){g.update();const q=g.snapshot();assert.equal(q.player.hp,3);if(q.player.x>755+gap&&q.player.onGround&&q.gravity===-1){invertedCrossed=true;break;}}
 assert(invertedCrossed,'inverted route at tier '+tier);
}
// Melee is a pickup variant. Neither normal shots nor parry become a default slash.
for(const type of ['blade','spear']){
 fresh();g.collectPowerup({type,x:100,y:438});const e=g.enemy(type==='spear'?245:165,430,'charger',3);g.shoot();assert.equal(g.snapshot().shots.length,0);assert(g.snapshot().player.slash>0);step(1);assert(e.hp<3,type+' melee connects');g.draw();
}
fresh();g.setPlayer({inv:0});const originalHP=g.snapshot().player.hp;g.parry();const reflected=g.bolt(137,449,-4,0);step(1);assert(reflected.reflected,'timed parry reflects shot');assert.equal(g.snapshot().player.hp,originalHP);assert(g.snapshot().parryFlash>0);assert.equal(g.snapshot().dashCooldown,0);g.draw();
fresh();g.setPlayer({inv:0});g.parry();step(12);g.bolt(g.snapshot().player.x+5,448,0,0);step(1);assert.equal(g.snapshot().player.hp,2,'expired parry is not a held guard');
fresh();g.setPlayer({inv:0});g.parry();g.hazard(108);step(1);assert.equal(g.snapshot().player.hp,2,'parry cannot block environmental thorns');
fresh();g.setPlayer({inv:0});g.parry();const contact=g.enemy(106,440,'charger',5);step(1);assert.equal(g.snapshot().player.hp,3);assert(contact.hp<5,'contact parry damages enemy');

// Persistent elites, giant boss phases, cleanup, soundtrack priority, and both viewports.
for(const portrait of [false,true]){
 fresh();portraitMode=portrait;g.position(500);const elite=g.boss(780);step(2);assert(elite.active);
 for(const x of [3000,7000,12000]){g.position(x);step(1);g.trimBehind();assert(elite.alive&&elite.active,'elite persists beyond old arena');const s=g.snapshot(),left=portrait?277:0,right=portrait?683:960;assert(elite.x>=s.cameraX+left&&elite.x+elite.w<=s.cameraX+right,'elite stays visible');}
 g.setUltimate(12000);g.ultimate();step(35);const s=g.snapshot();assert(elite.x+elite.w<=s.cameraX+(portrait?683:960));g.draw();
}
fresh();g.position(500);const mother=g.boss(780,'abyss');step(2);assert.equal(g.snapshot().musicMode,'boss');
mother.hp=Math.floor(mother.maxHp*.55);mother.cooldown=1;g.updateEnemy(mother);assert.equal(mother.phase,2);mother.cooldown=1;g.updateEnemy(mother);assert(g.snapshot().hazards.some(h=>h.type==='rift'&&h.warn>0),'boss lane attack must warn');
mother.hp=Math.floor(mother.maxHp*.2);g.updateEnemy(mother);assert.equal(mother.phase,3);g.draw();mother.hit=0;g.damageEnemy(mother,1000);assert(!mother.alive);assert(g.snapshot().hazards.every(h=>h.type!=='rift'||h.dead));assert.equal(g.snapshot().musicMode,'explore');
fresh();g.position(500);const first=g.boss(750),duplicate=g.boss(770);step(2);assert(first.active&&!duplicate.alive,'duplicate elites cannot stack without limit');

// Ultimate ignores combo multipliers and consumes a capped charging queue.
fresh();g.award(100);const normalQueue=g.snapshot().ultimatePending;fresh();g.setCombo(20);g.charge(100);g.award(100);
assert.equal(g.snapshot().ultimatePending,normalQueue,'combo and burst never accelerate ultimate');assert(g.snapshot().score>100,'score still enjoys multipliers');
fresh();g.setScore(999999);step(1);assert(g.snapshot().ultimateCharge<2,'score jumps cannot instantly fill ultimate');
fresh();g.chargeUltimate(99999);assert(g.snapshot().ultimatePending<=600,'large bonus has a bounded charge contribution');
for(let i=0;i<600;i++){g.chargeUltimate(600);g.update();}assert(g.snapshot().ultimateCharge<=1501,'charge capped at 150 units/sec');
g.ultimate();assert.equal(g.snapshot().ultimateTimer,0,'partial bar cannot cast');
g.setUltimate(12000);documentEvents.keydown(event({code:'KeyF'}));step(20);assert(g.snapshot().ultimateTimer>0);assert.equal(g.snapshot().ultimateCharge,0);assert.equal(g.snapshot().ultimatePending,0);assert.equal(g.snapshot().musicMode,'ultimate');assert(g.snapshot().player.vx>=11);g.hurt();assert.equal(g.snapshot().player.hp,3);g.draw();
step(135);assert.equal(g.snapshot().ultimateTimer,0);assert(g.snapshot().player.inv>0);g.resetGame(2);assert.equal(g.snapshot().ultimateCharge,0);assert.equal(g.snapshot().parryCooldown,0);

// Randomness is per run, reproducible by seed, with no fixed opening drop/room order.
const layout=()=>JSON.stringify({grounds:g.snapshot().grounds,stones:g.snapshot().stones,relics:g.snapshot().relics,enemies:g.snapshot().enemies});
g.resetGame(987);g.generateAhead(12000);const seeded=layout();g.resetGame(987);g.generateAhead(12000);assert.equal(layout(),seeded,'fixed seed reproduces layout');
const firstDrops=new Set(),openings=new Set(),lootTypes=new Set(),layouts=new Set();
for(let seed=0;seed<40;seed++){
 g.resetGame(seed);g.generateAhead(18000);const q=g.snapshot();
 firstDrops.add(q.relics[0].type);openings.add(q.grounds.slice(1,4).map(r=>r.kind).join(','));layouts.add(layout());
 q.relics.forEach(r=>{lootTypes.add(r.type);assert(Number.isFinite(r.x)&&Number.isFinite(r.y));});
 assert(q.enemies.every(e=>e.type!=='guardian'&&e.type!=='abyss'),'opening never schedules a boss');
 assert(!q.hazards.some(h=>h.x<1000),'opening safety area');
}
assert.equal(firstDrops.size,5);assert(openings.size>=8);assert.equal(layouts.size,40);assert.equal(lootTypes.size,8);
const randomSeeds=new Set();for(let i=0;i<8;i++){g.resetGame();randomSeeds.add(g.snapshot().seed);}assert.equal(randomSeeds.size,8,'unseeded new games do not reuse fixed seed');
g.begin();g.setPlayer({hp:1});g.hurt(true);assert.equal(g.snapshot().state,'over');g.resetGame(321);g.begin();assert.equal(g.snapshot().seed,321,'starting a reset run must not reroll it');

// Long-gap maps always retain a solid stepping stone after echo removal.
let bridgeCrossings=0;
for(let seed=0;seed<12;seed++){
 g.resetGame(seed);g.begin();g.setTier(2);g.generateAhead(22000);const map=g.snapshot();g.isolate();
 for(let i=1;i<map.grounds.length;i++){
  const prev=map.grounds[i-1],next=map.grounds[i],edge=prev.x+prev.w,gap=next.x-edge;if(gap<170)continue;
  const bridge=map.stones.find(p=>p.bridge&&p.x>edge&&p.x<next.x);assert(bridge,'wide gap must have permanent bridge');
  g.ledge(bridge.x,bridge.y,bridge.w);g.position(edge-18);g.pressJump();let crossed=false;
  for(let f=0;f<180;f++){g.update();const q=g.snapshot().player;assert.equal(q.hp,3);if(q.onGround&&Math.abs(q.y+32-bridge.y)<1&&q.x>bridge.x+bridge.w-40)g.pressJump();if(q.x>next.x&&q.onGround){crossed=true;break;}}
  assert(crossed,'permanent bridge is traversable');bridgeCrossings++;
 }
}
assert(bridgeCrossings>10);

// Projectile caps and one boss encounter avoid stacked unavoidable attacks.
fresh();g.setTier(5);const shooterCap=g.enemy(400,200,'turret');for(let i=0;i<20;i++)g.fireFan(shooterCap,7,4,.2);assert.equal(g.snapshot().bolts.length,18);
fresh();g.position(500);const eliteOnly=g.boss(780),bigPending=g.boss(800,'abyss');step(2);assert(eliteOnly.active&&!bigPending.alive,'big boss cannot pile on a persistent elite');
g.setScore(999999);g.setRuntime(99999);g.updateDifficulty();assert.equal(g.snapshot().tier,0,'tier cannot increase during boss encounter');

fresh();g.setTier(5);g.setRuntime(0);for(let n=20;n<70;n++)assert(!['guardian','abyss'].includes(g.roomKind(n,5)),'score spike never brings an early boss');
g.setRuntime(4500);const earlyBosses=[];for(let n=70;n<160;n++)earlyBosses.push(g.roomKind(n,5));assert(earlyBosses.includes('guardian')&&!earlyBosses.includes('abyss'));
g.setRuntime(7200);const laterBosses=[];for(let n=160;n<260;n++)laterBosses.push(g.roomKind(n,5));assert(laterBosses.includes('abyss'),'big boss remains reachable later');
for(const upsideDown of [false,true]){
 fresh();g.position(500);const targetBoss=g.boss(750,'abyss');targetBoss.hp=targetBoss.maxHp=1000;
 if(upsideDown)g.flipGravity();g.heldFire(true);step(360);
 assert(targetBoss.hp<995,'default ranged attack can hit boss in either gravity lane');
}

// Close-range damage measured through actual collisions over 10 seconds, not just config values.
const damageRates={};
for(const weapon of ['seed','scatter','seeker','boomerang','blade','spear']){
 fresh();g.setWeapon(weapon);g.heldFire(true);const target=g.enemy(164,420,'crawler',10000);target.w=90;target.h=70;
 for(let f=0;f<600;f++){const q=g.snapshot();target.x=q.player.x+64;target.left=target.x;target.right=target.x;target.y=420;g.update();}
 damageRates[weapon]=Number(((10000-target.hp)/10).toFixed(2));
}
assert(damageRates.scatter>damageRates.seed&&damageRates.scatter<damageRates.seed*1.6,'shotgun spread is useful without triple damage');
assert(damageRates.seeker>=damageRates.seed*.7&&damageRates.seeker<=damageRates.seed,'homing trades some raw damage for accuracy');
assert(damageRates.boomerang>damageRates.seed&&damageRates.boomerang<damageRates.seed*2,'boomerang can hit on outward and return pass');
assert(damageRates.blade>damageRates.spear&&damageRates.spear>damageRates.seed,'short melee trades reach for damage');
console.log('Measured close-range damage/sec:',JSON.stringify(damageRates));
// Growth is earned through combat/weapon pickups and lasts until the next run.
fresh();for(let i=0;i<4;i++)g.damageEnemy(g.enemy(800+i*40,445),1);
assert.equal(g.growth().power,0);g.collectPowerup({type:'spear',x:100,y:438});assert.equal(g.growth().power,1);
g.setPlayer({inv:0});g.hurt();assert.equal(g.growth().power,1,'damage never removes earned firepower');
step(1801);assert.equal(g.snapshot().weapon,'seed');assert.equal(g.growth().power,1,'weapon expiry preserves growth');
g.growPower(99999);assert.equal(g.growth().power,4,'growth has a finite cap');
g.resetGame(3);assert.equal(g.growth().power,0);assert.equal(g.growth().powerXP,0);
for(const type of ['seed','scatter','seeker','boomerang']){
 fresh();g.growPower(18);g.setWeapon(type);g.shoot();assert.equal(g.snapshot().shots.length,type==='scatter'?5:3,type+' gains multishot');
 fresh();g.growPower(36);g.setWeapon(type);g.shoot();assert(g.snapshot().shots.every(s=>s.pierce),type+' gains penetration');
}
const packKills=[];
for(const xp of [0,60]){
 fresh();g.growPower(xp);for(let i=0;i<6;i++)g.enemy(200+i*48,440);
 g.shoot();for(let f=0;f<38;f++)g.updateProjectiles();packKills.push(g.snapshot().kills);
}
assert.equal(packKills[0],1,'base shot has one target');assert.equal(packKills[1],6,'grown volley clears an entire pack');
fresh();g.charge(100);const close=g.enemy(245,445),far=g.enemy(500,445);g.damageEnemy(g.enemy(200,445),1);
assert(!close.alive&&far.alive,'burst explosion clears neighbors without unlimited propagation');
assert(g.snapshot().rushTimer<=480,'kill extension never banks unlimited burst time');
for(const type of ['blade','spear']){
 fresh();g.growPower(60);g.setWeapon(type);const farMelee=g.enemy(type==='spear'?290:235,438,'charger',3);g.shoot();step(1);
 assert(!farMelee.alive,type+' grows in reach and damage');assert.equal(g.snapshot().shots.length,0,'melee remains a true melee variant');
}
fresh();g.growPower(60);g.setUltimate(12000);g.ultimate();g.heldFire(true);step(80);
assert.equal(g.snapshot().ultimateCharge,0,'grown clearing cannot recharge ultimate while casting');
for(let tier=0;tier<=5;tier++){
 g.resetGame(tier+10);g.begin();g.setTier(tier);g.generateAhead(12000);const q=g.snapshot();
 assert(q.enemies.some(e=>e.fodder&&e.ceiling),'ceiling has killable packs');
 for(const e of q.enemies.filter(e=>e.fodder)){e.fireClock=1;e.cooldown=1;g.updateEnemy(e);}
 assert.equal(g.snapshot().bolts.length,0,'new packs do not multiply bullet emitters');
}
console.log('PASS: permanent run growth, upgraded weapon variants, melee reach, burst blast and pack clearing (one volley: '+packKills.join(' -> ')+').');
console.log('PASS: 40 random layouts, all 8 loot types, 5 starting weapons, '+bridgeCrossings+' permanent bridge crossings, projectile caps and boss pacing.');

// Web Audio score scheduling is deterministic and goes quiet on pause/mute.
let noteCount=0;
const audioParam={value:0,setValueAtTime(){},exponentialRampToValueAtTime(){},cancelScheduledValues(){},setTargetAtTime(){}};
const audioNode=()=>({gain:{...audioParam},frequency:{...audioParam},connect(target){return target},disconnect(){},start(){noteCount++},stop(){}});
const audio={currentTime:0,state:'running',destination:{},createGain:audioNode,createOscillator:audioNode};
const soundtrack=new sandbox.window.GrottoMusic();soundtrack.start(audio);
for(let i=0;i<120;i++){audio.currentTime=i/30;soundtrack.update('explore',true,true);}const calmNotes=noteCount;assert(calmNotes>10);
noteCount=0;for(let i=0;i<120;i++){audio.currentTime=4+i/30;soundtrack.update('boss',true,true);}assert(noteCount>calmNotes,'boss arrangement is denser');
const priorNotes=noteCount;audio.currentTime=9;soundtrack.update('boss',false,true);audio.currentTime=10;soundtrack.update('boss',true,false);assert.equal(noteCount,priorNotes,'pause and mute schedule no new notes');
console.log('PASS: mouse / controller mappings, score tiers, ceiling routes, melee variants, timed parry, persistent bosses, super dash and music.');
// Exercise the complete generator and live combat together, without removing obstacles.
let simulatedFrames=0,simulatedKills=0,simulatedScore=0;
for(const seed of [7,29,91]){
 g.resetGame(seed);g.begin();g.heldFire(true);
 for(let f=0;f<3600;f++){
  const s=g.snapshot();if(s.state==='over')break;
  if(f%480===60)g.flipGravity();if(f%155===30)g.dash();
  if(f%43===0)g.pressJump();if(f%197===90&&!s.player.onGround&&s.gravity===1)g.dive();
  g.update();const after=g.snapshot();assert(Number.isFinite(after.player.x)&&Number.isFinite(after.player.y)&&Number.isFinite(after.score),'combined skills must not corrupt physics');assert(after.player.hp>=0&&after.player.hp<=3);simulatedFrames++;
  if(f%150===0)g.draw();
 }
 simulatedKills+=g.snapshot().kills;simulatedScore+=g.snapshot().score;
}
assert(simulatedFrames>900&&simulatedKills>10&&simulatedScore>2000,'full encounters should sustain repeated platforming and combat');
console.log(`Integrated play: ${simulatedFrames} frames, ${simulatedKills} kills, ${simulatedScore} points across 3 seeds.`);
console.log(`PASS: ${crossings} gap crossings; gravity/cooldown, dash, stomp, slam, springs, moving/collapsing platforms, 3 weapon modes, powerups, burst, guardian/reflection, pause/restart, cleanup.`);




