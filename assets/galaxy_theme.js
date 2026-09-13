window.galaxyBg = (function(){
  var _raf = null;
  var _running = false;

  var canvas, ctx, W, H, cx, cy;

const FOV          = 500;
const DEPTH        = 1200;
const STAR_COUNT   = 420;
const DUST_COUNT   = 160;
const NEBULA_COUNT = 14;
const CLUSTER_COUNT= 4;
const COMET_COUNT  = 2;
const PULSAR_COUNT = 2;
const FADE_SPEED   = 0.0008;

const STAR_COLORS = [
  [160,210,255],[200,230,255],[255,255,245],[255,245,180],
  [255,210,120],[255,140,90],[190,160,255],[120,210,255],
];
const NEBULA_PALETTES = [
  {r:220,g:60, b:100}, {r:60, g:80, b:200},
  {r:80, g:160,b:60 }, {r:200,g:100,b:255},
  {r:255,g:140,b:60 }, {r:60, g:180,b:255},
  {r:255,g:60, b:180}, {r:40, g:200,b:160},
  {r:180,g:220,b:80 }, {r:120,g:60, b:220},
  {r:255,g:200,b:80 }, {r:60, g:120,b:255},
];

const wind = {x:0,y:0,vx:0,vy:0,tx:0,ty:0,timer:0,period:5000,drift:0};

const cam = {
  speed:      1.0,
  targetSpeed:1.0,
  burstTimer: 0,
  burstActive:false,
  burstDuration:0,
  burstElapsed:0,
  turnTimer:  0,
};
function _scheduleBurst(){
  cam.burstTimer = 18000 + Math.random()*35000;
}
function _scheduleTurn(){
  cam.turnTimer = 14000 + Math.random()*22000;
}
_scheduleBurst();
_scheduleTurn();

function updateCamSpeed(dt){
  cam.burstTimer -= dt;
  if(cam.burstTimer <= 0 && !cam.burstActive){
    const big = Math.random() < 0.40;
    cam.targetSpeed   = big ? 7.0 + Math.random()*5.0 : 3.0 + Math.random()*2.0;
    cam.burstDuration = big ? 6000 + Math.random()*6000 : 5000 + Math.random()*5000;
    cam.burstElapsed  = 0;
    cam.burstActive   = true;
  }
  if(cam.burstActive){
    cam.burstElapsed += dt;
    if(cam.burstElapsed >= cam.burstDuration){
      cam.burstActive = false;
      cam.targetSpeed = 1.0;
      _scheduleBurst();
    }
  }
  const eSpeed = 1 - Math.pow(0.9970, dt);
  cam.speed += (cam.targetSpeed - cam.speed) * eSpeed;

  cam.turnTimer -= dt;
  if(cam.turnTimer <= 0){
    const a = Math.random() * Math.PI * 2;
    const s = 0.030 + Math.random()*0.055;
    cam._pendingTurnX = Math.cos(a) * s;
    cam._pendingTurnY = Math.sin(a) * s;
    cam._hasPendingTurn = true;
    _scheduleTurn();
  }
}

function updateWind(dt){
  wind.drift += (Math.sin(wind.drift*0.3)*0.00003 - 0.000015)*dt;
  wind.timer -= dt;
  if(wind.timer<=0){
    if(cam._hasPendingTurn){
      wind.tx = cam._pendingTurnX;
      wind.ty = cam._pendingTurnY;
      cam._hasPendingTurn = false;
    } else {
      const a=Math.random()*Math.PI*2;
      const baseS = Math.random()<0.15 ? 0 : 0.012+Math.random()*0.030;
      wind.tx = Math.cos(a)*baseS;
      wind.ty = Math.sin(a)*baseS;
    }
    wind.period = 2500+Math.random()*5000; wind.timer=wind.period;
  }
  const eSmooth = 1-Math.pow(0.9980, dt);
  wind.vx+=(wind.tx-wind.vx)*eSmooth; wind.vy+=(wind.ty-wind.vy)*eSmooth;
  const maxDelta = Math.min(W,H)*0.0020;
  const dx = wind.vx*dt*cam.speed;
  const dy = wind.vy*dt*cam.speed;
  wind.x += Math.max(-maxDelta, Math.min(maxDelta, dx));
  wind.y += Math.max(-maxDelta, Math.min(maxDelta, dy));
  const md=Math.min(W,H)*0.30;
  wind.x*=1-Math.pow(0.9995,dt)*(Math.abs(wind.x)/md);
  wind.y*=1-Math.pow(0.9995,dt)*(Math.abs(wind.y)/md);
}

const horizon = {
  angle:0.38, targetAngle:0.38, timerAngle:18000,
  thickness:0, targetThickness:0, timerThickness:22000,
  hue:0, targetHue:0, timerHue:30000,
  alpha:0.12, targetAlpha:0.12, timerAlpha:25000,
  phase:0,
};
function updateHorizon(dt){
  horizon.phase += 0.000018*dt;
  horizon.timerAngle -= dt;
  if(horizon.timerAngle<=0){
    horizon.targetAngle=horizon.angle+(Math.random()-0.5)*0.18;
    horizon.targetAngle=Math.max(0.10,Math.min(0.75,horizon.targetAngle));
    horizon.timerAngle=18000+Math.random()*22000;
  }
  horizon.timerThickness -= dt;
  if(horizon.timerThickness<=0){
    horizon.targetThickness=H*(0.10+Math.random()*0.30);
    horizon.timerThickness=22000+Math.random()*28000;
  }
  horizon.timerHue -= dt;
  if(horizon.timerHue<=0){ horizon.targetHue=Math.random(); horizon.timerHue=30000+Math.random()*30000; }
  horizon.timerAlpha -= dt;
  if(horizon.timerAlpha<=0){ horizon.targetAlpha=0.09+Math.random()*0.13; horizon.timerAlpha=25000+Math.random()*20000; }
  const eAngle=1-Math.pow(0.9997,dt), eThick=1-Math.pow(0.9995,dt);
  const eHue=1-Math.pow(0.9993,dt),   eAlpha=1-Math.pow(0.9994,dt);
  horizon.angle     += (horizon.targetAngle     - horizon.angle)     * eAngle;
  horizon.thickness += (horizon.targetThickness - horizon.thickness) * eThick;
  horizon.hue       += (horizon.targetHue       - horizon.hue)       * eHue;
  horizon.alpha     += (horizon.targetAlpha     - horizon.alpha)     * eAlpha;
}

const mouse={nx:0,ny:0,x:0,y:0};
function _onMouseMove(e){
  if(!W||!H) return;
  mouse.nx=(e.clientX-W*0.5)/(W*0.5);
  mouse.ny=(e.clientY-H*0.5)/(H*0.5);
}
function updateMouse(dt){
  const e=1-Math.pow(0.9985,dt);
  mouse.x+=(mouse.nx-mouse.x)*e; mouse.y+=(mouse.ny-mouse.y)*e;
}

let camPhase=0;
function getCamRoll(dt){ camPhase+=0.00012*dt; return Math.sin(camPhase)*0.04+Math.sin(camPhase*0.4)*0.02; }
let sceneAlpha=0;
function pcx(z,wf){ return cx + mouse.x*(W*-0.0456)*(1-Math.min(z,DEPTH)/DEPTH*0.7)*wf + wind.x*wf; }
function pcy(z,wf){ return cy + mouse.y*(H*-0.0285)*(1-Math.min(z,DEPTH)/DEPTH*0.7)*wf + wind.y*wf; }
const _D={addColorStop(){}};
function radial(x0,y0,r0,x1,y1,r1){
  if(!isFinite(x0+y0+r0+x1+y1+r1)||r0<0||r1<0) return _D;
  try{ return ctx.createRadialGradient(x0,y0,r0,x1,y1,r1); }catch(e){ return _D; }
}
function linear(x0,y0,x1,y1){
  if(!isFinite(x0+y0+x1+y1)) return _D;
  try{ return ctx.createLinearGradient(x0,y0,x1,y1); }catch(e){ return _D; }
}
function ok(g){ return g!==_D; }

function drawBand(){
  const bx=cx+wind.x*0.2+mouse.x*(W*-0.015), by=cy+wind.y*0.2+mouse.y*(H*-0.01);
  const ang=horizon.angle+wind.drift*0.04;
  const bw=Math.max(W,H)*1.8;
  const bh=Math.max(H*0.55,horizon.thickness*1.6);
  const h=horizon.hue;
  function horizonRGB(t){
    if(t<0.33){ const f=t/0.33; return [Math.round(30+f*40),Math.round(25+f*35),Math.round(60+f*60)]; }
    else if(t<0.66){ const f=(t-0.33)/0.33; return [Math.round(70-f*20),Math.round(60+f*20),Math.round(120-f*10)]; }
    else { const f=(t-0.66)/0.34; return [Math.round(50+f*30),Math.round(80-f*20),Math.round(110-f*50)]; }
  }
  const [r1,g1c,b1]=horizonRGB(h);
  const ao=Math.max(0.28,horizon.alpha*2.2);
  ctx.save(); ctx.translate(bx,by); ctx.rotate(ang);
  const gradOuter=ctx.createLinearGradient(0,-bh,0,bh);
  gradOuter.addColorStop(0,'rgba(0,0,0,0)');
  gradOuter.addColorStop(0.22,`rgba(${r1},${g1c},${b1},${(ao*0.18).toFixed(3)})`);
  gradOuter.addColorStop(0.38,`rgba(${r1},${g1c},${b1},${(ao*0.38).toFixed(3)})`);
  gradOuter.addColorStop(0.50,`rgba(${Math.min(255,r1+20)},${Math.min(255,g1c+15)},${Math.min(255,b1+8)},${(ao*0.45).toFixed(3)})`);
  gradOuter.addColorStop(0.62,`rgba(${r1},${g1c},${b1},${(ao*0.38).toFixed(3)})`);
  gradOuter.addColorStop(0.78,`rgba(${r1},${g1c},${b1},${(ao*0.18).toFixed(3)})`);
  gradOuter.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=gradOuter; ctx.globalCompositeOperation='screen';
  ctx.fillRect(-bw/2,-bh,bw,bh*2);
  const coreH=bh*0.28;
  const gradCore=ctx.createLinearGradient(0,-coreH,0,coreH);
  const cr2=Math.min(255,r1+55),cg2=Math.min(255,g1c+48),cb2=Math.min(255,b1+22);
  gradCore.addColorStop(0,'rgba(0,0,0,0)');
  gradCore.addColorStop(0.30,`rgba(${cr2},${cg2},${cb2},${(ao*0.55).toFixed(3)})`);
  gradCore.addColorStop(0.50,`rgba(${Math.min(255,cr2+30)},${Math.min(255,cg2+25)},${Math.min(255,cb2+10)},${(ao*0.75).toFixed(3)})`);
  gradCore.addColorStop(0.70,`rgba(${cr2},${cg2},${cb2},${(ao*0.55).toFixed(3)})`);
  gradCore.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=gradCore; ctx.fillRect(-bw/2,-coreH,bw,coreH*2);
  ctx.globalCompositeOperation='source-over'; ctx.restore();
}

function drawStar(x,y,cr,cg,cb,alpha,size,spikes,spikeLen){
  if(!isFinite(x+y+size)||size<=0) return;
  ctx.beginPath(); ctx.arc(x,y,size,0,Math.PI*2);
  ctx.fillStyle=`rgba(${cr},${cg},${cb},${Math.min(1,alpha)})`; ctx.fill();
  if(size>0.5){ ctx.beginPath(); ctx.arc(x,y,size*0.35,0,Math.PI*2);
    ctx.fillStyle=`rgba(255,255,255,${Math.min(1,alpha*0.9)})`; ctx.fill(); }
  if(spikes>0&&spikeLen>1&&isFinite(spikeLen)){
    const off=spikes===6?0:Math.PI/4;
    for(let i=0;i<spikes;i++){
      const a=off+(i/spikes)*Math.PI*2;
      const ex=x+Math.cos(a)*spikeLen, ey=y+Math.sin(a)*spikeLen;
      const g=linear(x,y,ex,ey);
      if(ok(g)){
        g.addColorStop(0,`rgba(${cr},${cg},${cb},${alpha*0.85})`);
        g.addColorStop(1,`rgba(${cr},${cg},${cb},0)`);
        ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(ex,ey);
        ctx.strokeStyle=g; ctx.lineWidth=Math.max(0.25,size*0.3); ctx.stroke();
      }
    }
  }
}

function spawnFarEnough(arr,x3,y3,minDist3D){
  for(const o of arr){
    const dx=o.x3-x3, dy=o.y3-y3;
    if(dx*dx+dy*dy<minDist3D*minDist3D) return false;
  }
  return true;
}
function safePos(arr,rangeX,rangeY,minDist,tries=12){
  for(let i=0;i<tries;i++){
    const x3=(Math.random()-0.5)*rangeX;
    const y3=(Math.random()-0.5)*rangeY;
    if(spawnFarEnough(arr,x3,y3,minDist)) return {x3,y3};
  }
  return {x3:(Math.random()-0.5)*rangeX, y3:(Math.random()-0.5)*rangeY};
}

class Star {
  constructor(fresh){ this.reset(fresh); }
  reset(fresh){
    const c=STAR_COLORS[Math.floor(Math.random()*STAR_COLORS.length)];
    this.cr=c[0]; this.cg=c[1]; this.cb=c[2];
    this.x3=(Math.random()-0.5)*W*2.4;
    this.y3=Math.random()<0.5?(Math.random()-0.5)*H*0.6:(Math.random()-0.5)*H*2.4;
    this.z=fresh?Math.random()*DEPTH:DEPTH; this.pz=this.z;
    this.wf=0.5+Math.random()*0.8;
    this.speed=1.5+Math.random()*3;
    this.tp=Math.random()*Math.PI*2; this.ts=0.015+Math.random()*0.04;
    const r=Math.random();
    this.type=r<0.65?0:r<0.90?1:2;
    this.spikes=this.type===2?4:this.type===1&&Math.random()<0.5?6:0;
    this.size=this.type===2?1.3+Math.random()*0.8:this.type===1?0.8+Math.random()*0.4:0.4+Math.random()*0.3;
    this.fadeAlpha=fresh?1:Math.max(0, 1-(this.z/DEPTH));
  }
  update(dt){
    this.pz=this.z; this.z-=this.speed*dt*0.05*cam.speed; this.tp+=this.ts;
    const zf=1-this.z/DEPTH;
    this.x3+=wind.vx*dt*this.wf*(0.4+zf*1.8)*FOV*0.004;
    this.y3+=wind.vy*dt*this.wf*(0.4+zf*1.8)*FOV*0.004;
    if(this.fadeAlpha<1) this.fadeAlpha=Math.min(1,this.fadeAlpha+FADE_SPEED*(2.5+cam.speed*1.5)*dt);
    if(this.z<=1) this.reset(false);
  }
  draw(){
    if(!isFinite(this.z)||this.z<=0) return;
    const ox=pcx(this.z,this.wf), oy=pcy(this.z,this.wf);
    const sc=FOV/this.z, psc=FOV/Math.max(this.pz,1);
    const sx=this.x3*sc+ox, sy=this.y3*sc+oy;
    if(!isFinite(sx+sy)||sx<-60||sx>W+60||sy<-60||sy>H+60) return;
    const prox=1-this.z/DEPTH;
    const twk=0.5+0.5*Math.sin(this.tp);
    const alpha=Math.min(1,prox*2.8)*(0.55+0.45*twk)*this.fadeAlpha;
    if(alpha<0.01) return;
    if(this.type>0){
      const spx=this.x3*psc+ox, spy=this.y3*psc+oy;
      const tl=Math.hypot(sx-spx,sy-spy);
      if(tl>0.4){
        const tg=linear(spx,spy,sx,sy);
        if(ok(tg)){
          tg.addColorStop(0,`rgba(${this.cr},${this.cg},${this.cb},0)`);
          tg.addColorStop(1,`rgba(${this.cr},${this.cg},${this.cb},${alpha*0.55})`);
          ctx.beginPath(); ctx.moveTo(spx,spy); ctx.lineTo(sx,sy);
          ctx.strokeStyle=tg; ctx.lineWidth=this.size*0.45; ctx.stroke();
        }
      }
    }
    const spikeLen=this.type===2?(12+prox*38)*prox:this.type===1?(3+prox*16)*prox:0;
    drawStar(sx,sy,this.cr,this.cg,this.cb,alpha,this.size,this.spikes,spikeLen);
  }
}

class Nebula {
  constructor(fresh){ this.reset(fresh); }
  reset(fresh){
    const p=NEBULA_PALETTES[Math.floor(Math.random()*NEBULA_PALETTES.length)];
    this.cr=p.r; this.cg=p.g; this.cb=p.b;
    const sp=safePos(nebulae,W*1.4,H*1.2,W*0.28);
    this.x3=sp.x3; this.y3=sp.y3;
    this.z=fresh?300+Math.random()*800:900+Math.random()*200; this.pz=this.z;
    this.baseR=70+Math.random()*130; this.speed=0.12+Math.random()*0.25;
    this.alpha=0.12+Math.random()*0.18; this.wf=0.1+Math.random()*0.2;
    this.rot=Math.random()*Math.PI; this.rx=0.5+Math.random()*0.8;
    this.pp=Math.random()*Math.PI*2; this.ps=0.0005+Math.random()*0.001;
    this.fadeAlpha=fresh?1:0;
  }
  update(dt){
    this.pz=this.z; this.z-=this.speed*dt*0.05; this.pp+=this.ps*dt;
    if(this.fadeAlpha<1) this.fadeAlpha=Math.min(1,this.fadeAlpha+FADE_SPEED*0.9*dt);
    if(this.z<=80) this.fadeAlpha=Math.max(0,this.fadeAlpha-FADE_SPEED*1.5*dt);
    if(this.z<=5) this.reset(false);
  }
  draw(){
    if(!isFinite(this.z)||this.z<=0) return;
    const ox=pcx(this.z,this.wf), oy=pcy(this.z,this.wf);
    const sc=FOV/this.z;
    const x=this.x3*sc+ox, y=this.y3*sc+oy;
    const r=this.baseR*sc;
    if(!isFinite(x+y+r)||r<2||x<-r||x>W+r||y<-r||y>H+r) return;
    const prox=Math.max(0,1-this.z/DEPTH);
    const a=this.alpha*Math.min(1,prox*2.5)*this.fadeAlpha;
    if(a<0.008) return;
    ctx.save(); ctx.translate(x,y); ctx.rotate(this.rot+wind.drift*0.25); ctx.scale(this.rx,1);
    const g=ctx.createRadialGradient(0,0,0,0,0,r);
    g.addColorStop(0,`rgba(${this.cr},${this.cg},${this.cb},${a*0.9})`);
    g.addColorStop(0.4,`rgba(${this.cr},${this.cg},${this.cb},${a*0.4})`);
    g.addColorStop(1,`rgba(${this.cr},${this.cg},${this.cb},0)`);
    ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2);
    ctx.fillStyle=g; ctx.globalCompositeOperation='screen'; ctx.fill();
    ctx.globalCompositeOperation='source-over'; ctx.restore();
  }
}

class DustCloud {
  constructor(fresh){ this.reset(fresh); }
  reset(fresh){
    const h=Math.random();
    if(h<0.33){ this.cr=90; this.cg=55; this.cb=35; }
    else if(h<0.66){ this.cr=55; this.cg=75; this.cb=160; }
    else { this.cr=130; this.cg=75; this.cb=150; }
    this.x3=(Math.random()-0.5)*W*3; this.y3=(Math.random()-0.5)*H*3;
    this.z=fresh?Math.random()*DEPTH:DEPTH; this.pz=this.z;
    this.speed=0.4+Math.random()*1.1; this.baseR=10+Math.random()*30;
    this.wf=0.3+Math.random()*0.6; this.alpha=0.04+Math.random()*0.09;
    this.fadeAlpha=fresh?1:0;
  }
  update(dt){
    this.pz=this.z; this.z-=this.speed*dt*0.05;
    const zf=1-this.z/DEPTH;
    this.x3+=wind.vx*dt*this.wf*(0.5+zf*1.5)*FOV*0.003;
    this.y3+=wind.vy*dt*this.wf*(0.5+zf*1.5)*FOV*0.003;
    if(this.fadeAlpha<1) this.fadeAlpha=Math.min(1,this.fadeAlpha+FADE_SPEED*1.5*dt);
    if(this.z<=30) this.fadeAlpha=Math.max(0,this.fadeAlpha-FADE_SPEED*2*dt);
    if(this.z<=1) this.reset(false);
  }
  draw(){
    if(!isFinite(this.z)||this.z<=0) return;
    const ox=pcx(this.z,this.wf), oy=pcy(this.z,this.wf);
    const sc=FOV/this.z;
    const x=this.x3*sc+ox, y=this.y3*sc+oy;
    const prox=Math.max(0,1-this.z/DEPTH);
    const r=this.baseR*prox*3+2;
    if(!isFinite(x+y+r)||r<1||x<-r||x>W+r||y<-r||y>H+r) return;
    const a=this.alpha*Math.min(1,prox*3)*this.fadeAlpha;
    if(a<0.004) return;
    const g=ctx.createRadialGradient(x,y,0,x,y,r);
    g.addColorStop(0,`rgba(${this.cr},${this.cg},${this.cb},${a})`);
    g.addColorStop(1,`rgba(${this.cr},${this.cg},${this.cb},0)`);
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2);
    ctx.fillStyle=g; ctx.globalCompositeOperation='screen'; ctx.fill();
    ctx.globalCompositeOperation='source-over';
  }
}

