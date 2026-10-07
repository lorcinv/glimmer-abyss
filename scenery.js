/* Original procedural pixel artwork. No external assets. */
(() => {
  'use strict';
  const hash = n => { const v = Math.sin(n * 127.1 + 19.3) * 43758.5453; return v - Math.floor(v); };
  const W = 1120;
  // Each pair of chapters gets a full palette so stone, roots, moss and ground stay coherent with the sky.
  const themes = [
    {sky:'#08191e',fog:'#183834',haze:'#1f4640',far:'#0b1f22',farLit:'#173331',stone:'#28443e',light:'#405a45',moss:'#78985f',glow:'#b8df91',water:'#173d3f',ray:'#d6efb0',accent:'#e3c58b',
     pillar:'#10282c',pillarLit:'#1b3334',pillarCap:'#183133',seam:'#0e252a',edge:'#0a1f25',base:'#0c2428',crack:'#162e31',socket:'#102b2d',shade:'#1d3837',
     root:'#0a1b1e',rootMoss:['#213a31','#294336'],vine:'#375640',leaf:['#547047','#425e3d'],fern:['#254f45','#1b413d'],
     ground:{base:'#152c2b',a:'#28463a',b:'#213d36',hi:'#3d5740',mark:'#314b38',seam:'#122d2b',lip:'#556e43',lipHi:'#99ae6b',lipShade:'#3a573b',grassHi:'#a6b576',drip:'#587147',fern:'#65855b',tooth:['#173530','#1c3830'],flower:'#f0d99a',
       roof:'#243937',roofAlt:'#2a403c',roofLip:'#506553',roofHi:'#9aaa7b',roofDrip:'#71845e',roofMark:'#486047',roofSeam:'#081e24'}},
    {sky:'#121625',fog:'#2e2b43',haze:'#34304f',far:'#131629',farLit:'#232640',stone:'#3b3d52',light:'#55536b',moss:'#858397',glow:'#cbb8ef',water:'#292e4c',ray:'#e2d4ff',accent:'#f0b8d8',
     pillar:'#191a2e',pillarLit:'#24243d',pillarCap:'#202036',seam:'#151528',edge:'#0f0f1f',base:'#131326',crack:'#1d1c33',socket:'#16152a',shade:'#262640',
     root:'#0d0e1b',rootMoss:['#2b2942','#35314e'],vine:'#4a4468',leaf:['#6c6192','#574f79'],fern:['#302c50','#262344'],
     ground:{base:'#1a1a2b',a:'#34324a',b:'#2c2a41',hi:'#4a4764',mark:'#3d3a56',seam:'#141327',lip:'#5f5a7e',lipHi:'#b1a6d6',lipShade:'#423d5c',grassHi:'#bdb3dc',drip:'#5d5780',fern:'#7b7399',tooth:['#1d1c30','#222137'],flower:'#f3bde0',
       roof:'#2a2a3f',roofAlt:'#303047',roofLip:'#56536d',roofHi:'#a59fc2',roofDrip:'#6f6a8c',roofMark:'#46435e',roofSeam:'#10101f'}},
    {sky:'#071d23',fog:'#173d46',haze:'#1c4a52',far:'#081d23',farLit:'#133840',stone:'#264955',light:'#3c6367',moss:'#579788',glow:'#94dfce',water:'#194b54',ray:'#c9f4ea',accent:'#bfe9f0',
     pillar:'#0c272f',pillarLit:'#15363f',pillarCap:'#123039',seam:'#0a2129',edge:'#081c22',base:'#0a2229',crack:'#113039',socket:'#0b2830',shade:'#15343b',
     root:'#07191e',rootMoss:['#1b3c3f','#224849'],vine:'#2e5d58',leaf:['#4a8073','#396b63'],fern:['#1e4e50','#173e43'],
     ground:{base:'#0f262b',a:'#1f4547',b:'#1a3b3f',hi:'#35605c',mark:'#2a5051',seam:'#0c2327',lip:'#3d7466',lipHi:'#8fd0b8',lipShade:'#2b5850',grassHi:'#9ad6be',drip:'#3f7466',fern:'#4f8a78',tooth:['#10292e','#143036'],flower:'#c9f4ea',
       roof:'#1e3a3f',roofAlt:'#234247',roofLip:'#44696a',roofHi:'#8fc3b5',roofDrip:'#5a8d80',roofMark:'#3a5f5c',roofSeam:'#061a1f'}}
  ];
  const OUTLINE='#0f1d19';
  class GrottoArt {
    constructor(canvas) { this.canvas=canvas;this.ctx=canvas.getContext('2d');this.cache=new Map();this.motes=Array.from({length:65},(_,i)=>({x:hash(i+870)*W,y:hash(i+208)*420,s:hash(i+141)})); }
    rect(c,x,y,w,h,color) { c.fillStyle=color;c.fillRect(Math.floor(x),Math.floor(y),Math.ceil(w),Math.ceil(h)); }
    poly(c,points,color) { c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(Math.round(x),Math.round(y)):c.moveTo(Math.round(x),Math.round(y)));c.closePath();c.fill(); }
    glow(c,x,y,r,color,alpha=.2) { c.save();c.globalAlpha=alpha;const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,color+'00');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);c.restore(); }
    // Draws a layer three times so anything crossing the tile edge wraps seamlessly.
    tiled(c,fn) { for(const dx of [-W,0,W]){c.save();c.translate(dx,0);fn();c.restore();} }
    shadow(c,x,y,rx,alpha=.35) { c.save();c.globalAlpha=alpha;c.fillStyle='#02080a';c.beginPath();c.ellipse(x,y,rx,Math.max(2,rx*.17),0,0,Math.PI*2);c.fill();c.restore(); }
    fern(c,x,y,size,color,seed=0) {
      const r=(a,b,w,h,col)=>this.rect(c,a,b,w,h,col);
      for(let k=-2;k<=2;k++) {
        const length=size*(.72+hash(seed+k+90)*.3),tilt=k*.42;
        for(let j=0;j<length;j+=3) {
          const bend=tilt*j*(.55+j/length*.6),xx=x+bend,yy=y-j;
          r(xx,yy,2,4,color);
          if(j>3&&j<length-4){const leaf=(1-j/length)*8+1;r(xx-leaf,yy+2,leaf,2,color);r(xx+2,yy,leaf,2,color);}
        }
      }
    }
    mushroom(c,x,y,s,cap='#cc9675',luminous=false) {
      const r=(a,b,w,h,col)=>this.rect(c,a,b,w,h,col);
      if(luminous)this.glow(c,x,y-s*1.7,s*5,cap,.13);
      r(x-1,y-s*1.7,3,s*1.7,'#8c9e77');r(x-2,y-s*1.2,2,s*1.1,'#395d51');
      r(x-s,y-s*1.8,s*2,3,cap);r(x-s+2,y-s*1.8-3,s*2-4,3,cap);r(x-s+5,y-s*1.8-5,Math.max(3,s*2-10),2,cap);
      r(x-s+2,y-s*1.8+2,s*2-4,2,'#2d4943');r(x-3,y-s*1.8-3,3,2,'#e9d6a0');
      if(luminous){c.save();c.globalAlpha=.8;r(x-s+3,y-s*1.8-1,1,1,'#fff3cf');r(x+s-5,y-s*1.8,1,1,'#fff3cf');c.restore();}
    }
    brick(c,x,y,w,h,p,seed=0) {
      this.rect(c,x,y,w,h,p.stone);this.rect(c,x,y,w,2,p.light);this.rect(c,x+w-2,y,2,h,p.edge);this.rect(c,x,y+h-3,w,3,p.base);
      for(let i=0;i<Math.floor(w*h/70);i++){const xx=x+hash(seed+i*7)*w,yy=y+3+hash(seed+i*3+51)*(h-5);this.rect(c,xx,yy,2+hash(i+seed)*4,2,i%3?p.light:p.crack);}
    }
    // Farthest layer: sky gradient, hanging stalactites and spires dissolving into mist.
    makeFar(p) {
      const cvs=document.createElement('canvas');cvs.width=W;cvs.height=540;const c=cvs.getContext('2d');
      const r=(x,y,w,h,col)=>this.rect(c,x,y,w,h,col);
      const sky=c.createLinearGradient(0,0,0,540);sky.addColorStop(0,p.sky);sky.addColorStop(.64,p.fog);sky.addColorStop(1,p.sky);c.fillStyle=sky;c.fillRect(0,0,W,540);
      this.glow(c,560,300,430,p.glow,.045);
      this.tiled(c,()=>{
        for(let i=0;i<11;i++){
          const x=i*102+hash(i+401)*40,w=40+hash(i+402)*50,top=235+hash(i+403)*110;
          this.poly(c,[[x-w/2,480],[x-w*.4,top+36],[x-w*.16,top+10],[x,top],[x+w*.22,top+16],[x+w*.44,top+44],[x+w/2,480]],p.far);
          r(x-3,top+8,2,470-top,p.farLit);r(x-w*.3,top+60,w*.5,1,p.farLit);r(x-w*.34,top+118,w*.62,1,p.farLit);
        }
        for(let i=0;i<26;i++){
          const x=i*43+hash(i+301)*18,w=12+hash(i+302)*24,len=36+hash(i+303)*110;
          this.poly(c,[[x-w/2,0],[x+w/2,0],[x+w*.16,len*.72],[x,len],[x-w*.2,len*.6]],p.far);r(x-w*.28,0,2,len*.5,p.farLit);
        }
      });
      const mist=c.createLinearGradient(0,170,0,480);mist.addColorStop(0,p.haze+'00');mist.addColorStop(1,p.haze+'b0');c.fillStyle=mist;c.fillRect(0,170,W,370);
      for(let i=0;i<70;i++){c.globalAlpha=.1+hash(i+501)*.25;r(hash(i+502)*W,40+hash(i+503)*360,1,1,p.glow);}c.globalAlpha=1;
      return cvs;
    }
    makeScene(p,theme) {
      const cvs=document.createElement('canvas');cvs.width=W;cvs.height=540;const c=cvs.getContext('2d');
      const r=(x,y,w,h,col)=>this.rect(c,x,y,w,h,col);
      this.glow(c,746,259,320,p.glow,.105);this.glow(c,315,367,260,p.glow,.055);
      // Distant pillars, broken arches and mineral strata.
      this.tiled(c,()=>{
        for(let i=0;i<13;i++){
          const x=i*86+hash(i+8)*30,y=90+hash(i+721)*70,w=19+hash(i+141)*27;
          r(x,y,w,473-y,p.pillar);r(x+3,y+9,3,453-y,p.pillarLit);r(x+w-4,y,4,473-y,p.edge);r(x-5,y-8,w+10,8,p.pillarCap);r(x-5,y-8,w+10,1,p.pillarLit);
          for(let j=0;j<6;j++)r(x+3,y+28+j*41,w-5,1,p.seam);
        }
      });
      for(let i=0;i<3100;i++){const x=hash(i+912)*W,y=hash(i*2+9)*540;c.globalAlpha=.16+hash(i+388)*.15;r(x,y,hash(i+444)>.8?4:2,2,i%3===0?p.light:p.sky);}c.globalAlpha=1;
      // Monumental stepped arch.
      for(let row=0;row<15;row++){
        const y=113+row*21,inset=row<4?(4-row)*18:0;
        for(const side of [-1,1]){
          const x=750+side*(127-inset)-(side<0?35:0);
          this.brick(c,x,y,35,21,p,row*47+side);
          if(row%3===0)r(x-3,y,41,3,p.light);
        }
      }
      for(let i=0;i<7;i++)this.brick(c,643+i*31,94+Math.abs(i-3)*5,31,24,p,i+81);
      r(705,86,90,10,p.stone);r(727,80,46,6,p.light);r(745,84,9,13,p.moss);
      for(let i=0;i<7;i++){const y=151+i*30;r(609,y,7,15,p.light);r(885,y-8,5,9,p.moss);}
      // The quiet guardian: a weathered, moss-covered owl idol.
      for(let row=0;row<3;row++)this.brick(c,657-row*10,391+row*13,186+row*20,13,p,100+row);
      r(680,355,45,34,p.stone);r(779,355,43,34,p.stone);
      r(688,357,7,32,p.light);r(789,357,6,32,p.light);
      this.poly(c,[[674,296],[698,277],[804,277],[831,296],[817,365],[688,365]],p.stone);
      this.poly(c,[[675,302],[687,289],[709,310],[700,355],[688,351]],p.light);
      this.poly(c,[[809,296],[830,304],[816,354],[801,359],[797,317]],p.shade);
      for(let i=0;i<5;i++){r(714-i*2,316+i*8,72+i*4,3,p.light);r(721,320+i*8,3,3,p.moss);}
      this.poly(c,[[668,238],[677,229],[670,195],[697,204],[710,226],[788,226],[808,203],[830,194],[823,233],[834,242],[828,289],[810,312],[690,312],[670,291]],p.stone);
      this.poly(c,[[673,244],[685,229],[675,203],[690,210],[702,234],[790,234],[809,211],[824,204],[816,238],[826,246],[822,257],[790,248],[752,266],[711,248],[676,257]],p.light);
      r(676,252,57,40,p.socket);r(769,252,57,40,p.socket);r(683,251,46,4,p.socket);r(774,251,46,4,p.socket);
      for(const x of [701,789]){r(x-8,264,24,16,'#7f8660');r(x-5,261,18,22,'#a9b173');r(x-1,264,10,16,'#e2da93');r(x+2,266,4,12,'#f8e5aa');r(x+1,262,2,2,'#fff0c0');}
      this.poly(c,[[739,276],[755,270],[766,276],[753,303]],p.moss);this.poly(c,[[753,277],[766,276],[753,303]],p.light);
      r(679,293,39,4,p.light);r(787,293,38,4,p.light);r(690,304,25,3,p.moss);r(802,305,14,3,p.moss);
      // Age, cracks and small plants on the stone.
      for(let i=0;i<130;i++){const x=682+hash(i+77)*141,y=228+hash(i+710)*140;if(y>251&&y<290)continue;r(x,y,2+hash(i+790)*5,2,i%3?p.light:p.crack);}
      [[677,222],[698,231],[783,229],[809,226],[685,355],[803,367],[692,403],[833,401]].forEach(([x,y],i)=>this.fern(c,x,y,9+i%3*4,p.moss,i));
      r(818,318,3,17,p.socket);r(813,333,6,3,p.socket);r(690,241,3,7,p.moss);
      this.tiled(c,()=>{
        // Roots and cave ceiling.
        for(let i=0;i<66;i++){
          const x=i*17,len=22+hash(i+982)*63+(Math.sin(i*.17)+1)*10;
          r(x,0,18,len,p.root);r(x+2,len,12,6,p.root);r(x+5,len+6,6,8,p.root);
          if(i%3===0){r(x+2,len-7,12,3,p.rootMoss[0]);r(x+6,len-4,7,3,p.rootMoss[1]);}
        }
        for(let i=0;i<21;i++){
          const x=i*53+hash(i+24)*30,len=55+hash(i+543)*154;
          for(let j=0;j<len;j+=5){
            const xx=x+Math.sin(j*.031+i)*9;r(xx,j,2,6,p.vine);
            if(j%15===0){r(xx-5,j+3,6,3,p.leaf[0]);r(xx+2,j+7,5,3,p.leaf[1]);}
            if(j%45===30&&hash(i*13+j)>.55){this.glow(c,xx+1,j+4,9,p.glow,.22);r(xx-1,j+3,3,3,p.glow);}
          }
        }
        for(let i=0;i<40;i++){const x=hash(i+22)*W;this.fern(c,x,456+hash(i+100)*15,13+hash(i+678)*40,p.fern[i%2?0:1],i);}
        this.accents(c,p,theme);
        [140,164,320,562,898,1004,1030].forEach((x,i)=>this.mushroom(c,x,438+i%3*9,8+i%3*4,i%2?'#99bda0':'#b28b6e',true));
      });
      return cvs;
    }
    // A signature detail for each palette: glowing spores, amethyst shards or luminous pods.
    accents(c,p,theme) {
      const r=(x,y,w,h,col)=>this.rect(c,x,y,w,h,col);
      if(theme===0){
        for(let i=0;i<16;i++){const x=hash(i+901)*W,y=170+hash(i+902)*250;this.glow(c,x,y,12,p.glow,.16);r(x,y,2,2,p.glow);r(x+4,y+3,1,1,p.glow);r(x-3,y+4,1,1,'#e9f5c4');}
      }else if(theme===1){
        for(let i=0;i<9;i++){
          const x=hash(i+911)*W,y=458+hash(i+912)*10,h=12+hash(i+913)*18;
          this.glow(c,x,y-h*.5,h*1.8,p.glow,.14);
          this.poly(c,[[x-7,y],[x-9,y-h*.55],[x-5,y-h*.7],[x-3,y]],'#5e4d8f');
          this.poly(c,[[x-3,y],[x-2,y-h*.8],[x+1,y-h],[x+4,y-h*.8],[x+4,y]],'#b7a3ea');
          this.poly(c,[[x+1,y],[x+1,y-h*.95],[x+4,y-h*.8],[x+4,y]],'#8d78c4');
          this.poly(c,[[x+4,y],[x+6,y-h*.45],[x+10,y-h*.35],[x+9,y]],'#7a67b0');
          r(x-1,y-h*.75,1,h*.4,'#efe6ff');
        }
      }else{
        for(let i=0;i<12;i++){
          const x=hash(i+921)*W,y=70+hash(i+922)*150;
          r(x,0,1,y,p.vine);this.glow(c,x,y+4,18,p.glow,.2);
          r(x-2,y,5,8,'#5fb3a4');r(x-1,y+1,3,6,p.glow);r(x-1,y+1,1,2,'#effffb');r(x,y+8,1,2,'#5fb3a4');
        }
      }
    }
    rays(c,g,p) {
      c.save();
      for(let i=0;i<4;i++){
        let x=(i*300+140-g.cameraX*.16)%1200;if(x< -260)x+=1200;
        const w=30+hash(i+61)*48,slant=80+hash(i+62)*70,a=.055+.025*Math.sin(g.tick*.011+i*1.9);
        const grad=c.createLinearGradient(0,40,0,470);grad.addColorStop(0,p.ray);grad.addColorStop(1,p.ray+'00');
        c.globalAlpha=Math.max(0,a);c.fillStyle=grad;c.beginPath();c.moveTo(x,40);c.lineTo(x+w,40);c.lineTo(x+w*1.8+slant,470);c.lineTo(x+slant,470);c.closePath();c.fill();
      }
      c.restore();
    }
    background(g) {
      const c=this.ctx,theme=Math.floor(g.chapter/2)%3,p=themes[theme];
      if(!this.cache.has(theme))this.cache.set(theme,{far:this.makeFar(p),mid:this.makeScene(p,theme)});
      const layers=this.cache.get(theme),far=((g.cameraX*.08)%W+W)%W,offset=((g.cameraX*.22)%W+W)%W;
      c.drawImage(layers.far,-Math.floor(far),0);c.drawImage(layers.far,W-Math.floor(far),0);
      this.rays(c,g,p);
      c.drawImage(layers.mid,-Math.floor(offset),0);c.drawImage(layers.mid,W-Math.floor(offset),0);
      for(const x of [701,789]){let xx=x-offset;if(xx< -80)xx+=W;this.glow(c,xx+4,272,42,p.glow,.1+Math.sin(g.tick*.025)*.02);}
      // Falling water and isolated drops catch the light.
      for(let n=0;n<3;n++){
        let x=(n*437+454-g.cameraX*.29)%1311;if(x< -30)x+=1311;
        this.rect(c,x,147+n%2*33,10,320,'#8ed3c109');this.rect(c,x+3,147+n%2*33,2,320,'#b6e6d80c');
        for(let j=0;j<18;j++){const y=159+(j*21+g.tick*(1.2+n*.2))%300;this.rect(c,x+hash(j+n*21)*8,y,1,5+hash(j+81)*8,'#96cabe26');}
        this.glow(c,x+5,462,26,'#a8e0d4',.06);
      }
      for(let i=0;i<this.motes.length;i++){
        const m=this.motes[i];let x=(m.x-g.cameraX*.55+Math.sin(g.tick*.008+i)*17)%W;if(x<0)x+=W;
        const y=m.y+Math.sin(g.tick*.013+i*2)*7,a=.23+Math.sin(g.tick*.036+i)*.19;
        c.globalAlpha=a;this.rect(c,x,y,m.s>.8?2:1,2,i%4===0?p.accent:p.glow);c.globalAlpha=1;
        if(m.s>.9)this.glow(c,x,y,16,i%4===0?p.accent:p.glow,a*.3);
      }
      // Low mist drifting across the ravine floor.
      for(let i=0;i<3;i++){
        let x=(i*430-g.cameraX*.35+g.tick*.15)%1290;if(x< -320)x+=1290;
        c.save();c.globalAlpha=.2;c.translate(x,448);c.scale(3.4,1);const m=c.createRadialGradient(0,0,0,0,0,80);m.addColorStop(0,p.haze);m.addColorStop(1,p.haze+'00');c.fillStyle=m;c.fillRect(-80,-80,160,160);c.restore();
      }
      // Water occupies the bottom of the ravine.
      const water=c.createLinearGradient(0,473,0,540);water.addColorStop(0,p.water);water.addColorStop(1,'#071317');c.fillStyle=water;c.fillRect(0,473,960,67);
      this.rect(c,0,473,960,1,p.glow+'2a');
      for(let i=0;i<58;i++){let x=(i*41+g.tick*.24-g.cameraX*.45)%1000;if(x< -40)x+=1000;this.rect(c,x,480+hash(i+887)*59,4+hash(i+11)*35,1,i%5?'#82b7a51c':'#b9d7b22d');}
      for(let i=0;i<22;i++){let x=(i*47+Math.sin(g.tick*.03+i)*6-g.cameraX*.45)%1034;if(x< -20)x+=1034;c.globalAlpha=.25+Math.sin(g.tick*.05+i*1.7)*.15;this.rect(c,x,474+i%3,5+hash(i+331)*12,1,'#d8f0d0');}c.globalAlpha=1;
      for(let i=0;i<7;i++){let x=(i*179-g.cameraX*.4)%1100;if(x<0)x+=1100;this.glow(c,x,493,40,p.glow,.035);}
    }
    platform(p,g) {
      const c=this.ctx,pal=themes[Math.floor(g.chapter/2)%3],gr=pal.ground,x=Math.floor(p.x),y=p.y;
      if(p.gone>0)return;
      if(p.type==='ceiling'||p.ceiling){
        const inv=g.gravity===-1;
        this.rect(c,x,y,p.w,p.h,gr.roof);
        for(let i=0;i<p.w;i+=28){
          if((i/28)%2)this.rect(c,x+i+1,y+2,Math.min(27,p.w-i-1),p.h-7,gr.roofAlt);
          this.rect(c,x+i,y+3,1,p.h-8,gr.roofSeam);this.rect(c,x+i+4,y+4,15,2,gr.roofMark);
        }
        this.rect(c,x,y+p.h-5,p.w,5,inv?'#8f84ae':gr.roofLip);this.rect(c,x,y+p.h-1,p.w,2,inv?'#d7bde9':gr.roofHi);
        for(let i=0;i<p.w;i+=28)if(i%3)this.rect(c,x+i+8,y+p.h,3,4+hash(x+i)*7,inv?'#a595bb':gr.roofDrip);
        if(inv){c.save();c.globalAlpha=.35;this.rect(c,x,y+p.h+1,p.w,1,'#e6d3f5');c.restore();}
        if(p.type==='crumble'){c.strokeStyle=p.crack?'#f3c092':'#bcab86';c.lineWidth=2;c.beginPath();c.moveTo(x+p.w*.4,y);c.lineTo(x+p.w*.45,y+12);c.lineTo(x+p.w*.36,y+p.h);c.stroke();if(p.crack)this.rect(c,x,y+p.h+2,p.w*(1-p.crack/30),2,'#efb286');}
        if(p.moving){this.rect(c,x+6,y+8,10,3,'#c4c08b');this.rect(c,x+p.w-16,y+8,10,3,'#c4c08b');}
        return;
      }
      if(p.moving){c.save();c.setLineDash([2,7]);c.strokeStyle='#b8ad7144';c.beginPath();c.moveTo(x+p.w/2,p.baseY-48);c.lineTo(x+p.w/2,p.baseY+65);c.stroke();c.restore();}
      const ground=p.type==='ground';
      if(!ground){c.save();c.globalAlpha=.28;this.rect(c,x+6,y+p.h,p.w-12,5,'#02090b');c.globalAlpha=.13;this.rect(c,x+12,y+p.h+5,p.w-24,8,'#02090b');c.restore();}
      this.rect(c,x,y,p.w,p.h,gr.base);
      const rows=ground?4:1;
      for(let j=0;j<rows;j++){
        for(let i=0;i<p.w;i+=31){const xx=x+i,ww=Math.min(30,p.w-i);if(ww<1)continue;
          this.rect(c,xx,y+7+j*18,ww,16,j%2?gr.b:gr.a);this.rect(c,xx+1,y+7+j*18,ww-2,2,gr.hi);
          this.rect(c,xx+3,y+13+j*18,5+hash(i+x+j)*13,2,gr.mark);
          if(hash(i+x+j)>.7)this.rect(c,xx+ww-7,y+13+j*18,2,5,gr.seam);
        }
      }
      if(ground){
        // Depth falloff and shaded cliff faces make pits read at a glance.
        const dk=c.createLinearGradient(0,y+18,0,y+p.h);dk.addColorStop(0,'#02090b00');dk.addColorStop(1,'#02090bb8');c.fillStyle=dk;c.fillRect(x,y+18,p.w,p.h-18);
        this.rect(c,x,y+5,3,p.h-5,gr.seam);this.rect(c,x+p.w-3,y+5,3,p.h-5,gr.seam);this.rect(c,x+3,y+8,1,p.h-14,gr.hi);
      }
      this.rect(c,x,y,p.w,5,gr.lip);this.rect(c,x,y,p.w,2,gr.lipHi);this.rect(c,x+2,y+5,p.w-4,3,gr.lipShade);
      for(let i=0;i<p.w;i+=4){const seed=x+i,grass=hash(seed)*8;
        if(grass>2){this.rect(c,x+i,y-grass,2,grass+1,i%12?pal.moss:gr.grassHi);if(i%12===0)this.rect(c,x+i-2,y-grass+2,2,3,pal.moss);}
        if(hash(seed+782)>.76){const len=9+hash(seed+94)*17;this.rect(c,x+i,y+5,2,len,gr.drip);this.rect(c,x+i-2,y+len-2,4,2,pal.moss);}
        if(hash(seed+1337)>.965&&i>4&&i<p.w-6){this.rect(c,x+i+1,y-6,1,6,gr.drip);this.rect(c,x+i,y-8,3,2,gr.flower);this.rect(c,x+i+1,y-9,1,1,'#fff6de');}
      }
      for(let i=20;i<p.w-10;i+=49){if(hash(x+i)>.5)this.fern(c,x+i,y,7+hash(x+i+21)*14,gr.fern,x+i);}
      if(!ground){this.poly(c,[[x+4,y+21],[x+14,y+34],[x+24,y+21]],gr.tooth[0]);this.poly(c,[[x+p.w-38,y+21],[x+p.w-20,y+29],[x+p.w-8,y+21]],gr.tooth[1]);}
      if(p.decor){this.mushroom(c,x+p.w*.36,y,8,'#c5a082',true);this.mushroom(c,x+p.w*.36+16,y,5,'#d1b293');}
      if(p.type==='crumble'){
        this.rect(c,x,y,p.w,2,p.crack>0?'#fac99c':'#bdaf80');c.strokeStyle=p.crack>0?'#e2a287':'#12272b';c.lineWidth=2;c.beginPath();c.moveTo(x+p.w*.35,y+2);c.lineTo(x+p.w*.46,y+10);c.lineTo(x+p.w*.38,y+17);c.moveTo(x+p.w*.74,y+5);c.lineTo(x+p.w*.64,y+14);c.lineTo(x+p.w*.76,y+21);c.stroke();
        if(p.crack>0){c.fillStyle='#f0bf84';c.fillRect(x,y-3,p.w*(1-p.crack/30),2);this.glow(c,x+p.w*.4,y+10,22,'#f3b27f',.12);}
      }
    }
    pickup(r,g){
      const c=this.ctx,type=r.type||'shield',color=({scatter:'#f3c68f',seeker:'#9cd9de',boomerang:'#d5afe8',blade:'#c8eca7',spear:'#e7cea5',magnet:'#e3a4c2',heart:'#f29f94',shield:'#b5daa6'})[type],y=Math.round(r.y+Math.sin(g.tick*.04+r.x)*4),x=Math.round(r.x);
      const pulse=(g.tick*.018+r.x*.013)%1,size=11+pulse*9;
      this.glow(c,x,y,32,color,.18);
      c.save();c.translate(x,y);c.rotate(Math.PI/4);
      c.globalAlpha=(1-pulse)*.5;c.strokeStyle=color;c.lineWidth=1;c.strokeRect(-size,-size,size*2,size*2);c.globalAlpha=1;
      this.rect(c,-12,-12,24,24,'#061315');this.rect(c,-11,-11,22,22,'#102428');c.strokeStyle=color;c.strokeRect(-11,-11,22,22);
      c.globalAlpha=.3;c.strokeRect(-8,-8,16,16);c.globalAlpha=1;
      c.restore();
      const p=(a,b,w,h)=>this.rect(c,x+a,y+b,w,h,color);
      if(type==='blade'){p(-2,-9,4,15);p(-6,3,12,3);p(-2,6,4,4);}
      if(type==='spear'){p(-1,-6,2,16);this.poly(c,[[x,y-11],[x-5,y-3],[x+5,y-3]],color);}
      if(type==='scatter'){p(-6,-6,3,3);p(3,-2,4,4);p(-6,4,3,3);}
      if(type==='seeker'){c.strokeStyle=color;c.strokeRect(x-5,y-5,10,10);p(-1,-8,2,5);p(-1,3,2,5);p(-8,-1,5,2);p(3,-1,5,2);}
      if(type==='boomerang'){p(-6,-5,4,4);p(-2,-2,4,4);p(2,1,4,4);p(-2,4,4,3);}
      if(type==='magnet'){p(-6,-6,3,10);p(3,-6,3,10);p(-3,3,6,3);}
      if(type==='heart'){p(-7,-5,5,5);p(2,-5,5,5);p(-7,-1,14,4);p(-4,3,8,3);p(-1,6,2,2);}
      if(type==='shield'){p(-6,-6,12,8);p(-4,2,8,4);p(-1,6,2,2);}
      const orbit=g.tick*.06+r.x;this.rect(c,x+Math.cos(orbit)*19-1,y+Math.sin(orbit)*19-1,2,2,'#fff6df');
    }
    player(p,g,preview=false) {
      const c=this.ctx;
      if(!preview&&p.inv>0&&g.ultimateTimer<=0&&Math.floor(g.tick/5)%2===0)return;
      const x=Math.round(p.x),y=Math.round(p.y),walk=p.onGround?Math.sin(p.walk)*2:0,t=g.tick;
      const r=(a,b,w,h,col)=>this.rect(c,x+a,y+b,w,h,col);
      this.glow(c,x+12,y+14,44,'#d8efaa',.19);
      if(p.onGround)this.shadow(c,x+13,y+32,12,.32);
      // Small, luminous seed creature with a fluttering ochre scarf.
      const flap=Math.sin(t*.2)*3,tail=Math.sin(t*.2-1.2)*3,sway=Math.round(Math.sin(t*.06));
      this.poly(c,[[x+7,y+19],[x-4,y+18],[x-12,y+15+flap],[x-9,y+22],[x+7,y+24]],'#ba8a52');
      this.poly(c,[[x+7,y+19],[x-4,y+18],[x-11,y+16+flap],[x-6,y+19],[x+7,y+21]],'#d9a866');
      r(-15,16+tail,4,3,'#9c7040');
      const body=[[4,4,17,21],[1,8,23,14],[5,2,15,3],[3,20,19,7],[4,27+walk,5,4],[16,27-walk,5,4],[6,-6,3,10],[3+sway,-8,5,4],[14,-4,3,7],[16+sway,-7,4,4],[22,18,5,3]];
      for(const [a,b,w,h] of body)r(a-1,b-1,w+2,h+2,OUTLINE);
      r(4,4,17,21,'#e4e8b2');r(1,8,23,14,'#d4dfa9');r(5,2,15,3,'#edf1c7');
      r(1,9,2,11,'#eef3d0');r(21,9,3,12,'#b8c895');r(7,3,6,1,'#fbfbe4');
      r(3,20,19,7,'#a8bf8d');r(5,24,16,3,'#85a57e');
      r(6,-6,3,10,'#a3c785');r(3+sway,-8,5,4,'#cbde96');r(14,-4,3,7,'#bad58e');r(16+sway,-7,4,4,'#d0e5a6');r(4+sway,-8,2,1,'#eef8c9');r(17+sway,-7,2,1,'#eef8c9');
      if((t+(preview?60:100))%220<6){r(9,13,4,1,'#243c35');r(18,13,3,1,'#243c35');}
      else{r(9,10,4,5,'#243c35');r(18,10,3,5,'#243c35');r(10,10,1,2,'#f9efc3');r(19,10,1,1,'#f9efc3');}
      r(6,16,3,1,'#e6b48c');r(20,16,2,1,'#e6b48c');
      r(4,27+walk,5,4,'#d2deaa');r(16,27-walk,5,4,'#d2deaa');
      r(22,18,5,3,'#f2e5b3');r(4,20,18,3,'#d1aa66');r(4,20,18,1,'#e9c580');
      if(p.jumps===1){c.globalAlpha=.6;r(9,38,3,2,'#e2eabd');c.globalAlpha=1;}
      if(p.shield>0){
        c.strokeStyle='#a6dbb699';c.lineWidth=1;c.beginPath();c.ellipse(x+12,y+14,23,26,0,0,Math.PI*2);c.stroke();
        c.save();c.globalAlpha=.45;c.setLineDash([3,6]);c.lineDashOffset=-t*.4;c.strokeStyle='#d6f5d8';c.beginPath();c.ellipse(x+12,y+14,26,29,0,0,Math.PI*2);c.stroke();c.restore();
      }
      if(p.slash>0){
        const a=p.slash/12,range=p.meleeRange||88;c.save();c.translate(x+16,y+16);c.globalAlpha=a;
        if(g.weapon==='spear'){this.rect(c,9,-2,range-10,4,'#f0d7ac');this.poly(c,[[range+10,0],[range-6,-8],[range-6,8]],'#fff0ce');this.rect(c,20,-6,range-30,1,'#fff6dc88');}
        else{c.strokeStyle='#b4d69455';c.lineWidth=9;c.beginPath();c.ellipse(0,0,range-6,36,0,-1.25+(1-a)*.5,1.05);c.stroke();c.strokeStyle='#e4f4b6';c.lineWidth=4;c.stroke();c.strokeStyle='#fffbe6';c.lineWidth=1;c.stroke();}
        c.restore();
      }
    }
    enemy(e,g) {
      const c=this.ctx,x=Math.floor(e.x),y=Math.floor(e.y),bob=Math.sin(g.tick*.12+e.phase);
      if(e.type==='abyss'){
        const color=e.hit>0?'#e6c3d9':e.phase===3?'#8d456c':e.phase===2?'#735377':'#5b617b';
        this.glow(c,x+60,y+42,125,e.phase===3?'#ed86a7':'#bda0dc',.22);
        for(let i=0;i<6;i++){const xx=x+8+i*21,wave=Math.sin(g.tick*.09+i)*9;this.poly(c,[[xx,y+60],[xx+13,y+65],[xx+13+wave,y+98],[xx+wave-6,y+113],[xx+wave,y+80]],color);this.poly(c,[[xx+3,y+64],[xx+8,y+66],[xx+8+wave*.8,y+92],[xx+wave*.8,y+84]],'#ffffff14');}
        this.poly(c,[[x+2,y+28],[x-10,y-25],[x+28,y+1],[x+41,y-14],[x+60,y-26],[x+79,y-14],[x+93,y+1],[x+130,y-25],[x+118,y+28]],'#9383aa');
        this.poly(c,[[x+4,y+22],[x-6,y-18],[x+26,y+4]],'#b3a4c8');this.poly(c,[[x+116,y+22],[x+126,y-18],[x+94,y+4]],'#7d6f96');
        this.rect(c,x,y+15,120,48,color);this.rect(c,x+9,y+3,102,16,color);this.rect(c,x+12,y+60,96,19,'#3e354e');this.rect(c,x+9,y+3,102,2,'#ffffff1c');
        this.rect(c,x+22,y+19,76,40,'#1a2737');this.rect(c,x+35,y+26,50,23,e.windup?'#ffe2ad':'#e2adc9');this.rect(c,x+53,y+25,14,25,'#394154');this.rect(c,x+58,y+29,4,15,'#fff4cf');this.rect(c,x+36,y+27,10,2,'#fff4e6');
        this.glow(c,x+60,y+38,34,e.windup?'#ffd9a8':'#f2b7d4',.18);
        for(let i=0;i<6;i++)this.poly(c,[[x+30+i*11,y+65],[x+36+i*11,y+65],[x+33+i*11,y+75]],'#d6bac1');
        // Framed health bar with quarter notches and the boss title above it.
        const hp=Math.max(0,e.hp/e.maxHp);
        this.rect(c,x-2,y-40,124,8,'#0d0b16');this.rect(c,x,y-38,120,4,'#332e46');this.rect(c,x,y-38,120*hp,4,'#e6a9c6');this.rect(c,x,y-38,120*hp,1,'#ffd9ea');
        for(let k=1;k<4;k++)this.rect(c,x+k*30,y-38,1,4,'#0d0b16');
        this.poly(c,[[x-6,y-36],[x-3,y-39],[x,y-36],[x-3,y-33]],'#e6a9c6');this.poly(c,[[x+120,y-36],[x+123,y-39],[x+126,y-36],[x+123,y-33]],'#e6a9c6');
        c.font='bold 12px "Songti SC","Noto Serif SC",SimSun,serif';c.textAlign='center';c.lineWidth=3;c.strokeStyle='#0b0a14';c.strokeText('噬光之母',x+60,y-47);c.fillStyle='#f3d9e2';c.fillText('噬光之母',x+60,y-47);
        if(e.windup){c.save();c.strokeStyle='#f6b6cd77';c.lineWidth=1;c.setLineDash([5,8]);c.beginPath();c.moveTo(x+60,y+45);c.lineTo(g.player.x+12,e.aimY);c.stroke();c.restore();this.glow(c,x+60,y+38,40,'#ffd4aa',.3);}
        return;
      }
      if(e.type==='clinger'||e.type==='turret'){
        const color=e.hit?'#ffdcbe':e.type==='turret'?'#9b7599':'#799889';
        for(let i=0;i<4;i++){const xx=x+i*9;c.strokeStyle=color;c.lineWidth=2;c.beginPath();c.moveTo(xx-3,y-4);c.lineTo(xx,y+9);c.lineTo(x+15,y+15);c.stroke();}
        this.rect(c,x+2,y+6,27,17,'#141a20');this.rect(c,x+7,y+19,17,8,'#141a20');
        this.rect(c,x+3,y+7,25,15,color);this.rect(c,x+3,y+7,25,2,'#ffffff22');this.rect(c,x+8,y+20,15,6,'#42505b');this.rect(c,x+10,y+13,4,5,'#f9d1ad');this.rect(c,x+21,y+13,4,5,'#f9d1ad');this.rect(c,x+11,y+13,1,1,'#fff6e8');this.rect(c,x+22,y+13,1,1,'#fff6e8');
        if(e.type==='turret'){this.rect(c,x+12,y+21,7,11,e.windup?'#f7c5b2':'#b28b9c');this.glow(c,x+15,y+30,22,'#de9ac5',e.windup?.4:.08);}
        if(e.windup){c.strokeStyle='#f3b48d88';c.beginPath();c.arc(x+15,y+15,20,0,Math.PI*2);c.stroke();}
        return;
      }
      if(e.type==='guardian'){
        this.glow(c,x+31,y+28,85,'#e7a9a1',.16);this.shadow(c,x+31,y+60,30,.3);
        this.poly(c,[[x+5,y+12],[x-5,y-17],[x+14,y-3],[x+21,y+7],[x+41,y+7],[x+49,y-3],[x+67,y-17],[x+58,y+13]],'#787392');
        this.rect(c,x+2,y+9,58,41,'#1a1824');
        this.rect(c,x+3,y+10,56,39,e.hit>0?'#e6c6b2':'#605c77');this.rect(c,x+3,y+10,56,2,'#ffffff1a');this.rect(c,x+9,y+5,44,7,'#9790a7');this.rect(c,x+10,y+46,42,9,'#403e57');this.rect(c,x+17,y+54,28,5,'#777088');
        this.rect(c,x+7,y+19,19,17,'#202936');this.rect(c,x+37,y+19,19,17,'#202936');const eyes=e.windup>0?'#ffe4b0':'#efb0bd';this.rect(c,x+12,y+23,9,8,eyes);this.rect(c,x+41,y+23,9,8,eyes);this.rect(c,x+13,y+24,2,2,'#fff6ea');this.rect(c,x+42,y+24,2,2,'#fff6ea');this.poly(c,[[x+27,y+30],[x+36,y+30],[x+31,y+43]],'#c4a993');
        this.rect(c,x-1,y-27,64,5,'#0d0b14');this.rect(c,x,y-26,62,3,'#443b50');this.rect(c,x,y-26,62*Math.max(0,e.hp/e.maxHp),3,'#eac18d');this.rect(c,x,y-26,62*Math.max(0,e.hp/e.maxHp),1,'#fff0c8');
        if(e.active&&e.windup>0){c.save();c.setLineDash([6,8]);c.strokeStyle=e.windup<10?'#ffca9fbb':'#dd8e9966';c.lineWidth=2;c.beginPath();c.moveTo(g.player.x-70,e.aimY+5);c.lineTo(x,e.aimY+5);c.stroke();c.restore();this.glow(c,x,e.aimY,25,'#ffa786',.4);}
        return;
      }
      this.glow(c,x+13,y+12,25,e.type==='bat'?'#baa6d6':'#ed927d',.1);
      if(e.type==='bat'){
        const wing=Math.round(bob*7);
        this.poly(c,[[x+10,y+9],[x-12,y+wing],[x-5,y+14],[x+8,y+17]],'#867c9c');this.poly(c,[[x+16,y+9],[x+38,y+wing],[x+32,y+14],[x+19,y+17]],'#867c9c');
        this.poly(c,[[x+9,y+11],[x-9,y+wing+2],[x-3,y+13]],'#6c6384');this.poly(c,[[x+17,y+11],[x+35,y+wing+2],[x+29,y+13]],'#6c6384');
        this.rect(c,x+6,y+2,17,19,'#1c1826');this.rect(c,x+7,y-1,6,10,'#1c1826');this.rect(c,x+17,y-1,6,10,'#1c1826');
        this.rect(c,x+7,y+3,15,17,'#56516a');this.rect(c,x+8,y,4,8,'#958598');this.rect(c,x+18,y,4,8,'#958598');this.rect(c,x+8,y+4,2,12,'#6c6682');this.rect(c,x+10,y+10,3,3,'#f4c99c');this.rect(c,x+17,y+10,3,3,'#f4c99c');this.rect(c,x+10,y+10,1,1,'#fff4e0');this.rect(c,x+17,y+10,1,1,'#fff4e0');
      }else{
        this.shadow(c,x+15,y+26,16,.4);
        for(let j=0;j<4;j++){const xx=x+2+j*7;this.rect(c,xx,y+20+Math.sin(g.tick*.2+j)*2,3,5,'#aa786b');}
        this.rect(c,x+1,y+6,29,16,'#1b1216');this.rect(c,x+5,y+2,21,8,'#1b1216');this.rect(c,x+8,y-1,14,6,'#1b1216');this.rect(c,x-1,y+11,33,8,'#1b1216');
        this.rect(c,x+2,y+7,27,14,'#785955');this.rect(c,x+6,y+3,19,6,'#af7b69');this.rect(c,x+9,y,12,4,'#c19275');this.rect(c,x+10,y,6,1,'#e0b595');this.rect(c,x,y+12,31,6,'#5b4b4e');this.rect(c,x+6,y+10,4,4,'#f9cc94');this.rect(c,x+20,y+10,4,4,'#f9cc94');this.rect(c,x+6,y+10,1,1,'#fff3d6');this.rect(c,x+20,y+10,1,1,'#fff3d6');this.rect(c,x+11,y+20,10,2,'#352f3b');
        if(e.type==='charger'){this.rect(c,x+4,y+2,23,7,e.hit>0?'#ffe5b9':'#bbab78');this.rect(c,x+7,y-2,17,5,'#e0c693');this.rect(c,x+7,y-2,17,1,'#f6e3b6');this.rect(c,x-7,y+12,11,3,'#d9c49b');this.rect(c,x+12,y+2,2,6,'#666452');if(e.windup>0){this.glow(c,x+8,y+12,33,'#ff997b',.28);this.rect(c,x+1,y+10,7,4,'#ffe0ac');}if(e.charge>0){this.rect(c,x+33,y+16,12,2,'#dcc59a77');}}
      }
      if(e.windup>0||e.shooting){this.glow(c,x+15,y+12,30,'#ffb69a',.3);this.rect(c,x+13,y-12,3,7,'#ffd6a0');this.rect(c,x+13,y-2,3,2,'#ffd6a0');}
      if(e.charge>0)this.rect(c,x+31,y+15,16,2,'#f3bd9777');
      if(e.hit>0)this.glow(c,x+15,y+12,21,'#ffe3bc',.6);
    }
    draw(g) {
      if(g.state==='intro')g={...g,cameraX:0};
      const c=this.ctx;c.imageSmoothingEnabled=false;c.save();
      if(g.shake>0&&!g.reducedMotion)c.translate(Math.sin(g.tick*4)*g.shake,Math.cos(g.tick*5)*g.shake*.5);
      this.background(g.state==='intro'&&g.portrait?{...g,cameraX:480}:g);
      if(g.gravity===-1){this.glow(c,480,140,420,'#b88bdc',.11);c.fillStyle='#b999dd08';c.fillRect(0,0,960,540);}
      if(g.rushTimer>0||g.ultimateTimer>0){this.glow(c,245,310,240,'#ffd78e',.1);if(!g.reducedMotion)for(let i=0;i<14;i++)this.rect(c,(i*107-g.tick*14)%1080+60,145+hash(i+89)*260,25+hash(i+17)*45,1,'#f2d08f2b');}
      c.save();c.translate(-Math.floor(g.cameraX),0);
      const visible=p=>p.x+(p.w||30)>g.cameraX-55&&p.x<g.cameraX+960+55;
      for(const p of [...g.grounds,...g.stones,...(g.state==='intro'?[]:g.ceilings)])if(visible(p))this.platform(p,g);
      for(const h of g.hazards){
        if(h.dead||!visible(h))continue;
        if(h.type==='rift'){
          c.save();c.globalAlpha=h.warn>0?.16+Math.sin(g.tick*.22)*.08:.65;this.rect(c,h.x,h.y,h.w,h.h,h.warn>0?'#eab3bf':'#b968a3');
          c.strokeStyle=h.warn>0?'#f7d4be':'#f0c3db';c.lineWidth=1;c.setLineDash(h.warn>0?[9,8]:[]);c.strokeRect(h.x,h.y,h.w,h.h);
          if(h.warn>0){const yy=h.down?h.y+h.h+10:h.y-10;for(let xx=h.x+25;xx<h.x+h.w;xx+=70){c.beginPath();c.moveTo(xx-5,yy+(h.down?-5:5));c.lineTo(xx,yy+(h.down?2:-2));c.lineTo(xx+5,yy+(h.down?-5:5));c.stroke();}}
          c.restore();continue;
        }
        c.save();if(h.down){c.translate(0,h.y*2+20);c.scale(1,-1);}
        this.glow(c,h.x+h.w/2,h.y+10,40,'#cf89a3',.1);
        for(let i=0;i<h.w;i+=12){this.poly(c,[[h.x+i-1,h.y+21],[h.x+i+3,h.y+3],[h.x+i+8,h.y-1],[h.x+i+12,h.y+21]],'#2a1a24');this.poly(c,[[h.x+i,h.y+20],[h.x+i+4,h.y+3],[h.x+i+8,h.y],[h.x+i+11,h.y+20]],'#91677f');this.rect(c,h.x+i+5,h.y+6,2,9,'#e2a4b2');this.rect(c,h.x+i+7,h.y+1,1,2,'#ffe0ea');}
        this.rect(c,h.x,h.y+18,h.w,3,'#b88797');this.rect(c,h.x,h.y+18,h.w,1,'#d9a9b8');c.restore();
      }
      for(const s of g.springs){if(!visible(s))continue;const y=s.y+(s.compress>0?6:0);this.glow(c,s.x+17,y,35,'#92ddd3',.2);this.rect(c,s.x+13,y+5,8,470-y-5,'#669d85');for(let k=y+10;k<466;k+=6)this.rect(c,s.x+11,k,12,2,'#4c8573');this.rect(c,s.x-3,y+2,40,6,'#76bcb0');this.rect(c,s.x+2,y-3,30,6,'#b6e5c3');this.rect(c,s.x+9,y-6,16,4,'#d2edbf');this.rect(c,s.x+10,y-6,8,1,'#f2fbe2');this.rect(c,s.x+3,y+7,29,3,'#305d5b');this.rect(c,s.x+14,y-15,6,2,'#c8eab675');this.rect(c,s.x+16,y-19,2,5,'#c8eab675');}
      for(const m of g.motes){if(m.got||!visible(m))continue;const y=m.y+Math.sin(g.tick*.065+m.phase)*4,tw=.5+Math.sin(g.tick*.09+m.phase*1.7+m.x*.05)*.5;
        const color=m.rare?'#f2b0cf':'#e8d79a';this.glow(c,m.x,y,21+tw*4,color,.13+tw*.07);this.rect(c,m.x-2,y-5,4,10,m.rare?'#f4bbd6':'#eee0a2');this.rect(c,m.x-5,y-2,10,4,m.rare?'#cd84b6':'#d9c786');this.rect(c,m.x-1,y-1,2,2,'#fff5e0');
        if(tw>.72){c.globalAlpha=(tw-.72)*3;this.rect(c,m.x-1,y-10,1,4,'#fff5e0');this.rect(c,m.x-1,y+6,1,4,'#fff5e0');this.rect(c,m.x-10,y-1,4,1,'#fff5e0');this.rect(c,m.x+6,y-1,4,1,'#fff5e0');c.globalAlpha=1;}
      }
      for(const r of g.relics)if(!r.got&&visible(r))this.pickup(r,g);
      for(const e of g.enemies)if(e.alive&&(!['abyss','guardian'].includes(e.type)||e.active)&&visible(e))this.enemy(e,g);
      for(const b of g.shots){const color=b.power>=3?'#ffdc91':b.kind==='seeker'?'#a4dfe8':b.kind==='boomerang'?'#d7b2ed':'#edf0b8',size=1+(b.power||0)*.16;this.glow(c,b.x,b.y,18*size,color,.24);c.save();c.translate(b.x,b.y);c.scale(size,size);if(b.kind==='boomerang'){c.rotate(g.tick*.55);this.rect(c,-8,-2,16,4,color);this.rect(c,-2,-8,4,16,color);this.rect(c,-1,-1,2,2,'#ffffff');}else{this.rect(c,-17,-1,10,2,color+'77');this.rect(c,-8,-2,13,4,color);this.rect(c,-5,-1,8,2,'#fffdf0');}c.restore();}
      for(const b of g.bolts){const color=b.reflected?'#bcf3c9':'#f3a9a0';this.glow(c,b.x+7,b.y+5,24,color,.25);this.rect(c,b.x+(b.reflected?-9:12),b.y+4,12,2,color+'66');this.rect(c,b.x-1,b.y+1,18,8,b.reflected?'#0e2a1d':'#2a0f14');this.rect(c,b.x,b.y+2,16,6,color);this.rect(c,b.x+4,b.y+4,8,2,b.reflected?'#effff2':'#fff0e8');}
      for(const s of g.shockwaves){c.save();c.globalAlpha=s.life/20;c.strokeStyle='#f2c995';c.lineWidth=3;c.beginPath();c.ellipse(s.x,s.y,(21-s.life)*6,s.blast?(21-s.life)*6:8,0,0,Math.PI*2);c.stroke();c.globalAlpha=s.life/40;c.lineWidth=1;c.beginPath();c.ellipse(s.x,s.y,(21-s.life)*4,s.blast?(21-s.life)*4:5,0,0,Math.PI*2);c.stroke();c.restore();}
      for(const p of g.particles){c.globalAlpha=Math.max(0,p.life/p.max);this.rect(c,p.x,p.y,p.size,p.size,p.color);}c.globalAlpha=1;
      if(g.state==='intro')this.player({x:584,y:438,onGround:true,walk:g.tick*.055,jumps:0},g,true);else{
        if(g.dashTimer>0||g.rushTimer>0||g.ultimateTimer>0||g.player.diving)for(let i=0;i<g.player.trail.length;i+=2){const p=g.player.trail[i];c.globalAlpha=i/g.player.trail.length*.35;this.rect(c,p.x+3,p.y+3,20,25,g.gravity===-1?'#cfb5f1':g.rushTimer>0?'#ffdd9d':'#bcecd1');}c.globalAlpha=1;
        if(g.magnetTimer>0){c.save();c.setLineDash([2,10]);c.lineDashOffset=g.tick*.3;c.strokeStyle='#e2b5ca33';c.lineWidth=1;c.beginPath();c.arc(g.player.x+12,g.player.y+16,80,0,Math.PI*2);c.stroke();c.restore();}
        if(g.parryTimer>0||g.parryFlash>0){c.strokeStyle=g.parryFlash>0?'#f1fcff':'#b5e9f3';c.lineWidth=g.parryFlash>0?4:2;c.beginPath();c.arc(g.player.x+12,g.player.y+16,g.parryFlash>0?54:43,0,Math.PI*2);c.stroke();this.glow(c,g.player.x+12,g.player.y+16,66,'#bfefff',.18);}
        if(g.ultimateTimer>0){this.glow(c,g.player.x+12,g.player.y+16,100,'#ffe5a0',.45);this.poly(c,[[g.player.x-80,g.player.y+16],[g.player.x+20,g.player.y-18],[g.player.x+70,g.player.y+16],[g.player.x+20,g.player.y+50]],'#fbe6ad55');}
        c.save();if(g.gravity===-1){c.translate(0,g.player.y*2+g.player.h);c.scale(1,-1);}this.player(g.player,g);c.restore();
      }
      c.font='bold 12px Consolas,monospace';c.textAlign='center';c.lineWidth=3;c.lineJoin='round';c.strokeStyle='#061012';
      for(const t of g.floaters){c.globalAlpha=Math.min(1,t.life/15);const fx=Math.floor(t.x),fy=Math.floor(t.y);c.strokeText(t.text,fx,fy);c.fillStyle=t.color;c.fillText(t.text,fx,fy);}c.globalAlpha=1;
      c.restore();
      // Darken the top band so the HUD stays legible, then frame everything with a vignette.
      const top=c.createLinearGradient(0,0,0,135);top.addColorStop(0,'#02080ba6');top.addColorStop(1,'#02080b00');c.fillStyle=top;c.fillRect(0,0,960,135);
      const v=c.createRadialGradient(480,280,160,480,280,610);v.addColorStop(0,'#020c0f00');v.addColorStop(1,'#020a0dbd');c.fillStyle=v;c.fillRect(0,0,960,540);
      if(g.flash>0){c.fillStyle=`rgba(231,138,110,${g.flash/70})`;c.fillRect(0,0,960,540);}
      c.restore();
    }
  }
  window.GrottoArt=GrottoArt;
})();
