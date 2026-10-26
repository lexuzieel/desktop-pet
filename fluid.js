// ---------- fluid (1D shallow-water) + droplets + bubbles + head physics ----------
// The jar frame is non-inertial: water feels effective gravity g_eff = g - a_jar.
// Horizontal jar acceleration -> body force gx; vertical -> changes gy (wave speed / pressure).
const cv=document.getElementById('fx'), ctx=cv.getContext('2d');
const dpr=window.devicePixelRatio||1; cv.width=340*dpr; cv.height=480*dpr; ctx.scale(dpr,dpr);

const L=30, R=310, BOT=402, TOP=50, W=R-L, N=64, DX=W/N;
const D0=BOT-64;                 // mean water depth (px)
const G=1900;                    // px/s^2 -> first slosh mode period ~0.7 s
const RYS=13;                    // half-height of the surface ellipse (perspective)
const D=new Float32Array(N).fill(D0);   // depth per cell
const U=new Float32Array(N+1);          // velocity at cell faces (walls = 0)

let ax=0, ay=0, prevPos=null, prevVel={x:0,y:0};
let gyEff=G, gyPrev=G, energy=0;
let phi=0, phiV=0, sx=0, sxV=0, sy=0, syV=0;     // head tilt / sway / bob
const bubbles=[], drops=[];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

const surfY=x=>{ const f=clamp((x-L)/DX-0.5,0,N-1.001), i=Math.floor(f), t=f-i; return BOT-(D[i]*(1-t)+D[i+1]*t); };
const uAt =x=>{ const f=clamp((x-L)/DX,0,N-0.001), i=Math.floor(f), t=f-i; return U[i]*(1-t)+U[i+1]*t; };
const ryAt=x=>RYS*Math.sqrt(Math.max(0,1-((x-170)/140)**2));

function spawnBubble(x,y,r,vy=0){ bubbles.push({x,y,r,vx:0,vy,ph:Math.random()*6.28,pop:0}); }
function spawnDrop(x,vx,vy,r){ drops.push({x,y:surfY(x)-2,vx,vy,r}); }

function jarAcceleration(dt){
  if(winPos){
    if(prevPos){
      const vx=(winPos.x-prevPos.x)/dt, vy=(winPos.y-prevPos.y)/dt;
      ax+=((vx-prevVel.x)/dt-ax)*0.45; ay+=((vy-prevVel.y)/dt-ay)*0.45;
      prevVel={x:vx,y:vy};
    }
    prevPos={x:winPos.x,y:winPos.y};
    if(!start) winPos=null;
  } else if(prevPos){                 // released: window stops dead -> deceleration pulse
    ax=-prevVel.x/dt; ay=-prevVel.y/dt; prevVel={x:0,y:0}; prevPos=null;
  } else { ax*=0.4; ay*=0.4; }
}