class StarCluster {
  constructor(fresh){ this.reset(fresh); }
  reset(fresh){
    const sp=safePos(clusters,W*2,H*1.8,W*0.32);
    this.cx3=sp.x3; this.cy3=sp.y3;
    this.x3=this.cx3; this.y3=this.cy3;
    this.z=fresh?200+Math.random()*900:900+Math.random()*200; this.pz=this.z;
    this.speed=0.25+Math.random()*0.6; this.wf=0.2+Math.random()*0.4;
    this.count=14+Math.floor(Math.random()*22); this.spread=25+Math.random()*55;
    const c=STAR_COLORS[Math.floor(Math.random()*STAR_COLORS.length)];
    this.cr=c[0]; this.cg=c[1]; this.cb=c[2];
    this.pts=Array.from({length:this.count},()=>({
      ox:(Math.random()-0.5)*2, oy:(Math.random()-0.5)*2,
      br:0.4+Math.random()*0.8, sp:Math.random()<0.15?4:0
    }));
    this.fadeAlpha=fresh?1:0;
  }
  update(dt){
    this.pz=this.z; this.z-=this.speed*dt*0.05;
    const zf=1-this.z/DEPTH;
    this.cx3+=wind.vx*dt*this.wf*(0.4+zf)*FOV*0.003;
    this.cy3+=wind.vy*dt*this.wf*(0.4+zf)*FOV*0.003;
    if(this.fadeAlpha<1) this.fadeAlpha=Math.min(1,this.fadeAlpha+FADE_SPEED*dt);
    if(this.z<=60) this.fadeAlpha=Math.max(0,this.fadeAlpha-FADE_SPEED*1.5*dt);
    if(this.z<=5) this.reset(false);
  }
  draw(){
    if(!isFinite(this.z)||this.z<=0||this.fadeAlpha<0.01) return;
    const ox=pcx(this.z,this.wf), oy=pcy(this.z,this.wf);
    const sc=FOV/this.z;
    const bx=this.cx3*sc+ox, by=this.cy3*sc+oy;
    const sp=this.spread*sc;
    if(!isFinite(bx+by+sp)) return;
    const prox=Math.max(0,1-this.z/DEPTH);
    const a=Math.min(1,prox*2.5)*this.fadeAlpha;
    if(a<0.02) return;
    const hr=sp*0.55;
    const hg=ctx.createRadialGradient(bx,by,0,bx,by,hr);
    hg.addColorStop(0,`rgba(${this.cr},${this.cg},${this.cb},${a*0.18})`);
    hg.addColorStop(1,`rgba(${this.cr},${this.cg},${this.cb},0)`);
    ctx.beginPath(); ctx.arc(bx,by,hr,0,Math.PI*2);
    ctx.fillStyle=hg; ctx.globalCompositeOperation='screen'; ctx.fill();
    ctx.globalCompositeOperation='source-over';
    for(const p of this.pts){
      const sx=bx+p.ox*sp, sy=by+p.oy*sp;
      if(!isFinite(sx+sy)||sx<-20||sx>W+20||sy<-20||sy>H+20) continue;
      const sl=p.sp?prox*10:0;
      drawStar(sx,sy,this.cr,this.cg,this.cb,a*p.br,0.55+p.br*0.4,p.sp,sl);
    }
  }
}

