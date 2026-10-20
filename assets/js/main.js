document.documentElement.classList.add('js');
// scroll reveal: sequence cue only
(function(){
  var els=document.querySelectorAll('.rv');
  if(!('IntersectionObserver' in window)){els.forEach(function(e){e.classList.add('in')});return;}
  var io=new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target);}})},{threshold:.12});
  els.forEach(function(e){io.observe(e)});
})();
// ---------- motion: shared helpers ----------
var REDUCE=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function smooth(a,b,x){var u=clamp((x-a)/(b-a),0,1);return u*u*(3-2*u)}
function easeOut(x){return 1-Math.pow(1-x,3)}
// progress 0 until the whole element is on screen, then follows the scroll
function scrollP(el){var r=el.getBoundingClientRect(),vh=window.innerHeight,s=Math.max(vh-r.height-16,vh*.2),range=Math.max(300,Math.min(560,s-90));return clamp((s-r.top)/range,0,1)}
// clay profile: t 0..1 from base to rim, p 0..1 how far the pot is pulled up
function rFinal(t){var belly=42+40*Math.sin(Math.PI*Math.pow(t,.85));return belly*(1-.38*smooth(.58,.93,t))+6*smooth(.93,1,t)}
function rStart(t){return 64*(1-.18*t*t)}
function radius(t,p,wob){var e=smooth(0,1,p),r=rStart(t)*(1-e)+rFinal(t)*e;if(wob)r+=Math.sin(t*8+p*10)*2.2*Math.sin(Math.PI*p);return r}
function vaseD(cx,yb,H,k,p,wob){var N=48,L=[],R=[],i,t,r,y;for(i=0;i<=N;i++){t=i/N;r=radius(t,p,wob)*k;y=yb-H*t;L.push((cx-r).toFixed(1)+' '+y.toFixed(1));R.push((cx+r).toFixed(1)+' '+y.toFixed(1))}
  var r0=radius(0,p,wob)*k;return 'M'+L.join(' L')+' L'+R.reverse().join(' L')+' A'+r0.toFixed(1)+' '+(r0*.2).toFixed(1)+' 0 0 1 '+L[0]+' Z'}
