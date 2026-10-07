(() => {
  'use strict';
  const $=id=>document.getElementById(id),canvas=$('game'),art=new window.GrottoArt(canvas);
  const FLOOR=470,H=540,STEP=1000/60,CHAPTER_LENGTH=2800;
  const GRAVITY_COOLDOWN=18,ULTIMATE_COST=12000,TIER_INTERVAL=45*60,ULTIMATE_RATE=150/60;
  const tierThresholds=[0,8000,20000,40000,70000,110000],tierSpeeds=[3.8,3.9,4,4.1,4.2,4.3];
  const powerThresholds=[0,6,18,36,60];
  const difficultyAt=points=>{let tier=0;while(tier<5&&points>=tierThresholds[tier+1])tier++;return tier;};
  const weapons={
    seed:{damage:1,interval:24},scatter:{damage:.6,interval:30},seeker:{damage:1,interval:29},
    boomerang:{damage:1.2,interval:36},blade:{damage:2,finisher:3,interval:28},spear:{damage:2.4,interval:38}
  };
  const isBoss=e=>e.type==='guardian'||e.type==='abyss';
  const names=['苔光入口','遗忘庭院','紫晶深井','沉睡回廊','无声水脉','萤火之海'];
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const intersects=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
  const hash=n=>{const v=Math.sin(n*127.1+19.3)*43758.5453;return v-Math.floor(v);};
  const ui={overlay:$('overlay'),eyebrow:$('overlayEyebrow'),title:$('overlayTitle'),subtitle:$('overlaySubtitle'),start:$('startButton'),label:$('startLabel'),restart:$('restartButton'),hearts:$('hearts'),score:$('scoreCount'),best:$('bestCount'),combo:$('comboCount'),comboFill:$('comboFill'),chapter:$('chapter'),toast:$('toast'),sound:$('soundButton'),pause:$('pauseButton'),hud:$('hud'),distance:$('distance'),mobile:$('mobileControls'),result:$('result')};
  let state='intro',tick=0,cameraX=0,player,seed=1,runTime=0;
  let grounds=[],stones=[],motes=[],enemies=[],shots=[],particles=[],floaters=[],relics=[],hazards=[],springs=[],bolts=[],shockwaves=[],ceilings=[];
  let energy=0,rushTimer=0,airChain=0,bossKills=0,hitstop=0,attackId=0,runBest=0;
  let dashTimer=0,dashCooldown=0,gravity=1,gravityTimer=0,gravityCooldown=0;
  let weapon='seed',weaponTimer=0,magnetTimer=0;
  let power=0,powerXP=0;
  let parryTimer=0,parryCooldown=0,parryFlash=0,ultimateTimer=0,ultimateCharge=0,ultimatePending=0,lastUltimateDistance=96,meleeChain=0,meleeChainTimer=0;
  let inputDevice='keyboard',musicMode='explore',pads=null;
  const music=new window.GrottoMusic();
  let currentTier=0,lastTierAt=0,lastBossRoom=0,lastEliteRoom=0,lastRoom='',lastLoot='',dryRooms=0;
  let island=0,nextEdge=1000,maxDistance=96,score=0,bonus=0,best=0;
  let pickups=0,kills=0,combo=0,comboTimer=0,chapter=0,shotCooldown=0,toastTimer=0,shake=0,flash=0;
  let soundEnabled=true,audioContext=null,newRecord=false,ambientClock=0;
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const portrait=()=>window.matchMedia('(max-width:760px) and (orientation:portrait)').matches&&!document.fullscreenElement;
  const held={left:false,right:false,jump:false,shoot:false};
  try{const n=Number(localStorage.getItem('lumen-grotto-best'));best=Number.isFinite(n)?Math.max(0,Math.floor(n)):0;soundEnabled=localStorage.getItem('lumen-grotto-sound')!=='off';}catch(_){}
  const rand=n=>hash(n+seed);
  function growPower(amount){
    powerXP+=amount;const before=power;
    while(power<4&&powerXP>=powerThresholds[power+1])power++;
    if(power>before){burst(player.x+12,player.y+16,'#ffe3a0',32,4);floating('火力 '+['I','II','III','IV'][power-1],player.x+12,player.y-30,'#ffe3a0');tone(420+power*110,.28,'triangle',.04,1.6);updateHud();}
  }
  const attackScale=()=>1+power*.25+(rushTimer>0?.35:0);
  const attackInterval=()=>Math.max(8,Math.round(weapons[weapon].interval*(1-power*.1)*(rushTimer>0?.65:1)));
  function updateDifficulty(){
    if(currentTier<difficultyAt(score)&&runTime-lastTierAt>=TIER_INTERVAL&&!enemies.some(e=>e.alive&&e.active&&isBoss(e))){
      currentTier++;lastTierAt=runTime;
    }
  }
  function chargeUltimate(points){
    if(state!=='playing'||ultimateTimer>0||ultimateCharge>=ULTIMATE_COST)return;
    ultimatePending=Math.min(ULTIMATE_COST-ultimateCharge,ultimatePending+Math.min(600,Math.max(0,points)));
  }
  function pickLoot(n,opening=false){
    const weights=opening?[['scatter',1],['seeker',1],['boomerang',1],['blade',1],['spear',1]]:
      [['scatter',12],['seeker',12],['boomerang',12],['blade',12],['spear',12],['heart',20],['shield',14],['magnet',10]];
    const choices=weights.filter(([type])=>type!==lastLoot);let roll=rand(n*131+877)*choices.reduce((sum,[,w])=>sum+w,0);
    for(const [type,weight] of choices){roll-=weight;if(roll<0){lastLoot=type;return type;}}
    return choices[choices.length-1][0];
  }
  function dropLoot(x,width,n){
    if(rand(n*193+62)>.88&&dryRooms<1){dryRooms++;return;}dryRooms=0;
    const available=stones.filter(p=>p.x>=x+40&&p.x+p.w<x+width-30&&!p.ceiling&&!p.moving&&!p.gone);
    const lane=rand(n*157+61);let px=x+70+rand(n*211+67)*(width-140),py=435;
    if(lane>.76){py=163;}
    else if(lane>.52&&available.length){const p=available[Math.floor(rand(n*163+71)*available.length)];px=p.x+p.w/2;py=p.y-28;}
    if(py===435){for(let i=0;i<8&&hazards.some(h=>!h.down&&h.x<px+45&&h.x+h.w>px-45);i++)px=x+65+rand(n*223+i*17)*(width-130);}
    powerup(px,py,pickLoot(n));
  }
  function roomKind(n,tier){
    const occupied=enemies.some(e=>e.alive&&isBoss(e));
    if(!occupied&&tier>=2&&runTime>=120*60&&n-lastBossRoom>=12&&n>=18&&rand(n*317)<.22){lastBossRoom=n;lastEliteRoom=n;return 'abyss';}
    if(!occupied&&tier>=1&&runTime>=75*60&&n-lastEliteRoom>=8&&rand(n*331)<.2){lastEliteRoom=n;return 'guardian';}
    const pool=tier===0?['canopy','garden','steps']:tier===1?['canopy','garden','steps','crossing','teeth']:['canopy','garden','steps','crossing','teeth','flock','collapse'];
    // A rest room regularly separates dense layouts, but its contents remain random.
    if(n%5===0&&rand(n*349)<.7)return 'garden';
    const choices=pool.filter(k=>k!==lastRoom);return choices[Math.floor(rand(n*79)*choices.length)];
  }
  function addPack(x,width,tier,n,kind){
    // Groups of fragile enemies reward growing firepower without adding more bullet emitters.
    const count=kind==='garden'?2:3+Math.min(4,tier);
    const ceilingLane=rand(n*401)>.52;
    for(let i=0;i<count;i++){
      const px=x+220+i*Math.min(56,(width-300)/count);
      if(ceilingLane){
        const roof=ceilings.find(p=>p.x<=px&&p.x+p.w>=px+31&&!p.gone);
        if(roof){const e=addEnemy(px,px-18,px+25,'clinger',.35,roof.y+roof.h);e.fodder=true;e.ceiling=true;e.baseY=e.y;}
      }else if(!hazards.some(h=>!h.down&&h.x<px+45&&h.x+h.w>px-15)){
        const e=addEnemy(px,px-18,px+28,'crawler',.45,FLOOR-25);e.fodder=true;
      }
    }
    if(tier>=2&&kind!=='garden')for(let i=0;i<2;i++){const e=addEnemy(x+width-180+i*56,x+width-200+i*56,x+width-150+i*56,'bat',.4,300+i*35);e.fodder=true;}
  }
  function addMote(x,y,phase=0,rare=false){motes.push({x,y,phase,rare,got:false});}
  function addEnemy(x,left,right,type='crawler',speed=.75,y){const e={x,y:y??(type==='bat'?348:FLOOR-25),w:31,h:25,left,right,type,speed,dir:-1,alive:true,phase:x*.02,baseY:y??348,hp:type==='charger'?2:1,hit:0,windup:0,charge:0,clock:0,lastSlash:-1};enemies.push(e);return e;}
  function ledge(x,y,w=100,crumble=false){const p={x,y,w,h:21,type:crumble?'crumble':'stone',crack:0,gone:0};stones.push(p);return p;}
  function thorns(x,w=48){hazards.push({x,y:450,w,h:20,dead:false});}
  function spring(x,y=452){springs.push({x,y,w:34,h:18,compress:0});}
  function trail(x,y,count=4,rare=false,step=28){for(let i=0;i<count;i++)addMote(x+i*step,y-Math.sin(i/(count-1)*Math.PI)*16,i,rare);}
  function powerup(x,y,type){relics.push({x,y,type,got:false});}
  function addRoof(x,y,w,type='ceiling'){const p={x,y,w,h:25,type,ceiling:true,crack:0,gone:0};ceilings.push(p);return p;}
  function roofRoute(edge,x,width,tier,n){
    if(tier===0||(tier===1&&rand(n*19)<.55)){addRoof(edge-4,105,width+x-edge+8);trail(x+105,163,4,true,35);return;}
    const breakX=x+135,gap=70+tier*13;
    addRoof(edge-4,105,breakX-edge+4);
    const right=addRoof(breakX+gap,105,x+width-breakX-gap+4,n%3===0?'crumble':'ceiling');
    if(n%3===1){const p=ledge(breakX+12,195,78);p.moving=true;p.baseY=195;p.phase=n;p.ceiling=true;}
    else ledge(breakX+20,228,90,n%3===2).ceiling=true;
    trail(breakX-42,189,4,true,30);trail(right.x+20,162,4,true,26);
    if(tier>=2)hazards.push({x:x+48,y:130,w:30+tier*4,h:19,dead:false,down:true});
    if(tier>=2||rand(n*71)<.45){const e=addEnemy(right.x+35,right.x+12,Math.max(right.x+15,x+width-42),tier>=2&&n%2===0?'turret':'clinger',.55+tier*.08,130);e.y=130;e.baseY=130;e.ceiling=true;e.cooldown=155;e.windup=0;}
    if(tier>=4){const p=ledge(x+width-90,256,72,true);p.ceiling=true;addEnemy(x+width-87,x+width-110,x+width-46,'bat',.6,214);}
  }
  function spawnBoss(type,x,tier){const e=addEnemy(x+380,x,x+1000,type,0,320);Object.assign(e,{w:type==='abyss'?120:62,h:type==='abyss'?94:58,hp:type==='abyss'?42+tier*5:9+tier*2,maxHp:type==='abyss'?42+tier*5:9+tier*2,arenaStart:x,active:false,cooldown:90,pattern:0,phase:1,tier,aimY:300});return e;}
  function generateAhead(target){
    while(nextEdge<target){
      const n=++island,tier=currentTier,difficulty=tier/8,kind=roomKind(n,tier),special=kind==='crossing',bossRoom=kind==='guardian'||kind==='abyss';
      const gap=special?230+Math.floor(rand(n*17)*36):80+Math.floor(rand(n*31)*49);
      const x=nextEdge+gap,width=bossRoom?1100:560+Math.floor(rand(n*43)*150),shift=Math.floor(rand(n*53)*44)-22,high=285+Math.floor(rand(n*59)*56);
      grounds.push({x,y:FLOOR,w:width,h:70,type:'ground',decor:rand(n*71)>.55,kind});
      if(bossRoom||kind==='garden'){addRoof(nextEdge-4,105,width+gap+8);trail(x+105,163,4,true,35);}
      else roofRoute(nextEdge,x,width,tier,Math.floor(rand(n*97)*10000));
      if(special){const bridge=ledge(nextEdge+58,430,gap-110);bridge.bridge=true;addMote(nextEdge+gap*.5,397,n,true);}
      else for(let i=0;i<3;i++)addMote(nextEdge+gap*(i+1)/4,395-Math.sin((i+1)/4*Math.PI)*14,n+i);
      trail(x+38,435,3);
      if(kind==='canopy'){
        spring(x+85+shift);ledge(x+172+shift,high,122);ledge(x+350+shift,high-48,105,tier>=2);trail(x+186+shift,high-30,4,true);trail(x+360+shift,high-78,3,true);
        addEnemy(x+265,x+220,x+width-65,tier>=2?'charger':'crawler',.5+difficulty);if(tier>=2)thorns(x+410,42);
      }else if(kind==='steps'){
        ledge(x+120+shift,374,110);ledge(x+285+shift,316,115);trail(x+138+shift,345,3,true);trail(x+302+shift,287,3,true);
        if(tier>0)spring(x+70);addEnemy(x+width-100,x+width-140,x+width-50,'crawler',.5+difficulty);
      }else if(kind==='teeth'){
        thorns(x+168+shift,36);if(tier>=3)thorns(x+370,46);ledge(x+125+shift,364,115);trail(x+140+shift,337,3,true);addEnemy(x+290,x+265,x+330,'crawler',.6+difficulty);
      }else if(kind==='crossing'){
        ledge(x+155,345,135,tier>=3);trail(x+173,314,4,true);addEnemy(x+340,x+310,x+width-50,tier>=3?'charger':'crawler',.6);spring(x+width-77);
      }else if(kind==='flock'){
        if(tier>=3)thorns(x+205,70);spring(x+70+shift);for(let i=0;i<(tier>=4?3:2);i++)addEnemy(x+210+i*110,x+190+i*110,x+230+i*110,'bat',.2,335-i%2*44);trail(x+215,270,5,true);ledge(x+410,340,100);
      }else if(kind==='collapse'){
        spring(x+70);for(let i=0;i<3;i++){ledge(x+170+i*115,345-i%2*35,90,true);trail(x+185+i*115,315-i%2*35,2,true);}thorns(x+240,40);if(tier>=4)thorns(x+445,40);
      }else if(kind==='garden'){
        ledge(x+145+shift,369,140);trail(x+165+shift,340,4,true);trail(x+310,423,5);
      }else{
        spawnBoss(kind,x,tier);spring(x+170);ledge(x+460,337,130);spring(x+740);trail(x+470,303,4,true);
      }
      if(tier>=3&&!bossRoom&&kind!=='garden'&&rand(n*101)<.45)addEnemy(x+width-84,x+width-120,x+width-37,'crawler',.7+difficulty);
      if(tier>=5&&!bossRoom&&kind!=='garden'&&rand(n*103)<.4)addEnemy(x+330,x+290,x+385,'bat',.7,270);
      if(tier>=2&&!bossRoom&&rand(n*107)<.3){const p=ledge(x+width-150,310,96);p.moving=true;p.baseY=310;p.phase=rand(n*109)*6.28;}
      if(!bossRoom){addPack(x,width,tier,n,kind);dropLoot(x,width,n);}
      addMote(x+width-48,433,n*2);lastRoom=kind;nextEdge=x+width;
    }
  }
  function trimBehind(){const limit=player.x-1050;grounds=grounds.filter(v=>v.x+v.w>limit);stones=stones.filter(v=>v.x+v.w>limit);ceilings=ceilings.filter(v=>v.x+v.w>limit);motes=motes.filter(v=>v.x>limit&&!v.got);enemies=enemies.filter(v=>v.alive&&(v.x>limit||(isBoss(v)&&v.active)));relics=relics.filter(v=>v.x>limit&&!v.got);hazards=hazards.filter(v=>v.x>limit&&!v.dead);springs=springs.filter(v=>v.x>limit);}
  function resetGame(fixedSeed){
    seed=fixedSeed===undefined?(typeof crypto!=='undefined'&&crypto.getRandomValues?crypto.getRandomValues(new Uint32Array(1))[0]:Math.floor(Math.random()*4294967296)):fixedSeed;
    state='intro';currentTier=0;lastTierAt=0;lastBossRoom=0;lastEliteRoom=0;lastRoom='';lastLoot='';dryRooms=0;power=0;powerXP=0;
    grounds=[{x:-500,y:FLOOR,w:1500,h:70,type:'ground',decor:true}];
    stones=[];motes=[];enemies=[];shots=[];particles=[];floaters=[];relics=[];hazards=[];springs=[];bolts=[];shockwaves=[];ceilings=[{x:-500,y:105,w:1504,h:25,type:'ceiling'}];
    const startShift=Math.floor(rand(902)*100);trail(220,428,4);ledge(590+startShift,345,135);trail(606+startShift,315,4,true);spring(490+startShift);powerup(290+rand(907)*130,433,pickLoot(0,true));
    for(const px of [540,610,820]){const e=addEnemy(px,px-20,px+25,'crawler',.45);e.fodder=true;}
    for(const px of [680,745,850]){const e=addEnemy(px,px-18,px+25,'clinger',.35,130);e.fodder=true;e.ceiling=true;}
    score=0;bonus=0;island=0;nextEdge=1000;generateAhead(2000);
    player={x:96,y:438,w:25,h:32,vx:tierSpeeds[0],vy:0,hp:3,onGround:true,coyote:7,jumpBuffer:0,jumps:0,inv:0,walk:0,safeX:96,slash:0,shield:0,diving:false,trail:[]};
    trail(260,163,6,true,38);energy=0;rushTimer=0;airChain=0;bossKills=0;hitstop=0;attackId=0;runBest=best;dashTimer=0;dashCooldown=0;gravity=1;gravityTimer=0;gravityCooldown=0;
    weapon='seed';weaponTimer=0;magnetTimer=0;parryTimer=0;parryCooldown=0;parryFlash=0;ultimateTimer=0;ultimateCharge=0;ultimatePending=0;lastUltimateDistance=96;meleeChain=0;meleeChainTimer=0;musicMode='explore';
    cameraX=portrait()?-270:0;maxDistance=96;score=0;bonus=0;pickups=0;kills=0;combo=0;comboTimer=0;chapter=0;newRecord=false;runTime=0;shotCooldown=0;toastTimer=0;shake=0;flash=0;ambientClock=0;ui.toast.classList.remove('show');clearInput();updateHud();
  }
  function clearInput(){Object.keys(held).forEach(k=>held[k]=false);document.querySelectorAll('[data-control]').forEach(b=>b.classList.remove('pressed'));if(player)player.jumpBuffer=0;}
  function setOverlay(kind){
    state=kind;ui.overlay.dataset.state=kind;ui.overlay.classList.toggle('hidden',kind==='playing');
    const active=kind==='playing';ui.hud.hidden=!active;ui.distance.hidden=!active;ui.mobile.hidden=!active;ui.pause.disabled=kind==='intro'||kind==='over';ui.pause.setAttribute('aria-label',kind==='paused'?'继续游戏':'暂停游戏');ui.pause.title=kind==='paused'?'继续（P）':'暂停（P）';
    ui.result.hidden=kind!=='over';ui.restart.hidden=kind!=='paused';
    if(!active)clearInput();
    if(kind==='intro'){ui.eyebrow.innerHTML='<i></i> GLIMMER ABYSS';ui.title.innerHTML='微光<span>之渊</span>';ui.subtitle.textContent='跃入幽暗，追逐微光。';ui.label.textContent='跃入深渊';}
    if(kind==='paused'){ui.eyebrow.textContent='PAUSED';ui.title.innerHTML='稍作<span>停留</span>';ui.subtitle.textContent='微光会等你。';ui.label.textContent='继续旅程';}
    if(kind==='over'){ui.eyebrow.textContent=newRecord?'NEW RECORD':'ONCE MORE';ui.title.innerHTML='旅程<span>未完</span>';$('resultScore').textContent=score.toLocaleString();$('resultStats').textContent=`${distance()} 米 · ${kills} 击败${bossKills?' · '+bossKills+' 守井兽':''}`;ui.label.textContent='再来一次';}
    syncMusic();updateHud();
  }
  function begin(){if(state==='over')resetGame();setOverlay('playing');canvas.focus({preventScroll:true});if(soundEnabled&&audioContext?.state==='suspended')audioContext.resume();tone(440,.2,'sine',.04,1.5);syncMusic();}
  function togglePause(){if(state==='playing'){saveBest();setOverlay('paused');}else if(state==='paused')begin();}
  function tone(freq,duration=.11,type='sine',volume=.035,slide=1){
    if(!soundEnabled)return;
    try{audioContext ||= new (window.AudioContext||window.webkitAudioContext)();const o=audioContext.createOscillator(),gain=audioContext.createGain();o.type=type;o.frequency.setValueAtTime(freq,audioContext.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(40,freq*slide),audioContext.currentTime+duration);gain.gain.setValueAtTime(.0001,audioContext.currentTime);gain.gain.exponentialRampToValueAtTime(volume,audioContext.currentTime+.008);gain.gain.exponentialRampToValueAtTime(.0001,audioContext.currentTime+duration);o.connect(gain).connect(audioContext.destination);o.onended=()=>{o.disconnect();gain.disconnect();};o.start();o.stop(audioContext.currentTime+duration);}catch(_){}
  }
  function syncMusic(){
    musicMode=ultimateTimer>0?'ultimate':enemies.some(e=>e.alive&&e.active&&e.type==='abyss')?'boss':enemies.some(e=>e.alive&&e.active&&e.type==='guardian')?'elite':'explore';
    if(audioContext&&music.ctx!==audioContext)music.start(audioContext);
    music.update(musicMode,state==='playing',soundEnabled);
  }
  function setDevice(device){
    if(inputDevice===device)return;inputDevice=device;updateHud();
  }
  function say(message,duration=100){ui.toast.textContent=message;ui.toast.classList.add('show');toastTimer=duration;}
  function burst(x,y,color,count=11,speed=2.5){for(let i=0;i<count;i++){const a=i/count*Math.PI*2+hash(i+tick)*.2,v=speed*(.45+hash(i+tick*3)*.8);particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-.4,life:26+Math.floor(hash(i+tick+71)*15),max:41,color,size:1+Math.floor(hash(i+17)*3)});}if(particles.length>250)particles.splice(0,particles.length-250);}
  function floating(text,x,y,color='#ece3b0'){floaters.push({text,x,y,life:46,color});}
  function multiplier(){return Math.min(5,1+Math.floor(combo/4))*(rushTimer>0?2:1);}
  function distance(){return Math.max(0,Math.floor((maxDistance-96)/10));}
  function award(points,x,y){chargeUltimate(points);combo++;comboTimer=270;const gain=points*multiplier();bonus+=gain;score=Math.floor((maxDistance-96)/4)+bonus;if(x!==undefined)floating('+'+gain,x,y);}
  function charge(amount){if(rushTimer>0)return;energy=Math.min(100,energy+amount);if(energy>=100){energy=0;rushTimer=480;burst(player.x+12,player.y+16,'#ffd993',38,4);say('萤火爆发',80);tone(330,.5,'triangle',.055,2.5);}}
  let lastHealth=-1;
  function updateHud(){
    if(!player)return;
    if(lastHealth!==player.hp){ui.hearts.innerHTML=[0,1,2].map(i=>`<span class="${i<player.hp?'':'lost'}">♥</span>`).join('');ui.hearts.setAttribute('aria-label',`生命值 ${player.hp}`);lastHealth=player.hp;}
    ui.score.textContent=String(score).padStart(6,'0');ui.best.textContent=String(Math.max(best,score)).padStart(6,'0');ui.combo.textContent='×'+multiplier();ui.combo.style.opacity=combo>0?'1':'.4';ui.comboFill.style.width=(comboTimer/270*100)+'%';ui.chapter.textContent=['I','II','III','IV','V','VI'][currentTier]+' / '+names[chapter%names.length];ui.distance.textContent=distance()+' m';
    $('rushFill').style.width=(rushTimer>0?rushTimer/480*100:energy)+'%';$('rushMeter').classList.toggle('active',rushTimer>0);$('rushLabel').textContent=rushTimer>0?'爆发':'萤火';
    $('dashFill').style.width=(1-dashCooldown/150)*100+'%';$('gravityFill').style.width=(1-gravityCooldown/GRAVITY_COOLDOWN)*100+'%';$('gravityLabel').textContent=gravity===-1?'倒悬':'重力';$('gameShell').classList.toggle('inverted',gravity===-1);$('gameShell').classList.toggle('rushing',rushTimer>0);
    $('parryFill').style.width=(1-parryCooldown/54)*100+'%';
    $('ultimateFill').style.width=(ultimateTimer>0?ultimateTimer/150:ultimateCharge/ULTIMATE_COST)*100+'%';
    $('ultimateMeter').classList.toggle('ready',ultimateCharge>=ULTIMATE_COST);
    $('ultimateLabel').textContent=ultimateTimer>0?'超冲':ultimateCharge>=ULTIMATE_COST?'就绪':'大招';
    $('keyboardControls').hidden=inputDevice==='gamepad';$('gamepadControls').hidden=inputDevice!=='gamepad';
    for(const [id,key,pad] of [['dashKey','⇧','LT'],['gravityKey','右键','RT'],['parryKey','Q','LB'],['ultimateKey','F','Y']])$(id).textContent=inputDevice==='gamepad'?pad:key;
    $('weaponLabel').textContent=((weapon==='seed'?(power?'微光':''):({scatter:'散射',seeker:'追踪',boomerang:'回旋刃',blade:'辉刃',spear:'裂枪'})[weapon])+(power?' · '+['I','II','III','IV'][power-1]:''));$('weaponLabel').style.opacity=weapon!=='seed'&&weaponTimer<120?'.5':'1';
  }
  function pressJump(){if(state==='playing')player.jumpBuffer=8;}
  function doJump(){
    if(player.diving)return false;
    const grounded=player.onGround||player.coyote>0;
    if(!grounded&&player.jumps>=2)return false;
    player.jumps=grounded?1:2;player.vy=(grounded?-10.5:-9.2)*gravity;player.onGround=false;player.coyote=0;player.jumpBuffer=0;
    burst(player.x+12,player.y+30,grounded?'#b8d9a4':'#eee0b4',grounded?8:16,grounded?1.8:2.5);tone(grounded?380:560,.15,'sine',.035,1.6);return true;
  }
  function shoot(){
    if(state!=='playing'||shotCooldown>0)return;
    if(ultimateTimer<=0&&(weapon==='blade'||weapon==='spear')){
      meleeChain=meleeChainTimer>0?(meleeChain+1)%3:0;meleeChainTimer=65;attackId++;
      player.slash=12;player.meleeRange=(weapon==='spear'?145:meleeChain===2?112:88)+power*15;player.meleeDamage=(weapon==='blade'&&meleeChain===2?weapons.blade.finisher:weapons[weapon].damage)*attackScale();
      shotCooldown=attackInterval();tone(310,.12,'triangle',.03,1.8);return;
    }
    shotCooldown=ultimateTimer>0?7:attackInterval();
    const kind=ultimateTimer>0?'seeker':weapon,multi=power>=2||rushTimer>0;
    const angles=ultimateTimer>0?[-.3,-.15,0,.15,.3]:kind==='scatter'?(multi?[-.3,-.15,0,.15,.3]:[-.24,0,.24]):multi?[-.12,0,.12]:[0];
    for(const a of angles){const speed=ultimateTimer>0?20:rushTimer>0?16:13;shots.push({x:player.x+29,y:player.y+16,vx:speed*Math.cos(a),vy:speed*Math.sin(a),damage:ultimateTimer>0?2:weapons[kind].damage*attackScale(),life:kind==='boomerang'?90:kind==='seeker'?48:38,age:0,kind,power,pierce:power>=3||rushTimer>0||ultimateTimer>0||kind==='boomerang',hits:new Set()});}
    burst(player.x+30,player.y+17,'#e7e5b1',4,1.2);tone(570,.11,'triangle',.028,.7);
  }
  function collectPowerup(r){r.got=true;const type=r.type||'shield';if(['scatter','seeker','boomerang','blade','spear'].includes(type)){weapon=type;weaponTimer=1800;growPower(2);}else if(type==='magnet')magnetTimer=720;else if(type==='heart')player.hp=Math.min(3,player.hp+1);else player.shield=1;award(120,r.x,r.y-20);charge(12);burst(r.x,r.y,'#c8dea8',24,3);say(({scatter:'散射','seeker':'追踪',boomerang:'回旋刃',blade:'辉刃',spear:'裂枪',magnet:'磁吸',heart:'+1 ♥',shield:'萤火护盾'})[type],70);tone(540,.3,'sine',.045,2);updateHud();}
  function dive(){if(state!=='playing'||player.onGround||player.diving)return;player.diving=true;player.vy=15*gravity;player.coyote=0;player.jumpBuffer=0;tone(390,.18,'triangle',.04,.35);burst(player.x+12,player.y,'#ffe0ac',10,2);}
  function bounce(strength=-12.8){player.vy=strength*gravity;player.diving=false;player.onGround=false;player.coyote=0;player.jumps=1;player.jumpBuffer=0;burst(player.x+12,player.y+(gravity===1?31:0),'#e5d5a0',13,2.8);}
  function dash(){if(state!=='playing'||dashCooldown>0)return;dashTimer=12;dashCooldown=150;player.diving=false;player.vy=0;player.jumps=Math.min(player.jumps,1);player.inv=Math.max(player.inv,14);burst(player.x,player.y+16,'#c1e6de',16,3);tone(260,.16,'sawtooth',.025,2);updateHud();}
  function flipGravity(){
    if(state!=='playing'||gravityCooldown>0)return;
    gravity*=-1;gravityTimer=0;gravityCooldown=GRAVITY_COOLDOWN;player.vy=7*gravity;player.onGround=false;player.coyote=0;player.jumps=1;player.diving=false;
    burst(player.x+12,player.y+16,'#c6b0f2',18,2);tone(180,.18,'sine',.04,3);updateHud();
  }
  function parry(){
    if(state!=='playing'||parryCooldown>0||ultimateTimer>0)return;
    parryTimer=10;parryCooldown=54;tone(790,.09,'triangle',.02,1.4);updateHud();
  }
  function reflect(b){
    let target=b.owner?.alive?b.owner:null;
    if(!target)target=enemies.find(e=>e.alive&&(!isBoss(e)||e.active)&&e.x>player.x);
    const a=target?Math.atan2(target.y+target.h/2-b.y,target.x+target.w/2-b.x):Math.atan2(-b.vy,-b.vx);
    b.reflected=true;b.vx=Math.cos(a)*12;b.vy=Math.sin(a)*12;b.life=100;
  }
  function parrySuccess(e){
    parryTimer=0;parryFlash=15;player.inv=Math.max(player.inv,18);dashCooldown=0;charge(12);award(100,player.x+12,player.y-20);
    if(e){damageEnemy(e,3);e.charge=0;e.stagger=32;}
    burst(player.x+12,player.y+16,'#d6faff',25,4);tone(920,.2,'sine',.05,1.6);shake=3;
  }
  function ultimate(){
    if(state!=='playing'||ultimateCharge<ULTIMATE_COST||ultimateTimer>0)return;
    ultimateCharge=0;ultimatePending=0;ultimateTimer=150;dashTimer=0;player.diving=false;player.slash=0;player.jumpBuffer=0;player.inv=Math.max(player.inv,150);player.vy=0;
    burst(player.x+12,player.y+16,'#ffe5a1',45,5);say('微光超冲',70);tone(220,.6,'triangle',.06,4);syncMusic();updateHud();
  }
  function restoreGravity(){gravity=1;gravityTimer=0;player.vy=0;player.onGround=false;player.coyote=0;player.jumps=1;player.diving=false;updateHud();}
  function impact(x,y){shockwaves.push({x,y,life:20});shake=6;hitstop=4;burst(x,y,'#ead2a3',26,4);tone(130,.2,'triangle',.065,.5);for(const e of enemies)if(e.alive&&Math.abs(e.x+e.w/2-x)<108&&Math.abs(e.y+e.h-y)<72)damageEnemy(e,2);for(const h of hazards)if(!h.dead&&Math.abs(h.x+h.w/2-x)<100){h.dead=true;award(45,h.x+h.w/2,h.y-10);charge(7);burst(h.x+h.w/2,h.y,'#de95b4',16,3);}}
  function damageEnemy(e,damage=1,projectile=false,blast=false){if(!e.alive||(!projectile&&e.hit>0))return false;e.hp=(e.hp??1)-damage;e.hit=9;if(e.hp<=.00001)defeat(e,blast);else{burst(e.x+e.w/2,e.y+e.h/2,'#f0bf91',8,2);shake=2;tone(210,.07,'square',.018,1.5);}return true;}
  function defeat(e,blast=false){
    if(!e.alive)return;e.alive=false;kills++;growPower(isBoss(e)?6:1);
    award(e.type==='abyss'?3500:e.type==='guardian'?1000:e.type==='bat'?120:e.type==='charger'?150:80,e.x+e.w/2,e.y-8);
    charge(isBoss(e)?55:15);if(rushTimer>0)rushTimer=Math.min(480,rushTimer+12);dashCooldown=Math.max(0,dashCooldown-12);
    burst(e.x+e.w/2,e.y+e.h/2,e.type==='bat'?'#c2b0d4':'#e8b39b',isBoss(e)?50:21,3.6);shake=isBoss(e)?8:3;hitstop=Math.max(hitstop,isBoss(e)?8:blast?0:1);tone(240,.14,'triangle',.04,1.8);
    if(!blast&&(power>=4||rushTimer>0)){
      const x=e.x+e.w/2,y=e.y+e.h/2;shockwaves.push({x,y,life:20,blast:true});
      for(const other of enemies)if(other.alive&&(!isBoss(other)||other.active)&&Math.hypot(other.x+other.w/2-x,other.y+other.h/2-y)<115)damageEnemy(other,isBoss(other)?1:2,true,true);
    }
    if(isBoss(e)){bossKills++;player.hp=Math.min(3,player.hp+1);for(const b of bolts)if(b.owner===e)b.life=0;for(const h of hazards)if(h.owner===e)h.dead=true;say(e.type==='abyss'?'噬光之母击破':'守井兽击破',110);syncMusic();}
    if(!player.onGround&&player.jumps>=1){player.jumps=1;floating('再跃',player.x+12,player.y-13,'#cbe8ad');}
  }
  function saveBest(){if(score>best){best=score;try{localStorage.setItem('lumen-grotto-best',String(best));}catch(_){}}}
  function hurt(fell=false){
    if(state!=='playing'||ultimateTimer>0||(!fell&&player.inv>0))return;
    if(!fell&&player.shield>0){player.shield=0;player.inv=75;burst(player.x+12,player.y+15,'#cae8b6',25,3);tone(680,.18,'sine',.05,.5);return;}
    player.hp--;combo=0;comboTimer=0;airChain=0;energy=Math.max(0,energy-25);player.diving=false;shake=6;flash=10;tone(170,.24,'sawtooth',.025,.45);burst(player.x+12,player.y+16,'#e79d87',18,3);
    if(player.hp<=0){score=Math.floor((maxDistance-96)/4)+bonus;newRecord=score>runBest;saveBest();setOverlay('over');ui.toast.classList.remove('show');toastTimer=0;}
    else if(fell){const landing=grounds.find(p=>p.x>player.x-40)||grounds.find(p=>p.x+p.w>player.safeX);player.x=landing?landing.x+38:player.safeX;player.y=438;player.vx=tierSpeeds[currentTier];player.vy=0;player.inv=120;player.jumps=0;player.onGround=true;player.coyote=7;player.jumpBuffer=0;cameraX=player.x-(portrait()?365:245);say('失足 · −1 ♥',80);}
    else{player.vy=-4.5*gravity;player.inv=120;}
    updateHud();
  }
  function fireFan(e,count=1,speed=4,spread=.2){
    const limit=currentTier<3?8:currentTier<5?12:18,free=limit-bolts.filter(b=>!b.reflected&&b.life>0).length;count=Math.min(count,Math.max(0,free));
    const x=e.x+e.w/2,y=e.y+e.h/2,a=Math.atan2((e.aimY??player.y+16)-y,player.x+12-x);
    for(let i=0;i<count;i++){const angle=a+(i-(count-1)/2)*spread;bolts.push({x,y,w:12,h:10,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:180,reflected:false,owner:e});}
  }
  function bossBounds(e){
    const left=portrait()?277:0,right=portrait()?683:960;
    e.x=clamp(e.x,cameraX+left+30,cameraX+right-e.w-20);
  }
  function updateEnemy(e){
    if(!e.alive)return;if(e.hit>0)e.hit--;
    const tier=currentTier,slow=1;
    if(e.stagger>0){e.stagger--;return;}
    if(isBoss(e)){
      if(!e.active){
        if(player.x<e.arenaStart+15)return;
        // Keep one boss encounter active so persistent pursuers cannot pile up.
        if(enemies.some(other=>other!==e&&other.alive&&other.active&&isBoss(other))){e.alive=false;return;}
        e.active=true;e.x=player.x+(portrait()?155:230);say(e.type==='abyss'?'噬光之母':'守井兽',90);tone(110,.5,'triangle',.045,.7);
      }
      const big=e.type==='abyss',nextPhase=big?(e.hp/e.maxHp>.6?1:e.hp/e.maxHp>.3?2:3):1;
      if(nextPhase!==e.phase){e.phase=nextPhase;burst(e.x+e.w/2,e.y+e.h/2,'#f1a1cf',35,4);shake=5;e.cooldown=Math.max(60,e.cooldown);}
      const melee=weapon==='blade'||weapon==='spear',offset=melee?(big?100:82):big?(portrait()?150:250):(portrait()?165:230),target=player.x+offset;
      e.x+=(target-e.x)*.13;e.y+=(clamp(player.y+(big?-28:-8),132,big?370:408)+Math.sin(tick*.027)*8-e.y)*.035;
      bossBounds(e);e.cooldown-=slow;
      const wind=big?55:42;
      if(e.cooldown>wind)e.aimY=player.y+16;
      e.windup=e.cooldown<wind?Math.max(1,Math.ceil(e.cooldown)):0;
      if(e.cooldown<=0){
        fireFan(e,big?3+2*(e.phase-1):tier>=3?3:1,big?3.1+e.phase*.25:3.4+tier*.1,big?.25:.2);
        if(big&&e.phase>=2&&e.pattern%2===0){
          const upper=gravity===-1;
          hazards.push({x:player.x-90,y:upper?130:412,w:640,h:upper?56:58,type:'rift',warn:75,life:85,dead:false,owner:e,down:upper});
        }
        if(big&&e.phase===3&&e.pattern%3===1&&enemies.filter(v=>v.alive&&!isBoss(v)&&Math.abs(v.x-player.x)<500).length<6){
          addEnemy(player.x+300,player.x+240,player.x+380,'bat',.8,gravity===1?270:340);
        }
        e.cooldown=big?155-e.phase*10:160-tier*6;e.pattern++;e.windup=0;tone(180,.13,'sawtooth',.02,.65);
      }
      return;
    }
    if(e.x-player.x>650||e.x<player.x-200)return;
    if(e.type==='turret'||e.type==='clinger'){
      if(e.type==='clinger'){e.x+=e.speed*e.dir*slow;if(e.x<e.left||e.x>e.right){e.dir*=-1;e.x=clamp(e.x,e.left,e.right);}}
      if(e.fodder)return;
      e.cooldown=(e.cooldown??120)-slow;
      if(e.cooldown>42)e.aimY=player.y+16;
      e.windup=e.cooldown<42?Math.max(1,Math.ceil(e.cooldown)):0;
      if(e.cooldown<=0){fireFan(e,tier>=4?3:1,3.2+tier*.13,.22);e.cooldown=210-tier*10;e.windup=0;}
      return;
    }
    const canRush=!e.fodder&&(e.type==='charger'||tier>=3);
    if(canRush){
      if(e.charge>0){e.charge--;e.x+=(e.rushDir||-1)*(3.8+tier*.14)*slow;if(e.type==='bat')e.y+=clamp((e.aimY-e.y)*.025,-2,2);}
      else if(e.windup>0){e.windup-=slow;if(e.windup<=0){e.charge=27;e.rushDir=player.x<e.x?-1:1;}}
      else if(e.x>player.x+42&&e.x<player.x+260&&e.clock<=0&&enemies.filter(v=>v.alive&&(v.charge>0||v.windup>0)&&!isBoss(v)).length<2){e.windup=44;e.clock=230;e.aimY=player.y;}
      else e.x+=e.speed*e.dir*slow;
      if(e.clock>0)e.clock--;
    }else e.x+=e.speed*e.dir*slow;
    if(e.charge<=0&&(e.x<e.left||e.x>e.right)){e.dir*=-1;e.x=clamp(e.x,e.left,e.right);}
    if(e.type==='bat'&&e.charge<=0)e.y=e.baseY+Math.sin(tick*.035+e.phase)*20;
    if(tier>=4&&!e.fodder){
      e.fireClock=(e.fireClock??(90+Math.floor(hash(e.x)*70)))-slow;
      if(e.fireClock<42&&e.fireClock>0){e.shooting=true;e.aimY=player.y+16;}
      if(e.fireClock<=0){fireFan(e,tier===5?3:1,3.4,.2);e.fireClock=240;e.shooting=false;}
    }
  }
  function updateProjectiles(){
    for(let i=shots.length-1;i>=0;i--){
      const b=shots[i],oldX=b.x,oldY=b.y;b.age++;b.life--;
      if(b.kind==='seeker'){
        let target=null,dist=420;for(const e of enemies){const d=Math.hypot(e.x+e.w/2-b.x,e.y+e.h/2-b.y);if(e.alive&&(!isBoss(e)||e.active)&&e.x>b.x-35&&d<dist){target=e;dist=d;}}
        if(target){const a=Math.atan2(target.y+target.h/2-b.y,target.x+target.w/2-b.x);b.vx+=(Math.cos(a)*12-b.vx)*.17;b.vy+=(Math.sin(a)*12-b.vy)*.17;}
      }
      if(b.kind==='boomerang'&&b.age>28){if(!b.returning){b.returning=true;b.hits.clear();}b.vx=-10;b.vy=clamp((player.y+16-b.y)*.16,-6,6);if(Math.hypot(b.x-player.x-12,b.y-player.y-16)<24){shots.splice(i,1);continue;}}
      b.x+=b.vx;b.y+=b.vy;let hit=false;
      for(const e of enemies){if(e.alive&&(!isBoss(e)||e.active)&&!b.hits.has(e)&&intersects({x:Math.min(oldX,b.x)-4,y:Math.min(oldY,b.y)-4,w:Math.abs(b.vx)+8,h:Math.abs(b.vy)+8},e)){damageEnemy(e,b.damage??1,true);b.hits.add(e);hit=!b.pierce;if(hit)break;}}
      if(hit||b.life<=0||b.y<0||b.y>540)shots.splice(i,1);
    }
    for(let i=bolts.length-1;i>=0;i--){
      const b=bolts[i];b.x+=b.vx;b.y+=b.vy;b.life--;
      let remove=b.life<=0||b.x<player.x-600||b.x>player.x+1300||b.y<60||b.y>550;
      if(!remove&&b.reflected){for(const e of enemies)if(e.alive&&(!isBoss(e)||e.active)&&intersects(b,e)){damageEnemy(e,3);remove=true;break;}}
      else if(!remove){
        if(parryTimer>0&&Math.hypot(b.x+b.w/2-player.x-12,b.y+b.h/2-player.y-16)<48){reflect(b);parrySuccess();}
        else if(intersects(b,player)){hurt();remove=true;}
      }
      if(remove)bolts.splice(i,1);
    }
  }
  function update(){
    if(!document.hidden&&document.hasFocus?.()!==false)pads?.poll();syncMusic();if(state==='paused')return;tick++;
    if(state!=='playing')return;if(hitstop>0){hitstop--;return;}
    runTime++;updateDifficulty();generateAhead(player.x+1500);if(tick%120===0)trimBehind();
    if(toastTimer>0&&--toastTimer===0)ui.toast.classList.remove('show');if(shotCooldown>0)shotCooldown--;if(player.inv>0)player.inv--;if(player.slash>0)player.slash--;if(shake>0)shake*=.83;if(flash>0)flash--;if(comboTimer>0&&--comboTimer===0)combo=0;
    if(dashTimer>0)dashTimer--;if(dashCooldown>0)dashCooldown--;if(gravityCooldown>0)gravityCooldown--;if(rushTimer>0)rushTimer--;if(weaponTimer>0&&--weaponTimer===0)weapon='seed';if(magnetTimer>0)magnetTimer--;if(parryTimer>0)parryTimer--;if(parryCooldown>0)parryCooldown--;if(parryFlash>0)parryFlash--;if(meleeChainTimer>0)meleeChainTimer--;
    const wasUltimate=ultimateTimer>0;if(ultimateTimer>0&&--ultimateTimer===0){player.vy=0;player.jumps=1;player.inv=Math.max(player.inv,50);}if(held.shoot||pads?.held.shoot||ultimateTimer>0)shoot();
    for(const p of [...stones,...ceilings]){if(p.moving){const old=p.y;p.y=p.baseY+Math.sin(tick*.025+p.phase)*48;if(player.platform===p&&player.onGround)player.y+=p.y-old;}if(p.gone>0)p.gone--;if(p.crack>0&&++p.crack>29){p.gone=180;p.crack=0;burst(p.x+p.w/2,p.y,'#92837c',14,2);if(player.platform===p){player.onGround=false;player.coyote=2;}}}
    for(const s of springs)if(s.compress>0)s.compress--;
    for(const e of enemies)updateEnemy(e);
    const base=tierSpeeds[currentTier]+(rushTimer>0?.25:0),target=base+((held.right||pads?.held.right)?.3:0)-((held.left||pads?.held.left)?.5:0);
    player.vx=ultimateTimer>0?12:dashTimer>0?target+7.2:player.vx+(target-player.vx)*.25;player.walk+=player.vx*.17;player.coyote=player.onGround?7:Math.max(0,player.coyote-1);
    if(player.jumpBuffer>0&&ultimateTimer<=0){if(!doJump())player.jumpBuffer--;}
    const previousBottom=player.y+player.h,previousTop=player.y,wasDiving=player.diving;
    player.x+=player.vx;player.vy=ultimateTimer>0?clamp((265-player.y)*.12,-16,16):dashTimer>0?0:clamp(player.vy+(player.diving?1.2:.48)*gravity,-19,19);player.y+=player.vy;player.onGround=false;player.platform=null;
    if(gravity===1&&player.y<131){player.y=131;player.vy=Math.max(0,player.vy);}
    let bounced=false;
    if(ultimateTimer<=0&&player.vy*gravity>0){
      for(const e of enemies){if(!e.alive||(isBoss(e)&&!e.active)||player.x+player.w<e.x+2||player.x>e.x+e.w-2)continue;
        const stomp=gravity===1?previousBottom<=e.y+11&&player.y+player.h>=e.y:previousTop>=e.y+e.h-11&&player.y<=e.y+e.h;
        if(stomp){player.y=gravity===1?e.y-player.h:e.y+e.h;damageEnemy(e,wasDiving?3:2);airChain++;award((wasDiving?120:55)*Math.min(airChain,5),player.x+12,player.y-15);charge(10);player.inv=Math.max(player.inv,14);bounce(wasDiving?-14:-11.8);bounced=true;floating(airChain>1?'连踏 ×'+airChain:'弹跃',player.x+12,player.y-30,'#f4d796');break;}
      }
      if(!bounced&&gravity===1){for(const s of springs){if(player.x+player.w>s.x&&player.x<s.x+s.w&&previousBottom<=s.y+s.h+1&&previousTop<s.y&&player.y+player.h>=s.y){player.y=s.y-player.h;s.compress=18;bounce(-14.1);bounced=true;charge(4);tone(320,.2,'sine',.05,2.5);break;}}}
    }
    if(ultimateTimer<=0&&!bounced&&player.vy*gravity>=0){
      const surfaces=[...grounds,...ceilings.filter(p=>!p.gone),...stones.filter(p=>!p.gone)].sort((a,b)=>gravity===1?a.y-b.y:(b.y+b.h)-(a.y+a.h));
      for(const p of surfaces){if(player.x+player.w<=p.x+2||player.x>=p.x+p.w-2)continue;const landed=gravity===1?previousBottom<=p.y+4&&player.y+player.h>=p.y:previousTop>=p.y+p.h-4&&player.y<=p.y+p.h;
        if(landed){player.y=gravity===1?p.y-player.h:p.y+p.h;player.vy=0;player.onGround=true;player.jumps=0;player.platform=p;player.diving=false;airChain=0;if(p.type==='ground')player.safeX=Math.max(p.x+30,player.x);if(p.type==='crumble'&&!p.crack)p.crack=1;if(wasDiving){impact(player.x+12,gravity===1?p.y:p.y+p.h);if(p.type==='crumble'){p.gone=180;p.crack=0;player.onGround=false;player.coyote=7;}}break;}
      }
    }
    maxDistance=Math.max(maxDistance,player.x);
    if(player.y>H+24||player.y< -80){if(gravity===-1)restoreGravity();hurt(true);if(state!=='playing')return;}
    for(const m of motes){if(m.got)continue;const d=Math.hypot(player.x+12-m.x,player.y+16-m.y);if((magnetTimer>0||ultimateTimer>0)&&d<(ultimateTimer>0?250:170)){m.x+=(player.x+12-m.x)*.14;m.y+=(player.y+16-m.y)*.14;}if(d<26){m.got=true;pickups++;award(m.rare?60:25);charge(m.rare?7:3);burst(m.x,m.y,m.rare?'#efa9c1':'#eee0a7',7,1.8);tone(720+(pickups%5)*80,.09,'sine',.016,1.25);}}
    for(const r of relics)if(!r.got&&Math.hypot(player.x+12-r.x,player.y+16-r.y)<30)collectPowerup(r);
    for(const e of enemies){if(!e.alive||(isBoss(e)&&!e.active))continue;
      if(ultimateTimer>0&&Math.abs(e.x-player.x)<270)damageEnemy(e,2);
      if(dashTimer>0&&intersects({x:player.x-7,y:player.y-5,w:44,h:42},e))damageEnemy(e,2);
      if(player.slash>0&&e.lastSlash!==attackId&&intersects({x:player.x+10,y:player.y-7-power*3,w:player.meleeRange||88,h:(weapon==='spear'?43:65)+power*6},e)){e.lastSlash=attackId;damageEnemy(e,player.meleeDamage||2);}
    }
    updateProjectiles();if(state!=='playing')return;
    for(const e of enemies)if(e.alive&&(!isBoss(e)||e.active)&&intersects(player,e)){if(parryTimer>0)parrySuccess(e);else hurt();if(state!=='playing')return;}
    for(const h of hazards){
      if(h.dead)continue;
      if(h.type==='rift'){if(h.warn>0)h.warn--;else if(--h.life<=0){h.dead=true;continue;}}
      if(h.warn>0)continue;
      if(intersects(player,h)){
        if((dashTimer>0||ultimateTimer>0)&&h.type!=='rift'){h.dead=true;charge(6);award(45,h.x+h.w/2,h.y-14);burst(h.x+h.w/2,h.y,'#e9a0bb',15,3);}else hurt();
        if(state!=='playing')return;
      }
    }
    for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx;p.y+=p.vy;p.vy+=.055;p.vx*=.987;if(--p.life<=0)particles.splice(i,1);}
    for(let i=floaters.length-1;i>=0;i--){floaters[i].y-=.6;if(--floaters[i].life<=0)floaters.splice(i,1);}
    for(let i=shockwaves.length-1;i>=0;i--)if(--shockwaves[i].life<=0)shockwaves.splice(i,1);
    player.trail.push({x:player.x,y:player.y});if(player.trail.length>9)player.trail.shift();
    score=Math.floor((maxDistance-96)/4)+bonus;const newChapter=Math.floor((maxDistance-96)/CHAPTER_LENGTH);
    if(newChapter>chapter){chapter=newChapter;bonus+=250;score+=250;say(names[chapter%names.length],85);tone(440,.4,'sine',.04,2);}
    const anchor=portrait()?365:245,min=portrait()?-270:0;cameraX+=(Math.max(min,player.x-anchor)-cameraX)*.14;
    for(const e of enemies)if(e.alive&&isBoss(e)&&e.active)bossBounds(e);
    if(!wasUltimate){
      chargeUltimate(Math.max(0,maxDistance-lastUltimateDistance)/4);
      const credit=Math.min(ULTIMATE_RATE,ultimatePending,ULTIMATE_COST-ultimateCharge);
      ultimateCharge+=credit;ultimatePending-=credit;
    }
    lastUltimateDistance=maxDistance;syncMusic();
    if(tick%5===0)updateHud();
  }
  function draw(){art.draw({state,tick,cameraX,player,grounds,stones,ceilings,motes,enemies,shots,particles,floaters,relics,hazards,springs,bolts,shockwaves,chapter,shake,flash,reducedMotion,portrait:portrait(),gravity,gravityTimer,dashTimer,rushTimer,magnetTimer,weapon,parryTimer,parryFlash,ultimateTimer});}
  const moveKeys={KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right'};
  const jumpKeys=['Space','KeyW','ArrowUp'];
  const controls=[...Object.keys(moveKeys),...jumpKeys,'Enter','KeyP','Escape','KeyS','ArrowDown','ShiftLeft','ShiftRight','KeyQ','KeyF'];
  function keydown(e){
    if(e.ctrlKey||e.metaKey||e.altKey)return;
    if(!controls.includes(e.code))return;e.preventDefault();setDevice('keyboard');
    if((e.code==='Enter'||e.code==='Space')&&!e.repeat&&state!=='playing'){begin();return;}
    if(['KeyP','Escape'].includes(e.code)&&!e.repeat){togglePause();return;}
    if(state!=='playing')return;
    if(moveKeys[e.code])held[moveKeys[e.code]]=true;
    if(jumpKeys.includes(e.code)){held.jump=true;if(!e.repeat)pressJump();}
    if(['KeyS','ArrowDown'].includes(e.code)&&!e.repeat)dive();
    if(['ShiftLeft','ShiftRight'].includes(e.code)&&!e.repeat)dash();
    if(e.code==='KeyQ'&&!e.repeat)parry();
    if(e.code==='KeyF'&&!e.repeat)ultimate();
  }
  function cutJump(){if(state==='playing'&&player.vy*gravity< -4)player.vy*=.7;}
  function releaseJump(){held.jump=false;if(!pads?.held.jump)cutJump();}
  function keyup(e){if(moveKeys[e.code])held[moveKeys[e.code]]=false;if(jumpKeys.includes(e.code))releaseJump();}
  document.addEventListener('keydown',keydown);document.addEventListener('keyup',keyup);
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('pointerdown',e=>{
    if(e.pointerType==='touch'||state!=='playing')return;e.preventDefault();setDevice('keyboard');canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);
    if(e.button===0){held.shoot=true;shoot();}else if(e.button===2)flipGravity();
  });
  const releaseMouse=e=>{if(e.type!=='pointerup'||e.button===0)held.shoot=false;};
  canvas.addEventListener('pointerup',releaseMouse);canvas.addEventListener('pointercancel',releaseMouse);canvas.addEventListener('lostpointercapture',releaseMouse);
  pads=new window.GrottoGamepad({device:setDevice,jump:()=>{if(state==='intro'||state==='over')begin();else pressJump();},releaseJump:()=>{if(!held.jump)cutJump();},pause:()=>{if(state==='intro'||state==='over')begin();else togglePause();},dash,gravity:flipGravity,dive,parry,ultimate});
  function suspend(){clearInput();if(state==='playing'){saveBest();setOverlay('paused');}}
  window.addEventListener('blur',suspend);document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();});window.addEventListener('pagehide',saveBest);
  ui.start.addEventListener('click',begin);ui.restart.addEventListener('click',()=>{resetGame();begin();});ui.pause.addEventListener('click',togglePause);
  function soundUI(){ui.sound.classList.toggle('muted',!soundEnabled);ui.sound.setAttribute('aria-label',soundEnabled?'关闭声音':'打开声音');ui.sound.setAttribute('aria-pressed',String(soundEnabled));ui.sound.title=soundEnabled?'关闭声音':'打开声音';}
  ui.sound.addEventListener('click',()=>{soundEnabled=!soundEnabled;soundUI();try{localStorage.setItem('lumen-grotto-sound',soundEnabled?'on':'off');}catch(_){}if(!soundEnabled&&audioContext)audioContext.suspend();else if(soundEnabled){audioContext?.resume();tone(590,.13,'sine',.03,1.25);}syncMusic();});
  $('fullscreenButton').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if($('gameShell').requestFullscreen)await $('gameShell').requestFullscreen();}catch(_){}});
  document.addEventListener('fullscreenchange',()=>{const active=!!document.fullscreenElement;$('fullscreenButton').setAttribute('aria-label',active?'退出全屏':'全屏');});
  if(!$('gameShell').requestFullscreen)$('fullscreenButton').hidden=true;
  document.querySelectorAll('[data-control]').forEach(button=>{
    const control=button.dataset.control;
    button.addEventListener('pointerdown',e=>{e.preventDefault();if(state!=='playing')return;button.setPointerCapture(e.pointerId);button.classList.add('pressed');if(control==='jump'){held.jump=true;pressJump();}if(control==='shoot'){held.shoot=true;shoot();}if(control==='dive')dive();if(control==='dash')dash();if(control==='gravity')flipGravity();if(control==='parry')parry();if(control==='ultimate')ultimate();});
    const release=()=>{button.classList.remove('pressed');if(control==='jump')releaseJump();if(control==='shoot')held.shoot=false;};button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
  });
  resetGame();setOverlay('intro');soundUI();
  let previous=performance.now(),accumulator=0;
  function frame(now){accumulator+=Math.min(50,Math.max(0,now-previous));previous=now;while(accumulator>=STEP){update();accumulator-=STEP;}draw();requestAnimationFrame(frame);}
  requestAnimationFrame(frame);
})();