class BlackHole {
  constructor(fresh){ this.reset(fresh); }
  reset(fresh){
    const sp=safePos(blackHoles,W*1.6,H*1.6,W*0.45);
    this.x3=sp.x3; this.y3=sp.y3;
    this.z=fresh?200+Math.random()*700:700+Math.random()*400; this.pz=this.z;
    this.baseR=10+Math.random()*28;
    this.diskRMult=7.5+Math.random()*5.5;
    this.speed=0.06+Math.random()*0.1;
    this.wf=0.1+Math.random()*0.15;
    this.globalAngle=Math.random()*Math.PI*2;
    this.diskFlatten=0.08+Math.random()*0.38;
    this.pulse=Math.random()*Math.PI*2; this.pulseSpeed=0.0008+Math.random()*0.001;
    this.fadeAlpha=fresh?1:0; this.dying=false; this._dead=false;
  }
  update(dt){
    this.pz=this.z; this.z-=this.speed*dt*0.05;
    const zf=1-this.z/DEPTH;
    this.x3+=wind.vx*dt*this.wf*(0.3+zf)*FOV*0.003;
    this.y3+=wind.vy*dt*this.wf*(0.3+zf)*FOV*0.003;
    this.pulse+=this.pulseSpeed*dt;
    if(!this.dying&&this.fadeAlpha<1) this.fadeAlpha=Math.min(1,this.fadeAlpha+FADE_SPEED*0.5*dt);

    if(!this.dying){
      const _sc=FOV/Math.max(this.z,1),_ox=pcx(this.z,this.wf),_oy=pcy(this.z,this.wf);
      const _x=this.x3*_sc+_ox,_y=this.y3*_sc+_oy,_r=this.baseR*_sc;
      const offscreen=_x<-_r*2||_x>W+_r*2||_y<-_r*2||_y>H+_r*2;
      if(this.z<=220||offscreen) this.dying=true;
    }
    const fadeRate = FADE_SPEED * (0.45 + cam.speed * 0.08);
    if(this.dying) this.fadeAlpha=Math.max(0,this.fadeAlpha-fadeRate*dt);
    if(this.fadeAlpha<=0) this._dead=true;
  }
  draw(){
    if(!isFinite(this.z)||this.z<=0||this.fadeAlpha<0.01) return;
    const ox=pcx(this.z,this.wf), oy=pcy(this.z,this.wf);
    const sc=FOV/this.z;
    const x=this.x3*sc+ox, y=this.y3*sc+oy;
    const r=this.baseR*sc;
    if(!isFinite(x+y+r)||r<2||x<-r*10||x>W+r*10||y<-r*10||y>H+r*10) return;
    const prox=Math.max(0,1-this.z/DEPTH);
    const alpha=Math.min(1,prox*3)*this.fadeAlpha;
    if(alpha<0.02) return;
    const fl=1+0.04*Math.sin(this.pulse);

    for(let i=5;i>=1;i--){
      const lr=r*(2.2+i*0.9);
      const lg=ctx.createRadialGradient(x,y,lr*0.8,x,y,lr);
      lg.addColorStop(0,'rgba(255,255,255,0)');
      lg.addColorStop(0.5,`rgba(255,240,200,${alpha*0.04/i})`);
      lg.addColorStop(1,'rgba(255,255,255,0)');
      ctx.beginPath(); ctx.arc(x,y,lr,0,Math.PI*2); ctx.fillStyle=lg; ctx.fill();
    }

    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(this.globalAngle);

    const jl=r*10*fl;
    for(const sign of [1,-1]){
      const jg=ctx.createLinearGradient(0,0,0,sign*jl);
      jg.addColorStop(0,`rgba(160,210,255,${alpha*0.70})`);
      jg.addColorStop(0.35,`rgba(90,150,255,${alpha*0.35})`);
      jg.addColorStop(1,'rgba(60,100,255,0)');
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,sign*jl);
      ctx.strokeStyle=jg; ctx.lineWidth=r*0.25;
      ctx.globalCompositeOperation='screen'; ctx.stroke();
      ctx.globalCompositeOperation='source-over';
    }

    ctx.save();
    ctx.scale(1,this.diskFlatten);
    const diskR=r*this.diskRMult*fl;
    const dg=ctx.createRadialGradient(0,0,r*0.92,0,0,diskR);
    dg.addColorStop(0,    `rgba(255,255,210,${alpha*0.98})`);
    dg.addColorStop(0.06, `rgba(255,230,100,${alpha*0.92})`);
    dg.addColorStop(0.16, `rgba(255,150,20,${alpha*0.75})`);
    dg.addColorStop(0.32, `rgba(255,80,10,${alpha*0.50})`);
    dg.addColorStop(0.55, `rgba(180,30,0,${alpha*0.22})`);
    dg.addColorStop(1,    `rgba(40,0,0,0)`);
    ctx.beginPath(); ctx.arc(0,0,diskR,0,Math.PI*2);
    ctx.fillStyle=dg; ctx.globalCompositeOperation='screen'; ctx.fill();
    ctx.globalCompositeOperation='source-over';

    ctx.beginPath(); ctx.arc(0,0,r*1.3,0,Math.PI*2);
    ctx.strokeStyle=`rgba(255,235,170,${alpha*0.70})`; ctx.lineWidth=r*0.18; ctx.stroke();

    ctx.beginPath(); ctx.arc(0,0,r*2.0,0,Math.PI*2);
    ctx.strokeStyle=`rgba(255,180,80,${alpha*0.20})`; ctx.lineWidth=r*0.08; ctx.stroke();
    ctx.restore();

    ctx.beginPath(); ctx.arc(0,0,r*0.82,0,Math.PI*2); ctx.fillStyle='#000'; ctx.fill();
    ctx.beginPath(); ctx.arc(0,0,r*0.82,0,Math.PI*2);
    ctx.strokeStyle=`rgba(255,200,80,${alpha*0.65})`; ctx.lineWidth=Math.max(1,r*0.08); ctx.stroke();

    ctx.restore();
  }
}

