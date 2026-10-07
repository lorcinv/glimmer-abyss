const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/Lorcin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--mute-audio']});
 const errors=[];let context;
 try{
  context=await browser.newContext({viewport:{width:1280,height:900}});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4177/'+encodeURIComponent('微光之渊.html'));
  await page.locator('#startButton').click();
  await page.mouse.move(600,500);await page.mouse.down();await page.waitForTimeout(450);await page.mouse.up();
  await page.mouse.click(620,500,{button:'right'});await page.waitForTimeout(350);
  assert(await page.locator('#gameShell').evaluate(el=>el.classList.contains('inverted')));
  const before=await page.locator('#scoreCount').textContent();await page.keyboard.press('r');await page.waitForTimeout(200);assert(Number(await page.locator('#scoreCount').textContent())>=Number(before));
  await page.keyboard.press('p');assert.equal(await page.locator('#overlay').getAttribute('data-state'),'paused');
  await page.keyboard.press('p');assert.equal(await page.locator('#overlay').getAttribute('data-state'),'playing');
  await page.locator('#soundButton').click();assert.equal(await page.locator('#soundButton').getAttribute('aria-pressed'),'false');
  await page.screenshot({animations:'disabled',path:'qa-live-desktop.png'});
  await context.close();
  // Test-only hooks are injected in an isolated page; deliverables never contain them.
  const source=fs.readFileSync(path.join(__dirname,'runner.js'),'utf8').replace(/\}\)\(\);\s*$/,`
    window.__qa={
     step(n){for(let i=0;i<n;i++)update();draw();},
     state:()=>({state,gravity,score,parryTimer,ultimateTimer,ultimateCharge,musicMode,audioState:audioContext?.state,voices:music.nodes.size,player:{x:player.x,y:player.y,vx:player.vx},enemies:enemies.filter(e=>e.active&&e.alive).map(e=>({x:e.x,w:e.w,type:e.type})),cameraX}),
     scene(kind){resetGame(9);begin();bonus=15000;score=15000;player.x=3300;player.y=280;player.inv=0;maxDistance=3300;cameraX=player.x-(portrait()?365:245);generateAhead(5000);enemies=[];motes=[];hazards=[];springs=[];shots=[];relics=[];stones=[];ceilings=[{x:2500,y:105,w:1700,h:25,type:'ceiling'}];grounds=[{x:2500,y:470,w:1700,h:70,type:'ground'}];
      const e=spawnBoss('abyss',3000,4);e.active=true;e.x=player.x+180;e.y=230;e.hp=e.maxHp*.45;e.phase=2;e.cooldown=25;e.aimY=player.y+16;
      addEnemy(player.x+100,player.x+70,player.x+180,'clinger',.4,130);addEnemy(player.x+350,player.x+330,player.x+440,'turret',0,130);
      for(let i=0;i<4;i++)addMote(player.x+100+i*45,375,0,true);fireFan(e,5,3.8,.24);hazards.push({x:player.x-110,y:412,w:620,h:58,type:'rift',warn:45,life:100});
      if(kind==='ultimate'){ultimateCharge=ULTIMATE_COST;ultimate();}else if(kind==='melee'){weapon='spear';weaponTimer=700;shoot();}else parry();
      updateHud();syncMusic();draw();
     }
    };
  })();`);
  for(const size of [{width:1280,height:900,name:'desktop'},{width:390,height:844,name:'mobile'}]){
   context=await browser.newContext({viewport:size,hasTouch:size.name==='mobile'});
   const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
   await p.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
   await p.route('**/runner.js',r=>r.fulfill({contentType:'text/javascript',body:source}));
   await p.goto('http://127.0.0.1:4177/index.html');
   await p.locator('#startButton').click();
   await p.evaluate(()=>__qa.scene('parry'));
   const s=await p.evaluate(()=>__qa.state());assert.equal(s.musicMode,'boss');assert(s.voices>0);assert.equal(s.audioState,'running');
   await p.screenshot({animations:'disabled',path:'qa-boss-'+size.name+'.png'});
   const boxes=await p.evaluate(()=>['.hud-left','.score-block','.skill-status'].map(sel=>{const r=document.querySelector(sel).getBoundingClientRect();return {x:r.x,right:r.right};}));
   assert(boxes[0].right<=boxes[1].x+2&&boxes[1].right<=boxes[2].x+2,'HUD overlaps at '+size.name);
   if(size.name==='mobile'){
    const buttons=await p.locator('[data-control]').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};}));
    for(const b of buttons)assert(b.width>=38&&b.height>=38&&b.left>=0&&b.right<=390);
    for(let i=0;i<buttons.length;i++)for(let j=i+1;j<buttons.length;j++)assert(!(buttons[i].left<buttons[j].right&&buttons[i].right>buttons[j].left&&buttons[i].top<buttons[j].bottom&&buttons[i].bottom>buttons[j].top),'touch buttons overlap');
   }
   await p.evaluate(()=>{__qa.scene('ultimate');__qa.step(12);});await p.screenshot({animations:'disabled',path:'qa-ultimate-'+size.name+'.png'});
   await p.evaluate(()=>__qa.scene('melee'));await p.screenshot({animations:'disabled',path:'qa-melee-'+size.name+'.png'});
   await p.evaluate(()=>{
    window.__pad={index:0,connected:true,axes:[0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
    Object.defineProperty(navigator,'getGamepads',{value:()=>[window.__pad],configurable:true});
    window.__pad.buttons[7]={pressed:true,value:1};__qa.step(1);
   });
   assert.equal((await p.evaluate(()=>__qa.state())).gravity,-1);
   assert.equal(await p.locator('#gravityKey').textContent(),'RT');
   assert.equal(await p.locator('#parryKey').textContent(),'LB');
   assert.equal(await p.locator('#ultimateKey').textContent(),'Y');
   assert.equal(await p.locator('#overlay').evaluate(el=>getComputedStyle(el).visibility),'hidden');
   await context.close();
  }
  assert.deepEqual(errors,[]);console.log('PASS: standalone browser inputs, Web Audio playback, desktop/mobile layout, boss/ultimate/melee rendering, controller HUD. No browser errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