function step(dt){
  jarAcceleration(dt);
  const gx=clamp(-ax*0.25,-1300,1300);
  const gyT=clamp(G-ay*0.3,900,3200);
  gyPrev=gyEff; gyEff+=(gyT-gyEff)*0.5;
  // vertical jolt excites the symmetric (2nd) sloshing mode
  const dG=gyEff-gyPrev;
  if(Math.abs(dG)>20) for(let j=1;j<N;j++) U[j]-=dG*0.035*Math.sin(2*Math.PI*j/N);

  // shallow-water integration (staggered grid, upwind flux, volume-conserving)
  const nS=6, h=dt/nS;
  for(let s=0;s<nS;s++){
    for(let j=1;j<N;j++){
      U[j]+=h*(-gyEff*(D[j]-D[j-1])/DX + gx);
      U[j]*=1-2.0*h;                                   // viscosity / drag
      U[j]=clamp(U[j],-520,520);
    }
    for(let i=0;i<N;i++){
      const f0=U[i]*(U[i]>0?D[i>0?i-1:0]:D[i]);
      const f1=U[i+1]*(U[i+1]>0?D[i]:D[i<N-1?i+1:N-1]);
      D[i]-=h*(f1-f0)/DX;
    }
    for(let i=1;i<N-1;i++) D[i]+=0.07*(D[i-1]+D[i+1]-2*D[i]);   // numeric smoothing
  }
  let m=0; for(let i=0;i<N;i++){ D[i]=clamp(D[i],D0*0.45,D0*1.45); m+=D[i]; }
  const corr=D0-m/N; for(let i=0;i<N;i++) D[i]+=corr*0.2;        // keep volume

  // turbulence energy (drives bubble bursts)
  let uMean=0, uAbs=0;
  for(let j=1;j<N;j++){ uAbs+=Math.abs(U[j]); if(j>N*0.3&&j<N*0.7) uMean+=U[j]; }
  uMean/=(N*0.4); uAbs/=N;
  energy+=((Math.abs(ax)+Math.abs(ay))/3000 + uAbs/260 - energy)*0.25;

  // head on its neck, dragged by the water current
  const f=dt*60;
  phiV+=(-phi*0.05-phiV*0.07+uMean*0.0011-gx*0.00010)*f; phi+=phiV*f;
  sxV +=(-sx*0.05 -sxV*0.09 +uMean*0.0007)*f;              sx+=sxV*f;
  syV +=(-sy*0.06 -syV*0.10 +(gyEff-G)*0.00025)*f;         sy+=syV*f;
  phi=clamp(phi,-7,7); sx=clamp(sx,-6,6); sy=clamp(sy,-5,5);
  wrap.style.transform=`translate(${sx.toFixed(2)}px,${sy.toFixed(2)}px) rotate(${phi.toFixed(2)}deg)`;

  // splashes: steep fast crests and wall slams throw droplets
  let n=0;
  for(let i=1;i<N-1&&n<5;i++){
    const slope=(D[i+1]-D[i-1])/(2*DX), u=U[i];
    if(Math.abs(u)>240&&Math.abs(slope)>0.8&&Math.random()<0.12){
      const x=L+(i+0.5)*DX; spawnDrop(x,u*0.45+(Math.random()-0.5)*90,-(140+Math.random()*260+Math.abs(u)*0.35),0.8+Math.random()*2); n++;
    }
  }
  for(const [i,sg] of [[1,1],[N-1,-1]]){
    if(Math.abs(U[i])>180&&Math.random()<0.4){
      const x=i===1?L+4:R-4; spawnDrop(x,sg*(30+Math.random()*80),-(160+Math.random()*320),0.8+Math.random()*2.2);
    }
  }
  for(let k=drops.length-1;k>=0;k--){
    const p=drops[k];
    p.vy+=1500*dt; p.x+=p.vx*dt; p.y+=p.vy*dt;
    if(p.x<L+2){p.x=L+2;p.vx*=-0.4;} if(p.x>R-2){p.x=R-2;p.vx*=-0.4;}
    if(p.y<TOP){p.y=TOP;p.vy*=-0.3;}
    if(p.y>surfY(p.x)){
      const i=clamp(Math.floor((p.x-L)/DX),0,N-1); D[i]+=p.r*p.r*0.6;
      const c=Math.random()<0.6?1+Math.floor(Math.random()*3):0;
      for(let q=0;q<c;q++) spawnBubble(p.x+(Math.random()-0.5)*6,surfY(p.x)+3+Math.random()*6,0.6+Math.random()*1.0,40+Math.random()*60);
      drops.splice(k,1);
    }
  }
  if(drops.length>90) drops.splice(0,drops.length-90);

  // bubbles: trickle + bursts when stirred; advected by the local water current
  if(Math.random()<0.7*dt) spawnBubble(L+20+Math.random()*(W-40),BOT-4,0.8+Math.random()*1.6);
  const burst=energy*22*dt;
  for(let k=0;k<burst;k++) if(Math.random()<0.8) spawnBubble(L+10+Math.random()*(W-20),surfY(170)+20+Math.random()*(BOT-surfY(170)-40),0.6+Math.random()*2.0);
  for(let i=bubbles.length-1;i>=0;i--){
    const b=bubbles[i];
    if(b.pop){ b.pop++; if(b.pop>8) bubbles.splice(i,1); continue; }
    const sy0=surfY(b.x), depthK=clamp(1-(b.y-sy0)/D0,0.25,1);     // current is stronger near the surface
    b.vx+=(uAt(b.x)*0.75*depthK+Math.sin(b.ph+=dt*6)*14-b.vx)*Math.min(1,5*dt)+(gx*0.00035)*0;
    const term=-(26+b.r*20)*(gyEff/G);
    b.vy+=(term-b.vy)*Math.min(1,2.5*dt)+(Math.random()-0.5)*energy*40;
    b.x+=b.vx*dt; b.y+=b.vy*dt;
    if(b.x<L+b.r){b.x=L+b.r;b.vx*=-0.4;} if(b.x>R-b.r){b.x=R-b.r;b.vx*=-0.4;}
    if(b.y>BOT-b.r){b.y=BOT-b.r;b.vy=-Math.abs(b.vy)*0.3;}
    if(b.y<surfY(b.x)+b.r*0.4) b.pop=1;
  }
  if(bubbles.length>140) bubbles.splice(0,bubbles.length-140);
}