class Galaxy {
  constructor(fresh){ this.reset(fresh); }
  reset(fresh){
    const sp=safePos(galaxies,W*1.5,H*1.5,W*0.50);
    this.x3=sp.x3; this.y3=sp.y3;
    this.z=fresh?200+Math.random()*800:700+Math.random()*400; this.pz=this.z;
    this.baseR=55+Math.random()*95; this.speed=0.04+Math.random()*0.07;
    this.wf=0.08+Math.random()*0.12;
    this.tilt=0.2+Math.random()*0.5; this.viewAngle=Math.random()*Math.PI*2;
    this.spinAngle=Math.random()*Math.PI*2;
    this.spinSpeed=(0.00003+Math.random()*0.00007)*(Math.random()<0.5?1:-1);
    this.arms=Math.random()<0.5?2:3;
    const warm=Math.random()<0.5;
    this.cR=warm?255:200; this.cG=warm?240:220; this.cB=warm?180:255;
    this.aR=warm?200:150; this.aG=warm?160:180; this.aB=warm?255:255;
    this.alpha=0.5+Math.random()*0.3;
    this.fadeAlpha=fresh?1:0; this.dying=false;
    this._build();
  }
  _build(){
    const sz=512,oc=document.createElement('canvas');
    oc.width=oc.height=sz;
    const ot=oc.getContext('2d'),cx2=sz/2,cy2=sz/2,mR=sz*0.46;

    const bg=ot.createRadialGradient(cx2,cy2,0,cx2,cy2,mR*0.38);
    bg.addColorStop(0,`rgba(${this.cR},${this.cG},${this.cB},0.55)`);
    bg.addColorStop(0.45,`rgba(${this.cR},${this.cG},${this.cB},0.18)`);
    bg.addColorStop(1,`rgba(${this.cR},${this.cG},${this.cB},0)`);
    ot.beginPath(); ot.arc(cx2,cy2,mR*0.38,0,Math.PI*2); ot.fillStyle=bg; ot.fill();

    const cg=ot.createRadialGradient(cx2,cy2,0,cx2,cy2,mR*0.16);
    cg.addColorStop(0,'rgba(255,255,255,1)');
    cg.addColorStop(0.15,'rgba(255,255,255,0.95)');
    cg.addColorStop(0.3,`rgba(${this.cR},${this.cG},${this.cB},0.9)`);
    cg.addColorStop(1,`rgba(${this.cR},${this.cG},${this.cB},0)`);
    ot.beginPath(); ot.arc(cx2,cy2,mR*0.16,0,Math.PI*2); ot.fillStyle=cg; ot.fill();
    for(let i=0;i<2000;i++){
      const t=Math.random(),arm=Math.floor(Math.random()*this.arms);
      const theta=t*Math.PI*3.5+(arm/this.arms)*Math.PI*2;
      const rr=t*mR,sp=(0.1+t*0.28)*mR;
      const px=cx2+Math.cos(theta)*rr+(Math.random()-0.5)*sp;
      const py=cy2+Math.sin(theta)*rr+(Math.random()-0.5)*sp*0.5;
      const br=Math.pow(1-t,0.6),a=br*(0.5+Math.random()*0.5);
      const dr=0.8+Math.random()*2.2*br;
      const dg=ot.createRadialGradient(px,py,0,px,py,dr*1.4);
      dg.addColorStop(0,`rgba(${this.aR},${this.aG},${this.aB},${a})`);
      dg.addColorStop(1,`rgba(${this.aR},${this.aG},${this.aB},0)`);
      ot.beginPath(); ot.arc(px,py,dr*1.4,0,Math.PI*2);
      ot.fillStyle=dg; ot.globalCompositeOperation='screen'; ot.fill();
    }
    ot.globalCompositeOperation='source-over';
    this._cv=oc;
  }
  update(dt){
    this.pz=this.z; this.z-=this.speed*dt*0.05;
    const zf=1-this.z/DEPTH;
    this.x3+=wind.vx*dt*this.wf*(0.3+zf)*FOV*0.003;
    this.y3+=wind.vy*dt*this.wf*(0.3+zf)*FOV*0.003;
    this.spinAngle+=this.spinSpeed*dt;
    if(!this.dying&&this.fadeAlpha<1) this.fadeAlpha=Math.min(1,this.fadeAlpha+FADE_SPEED*0.4*dt);
    if(this.z<=80&&!this.dying) this.dying=true;
    if(this.dying) this.fadeAlpha=Math.max(0,this.fadeAlpha-FADE_SPEED*0.6*dt);
    if(this.z<=5||this.fadeAlpha<=0) this.reset(false);
  }
  draw(){
    if(!isFinite(this.z)||this.z<=0||this.fadeAlpha<0.01||!this._cv) return;
    const ox=pcx(this.z,this.wf),oy=pcy(this.z,this.wf);
    const sc=FOV/this.z;
    const x=this.x3*sc+ox,y=this.y3*sc+oy;
    const r=this.baseR*sc;
    if(!isFinite(x+y+r)||r<6||x<-r*2||x>W+r*2||y<-r*2||y>H+r*2) return;
    const prox=Math.max(0,1-this.z/DEPTH);
    const a=this.alpha*Math.min(1,prox*2.5)*this.fadeAlpha;
    if(a<0.03) return;
    const ds=r*2;
    ctx.save(); ctx.translate(x,y); ctx.rotate(this.viewAngle+this.spinAngle);
    ctx.scale(1,this.tilt); ctx.globalAlpha=a;
    ctx.globalCompositeOperation='screen';
    ctx.drawImage(this._cv,-ds/2,-ds/2,ds,ds);
    ctx.globalCompositeOperation='source-over'; ctx.globalAlpha=1; ctx.restore();
  }
}

class QuasarGalaxy {
  constructor(){ this.reset(); }
  reset(){
    const sp=safePos(quasars,W*1.7,H*1.7,W*0.35);
    this.x3=sp.x3; this.y3=sp.y3;
    // daleko — duże z, bardzo wolno się zbliża
    this.z=1000+Math.random()*150; this.pz=this.z;
    this.baseR=22+Math.random()*18;
    this.speed=0.0018+Math.random()*0.002; // bardzo wolny drift z
    this.wf=0.008+Math.random()*0.012;
    this.driftAngle=Math.random()*Math.PI*2;
    this.driftSpeed=0.0002+Math.random()*0.0002;
    this.pulse=Math.random()*Math.PI*2;
    this.pulseSpeed=0.0010+Math.random()*0.0015;
    this.globalAngle=Math.random()*Math.PI*2;
    this.diskFlatten=0.10+Math.random()*0.20;
    // ramiona galaktyki — obrót
    this.spinAngle=Math.random()*Math.PI*2;
    this.spinSpeed=(0.000025+Math.random()*0.000035)*(Math.random()<0.5?1:-1);
    this.arms=Math.random()<0.5?2:3;
    // kolor niebieski jak kwazar
    this.cr=60+Math.floor(Math.random()*40);
    this.cg=140+Math.floor(Math.random()*60);
    this.cb=255;
    // czas życia: losowo od 60s do 240s (4 minuty)
    this.maxLife=60000+Math.random()*180000;
    this.lifeTime=0;
    this.fadeAlpha=0; this.dying=false;
    this._buildArms();
  }
  _buildArms(){
    const sz=512, oc=document.createElement('canvas');
    oc.width=oc.height=sz;
    const ot=oc.getContext('2d'), cx2=sz/2, cy2=sz/2, mR=sz*0.46;
    const cr=this.cr, cg=this.cg, cb=this.cb;
    // poświata centralna
    const bg=ot.createRadialGradient(cx2,cy2,0,cx2,cy2,mR*0.38);
    bg.addColorStop(0,`rgba(${cr},${cg},${cb},0.45)`);
    bg.addColorStop(0.45,`rgba(${cr},${cg},${cb},0.15)`);
    bg.addColorStop(1,`rgba(${cr},${cg},${cb},0)`);
    ot.beginPath(); ot.arc(cx2,cy2,mR*0.38,0,Math.PI*2); ot.fillStyle=bg; ot.fill();
    // białe centrum
    const cg2=ot.createRadialGradient(cx2,cy2,0,cx2,cy2,mR*0.14);
    cg2.addColorStop(0,'rgba(255,255,255,1)');
    cg2.addColorStop(0.2,'rgba(255,255,255,0.9)');
    cg2.addColorStop(0.5,`rgba(${cr},${cg},${cb},0.7)`);
    cg2.addColorStop(1,`rgba(${cr},${cg},${cb},0)`);
    ot.beginPath(); ot.arc(cx2,cy2,mR*0.14,0,Math.PI*2); ot.fillStyle=cg2; ot.fill();
    // ramiona galaktyki
    ot.globalCompositeOperation='screen';
    for(let i=0;i<1800;i++){
      const t=Math.random(), arm=Math.floor(Math.random()*this.arms);
      const theta=t*Math.PI*3.5+(arm/this.arms)*Math.PI*2;
      const rr=t*mR, sp2=(0.08+t*0.22)*mR;
      const px=cx2+Math.cos(theta)*rr+(Math.random()-0.5)*sp2;
      const py=cy2+Math.sin(theta)*rr+(Math.random()-0.5)*sp2*0.5;
      const br=Math.pow(1-t,0.6), a=br*(0.45+Math.random()*0.55);
      const dr=0.7+Math.random()*2.0*br;
      const dg=ot.createRadialGradient(px,py,0,px,py,dr*1.4);
      dg.addColorStop(0,`rgba(${cr},${cg},${cb},${a})`);
      dg.addColorStop(1,`rgba(${cr},${cg},${cb},0)`);
      ot.beginPath(); ot.arc(px,py,dr*1.4,0,Math.PI*2);
      ot.fillStyle=dg; ot.fill();
    }
    ot.globalCompositeOperation='source-over';
    this._cv=oc;
  }
  update(dt){
    this.pz=this.z; this.z-=this.speed*dt*0.05;
    this.lifeTime+=dt;
    this.driftAngle+=0.000012*dt;
    this.x3+=Math.cos(this.driftAngle)*this.driftSpeed*dt;
    this.y3+=Math.sin(this.driftAngle)*this.driftSpeed*dt;
    this.x3+=wind.vx*dt*this.wf*FOV*0.001;
    this.y3+=wind.vy*dt*this.wf*FOV*0.001;
    this.pulse+=this.pulseSpeed*dt;
    this.spinAngle+=this.spinSpeed*dt;
    if(!this.dying&&this.fadeAlpha<0.88) this.fadeAlpha=Math.min(0.88,this.fadeAlpha+FADE_SPEED*0.18*dt);
    if((this.lifeTime>=this.maxLife||this.z<=180)&&!this.dying) this.dying=true;
    if(this.dying) this.fadeAlpha=Math.max(0,this.fadeAlpha-FADE_SPEED*0.25*dt);
    if(this.fadeAlpha<=0||this.z<=5){ quasars.splice(quasars.indexOf(this),1); }
  }
  isOnScreen(){
    if(!isFinite(this.z)||this.z<=0||this.fadeAlpha<0.01) return false;
    const sc=FOV/this.z;
    const x=this.x3*sc+cx, y=this.y3*sc+cy;
    const r=this.baseR*sc*12;
    return x>-r&&x<W+r&&y>-r&&y<H+r;
  }
  draw(){
    if(!isFinite(this.z)||this.z<=0||this.fadeAlpha<0.01||!this._cv) return;
    const ox=pcx(this.z,this.wf), oy=pcy(this.z,this.wf);
    const sc=FOV/this.z;
    const x=this.x3*sc+ox, y=this.y3*sc+oy;
    const r=this.baseR*sc;
    if(!isFinite(x+y+r)||r<1||x<-r*16||x>W+r*16||y<-r*16||y>H+r*16) return;
    const prox=Math.max(0,1-this.z/DEPTH);
    const alpha=Math.min(1,prox*4.5)*this.fadeAlpha;
    if(alpha<0.01) return;
    const fl=1+0.04*Math.sin(this.pulse);
    const {cr,cg,cb}=this;

    // halo zewnętrzne
    const haloR=r*30*fl;
    const hg=radial(x,y,r,x,y,haloR);
    if(ok(hg)){
      hg.addColorStop(0,   `rgba(${cr},${cg},${cb},${alpha*0.45})`);
      hg.addColorStop(0.10,`rgba(${cr},${cg},${cb},${alpha*0.18})`);
      hg.addColorStop(0.35,`rgba(${cr},${cg},${cb},${alpha*0.05})`);
      hg.addColorStop(1,   `rgba(${cr},${cg},${cb},0)`);
      ctx.beginPath(); ctx.arc(x,y,haloR,0,Math.PI*2);
      ctx.fillStyle=hg; ctx.globalCompositeOperation='screen'; ctx.fill();
      ctx.globalCompositeOperation='source-over';
    }

    // ramiona galaktyki (offscreen canvas)
    const gSize=r*2*8;
    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(this.spinAngle);
    ctx.scale(1, 0.35+this.diskFlatten);
    ctx.globalAlpha=alpha*0.70;
    ctx.globalCompositeOperation='screen';
    ctx.drawImage(this._cv,-gSize/2,-gSize/2,gSize,gSize);
    ctx.globalCompositeOperation='source-over'; ctx.globalAlpha=1;
    ctx.restore();

    // dysk akrecji (niebieski)
    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(this.globalAngle);
    ctx.save();
    ctx.scale(1,this.diskFlatten);
    const diskR=r*this.diskFlatten*42*fl;
    const dg=ctx.createRadialGradient(0,0,r*0.90,0,0,diskR);
    dg.addColorStop(0,    `rgba(255,255,255,${alpha*0.98})`);
    dg.addColorStop(0.06, `rgba(${cr},${Math.min(255,cg+60)},${cb},${alpha*0.90})`);
    dg.addColorStop(0.18, `rgba(${cr},${cg},${cb},${alpha*0.65})`);
    dg.addColorStop(0.40, `rgba(${Math.max(0,cr-30)},${Math.max(0,cg-40)},${cb},${alpha*0.30})`);
    dg.addColorStop(0.70, `rgba(0,30,${cb},${alpha*0.10})`);
    dg.addColorStop(1,    `rgba(0,0,40,0)`);
    ctx.beginPath(); ctx.arc(0,0,diskR,0,Math.PI*2);
    ctx.fillStyle=dg; ctx.globalCompositeOperation='screen'; ctx.fill();
    ctx.globalCompositeOperation='source-over';
    // pierścień
    ctx.beginPath(); ctx.arc(0,0,r*1.25,0,Math.PI*2);
    ctx.strokeStyle=`rgba(${cr},${Math.min(255,cg+80)},${cb},${alpha*0.65})`; ctx.lineWidth=r*0.16; ctx.stroke();
    ctx.beginPath(); ctx.arc(0,0,r*2.1,0,Math.PI*2);
    ctx.strokeStyle=`rgba(${cr},${cg},${cb},${alpha*0.18})`; ctx.lineWidth=r*0.07; ctx.stroke();
    ctx.restore();

    // jety (niebieskie, jak kwazar)
    const bp=0.5+0.5*Math.abs(Math.sin(this.pulse*1.3));
    const jl=r*20*fl;
    for(const sign of [1,-1]){
      const jgC=linear(0,0,0,sign*jl);
      if(ok(jgC)){
        jgC.addColorStop(0,   `rgba(255,255,255,${alpha*bp*0.85})`);
        jgC.addColorStop(0.08,`rgba(${cr},${cg},${cb},${alpha*bp*0.65})`);
        jgC.addColorStop(0.35,`rgba(${cr},${cg},${cb},${alpha*bp*0.25})`);
        jgC.addColorStop(1,   `rgba(${cr},${cg},${cb},0)`);
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,sign*jl);
        ctx.strokeStyle=jgC; ctx.lineWidth=Math.max(0.8,r*0.28);
        ctx.globalCompositeOperation='screen'; ctx.stroke();
        ctx.globalCompositeOperation='source-over';
      }
    }

