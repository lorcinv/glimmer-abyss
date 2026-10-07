/* Procedural soundtrack: all voices are synthesized locally with Web Audio. */
(() => {
  'use strict';
  const frequency = note => 440 * Math.pow(2, (note - 69) / 12);
  const scores = {
    explore: {bpm:84, bass:[38,38,41,36], melody:[62,69,65,72,69,65,60,65,62,57,65,69,60,65,57,60], volume:.72},
    elite: {bpm:118, bass:[38,38,34,36], melody:[62,65,69,74,69,65,62,57,58,62,65,70,60,63,67,72], volume:.85},
    boss: {bpm:154, bass:[38,34,36,33], melody:[74,69,65,62,77,74,69,65,70,65,62,58,72,67,63,60], volume:1},
    ultimate: {bpm:174, bass:[38,41,43,45], melody:[74,77,81,86,81,77,74,69,77,81,84,89,81,77,74,81], volume:.95}
  };
  class GrottoMusic {
    constructor(){this.ctx=null;this.mode='explore';this.step=0;this.next=0;this.playing=false;this.nodes=new Set();}
    start(ctx){if(!ctx)return;if(this.ctx!==ctx){this.ctx=ctx;this.master=ctx.createGain();this.master.gain.value=.16;this.master.connect(ctx.destination);}this.next=ctx.currentTime+.03;}
    note(midi,at,duration,type,volume){
      const c=this.ctx,o=c.createOscillator(),a=c.createGain();o.type=type;o.frequency.setValueAtTime(frequency(midi),at);a.gain.setValueAtTime(.0001,at);a.gain.exponentialRampToValueAtTime(volume,at+.014);a.gain.exponentialRampToValueAtTime(.0001,at+duration);o.connect(a).connect(this.master);this.nodes.add(o);o.onended=()=>{this.nodes.delete(o);o.disconnect();a.disconnect();};o.start(at);o.stop(at+duration+.02);
    }
    drum(at,accent=false){const c=this.ctx,o=c.createOscillator(),a=c.createGain();o.type=accent?'triangle':'sine';o.frequency.setValueAtTime(accent?210:115,at);o.frequency.exponentialRampToValueAtTime(accent?65:36,at+.12);a.gain.setValueAtTime(accent?.16:.22,at);a.gain.exponentialRampToValueAtTime(.0001,at+.18);o.connect(a).connect(this.master);this.nodes.add(o);o.onended=()=>{this.nodes.delete(o);o.disconnect();a.disconnect();};o.start(at);o.stop(at+.2);}
    update(mode,playing,enabled){
      if(!this.ctx)return;const c=this.ctx,active=playing&&enabled&&c.state!=='suspended';
      if(mode!==this.mode){this.mode=mode;this.step=0;this.next=c.currentTime+.02;}
      if(active!==this.playing){this.master.gain.cancelScheduledValues(c.currentTime);this.master.gain.setTargetAtTime(active?.16:0,c.currentTime,.08);this.playing=active;this.next=c.currentTime+.02;}
      if(!active)return;if(this.next<c.currentTime-.2)this.next=c.currentTime+.02;
      const s=scores[mode]||scores.explore,beat=60/s.bpm/2;let scheduled=0;
      while(this.next<c.currentTime+.14&&scheduled++<3){const i=this.step%32,chord=Math.floor(i/8),base=s.bass[chord],at=this.next;
        if(i%4===0)this.note(base,at,beat*3.7,'triangle',.18*s.volume);
        if(mode==='explore'){
          if(i%2===0)this.note(s.melody[Math.floor(i/2)],at,beat*2.8,'sine',.11);
          if(i%8===0){this.note(base+24,at,beat*7.5,'sine',.04);this.note(base+31,at,beat*7.5,'sine',.03);}
        }else{
          this.note(s.melody[i%16],at,beat*.8,mode==='boss'?'square':'triangle',mode==='boss'?.038:.085);
          if(i%2===0)this.note(base+12,at,beat*.72,'sawtooth',.025);
          if(i%4===0)this.drum(at);if(i%4===2)this.drum(at,true);
          if(mode==='boss'&&i%8===6)this.note(base+19,at,beat*1.6,'triangle',.07);
        }
        this.next+=beat;this.step++;
      }
    }
  }
  window.GrottoMusic=GrottoMusic;
})();