// ---------- motion 1: rotating ring, speeds up with scroll ----------
(function(){
  var g=document.getElementById('ringG');if(!g)return;
  var ang=0,vel=0,last=window.scrollY,t0=performance.now(),vis=true,raf=0;
  function set(){g.setAttribute('transform','rotate('+ang.toFixed(2)+' 100 100)')}
  if(REDUCE){set();return}
  new IntersectionObserver(function(es){vis=es[0].isIntersecting;if(vis&&!raf)raf=requestAnimationFrame(tick)}).observe(g.closest('.badge'));
  function tick(t){raf=0;if(!vis)return;var dt=Math.min(50,t-t0)/1000;t0=t;var y=window.scrollY;vel=clamp(vel*.9+(y-last)*.08,-9,9);last=y;ang+=12*dt+vel;set();raf=requestAnimationFrame(tick)}
  raf=requestAnimationFrame(tick);
})();
// ---------- motion 2: vase rises while the section scrolls into view ----------
(function(){
  var st=document.getElementById('stage');if(!st)return;
  var v=document.getElementById('vase'),c=document.getElementById('vaseClip'),top=document.getElementById('vaseTop'),hole=document.getElementById('vaseHole');
  function draw(p){var H=70+175*smooth(0,1,p),d=vaseD(150,328,H,1,p,!REDUCE),rt=radius(1,p,!REDUCE),y=328-H;
    v.setAttribute('d',d);c.setAttribute('d',d);
    top.setAttribute('cx',150);top.setAttribute('cy',y.toFixed(1));top.setAttribute('rx',rt.toFixed(1));top.setAttribute('ry',(rt*.2).toFixed(1));
    hole.setAttribute('cx',150);hole.setAttribute('cy',(y+1).toFixed(1));hole.setAttribute('rx',(rt*.84).toFixed(1));hole.setAttribute('ry',(rt*.16).toFixed(1));hole.setAttribute('opacity',smooth(.5,.8,p).toFixed(2))}
  if(REDUCE){draw(1);return}
  var tick=false;function upd(){tick=false;draw(scrollP(st))}
  function req(){if(!tick){tick=true;requestAnimationFrame(upd)}}
  window.addEventListener('scroll',req,{passive:true});window.addEventListener('resize',req);upd();
})();
// ---------- motion 3: paint a vase with a brush ----------
(function(){
  var cv=document.getElementById('paintCanvas');if(!cv)return;
  var W=320,Hh=420,dpr=Math.min(2,window.devicePixelRatio||1),ctx=cv.getContext('2d');
  cv.width=W*dpr;cv.height=Hh*dpr;ctx.scale(dpr,dpr);
  var d=vaseD(160,396,300,1.5,1,false),P=new Path2D(d);document.getElementById('paintShape').setAttribute('d',d);
  var color='#AB92BF',size=22,drawing=false,last=null,demo=false,brush=document.getElementById('brush'),tip=document.getElementById('brushTip');
  function base(){ctx.clearRect(0,0,W,Hh);ctx.save();ctx.fillStyle='#EFDFCB';ctx.fill(P);ctx.restore()}
  function ln(a,b){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}
  function seg(a,b){ctx.save();ctx.clip(P);ctx.lineCap='round';ctx.lineJoin='round';
    ctx.globalAlpha=.92;ctx.strokeStyle=color;ctx.lineWidth=size;ln(a,b);
    var dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy)||1,nx=-dy/l,ny=dx/l,o=[-.33,-.1,.16,.34],i;
    for(i=0;i<o.length;i++){ctx.globalAlpha=.2;ctx.strokeStyle=i%2?'#ffffff':'#2F2742';ctx.lineWidth=Math.max(1,size*.06);
      ln({x:a.x+nx*o[i]*size,y:a.y+ny*o[i]*size},{x:b.x+nx*o[i]*size,y:b.y+ny*o[i]*size})}
    ctx.restore()}
  function pt(e){var r=cv.getBoundingClientRect();return {x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*Hh/r.height,cx:e.clientX-r.left,cy:e.clientY-r.top}}
  function glyph(x,y,on){brush.style.transform='translate('+(x-7)+'px,'+(y-88)+'px) rotate(26deg)';brush.classList.toggle('on',on);tip.setAttribute('fill',color);brush.style.color=color}
  cv.addEventListener('pointerdown',function(e){demo=false;drawing=true;cv.setPointerCapture(e.pointerId);last=pt(e);seg(last,last);glyph(last.cx,last.cy,true)});
  cv.addEventListener('pointermove',function(e){var q=pt(e);glyph(q.cx,q.cy,true);if(drawing){seg(last,q);last=q}});
  function up(){drawing=false}
  cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
  cv.addEventListener('pointerleave',function(){if(!drawing)brush.classList.remove('on')});
  document.querySelectorAll('.sw').forEach(function(b){b.addEventListener('click',function(){color=b.dataset.c;document.querySelectorAll('.sw').forEach(function(x){x.setAttribute('aria-pressed',x===b)})})});
  document.getElementById('paintSize').addEventListener('input',function(e){size=+e.target.value});
  document.getElementById('paintClear').addEventListener('click',function(){base()});
  base();
  // one short demo stroke the first time the vase is in view
  if(REDUCE||!('IntersectionObserver' in window))return;
  var io=new IntersectionObserver(function(es){if(!es[0].isIntersecting)return;io.disconnect();run()},{threshold:.7});io.observe(cv);
  function run(){demo=true;var waves=[{c:'#AB92BF',s:26,y:196,a:14},{c:'#655A7C',s:16,y:272,a:12}],w=0,u=0,prev=null,t0=performance.now();
    var r=cv.getBoundingClientRect(),k=r.width/W;
    function step(t){if(!demo){return}var dur=1100,uu=clamp((t-t0)/dur,0,1),wv=waves[w];color=wv.c;size=wv.s;
      var x=44+232*uu,y=wv.y+wv.a*Math.sin(uu*Math.PI*2.2),q={x:x,y:y};
      if(prev)seg(prev,q);prev=q;glyph(x*k,y*k,true);
      if(uu<1){requestAnimationFrame(step)}else if(w<waves.length-1){w++;t0=t;prev=null;requestAnimationFrame(step)}else{demo=false;brush.classList.remove('on');color='#AB92BF';size=+document.getElementById('paintSize').value}}
    requestAnimationFrame(step)}
})();
// ---------- motion 4: the kiln heats up ----------
(function(){
  var cards=[].slice.call(document.querySelectorAll('[data-heat]'));if(!cards.length)return;
  var dark=window.matchMedia('(prefers-color-scheme: dark)').matches;
  function rgb(s){var m=s.match(/\d+/g);return m?m.slice(0,3).map(Number):[47,39,66]}
  var wrap=document.querySelector('.temps');
  var items=cards.map(function(el){var n=el.querySelector('.num'),deg=el.querySelector('.deg');return {el:el,n:n,deg:deg,target:+el.dataset.heat,from:rgb(getComputedStyle(deg).color),to:dark?[255,150,100]:[184,53,15]}});
  function set(p){items.forEach(function(it){var e=smooth(0,1,p),val=Math.round(20+(it.target-20)*e),h=clamp(val/it.target,.02,1),c=it.from.map(function(f,i){return Math.round(f+(it.to[i]-f)*e)});
    it.n.textContent=val;it.el.style.setProperty('--h',h.toFixed(3));it.deg.style.color='rgb('+c.join(',')+')'})}
  if(REDUCE){set(1);return}
  var tick=false;function upd(){tick=false;set(scrollP(wrap))}
  function req(){if(!tick){tick=true;requestAnimationFrame(upd)}}
  window.addEventListener('scroll',req,{passive:true});window.addEventListener('resize',req);upd();
})();
// mobile menu
(function(){
  var b=document.querySelector('.menu-toggle'),m=document.getElementById('menu');
  b.addEventListener('click',function(){var o=m.classList.toggle('open');b.setAttribute('aria-expanded',o)});
  m.addEventListener('click',function(e){if(e.target.tagName==='A'){m.classList.remove('open');b.setAttribute('aria-expanded','false')}});
})();
// contact form: topic switches the extra questions
(function(){
  var map={'Keramiek schilderen':'schilderen','Groepsworkshop':'groep','Stookservice':'stoken','Open atelier':'draaien','Iets anders':'anders'};
  var radios=document.querySelectorAll('input[name=onderwerp]');
  function show(key){document.querySelectorAll('.extra').forEach(function(x){x.classList.toggle('on',x.dataset.for===key)})}
  radios.forEach(function(r){r.addEventListener('change',function(){show(map[r.value])})});
  var pre={schilderen:'t-schilderen',stoken:'t-stoken',draaien:'t-draaien',groep:'t-groep'};
  document.querySelectorAll('a[data-topic]').forEach(function(a){a.addEventListener('click',function(){var r=document.getElementById(pre[a.dataset.topic]);if(r){r.checked=true;show(map[r.value])}})});
  var f=document.getElementById('contactForm'),st=document.getElementById('status'),btn=document.getElementById('send');
  function bad(id,cond){var w=document.getElementById(id).closest('.field');w.classList.toggle('invalid',cond);return cond}
  f.addEventListener('submit',function(e){
    e.preventDefault();
    var m=document.getElementById('f-mail').value.trim();
    var err=[bad('f-naam',!document.getElementById('f-naam').value.trim()),bad('f-mail',!/^\S+@\S+\.\S+$/.test(m)),bad('f-bericht',!document.getElementById('f-bericht').value.trim())].some(Boolean);
    st.className='status';
    if(err){st.className='status bad';st.textContent='Er ontbreekt nog iets. Kijk even naar de rood gemarkeerde velden.';return}
    f.classList.add('sending');btn.textContent='Versturen...';
    // Preview: no backend yet. In the live build this posts to Netlify Forms.
    setTimeout(function(){f.classList.remove('sending');btn.textContent='Verstuur bericht';st.className='status ok';st.textContent='Dankjewel! In de echte site gaat dit bericht naar Marlou en Jacky. We reageren binnen 72 uur.'},900);
  });
})();