    // czarna dziura — czarne koło + niebieski ring
    ctx.beginPath(); ctx.arc(0,0,r*0.82,0,Math.PI*2); ctx.fillStyle='#000'; ctx.fill();
    ctx.beginPath(); ctx.arc(0,0,r*0.82,0,Math.PI*2);
    ctx.strokeStyle=`rgba(${cr},${cg},${cb},${alpha*0.60})`; ctx.lineWidth=Math.max(1,r*0.09); ctx.stroke();

    ctx.restore();
  }
}

class ShootingStar {
  constructor(){
    const fromTop=Math.random()<0.7;
    if(fromTop){ this.x=Math.random()*W; this.y=-5; }
    else        { this.x=-5; this.y=Math.random()*H*0.5; }
    const spd=10+Math.random()*16, ang=0.3+Math.random()*0.55;
    this.vx=Math.cos(ang)*spd; this.vy=Math.sin(ang)*spd;
    const c=STAR_COLORS[Math.floor(Math.random()*STAR_COLORS.length)];
    this.cr=c[0]; this.cg=c[1]; this.cb=c[2];
    this.tailLen=60+Math.random()*160;
    this.life=0; this.maxLife=900+Math.random()*700;
    this.maxAlpha=0.65+Math.random()*0.35; this.alpha=0; this.dead=false;
  }
  update(dt){
    this.life+=dt;
    this.x+=this.vx*dt*0.06; this.y+=this.vy*dt*0.06;
    const t=this.life/this.maxLife;
    if(t<0.12)       this.alpha=(t/0.12)*this.maxAlpha;
    else if(t<0.55)  this.alpha=this.maxAlpha;
    else             this.alpha=this.maxAlpha*(1-(t-0.55)/0.45);
    if(this.life>=this.maxLife||this.x>W+120||this.y>H+120) this.dead=true;
  }
  draw(){
    const a=this.alpha; if(a<0.01) return;
    const mag=Math.hypot(this.vx,this.vy);
    const nx=this.vx/mag, ny=this.vy/mag;
    const tx=this.x-nx*this.tailLen, ty=this.y-ny*this.tailLen;
    const tg=linear(tx,ty,this.x,this.y);
    if(ok(tg)){
      tg.addColorStop(0,`rgba(${this.cr},${this.cg},${this.cb},0)`);
      tg.addColorStop(1,`rgba(${this.cr},${this.cg},${this.cb},${a})`);
      ctx.beginPath(); ctx.moveTo(tx,ty); ctx.lineTo(this.x,this.y);
      ctx.strokeStyle=tg; ctx.lineWidth=1.5; ctx.stroke();
    }
    drawStar(this.x,this.y,this.cr,this.cg,this.cb,a,2,0,0);
  }
}

class Comet {
  constructor(fresh){ this.reset(fresh); }
  reset(fresh){
    const side=Math.random()<0.5;
    this.x3=side?-W*0.8:W*0.8;
    const yCandidates=Array.from({length:8},()=>(Math.random()-0.5)*H*1.2);
    this.y3=yCandidates.find(y=>comets.every(c=>Math.abs((c.y3||0)-y)>H*0.25))||yCandidates[0];
    this.z=fresh?250+Math.random()*650:700+Math.random()*400; this.pz=this.z;
    this.vx3=(0.18+Math.random()*0.22)*(side?1:-1);
    this.vy3=(Math.random()-0.5)*0.12;
    this.speed=0.04+Math.random()*0.07; this.wf=0.06+Math.random()*0.1;
    this.tailLen=100+Math.random()*180;
    this.cr=200+Math.floor(Math.random()*55); this.cg=230; this.cb=255;
    this.fadeAlpha=fresh?1:0; this.dying=false;
  }
  update(dt){
    this.pz=this.z; this.z-=this.speed*dt*0.05;
    this.x3+=this.vx3*dt*0.4; this.y3+=this.vy3*dt*0.4;
    if(!this.dying&&this.fadeAlpha<1) this.fadeAlpha=Math.min(1,this.fadeAlpha+FADE_SPEED*dt);
    if(this.z<=80&&!this.dying) this.dying=true;
    if(this.dying) this.fadeAlpha=Math.max(0,this.fadeAlpha-FADE_SPEED*dt);
    if(this.z<=5||this.fadeAlpha<=0) this.reset(false);
  }
  draw(){
    if(!isFinite(this.z)||this.z<=0||this.fadeAlpha<0.01) return;
    const ox=pcx(this.z,this.wf),oy=pcy(this.z,this.wf);
    const sc=FOV/this.z;
    const x=this.x3*sc+ox,y=this.y3*sc+oy;
    if(!isFinite(x+y)||x<-500||x>W+500||y<-400||y>H+400) return;
    const prox=Math.max(0,1-this.z/DEPTH);
    const a=Math.min(1,prox*3)*this.fadeAlpha;
    if(a<0.02) return;
    const len=this.tailLen*sc*(0.4+prox*0.6);
    const tx=x-this.vx3*len*1.2, ty=y-this.vy3*len*1.2;
    const cr2=len*0.12+4;
    const cg2=radial(x,y,0,x,y,cr2);
    if(ok(cg2)){
      cg2.addColorStop(0,`rgba(255,255,255,${a})`);
      cg2.addColorStop(0.4,`rgba(${this.cr},${this.cg},${this.cb},${a*0.6})`);
      cg2.addColorStop(1,`rgba(${this.cr},${this.cg},${this.cb},0)`);
      ctx.beginPath(); ctx.arc(x,y,cr2,0,Math.PI*2);
      ctx.fillStyle=cg2; ctx.globalCompositeOperation='screen'; ctx.fill();
      ctx.globalCompositeOperation='source-over';
    }
    const tg=linear(tx,ty,x,y);
    if(ok(tg)){
      tg.addColorStop(0,`rgba(${this.cr},${this.cg},${this.cb},0)`);
      tg.addColorStop(0.5,`rgba(${this.cr},${this.cg},${this.cb},${a*0.12})`);
      tg.addColorStop(1,`rgba(${this.cr},${this.cg},${this.cb},${a*0.45})`);
      ctx.beginPath(); ctx.moveTo(tx,ty); ctx.lineTo(x,y);
      ctx.strokeStyle=tg; ctx.lineWidth=Math.max(1,3*sc);
      ctx.globalCompositeOperation='screen'; ctx.stroke();
      ctx.globalCompositeOperation='source-over';
    }
    ctx.beginPath(); ctx.arc(x,y,Math.max(1.5,2.5*sc),0,Math.PI*2);
    ctx.fillStyle=`rgba(255,255,255,${a})`; ctx.fill();
  }
}