function waterPath(dy,cont){ // polyline along the surface, offset by perspective dy sign
  for(let i=0;i<N;i++){ const x=L+(i+0.5)*DX, y=BOT-D[i]+dy*ryAt(x); (i||cont)?ctx.lineTo(x,y):ctx.moveTo(x,y); }
}
function draw(){
  ctx.clearRect(0,0,340,480);
  ctx.save();
  ctx.beginPath(); ctx.moveTo(L,TOP-6); ctx.lineTo(L,BOT); ctx.ellipse(170,BOT,140,13,0,Math.PI,0,true); ctx.lineTo(R,TOP-6); ctx.closePath(); ctx.clip();

  // water body (starts at the back edge of the surface ellipse)
  ctx.beginPath(); ctx.moveTo(L,BOT+16); ctx.lineTo(L,BOT-D[0]); waterPath(-1,true); ctx.lineTo(R,BOT-D[N-1]); ctx.lineTo(R,BOT+16); ctx.closePath();
  const g=ctx.createLinearGradient(0,BOT-D0,0,BOT);
  g.addColorStop(0,'rgba(120,190,190,0.17)'); g.addColorStop(1,'rgba(20,70,78,0.40)');
  ctx.fillStyle=g; ctx.fill();

  // bubbles + droplets
  for(const b of bubbles){
    if(b.pop){ ctx.strokeStyle=`rgba(255,255,255,${0.22-b.pop*0.025})`; ctx.lineWidth=0.6; ctx.beginPath(); ctx.arc(b.x,b.y,b.r+b.pop*0.8,0,6.283); ctx.stroke(); continue; }
    const r=b.r;
    ctx.fillStyle='rgba(215,238,244,0.05)'; ctx.beginPath(); ctx.arc(b.x,b.y,r,0,6.283); ctx.fill();
    ctx.lineWidth=0.6; ctx.strokeStyle='rgba(235,250,255,0.20)'; ctx.stroke();
    if(r>1.1){
      ctx.lineWidth=Math.max(0.6,r*0.18); ctx.lineCap='round';
      ctx.strokeStyle='rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.arc(b.x,b.y,r*0.72,3.5,4.6); ctx.stroke();            // window highlight (upper-left)
      ctx.strokeStyle='rgba(255,255,255,0.14)'; ctx.beginPath(); ctx.arc(b.x,b.y,r*0.72,0.45,1.5); ctx.stroke();           // bounce light (lower-right)
    }
  }
  ctx.fillStyle='rgba(205,240,240,0.42)';
  for(const p of drops){ ctx.beginPath(); ctx.ellipse(p.x,p.y,p.r,p.r*(1+Math.min(1,Math.abs(p.vy)/900)*0.6),0,0,6.283); ctx.fill(); }

  // surface plane: back edge -> front edge (seen slightly from above)
  ctx.beginPath(); waterPath(-1);
  for(let i=N-1;i>=0;i--){ const x=L+(i+0.5)*DX; ctx.lineTo(x,BOT-D[i]+ryAt(x)); }
  ctx.closePath(); ctx.fillStyle='rgba(215,248,244,0.17)'; ctx.fill();
  ctx.beginPath(); waterPath(-1); ctx.strokeStyle='rgba(255,255,255,0.22)'; ctx.lineWidth=1; ctx.stroke();
  ctx.beginPath(); waterPath(1);  ctx.strokeStyle='rgba(235,255,252,0.55)';  ctx.lineWidth=1.3; ctx.stroke();
  ctx.restore();
}
let lastT=performance.now();
function loop(now){
  const dt=clamp((now-lastT)/1000,0.004,0.05); lastT=now;
  step(dt); draw(); requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
