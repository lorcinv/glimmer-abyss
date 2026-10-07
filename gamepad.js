(() => {
  'use strict';
  class GrottoGamepad {
    constructor(actions){this.actions=actions;this.previous=[];this.index=null;this.held={left:false,right:false,shoot:false,jump:false};this.active=false;}
    poll(){
      let pads=[];try{pads=typeof navigator!=='undefined'&&navigator.getGamepads?Array.from(navigator.getGamepads()):[];}catch(_){}
      const candidates=pads.filter(p=>p&&p.connected!==false);
      const engaged=p=>p.buttons.some(b=>b.pressed||b.value>.45)||p.axes.some(a=>Math.abs(a)>.24);
      const pad=candidates.find(p=>p.index===this.index&&engaged(p))||candidates.find(engaged)||candidates.find(p=>p.index===this.index)||candidates[0];
      if(!pad){if(this.index!==null){if(this.held.jump)this.actions.releaseJump();this.actions.device('keyboard');}this.index=null;this.previous=[];Object.keys(this.held).forEach(k=>this.held[k]=false);return;}
      if(this.index!==pad.index){this.previous=[];this.index=pad.index;}
      const pressed=i=>!!pad.buttons[i]&&(pad.buttons[i].pressed||pad.buttons[i].value>.45),buttons=Array.from({length:17},(_,i)=>pressed(i));
      const edge=i=>buttons[i]&&!this.previous[i];
      if(engaged(pad)){this.active=true;this.actions.device('gamepad');}
      this.held.left=(pad.axes[0]||0)<-.24||buttons[14];this.held.right=(pad.axes[0]||0)>.24||buttons[15];this.held.shoot=buttons[2];
      const wasJump=this.held.jump;this.held.jump=buttons[0]||buttons[12];
      if(edge(9))this.actions.pause();
      if((edge(0)||edge(12)))this.actions.jump();
      if(wasJump&&!this.held.jump)this.actions.releaseJump();
      if(edge(6))this.actions.dash();if(edge(7))this.actions.gravity();if(edge(3))this.actions.ultimate();if(edge(4))this.actions.parry();if(edge(1)||edge(13))this.actions.dive();
      this.previous=buttons;
    }
  }
  window.GrottoGamepad=GrottoGamepad;
})();