class Pulsar {
  constructor(fresh){ this.reset(fresh); }
  reset(fresh){
    const cornerX=(Math.random()<0.5?-1:1)*(W*0.25+Math.random()*W*0.35);
    const cornerY=(Math.random()<0.5?-1:1)*(H*0.25+Math.random()*H*0.35);
    this.x3=cornerX; this.y3=cornerY;
    this.z=fresh?250+Math.random()*750:800+Math.random()*300; this.pz=this.z;
    this.speed=0.22+Math.random()*0.3; this.wf=0.25+Math.random()*0.35;
    this.beamAngle=Math.random()*Math.PI*2;
    this.fastRotator = Math.random()<0.5;
    this.rotSpeed=(this.fastRotator?0.010+Math.random()*0.012:0.002+Math.random()*0.004)*(Math.random()<0.5?1:-1);
    this.brightness = 0.45+Math.random()*0.55;
    this.fastBlink = Math.random()<0.5;
    this.phase=Math.random()*Math.PI*2;
    this.phaseSpeed=this.fastBlink?0.010+Math.random()*0.012:0.002+Math.random()*0.005;
    this.fadeAlpha=fresh?1:0; this.dying=false;
  }
  update(dt){
    this.pz=this.z; this.z-=this.speed*dt*0.05;
    const zf=1-this.z/DEPTH;
    this.x3+=wind.vx*dt*this.wf*(0.3+zf)*FOV*0.003;
    this.y3+=wind.vy*dt*this.wf*(0.3+zf)*FOV*0.003;
    this.beamAngle+=this.rotSpeed*dt;
    this.phase+=this.phaseSpeed*dt;
    if(!this.dying&&this.fadeAlpha<1) this.fadeAlpha=Math.min(1,this.fadeAlpha+FADE_SPEED*dt);
    if(this.z<=60&&!this.dying) this.dying=true;
    if(this.dying) this.fadeAlpha=Math.max(0,this.fadeAlpha-FADE_SPEED*dt);
    if(this.z<=5||this.fadeAlpha<=0){
      if(pulsars.filter(p=>!p.dying).length<(window._pulsarTarget||1)) this.reset(false);
      else pulsars.splice(pulsars.indexOf(this),1);
    }
  }
  draw(){
    if(!isFinite(this.z)||this.z<=0||this.fadeAlpha<0.01) return;
    const ox=pcx(this.z,this.wf),oy=pcy(this.z,this.wf);
    const sc=FOV/this.z;
    const x=this.x3*sc+ox,y=this.y3*sc+oy;
    if(!isFinite(x+y)||x<-100||x>W+100||y<-100||y>H+100) return;
    const prox=Math.max(0,1-this.z/DEPTH);
    const a=Math.min(1,prox*3)*this.fadeAlpha;
    if(a<0.02) return;
    const r=Math.max(1.5,2.5*sc);
    const bp=0.35+0.65*Math.abs(Math.sin(this.phase));
    const bright=this.brightness??0.8;
    const beamLen=(80+bp*150)*sc;
    for(const sign of [1,-1]){
      const bx=x+Math.cos(this.beamAngle)*sign*beamLen;
      const by=y+Math.sin(this.beamAngle)*sign*beamLen;
      const bg=linear(x,y,bx,by);
      if(ok(bg)){
        bg.addColorStop(0,`rgba(140,210,255,${a*bright*bp})`);
        bg.addColorStop(0.4,`rgba(80,170,255,${a*bright*0.35*bp})`);
        bg.addColorStop(1,'rgba(60,130,255,0)');
        ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(bx,by);
        ctx.strokeStyle=bg; ctx.lineWidth=Math.max(0.5,r*0.8);
        ctx.globalCompositeOperation='screen'; ctx.stroke();
        ctx.globalCompositeOperation='source-over';
      }
    }
    drawStar(x,y,200,230,255,a*bright,r,4,r*3*(0.5+bp*0.5));
  }
}

const SBH_PLANETS=[
  {cr:220,cg:130,cb:70},{cr:180,cg:215,cb:255},{cr:255,cg:210,cb:130},
  {cr:185,cg:140,cb:255},{cr:80,cg:210,cb:165},{cr:255,cg:85,cb:55},{cr:240,cg:235,cb:200},
];
class SuperBlackHole {
  constructor(){ this.reset(); }
  reset(){
    this.x3=(Math.random()-0.5)*W*0.85; this.y3=(Math.random()-0.5)*H*0.85;
    this.z=480+Math.random()*480; this.pz=this.z;
    this.baseR=18+Math.random()*48;
    this.speed=0.006+Math.random()*0.01; this.wf=0.04+Math.random()*0.06;
    this.globalAngle=Math.random()*Math.PI*2;
    this.diskFlatten=0.08+Math.random()*0.18;
    this.pulse=Math.random()*Math.PI*2; this.pulseSpeed=0.0004+Math.random()*0.0005;
    this.fadeAlpha=0; this.dying=false; this.lifeTime=0;
    this.maxLife=75000+Math.random()*55000;
    const nc=3+Math.floor(Math.random()*4);
    this.planets=Array.from({length:nc},(v,i)=>{
      const pp=SBH_PLANETS[Math.floor(Math.random()*SBH_PLANETS.length)];
      return {
        angle:Math.random()*Math.PI*2,
        speed:(0.0004+Math.random()*0.0012/Math.sqrt(i+1))*(Math.random()<0.5?1:-1),
        orbitR:3.4+(i+Math.random()*0.9)*1.7,
        sizeF:0.07+Math.random()*0.13,
        cr:pp.cr,cg:pp.cg,cb:pp.cb,
      };
    });
  }
  _planet(wx,wy,p,a,r){
    const ps=Math.max(2,p.sizeF*r);
    const pg=radial(wx,wy,0,wx,wy,ps*2.8);
    if(ok(pg)){
      pg.addColorStop(0,`rgba(${p.cr},${p.cg},${p.cb},${a})`);
      pg.addColorStop(0.45,`rgba(${p.cr},${p.cg},${p.cb},${a*0.3})`);
      pg.addColorStop(1,`rgba(${p.cr},${p.cg},${p.cb},0)`);
      ctx.beginPath(); ctx.arc(wx,wy,ps*2.8,0,Math.PI*2);
      ctx.fillStyle=pg; ctx.globalCompositeOperation='screen'; ctx.fill();
      ctx.globalCompositeOperation='source-over';
    }
    ctx.beginPath(); ctx.arc(wx,wy,ps,0,Math.PI*2);
    ctx.fillStyle=`rgba(${p.cr},${p.cg},${p.cb},${Math.min(1,a)})`; ctx.fill();
  }
  update(dt){
    this.pz=this.z; this.z-=this.speed*dt*0.05; this.lifeTime+=dt;
    const zf=1-this.z/DEPTH;
    this.x3+=wind.vx*dt*this.wf*(0.3+zf)*FOV*0.003;
    this.y3+=wind.vy*dt*this.wf*(0.3+zf)*FOV*0.003;
    this.pulse+=this.pulseSpeed*dt;
    for(const p of this.planets) p.angle+=p.speed*dt;
    if(!this.dying&&this.fadeAlpha<1) this.fadeAlpha=Math.min(1,this.fadeAlpha+FADE_SPEED*0.22*dt);
    if((this.z<=120||this.lifeTime>=this.maxLife)&&!this.dying) this.dying=true;
    if(this.dying) this.fadeAlpha=Math.max(0,this.fadeAlpha-FADE_SPEED*0.35*dt);
  }
  get isDead(){ return this.z<=5||this.fadeAlpha<=0; }
  draw(){
    if(!isFinite(this.z)||this.z<=0||this.fadeAlpha<0.01) return;
    const ox=pcx(this.z,this.wf),oy=pcy(this.z,this.wf);
    const sc=FOV/this.z;
    const x=this.x3*sc+ox,y=this.y3*sc+oy;
    const r=this.baseR*sc;
    if(!isFinite(x+y+r)||r<3||x<-r*9||x>W+r*9||y<-r*9||y>H+r*9) return;
    const prox=Math.max(0,1-this.z/DEPTH);
    const a=Math.min(1,prox*2.2)*this.fadeAlpha;
    if(a<0.02) return;
    const fl=1+0.04*Math.sin(this.pulse);
    for(let i=6;i>=1;i--){
      const lr=r*(2.2+i*1.15);
      const lg=ctx.createRadialGradient(x,y,lr*0.78,x,y,lr);
      lg.addColorStop(0,'rgba(255,255,255,0)');
      lg.addColorStop(0.5,`rgba(255,220,160,${a*0.045/i})`);
      lg.addColorStop(1,'rgba(255,255,255,0)');
      ctx.beginPath(); ctx.arc(x,y,lr,0,Math.PI*2); ctx.fillStyle=lg; ctx.fill();
    }
    const cosG=Math.cos(this.globalAngle),sinG=Math.sin(this.globalAngle);
    const pdata=this.planets.map(p=>{
      const pr=p.orbitR*r;
      const lx=Math.cos(p.angle)*pr, ly=Math.sin(p.angle)*pr*this.diskFlatten;
      const wx=x+lx*cosG-ly*sinG, wy=y+lx*sinG+ly*cosG;
      return {wx,wy,depth:Math.sin(p.angle),p};
    });
    for(const {wx,wy,depth,p} of pdata){ if(depth<0) this._planet(wx,wy,p,a*Math.max(0.25,0.8+depth*0.6),r); }
    ctx.save(); ctx.translate(x,y); ctx.rotate(this.globalAngle);
    const jl=r*14*fl;
    for(const sign of [1,-1]){
      const jg=ctx.createLinearGradient(0,0,0,sign*jl);
      jg.addColorStop(0,`rgba(210,235,255,${a*0.75})`);
      jg.addColorStop(0.2,`rgba(130,190,255,${a*0.45})`);
      jg.addColorStop(1,'rgba(50,90,255,0)');
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,sign*jl);
      ctx.strokeStyle=jg; ctx.lineWidth=r*0.32;
      ctx.globalCompositeOperation='screen'; ctx.stroke();
      ctx.globalCompositeOperation='source-over';
    }
    ctx.save(); ctx.scale(1,this.diskFlatten);
    const diskR=r*9.5*fl;
    const dg=ctx.createRadialGradient(0,0,r*0.88,0,0,diskR);
    dg.addColorStop(0,`rgba(255,255,230,${a*0.98})`);
    dg.addColorStop(0.08,`rgba(255,220,80,${a*0.9})`);
    dg.addColorStop(0.25,`rgba(255,100,15,${a*0.6})`);
    dg.addColorStop(0.55,`rgba(180,35,0,${a*0.28})`);
    dg.addColorStop(1,`rgba(40,0,0,0)`);
    ctx.beginPath(); ctx.arc(0,0,diskR,0,Math.PI*2);
    ctx.fillStyle=dg; ctx.globalCompositeOperation='screen'; ctx.fill();
    ctx.globalCompositeOperation='source-over';
    ctx.beginPath(); ctx.arc(0,0,r*1.25,0,Math.PI*2);
    ctx.strokeStyle=`rgba(255,245,190,${a*0.65})`; ctx.lineWidth=r*0.2; ctx.stroke();
    ctx.restore();
    ctx.beginPath(); ctx.arc(0,0,r*0.80,0,Math.PI*2); ctx.fillStyle='#000'; ctx.fill();
    ctx.beginPath(); ctx.arc(0,0,r*0.80,0,Math.PI*2);
    ctx.strokeStyle=`rgba(255,215,100,${a*0.75})`; ctx.lineWidth=Math.max(1.5,r*0.09); ctx.stroke();
    ctx.restore();
    for(const {wx,wy,depth,p} of pdata){ if(depth>=0) this._planet(wx,wy,p,a,r); }
  }
}

