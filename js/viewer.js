/* Ålive product viewer: drag to rotate, open and close. Needs three.min.js (r128). */
(function(){
function sm(a,b,x){var t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)}
function back(t){t=Math.max(0,Math.min(1,t));var c=1.4;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2)}
window.AliveViewer=function(kind,opts){
  var box=document.getElementById(opts.el),btn=document.getElementById(opts.btn),hint=document.getElementById(opts.hint);
  var T=window.THREE,renderer;
  try{renderer=new T.WebGLRenderer({antialias:true,alpha:true})}catch(e){return false}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.outputEncoding=T.sRGBEncoding;
  box.appendChild(renderer.domElement);box.classList.add('ready');
  var scene=new T.Scene(),cam=new T.PerspectiveCamera(28,1,1,300);
  scene.add(new T.HemisphereLight(0xffffff,0x8a9a70,0.95));
  var dl=new T.DirectionalLight(0xffffff,0.75);dl.position.set(-14,26,30);scene.add(dl);
  var d2=new T.DirectionalLight(0xfff2cc,0.3);d2.position.set(20,8,-18);scene.add(d2);
  var root=new T.Group();scene.add(root);
  var loader=new T.TextureLoader();
  function tex(u){var t=loader.load(u,draw);t.encoding=T.sRGBEncoding;t.anisotropy=renderer.capabilities.getMaxAnisotropy();return t}
  var GREEN=new T.Color(0x2b651b).convertSRGBToLinear(),SILVER=0xcfd3d6,OLIVE=new T.Color(0x6f8a12).convertSRGBToLinear();
  var oliveGeo=new T.SphereGeometry(1,28,20),oliveMat=new T.MeshStandardMaterial({color:OLIVE,roughness:.28,metalness:0});
  function olive(s){var m=new T.Mesh(oliveGeo,oliveMat);s*=1.1;m.scale.set(.93*s,1.3*s,.9*s);m.userData.s=s;return m}
  var open=0,target=0,update,centerY,dist;

  if(kind==='bag'){
    var W=16,H=23,D=8,VT=1-24/230,NX=36,NY=40;centerY=11.3;dist=64;
    function depth(u,v,o){
      var uu=Math.min(1,Math.abs(u)/.94),sx=uu<1?Math.pow(1-Math.pow(uu,2.4),.62):0;
      var base=Math.max(.03,(D/2)*sx*Math.pow(1-sm(.05,.9,v),.85));
      var mouth=sm(.3,.72,o)*2.7*Math.pow(Math.max(0,1-u*u),.5)*sm(.5,VT,v);
      return base+mouth;
    }
    function panel(sign,v0,v1,ny){
      var g=new T.BufferGeometry(),pos=new Float32Array((NX+1)*(ny+1)*3),uv=new Float32Array((NX+1)*(ny+1)*2),idx=[];
      for(var j=0;j<=ny;j++)for(var i=0;i<=NX;i++){var k=j*(NX+1)+i,u=-1+2*i/NX,v=v0+(v1-v0)*j/ny;
        uv[k*2]=sign>0?(u+1)/2:1-(u+1)/2;uv[k*2+1]=v}
      for(j=0;j<ny;j++)for(i=0;i<NX;i++){var a=j*(NX+1)+i,b=a+1,c=a+NX+1,d=c+1;
        if(sign>0)idx.push(a,b,d,a,d,c);else idx.push(a,d,b,a,c,d)}
      g.setAttribute('position',new T.BufferAttribute(pos,3));g.setAttribute('uv',new T.BufferAttribute(uv,2));g.setIndex(idx);
      g.userData={sign:sign,v0:v0,v1:v1,ny:ny};return g;
    }
    function shape(g,o){var p=g.attributes.position.array,d=g.userData;
      for(var j=0;j<=d.ny;j++)for(var i=0;i<=NX;i++){var k=(j*(NX+1)+i)*3,u=-1+2*i/NX,v=d.v0+(d.v1-d.v0)*j/d.ny;
        var pinch=1-.05*(1-sm(0,.5,v))-sm(.3,.72,o)*.035*sm(.5,VT,v);
        p[k]=u*W/2*pinch;p[k+1]=v*H;p[k+2]=d.sign*depth(u,v,o)}
      g.attributes.position.needsUpdate=true;g.computeVertexNormals()}
    var mats={f:new T.MeshStandardMaterial({map:tex('img/tex-bag-front.jpg'),roughness:.55}),b:new T.MeshStandardMaterial({map:tex('img/tex-bag-back.jpg'),roughness:.55}),
      i:new T.MeshStandardMaterial({color:SILVER,roughness:.35,metalness:.75,side:T.BackSide})};
    var body=[panel(1,0,VT,NY),panel(-1,0,VT,NY)],strip=[panel(1,VT,1,5),panel(-1,VT,1,5)],stripG=new T.Group(),stripMats=[];
    body.forEach(function(g,n){root.add(new T.Mesh(g,n?mats.b:mats.f));root.add(new T.Mesh(g,mats.i))});
    strip.forEach(function(g,n){shape(g,0);g.translate(W/2,-H*VT,0);var m=(n?mats.b:mats.f).clone();m.transparent=true;stripMats.push(m);
      stripG.add(new T.Mesh(g,m));var im=mats.i.clone();im.transparent=true;stripMats.push(im);stripG.add(new T.Mesh(g,im))});
    stripG.position.set(-W/2,H*VT,0);root.add(stripG);
    var ols=[],spots=[[-4.3,-.2,.5,.3],[-1.5,.75,-.4,-.5],[1.4,.3,.6,.9],[4.1,-.5,-.3,.2],[-2.9,-1.9,-.6,1.3],[.1,-1.6,.2,-.9],[2.9,-2.1,-.5,.6]];
    spots.forEach(function(s){var o=olive(.92);o.position.set(s[0]*.9,0,s[2]*.7);o.rotation.set(s[3],s[3]*2,s[3]*.7+.3);o.userData.p=s;root.add(o);ols.push(o)});
    update=function(o){
      body.forEach(function(g){shape(g,o)});
      var a=sm(0,.3,o),b=sm(.22,.6,o);
      stripG.rotation.z=a*.75;stripG.position.set(-W/2-b*5,H*VT+b*9,b*2);stripG.rotation.y=b*.8;
      stripMats.forEach(function(m){m.opacity=1-b});stripG.visible=b<.99;
      var t=sm(.66,1,o),r=back(t),g=sm(.66,.8,o);
      ols.forEach(function(ol){var k=ol.userData.s*Math.max(.001,g);ol.visible=o>.66;ol.scale.set(.93*k,1.3*k,.9*k);
        ol.position.y=H*VT-2.6+r*(2.5+ol.userData.p[1])})};
  }else if(kind==='jar'){
    var R=4.4;centerY=6.9;dist=48;
    var prof=[[.01,0],[3.6,0],[4.1,.22],[4.38,.8],[R,1.6],[R,10],[4.3,10.7],[4.05,11.3],[3.9,11.7],[3.9,12.5]].map(function(p){return new T.Vector2(p[0],p[1])});
    var inner=new T.Mesh(new T.CylinderGeometry(R-.3,R-.45,10.4,48,1,false),new T.MeshStandardMaterial({color:0xf3e08a,transparent:true,opacity:.2,roughness:.1,depthWrite:false}));
    inner.position.y=5.6;inner.renderOrder=1;root.add(inner);
    var jo=[],k=0;
    for(var L=0;L<5;L++)for(var j=0;j<6;j++){var o=olive(.78),y=1.55+L*2.0,a=2*Math.PI*j/5+L*.63;
      if(j<5)o.position.set(2.5*Math.cos(a),y+((k*37)%10)/40,2.5*Math.sin(a));else o.position.set(.1,y+.6,-.1);
      o.rotation.set(k*1.3,k*2.1,k*.7);o.userData={y:o.position.y,top:L===4,lift:L===4?(j===5?3.1:1.5+j*.28):0};root.add(o);jo.push(o);k++}
    var glass=new T.Mesh(new T.LatheGeometry(prof,64),new T.MeshPhongMaterial({color:0xffffff,transparent:true,opacity:.2,shininess:120,specular:0xffffff,depthWrite:false,side:T.DoubleSide}));
    glass.renderOrder=2;root.add(glass);
    var cov=25/(2*Math.PI*(R+.03)),lab=new T.Mesh(new T.CylinderGeometry(R+.03,R+.03,7,96,1,true,-cov*Math.PI,cov*2*Math.PI),new T.MeshStandardMaterial({map:tex('img/tex-jar-label.jpg'),roughness:.6,side:T.DoubleSide}));
    lab.position.y=6.1;lab.renderOrder=3;root.add(lab);
    var lid=new T.Group(),lm=new T.MeshStandardMaterial({color:GREEN,roughness:.4,metalness:.25});
    var side=new T.Mesh(new T.CylinderGeometry(4.3,4.3,1.4,64,1,true),lm);side.position.y=.7;lid.add(side);
    var inside=new T.Mesh(new T.CylinderGeometry(4.25,4.25,1.36,64,1,true),new T.MeshStandardMaterial({color:SILVER,metalness:.8,roughness:.3,side:T.BackSide}));inside.position.y=.7;lid.add(inside);
    var top=new T.Mesh(new T.CircleGeometry(4.3,64),new T.MeshStandardMaterial({map:tex('img/tex-jar-lid.jpg'),roughness:.45}));top.rotation.x=-Math.PI/2;top.position.y=1.4;lid.add(top);
    var under=new T.Mesh(new T.CircleGeometry(4.25,64),new T.MeshStandardMaterial({color:SILVER,metalness:.8,roughness:.3}));under.rotation.x=Math.PI/2;under.position.y=1.38;lid.add(under);
    lid.position.y=11.6;lid.renderOrder=4;root.add(lid);
    update=function(o){
      var tw=sm(0,.4,o),up=sm(.25,.8,o),tilt=sm(.5,1,o);
      lid.rotation.y=-tw*1.6;lid.position.set(tilt*3.4,11.6+up*6.6,-tilt*1.0);lid.rotation.z=-tilt*.5;lid.rotation.x=-tilt*.25;
      var r=back(sm(.5,1,o));jo.forEach(function(ol){ol.position.y=ol.userData.y+r*ol.userData.lift})};
  }
  var rotY=-.45,rotX=0,vel=0,auto=true,dragging=false,lx=0,ly=0,dirty=true,last=0;
  var pk=null;
  if(kind==='pack'){
    centerY=0;dist=40;pk={opens:[0,0,0,0,0],targets:[0,0,0,0,0],pick:[]};
    var PW=24.96,PH=8.84,RX=1.93,RY=2.59,SUF={original:'',garlic:'-garlic',chilli:'-chilli'};
    var FIT=[[311.5,406.8,-98],[779.5,463.9,-83],[1247.5,396.3,-94],[1720.7,453.5,-80],[2188.7,411.9,-96]],WIN=[[311.5,407],[779.5,464],[1247.5,396.5],[1729.5,454],[2189,412]];
    var TABX=[-9.3,-4.995,.205,4.515,10.075];
    function cm(px,py){return [(px-1248)/100,(442-py)/100]}
    function inEl(j,X,Y){var f=FIT[j],a=f[2]*Math.PI/180,ca=Math.cos(a),sa=Math.sin(a),u=(X-f[0])*ca+(Y-f[1])*sa,v=-(X-f[0])*sa+(Y-f[1])*ca;return u*u/(340.1*340.1)+v*v/(288.2*288.2)<1}
    var arcs=[],N=180;
    FIT.forEach(function(f,i){var a=f[2]*Math.PI/180,ca=Math.cos(a),sa=Math.sin(a),pts=[],keep=[];
      for(var k=0;k<N;k++){var t=2*Math.PI*k/N,X=f[0]+340.1*Math.cos(t)*ca-288.2*Math.sin(t)*sa,Y=f[1]+340.1*Math.cos(t)*sa+288.2*Math.sin(t)*ca,ins=false;
        for(var j=0;j<5;j++)if(j!==i&&inEl(j,X,Y))ins=true;pts.push(cm(X,Y));keep.push(!ins)}
      var st=0;for(k=0;k<N;k++)if(keep[k]&&!keep[(k+N-1)%N]){st=k;break}
      var cur=[];for(var d=0;d<N;d++){k=(st+d)%N;if(keep[k])cur.push(pts[k]);else if(cur.length){arcs.push(cur);cur=[]}}if(cur.length)arcs.push(cur)});
    var chain=arcs.shift().slice();
    while(arcs.length){var e=chain[chain.length-1],best=null;arcs.forEach(function(a,n){[0,1].forEach(function(rv){var q=rv?a[a.length-1]:a[0],dd=Math.hypot(q[0]-e[0],q[1]-e[1]);if(!best||dd<best[0])best=[dd,n,rv]})});
      var a2=arcs.splice(best[1],1)[0];if(best[2])a2.reverse();chain=chain.concat(a2)}
    var shape=new T.Shape(chain.map(function(p){return new T.Vector2(p[0],p[1])}));
    var C=WIN.map(function(w){return cm(w[0],w[1])});
    C.forEach(function(c){var h=new T.Path();h.absellipse(c[0],c[1],RX,RY,0,Math.PI*2,true,0);shape.holes.push(h)});
    function uvFix(g){var p=g.attributes.position,uv=g.attributes.uv;for(var i=0;i<p.count;i++)uv.setXY(i,p.getX(i)/PW+.5,p.getY(i)/PH+.5);uv.needsUpdate=true}
    var flat=new T.Group();flat.rotation.x=-Math.PI/2;root.add(flat);
    var lidTex={},lidMat=new T.MeshStandardMaterial({roughness:.5}),under=new T.MeshStandardMaterial({color:0xb9bfc4,metalness:.35,roughness:.35,side:T.BackSide});
    var lg=new T.ShapeGeometry(shape,40);uvFix(lg);flat.add(new T.Mesh(lg,lidMat));flat.add(new T.Mesh(lg,under));
    var glassM=new T.MeshPhongMaterial({color:0xffffff,transparent:true,opacity:.22,shininess:120,specular:0xffffff,depthWrite:false,side:T.DoubleSide});
    var oilM=new T.MeshStandardMaterial({color:new T.Color(0xf2c53a).convertSRGBToLinear(),transparent:true,opacity:.55,roughness:.1,depthWrite:false});
    var hemi=new T.SphereGeometry(1,40,20,0,Math.PI*2,Math.PI/2,Math.PI/2);
    var RINGS=12,SEG=56,TH=2.75,RC=.75,LM=RY*2,tabMats=[];
    pk.pods=C.map(function(c,i){
      var g=new T.BufferGeometry(),n=RINGS*SEG+1,rest=new Float32Array(n*2),pos=new Float32Array(n*3),uv=new Float32Array(n*2),idx=[];
      rest[0]=0;rest[1]=-RY;
      for(var r=1;r<=RINGS;r++)for(var s2=0;s2<SEG;s2++){var k=1+(r-1)*SEG+s2,a=2*Math.PI*s2/SEG,rr=r/RINGS*.985;rest[k*2]=rr*RX*Math.cos(a);rest[k*2+1]=-RY+rr*RY*Math.sin(a)}
      for(k=0;k<n;k++){uv[k*2]=(rest[k*2]+c[0])/PW+.5;uv[k*2+1]=(rest[k*2+1]+c[1]+RY)/PH+.5}
      for(s2=0;s2<SEG;s2++){idx.push(0,1+s2,1+(s2+1)%SEG)}
      for(r=1;r<RINGS;r++)for(s2=0;s2<SEG;s2++){var a0=1+(r-1)*SEG+s2,a1=1+(r-1)*SEG+(s2+1)%SEG,b0=a0+SEG,b1=a1+SEG;idx.push(a0,b0,b1,a0,b1,a1)}
      g.setAttribute('position',new T.BufferAttribute(pos,3));g.setAttribute('uv',new T.BufferAttribute(uv,2));g.setIndex(idx);
      var grp=new T.Group();grp.position.set(c[0],c[1]+RY,.02);flat.add(grp);
      var top=new T.Mesh(g,lidMat),bot=new T.Mesh(g,under);top.userData.pod=bot.userData.pod=i;grp.add(top);grp.add(bot);pk.pick.push(top,bot);
      var tm=new T.MeshStandardMaterial({transparent:true,alphaTest:.4,roughness:.5,side:T.DoubleSide});tabMats.push(tm);
      var tab=new T.Mesh(new T.PlaneGeometry(1.26,1.43),tm);tab.userData.pod=i;grp.add(tab);pk.pick.push(tab);
      var pod=new T.Mesh(hemi,glassM);pod.rotation.x=Math.PI/2;pod.scale.set(2.25,3.6,2.86);pod.position.set(c[0],c[1],0);pod.renderOrder=3;pod.userData.pod=i;flat.add(pod);pk.pick.push(pod);
      var oil=new T.Mesh(hemi,oilM);oil.rotation.x=Math.PI/2;oil.scale.set(1.75,1.5,2.3);oil.position.set(c[0],c[1],-2.0);oil.renderOrder=2;flat.add(oil);
      var ol=new T.Mesh(oliveGeo,oliveMat);ol.scale.set(1.68,2.34,1.64);ol.position.set(c[0],c[1],-1.8);ol.rotation.z=[.07,-.12,.05,.16,-.09][i];ol.userData.pod=i;flat.add(ol);pk.pick.push(ol);
      return {g:g,rest:rest,n:n,tab:tab,ol:ol,x:TABX[i]-c[0]};
    });
    function curl(x,y,p,out){var d=-y,dl=LM*(1-p);if(d<=dl){out[0]=x;out[1]=y;out[2]=0;out[3]=0;return}
      var u=d-dl;if(u<=RC*TH){var ph=u/RC;out[0]=x;out[1]=-dl-RC*Math.sin(ph);out[2]=RC*(1-Math.cos(ph));out[3]=ph;return}
      var r=u-RC*TH;out[0]=x;out[1]=-dl-RC*Math.sin(TH)-r*Math.cos(TH);out[2]=RC*(1-Math.cos(TH))+r*Math.sin(TH);out[3]=TH}
    var tmp=[0,0,0,0];
    update=function(){pk.pods.forEach(function(P,i){var o=pk.opens[i],p=sm(0,.7,o)*.9,a=P.g.attributes.position.array;
      for(var k=0;k<P.n;k++){curl(P.rest[k*2],P.rest[k*2+1],p,tmp);a[k*3]=tmp[0];a[k*3+1]=tmp[1];a[k*3+2]=tmp[2]}
      P.g.attributes.position.needsUpdate=true;P.g.computeVertexNormals();
      curl(P.x,-LM-.42,p,tmp);P.tab.position.set(tmp[0],tmp[1],tmp[2]+.03);P.tab.rotation.set(tmp[3],0,[-.1,.09,-.03,.12,-.07][i]);
      P.ol.position.z=-1.8+back(sm(.45,1,o))*1.5})};
    pk.flavour=function(k){if(!lidTex[k])lidTex[k]=tex('img/tex-pack-'+k+'.jpg');lidMat.map=lidTex[k];lidMat.needsUpdate=true;
      tabMats.forEach(function(m,i){m.map=tex('img/tab'+(i+1)+SUF[k]+'.png');m.needsUpdate=true});dirty=true};
  }
  if(pk){rotY=-.3;pk.flavour('original')}
  function size(){var w=box.clientWidth,h=box.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);cam.aspect=w/h;
    var tf=2*Math.tan(cam.fov*Math.PI/360);
    if(pk){var d=Math.max(27/(tf*cam.aspect),15/tf);cam.position.set(0,d*.56,d*.83);cam.lookAt(0,.6,0);cam.updateProjectionMatrix();dirty=true;return}
    var need=(kind==='bag'?30:27.5)/tf;var d=Math.max(dist,need/Math.min(1,cam.aspect*1.25));
    cam.position.set(0,centerY+d*.2,d);cam.lookAt(0,centerY+(kind==='bag'?.6:4.0),0);cam.updateProjectionMatrix();dirty=true}
  function draw(){dirty=true}
  var el=renderer.domElement;el.style.touchAction='pan-y';
  var sx0=0,sy0=0,st0=0,ray=new T.Raycaster(),mv=new T.Vector2();
  el.addEventListener('pointerdown',function(e){dragging=true;auto=false;lx=sx0=e.clientX;ly=sy0=e.clientY;st0=Date.now();vel=0;try{el.setPointerCapture(e.pointerId)}catch(_){}if(hint)hint.classList.add('gone')});
  el.addEventListener('pointermove',function(e){if(!dragging)return;var dx=e.clientX-lx,dy=e.clientY-ly;lx=e.clientX;ly=e.clientY;
    rotY+=dx*.011;vel=dx*.011;rotX=Math.max(pk?-.4:-.12,Math.min(pk?.45:.55,rotX+dy*.006));dirty=true});
  function end(){dragging=false}
  el.addEventListener('pointerup',function(e){
    if(pk&&Math.hypot(e.clientX-sx0,e.clientY-sy0)<7&&Date.now()-st0<500){var r=el.getBoundingClientRect();
      mv.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height*2-1));ray.setFromCamera(mv,cam);
      var hit=ray.intersectObjects(pk.pick,false);if(hit.length){var i=hit[0].object.userData.pod;pk.targets[i]=pk.targets[i]?0:1;label();dirty=true}}
    end()});el.addEventListener('pointercancel',end);
  function anyOpen(){return pk?pk.targets.some(function(t){return t}):target}
  function label(){var a=anyOpen();btn.textContent=a?opts.close:opts.open;btn.setAttribute('aria-pressed',a?'true':'false')}
  btn.addEventListener('click',function(){if(pk){var v=anyOpen()?0:1;pk.targets=pk.targets.map(function(){return v})}else target=target?0:1;auto=false;label();dirty=true});label();
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion:reduce)').matches;if(reduce)auto=false;
  function frame(t){
    requestAnimationFrame(frame);var dt=Math.min(.05,(t-last)/1000||0);last=t;
    if(open!==target){var step=dt/(reduce?.01:1.1);open=target>open?Math.min(target,open+step):Math.max(target,open-step*1.4);dirty=true}
    if(pk)pk.opens.forEach(function(o,i){var t=pk.targets[i];if(o!==t){var st=dt/(reduce?.01:.75);pk.opens[i]=t>o?Math.min(t,o+st):Math.max(t,o-st*1.3);dirty=true}});
    if(auto){rotY+=dt*(pk?.22:.35);dirty=true}
    else if(!dragging&&Math.abs(vel)>.0004){rotY+=vel;vel*=.93;dirty=true}
    if(!dirty)return;dirty=false;update(open);root.rotation.y=rotY;root.rotation.x=rotX;renderer.render(scene,cam)}
  window.addEventListener('resize',size);size();update(0);requestAnimationFrame(frame);
  return {flavour:pk?pk.flavour:null,pod:function(i,v){if(pk){pk.targets[i]=pk.opens[i]=v;label();dirty=true}},set:function(o,ry,rx){if(pk){pk.targets=pk.targets.map(function(){return o});pk.opens=pk.targets.slice()}target=open=o;auto=false;if(ry!=null)rotY=ry;if(rx!=null)rotX=rx;label();dirty=true}};
};
})();