const SUPERNOVA_COLORS=[
  [255,220,120],[255,180,80],[255,140,60],[255,100,50],
  [200,160,255],[140,200,255],[255,255,200],
];
let snFlash={alpha:0,duration:0,elapsed:0,active:false};
class Supernova {
  constructor(){
    const side=Math.floor(Math.random()*4);
    if(side===0){ this.x=-20; this.y=Math.random()*H; }
    else if(side===1){ this.x=W+20; this.y=Math.random()*H; }
    else if(side===2){ this.x=Math.random()*W; this.y=-20; }
    else { this.x=Math.random()*W; this.y=H+20; }
    const qx=(this.x<W/2)?W*0.55+Math.random()*W*0.35:Math.random()*W*0.35;
    const qy=(this.y<H/2)?H*0.55+Math.random()*H*0.35:Math.random()*H*0.35;
    const travelTime=4000+Math.random()*6000;
    this.vx=(qx-this.x)/travelTime; this.vy=(qy-this.y)/travelTime;
    this.travelTime=travelTime; this.life=0;
    const c=SUPERNOVA_COLORS[Math.floor(Math.random()*SUPERNOVA_COLORS.length)];
    this.cr=c[0]; this.cg=c[1]; this.cb=c[2];
    this.starSize=2.2+Math.random()*1.6;
    this.twinklePhase=Math.random()*Math.PI*2; this.twinkleSpeed=0.005+Math.random()*0.008;
    this.flashStrength=Math.random()<0.5?0.88+Math.random()*0.12:0.35+Math.random()*0.25;
    this.flashDuration=1000+Math.random()*2000;
    this.phase='travel'; this.explodeLife=0;
    this.explodeDuration=4500+Math.random()*2000;
    this.explodeR=0; this.maxExplodeR=110+Math.random()*90;
    this.rings=Array.from({length:5},(_,i)=>({delay:i*200,r:0,alpha:0}));
    this.sparks=Array.from({length:48},()=>{
      const a=Math.random()*Math.PI*2, spd=0.025+Math.random()*0.055;
      return {angle:a,speed:spd,dist:0,size:1.0+Math.random()*2.0,lifespan:0.45+Math.random()*0.55,alpha:1};
    });
    this.dead=false;
  }
  update(dt){
    this.life+=dt; this.twinklePhase+=this.twinkleSpeed*dt;
    if(this.phase==='travel'){
      this.x+=this.vx*dt; this.y+=this.vy*dt;
      if(this.life>=this.travelTime){
        this.phase='explode';
        snFlash.alpha=this.flashStrength; snFlash.duration=this.flashDuration;
        snFlash.elapsed=0; snFlash.active=true;
      }
    } else {
      this.explodeLife+=dt;
      const t=Math.min(1,this.explodeLife/this.explodeDuration);
      this.explodeR=this.maxExplodeR*Math.min(1,t*2.2);
      for(const sp of this.sparks){
        sp.dist+=sp.speed*dt;
        const sparkT=Math.min(1,(this.explodeLife/this.explodeDuration)/sp.lifespan);
        sp.alpha=Math.max(0,1-sparkT*sparkT);
      }
      for(const rn of this.rings){
        if(this.explodeLife>rn.delay){
          const rt=(this.explodeLife-rn.delay)/(this.explodeDuration*0.9);
          rn.r=this.maxExplodeR*Math.min(1.5,rt*1.8);
          rn.alpha=Math.max(0,(1-rt)*(1-rt)*0.85);
        }
      }
      if(this.explodeLife>=this.explodeDuration) this.dead=true;
    }
  }
  draw(){
    if(this.phase==='travel'){
      const twk=0.6+0.4*Math.sin(this.twinklePhase);
      const a=twk*0.9;
      const gg=radial(this.x,this.y,0,this.x,this.y,this.starSize*6);
      if(ok(gg)){
        gg.addColorStop(0,`rgba(${this.cr},${this.cg},${this.cb},${a*0.55})`);
        gg.addColorStop(1,`rgba(${this.cr},${this.cg},${this.cb},0)`);
        ctx.beginPath(); ctx.arc(this.x,this.y,this.starSize*6,0,Math.PI*2);
        ctx.fillStyle=gg; ctx.fill();
      }
      drawStar(this.x,this.y,this.cr,this.cg,this.cb,a,this.starSize,4,this.starSize*(4+twk*5));
    } else {
      const t=Math.min(1,this.explodeLife/this.explodeDuration);
      const ex=this.x,ey=this.y;
      const bloomA=Math.max(0,1-t*0.9)*0.9;
      if(bloomA>0.01){
        const bg2=radial(ex,ey,0,ex,ey,this.explodeR*2.5);
        if(ok(bg2)){
          bg2.addColorStop(0,`rgba(${this.cr},${this.cg},${this.cb},${bloomA*0.75})`);
          bg2.addColorStop(0.35,`rgba(${this.cr},${this.cg},${this.cb},${bloomA*0.25})`);
          bg2.addColorStop(1,'rgba(0,0,0,0)');
          ctx.beginPath(); ctx.arc(ex,ey,this.explodeR*2.5,0,Math.PI*2);
          ctx.fillStyle=bg2; ctx.globalCompositeOperation='screen'; ctx.fill();
          ctx.globalCompositeOperation='source-over';
        }
      }
      const coreA=Math.max(0,1-t*1.6);
      if(coreA>0.01){
        const cg3=radial(ex,ey,0,ex,ey,this.explodeR*0.65);
        if(ok(cg3)){
          cg3.addColorStop(0,`rgba(255,255,255,${coreA})`);
          cg3.addColorStop(0.4,`rgba(${this.cr},${this.cg},${this.cb},${coreA*0.85})`);
          cg3.addColorStop(1,`rgba(${this.cr},${this.cg},${this.cb},0)`);
          ctx.beginPath(); ctx.arc(ex,ey,this.explodeR*0.65,0,Math.PI*2);
          ctx.fillStyle=cg3; ctx.globalCompositeOperation='screen'; ctx.fill();
          ctx.globalCompositeOperation='source-over';
        }
      }
      for(const rn of this.rings){
        if(rn.alpha<0.01||rn.r<1) continue;
        ctx.beginPath(); ctx.arc(ex,ey,rn.r,0,Math.PI*2);
        ctx.strokeStyle=`rgba(${this.cr},${Math.min(255,this.cg+40)},${Math.min(255,this.cb+80)},${rn.alpha})`;
        ctx.lineWidth=Math.max(0.8,3*(1-t));
        ctx.globalCompositeOperation='screen'; ctx.stroke();
        ctx.globalCompositeOperation='source-over';
      }
      for(const sp of this.sparks){
        if(sp.alpha<0.01) continue;
        const sx=ex+Math.cos(sp.angle)*sp.dist, sy=ey+Math.sin(sp.angle)*sp.dist;
        if(sx<-40||sx>W+40||sy<-40||sy>H+40) continue;
        const halo=radial(sx,sy,0,sx,sy,sp.size*3.5);
        if(ok(halo)){
          halo.addColorStop(0,`rgba(${this.cr},${this.cg},${this.cb},${sp.alpha*0.55})`);
          halo.addColorStop(1,`rgba(${this.cr},${this.cg},${this.cb},0)`);
          ctx.beginPath(); ctx.arc(sx,sy,sp.size*3.5,0,Math.PI*2);
          ctx.fillStyle=halo; ctx.globalCompositeOperation='screen'; ctx.fill();
          ctx.globalCompositeOperation='source-over';
        }
        ctx.beginPath(); ctx.arc(sx,sy,sp.size,0,Math.PI*2);
        ctx.fillStyle=`rgba(255,255,255,${sp.alpha*0.9})`; ctx.fill();
      }
    }
  }
}

const stars=[],dust=[],nebulae=[],clusters=[],blackHoles=[],galaxies=[],comets=[],pulsars=[];
const superBHs=[];

const quasars=[];

let shootingStars=[],supernovae=[],ssTimer=1200;
let snCooldown=0;

const BH_MAX_SLOTS = 4;
const BH_SLOT_COOLDOWN_MIN = 30000;
const BH_SLOT_COOLDOWN_MAX = 90000;

const bhSlotCooldowns = Array(BH_MAX_SLOTS).fill(0);

let sbhQueue = 0;
let sbhRollTimer = 0;
let sbhGracePeriod = 0;

let _quasarTimer = 0;

function resize(){
  if(!canvas) return;
  var nw=window.innerWidth||document.documentElement.clientWidth||canvas.offsetWidth||800;
  var nh=window.innerHeight||document.documentElement.clientHeight||canvas.offsetHeight||600;
  if(nw<10||nh<10) return;
  canvas.width=W=nw; canvas.height=H=nh;
  cx=W/2; cy=H/2;
}

function init(){
  resize();
  if(W<10||H<10){ console.warn('[galaxyBg] init() called with invalid dimensions W='+W+' H='+H); return; }
  stars.length=dust.length=nebulae.length=clusters.length=0;
  blackHoles.length=galaxies.length=quasars.length=0;
  superBHs.length=0; sbhQueue=0; sbhRollTimer=0; sbhGracePeriod=0;
  supernovae.length=0; snCooldown=8000;
  bhSlotCooldowns.fill(0); _quasarTimer=0;
  for(let i=0;i<STAR_COUNT;i++)    stars.push(new Star(true));
  for(let i=0;i<DUST_COUNT;i++)    dust.push(new DustCloud(true));
  for(let i=0;i<NEBULA_COUNT;i++)  nebulae.push(new Nebula(true));
  for(let i=0;i<CLUSTER_COUNT;i++) clusters.push(new StarCluster(true));

  blackHoles.push(new BlackHole(true));
  blackHoles.push(new BlackHole(true));

  bhSlotCooldowns[2] = BH_SLOT_COOLDOWN_MIN + Math.random()*(BH_SLOT_COOLDOWN_MAX-BH_SLOT_COOLDOWN_MIN);
  bhSlotCooldowns[3] = BH_SLOT_COOLDOWN_MIN + Math.random()*(BH_SLOT_COOLDOWN_MAX-BH_SLOT_COOLDOWN_MIN);
  galaxies.push(new Galaxy(true));
  galaxies.push(new Galaxy(true));
  for(let i=0;i<COMET_COUNT;i++)   comets.push(new Comet(true));

  let _pCount=1;
  if(Math.random()<0.50) _pCount=2;
  if(Math.random()<0.30) _pCount=3;
  if(Math.random()<0.10) _pCount=4;
  if(Math.random()<0.05) _pCount=5;
  window._pulsarTarget=_pCount;
  for(let i=0;i<_pCount;i++) pulsars.push(new Pulsar(true));
}

function _majorOnScreen(){
  for(const bh of blackHoles){
    const sc=FOV/Math.max(bh.z,1),ox=pcx(bh.z,bh.wf),oy=pcy(bh.z,bh.wf);
    const x=bh.x3*sc+ox, y=bh.y3*sc+oy, r=bh.baseR*sc;
    if(x>-r&&x<W+r&&y>-r&&y<H+r&&bh.fadeAlpha>0.1) return true;
  }
  for(const g of galaxies){
    const sc=FOV/Math.max(g.z,1),ox=pcx(g.z,g.wf),oy=pcy(g.z,g.wf);
    const x=g.x3*sc+ox, y=g.y3*sc+oy, r=g.baseR*sc;
    if(x>-r*2&&x<W+r*2&&y>-r*2&&y<H+r*2&&g.fadeAlpha>0.1) return true;
  }
  return false;
}

const bgMood = {
  r:0, g:0, b:0,
  tr:0, tg:0, tb:0,
  timer:0,
};
function _pickBgMood(){
  const palettes = [
    [0,0,0],
    [4,0,12],
    [0,6,18],
    [0,14,10],
    [12,0,8],
    [6,3,0],
    [0,4,20],
    [8,0,16],
    [2,8,4],
    [14,4,0],
  ];
  const p = palettes[Math.floor(Math.random()*palettes.length)];
  bgMood.tr = p[0]; bgMood.tg = p[1]; bgMood.tb = p[2];
  bgMood.timer = 25000 + Math.random()*45000;
}
_pickBgMood();
function updateBgMood(dt){
  bgMood.timer -= dt;
  if(bgMood.timer <= 0) _pickBgMood();
  const e = 1-Math.pow(0.9998, dt);
  bgMood.r += (bgMood.tr - bgMood.r)*e;
  bgMood.g += (bgMood.tg - bgMood.g)*e;
  bgMood.b += (bgMood.tb - bgMood.b)*e;
}

const camRoll = { phase: 0 };
function updateCamRoll(dt){
  camRoll.phase += 0.00010 * dt;
}
function getCamRollValue(){
  return Math.sin(camRoll.phase)*0.030
       + Math.sin(camRoll.phase*0.37)*0.015;
}

let last=-1, camPhaseLocal=0;
function loop(now){
  if(!_running) return;
  _raf=requestAnimationFrame(loop);
  if(last<0) last=now;
  const dt=Math.min(now-last,50); last=now;
  updateCamSpeed(dt);
  updateWind(dt); updateMouse(dt); updateHorizon(dt); updateBgMood(dt);
  ssTimer-=dt; if(ssTimer<=0){ shootingStars.push(new ShootingStar()); ssTimer=2500+Math.random()*4500; }
  snCooldown-=dt;
  if(snCooldown<=0&&supernovae.filter(sn=>!sn.dead).length===0&&Math.random()<0.01){
    supernovae.push(new Supernova()); snCooldown=60000;
  }
  supernovae=supernovae.filter(sn=>!sn.dead);
  if(snFlash.active){ snFlash.elapsed+=dt; if(snFlash.elapsed>=snFlash.duration) snFlash.active=false; }
  const sbhActive=superBHs.length>0;

  for(let i=blackHoles.length-1;i>=0;i--){
    if(blackHoles[i]._dead){
      blackHoles.splice(i,1);
      const freeSlot=bhSlotCooldowns.findIndex(c=>c<=0);
      if(freeSlot>=0)
        bhSlotCooldowns[freeSlot]=BH_SLOT_COOLDOWN_MIN+Math.random()*(BH_SLOT_COOLDOWN_MAX-BH_SLOT_COOLDOWN_MIN);
    }
  }

  if(!sbhActive&&sbhGracePeriod<=0){
    for(let s=0;s<BH_MAX_SLOTS;s++){
      if(bhSlotCooldowns[s]>0){
        bhSlotCooldowns[s]-=dt;
        if(bhSlotCooldowns[s]<=0){
          bhSlotCooldowns[s]=0;
          if(blackHoles.length<BH_MAX_SLOTS)
            blackHoles.push(new BlackHole(false));
        }
      }
    }
  }

  if(!sbhActive){
    sbhRollTimer+=dt;
    if(sbhRollTimer>=60000){
      sbhRollTimer=0;
      if(Math.random()<1/10) sbhQueue++;
    }
    if(sbhQueue>0&&blackHoles.length===0){
      superBHs.push(new SuperBlackHole());
      sbhQueue--;
    }
  } else {
    sbhRollTimer=0;
  }

  if(quasars.length===0){
    _quasarTimer+=dt;
    if(_quasarTimer>=60000){
      _quasarTimer=0;
      const bhCount=blackHoles.filter(bh=>!bh._dead&&!bh.dying).length;
      const activeSBH=superBHs.length>0;
      const manyPulsars=pulsars.filter(p=>!p.dying).length>3;
      const boosted=activeSBH||manyPulsars;
      const chance=boosted?(1/100):(1/300);
      if(bhCount<=2&&Math.random()<chance) quasars.push(new QuasarGalaxy());
    }
  } else {
    _quasarTimer=0;
  }

  updateCamRoll(dt);
  const roll=getCamRollValue();
  sceneAlpha=Math.min(1,sceneAlpha+dt/3500);

  const br=Math.round(bgMood.r), bg2=Math.round(bgMood.g), bb=Math.round(bgMood.b);
  ctx.fillStyle=`rgb(${br},${bg2},${bb})`; ctx.fillRect(0,0,W,H);

  ctx.save();
  try {
  ctx.translate(cx,cy); ctx.rotate(roll); ctx.translate(-cx,-cy);
  ctx.fillStyle=`rgb(${br},${bg2},${bb})`;
  const pad=Math.ceil(Math.max(W,H)*0.05);
  ctx.fillRect(-pad,-pad,W+pad*2,H+pad*2);

  ctx.globalAlpha=sceneAlpha;
  drawBand();

  for(let qi=quasars.length-1;qi>=0;qi--) quasars[qi].update(dt);
  for(let qi=0;qi<quasars.length;qi++) quasars[qi].draw();
  for(const n of nebulae)   { n.update(dt); n.draw(); }
  for(const cl of clusters)  { cl.update(dt); cl.draw(); }
  for(const g of galaxies)   { g.update(dt); g.draw(); }
  for(const c of comets)     { c.update(dt); c.draw(); }
  for(const p of pulsars)    { p.update(dt); p.draw(); }
  for(const ss of shootingStars){ ss.update(dt); ss.draw(); }
  shootingStars=shootingStars.filter(ss=>!ss.dead);
  for(const sn of supernovae){ sn.update(dt); sn.draw(); }
  if(sbhActive) sbhGracePeriod=3000;
  else if(sbhGracePeriod>0) sbhGracePeriod-=dt;
  for(let si=superBHs.length-1;si>=0;si--){
    const sbh=superBHs[si]; sbh.update(dt); sbh.draw();
    if(sbh.isDead){
      superBHs.splice(si,1);
      sbhRollTimer=0;
    }
  }
  for(const bh of blackHoles){ bh.update(dt); if(!sbhActive&&sbhGracePeriod<=0) bh.draw(); }
  for(const d of dust)       { d.update(dt); d.draw(); }
  for(const s of stars)      { s.update(dt); s.draw(); }
  ctx.globalAlpha=1;
  } catch(e) {
    ctx.globalAlpha=1;
    ctx.globalCompositeOperation='source-over';
    console.warn('[galaxyBg] render error:', e);
  }
  ctx.restore();

  if(snFlash.active&&snFlash.alpha>0.005){
    const ft=snFlash.elapsed/snFlash.duration;
    let fa;
    if(ft<0.08) fa=snFlash.alpha*(ft/0.08);
    else        fa=snFlash.alpha*Math.pow(1-(ft-0.08)/0.92,1.6);
    fa=Math.max(0,Math.min(1,fa));
    if(fa>0.005){
      ctx.globalAlpha=fa; ctx.fillStyle='#ffffff';
      ctx.fillRect(0,0,W,H); ctx.globalAlpha=1;
    }
  }
}

  function start(){
    if(_running) return;
    canvas=document.getElementById('galaxy-bg-canvas');
    if(!canvas){ console.warn('galaxy-bg-canvas not found'); return; }
    canvas.style.display='block';
    ctx=canvas.getContext('2d');
    var _safeStartAttempts=0;
    function safeStart(){
      var w=window.innerWidth||document.documentElement.clientWidth||0;
      var h=window.innerHeight||document.documentElement.clientHeight||0;
      var cw=canvas.offsetWidth||canvas.clientWidth||w;
      var ch=canvas.offsetHeight||canvas.clientHeight||h;
      if(w<10||h<10||cw<10||ch<10){
        _safeStartAttempts++;
        requestAnimationFrame(safeStart);
        return;
      }
      resize();
      if(W<10||H<10){
        if(_safeStartAttempts<30){ _safeStartAttempts++; requestAnimationFrame(safeStart); return; }
        console.warn('[galaxyBg] could not get valid dimensions after 30 frames, aborting');
        return;
      }
      sceneAlpha=0;
      window.addEventListener('resize',resize);
      window.addEventListener('mousemove',_onMouseMove);
      init();
      if(stars.length===0||nebulae.length===0||galaxies.length===0){
        console.warn('[galaxyBg] init() produced empty arrays (W='+W+' H='+H+'), retrying...');
        stars.length=dust.length=nebulae.length=clusters.length=0;
        blackHoles.length=galaxies.length=quasars.length=0;
        superBHs.length=0; comets.length=0; pulsars.length=0;
        init();
      }
      _running=true;
      requestAnimationFrame(function(now){ last=now; requestAnimationFrame(loop); });
    }
    requestAnimationFrame(safeStart);
  }

  function stop(){
    if(!_running) return;
    _running=false; last=-1;
    if(_raf){ cancelAnimationFrame(_raf); _raf=null; }
    window.removeEventListener('resize',resize);
    window.removeEventListener('mousemove',_onMouseMove);
    mouse.nx=0; mouse.ny=0; mouse.x=0; mouse.y=0;
    var c=document.getElementById('galaxy-bg-canvas');
    if(c){ c.style.display='none'; var ct=c.getContext('2d'); ct.clearRect(0,0,c.width,c.height); }
  }

  return { start:start, stop:stop };
})();
