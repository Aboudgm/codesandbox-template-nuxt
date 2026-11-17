// GLSL for the "small light in an empty room" scene.
// Pipeline: physics -> light shadow cube -> opaque scene -> volumetric fog
//           -> gather DOF -> scatter bokeh sprites -> bloom -> grade.

const HEAD = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
precision highp samplerCube;
`

const NOISE = `
uint pcg(uint v){uint s=v*747796405u+2891336453u;uint w=((s>>((s>>28u)+4u))^s)*277803737u;return (w>>22u)^w;}
float rnd(int i,int k){return float(pcg(uint(i)*2654435761u^pcg(uint(k)+1013904223u)))*(1.0/4294967295.0);}
float hash21(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
`

const BODY = `
uniform int uTex;
uniform int uNBig;
uniform int uNMid;
int cls(int i){return i<uNBig?0:(i<uNBig+uNMid?1:2);}
float bodySize(int i){
  int c=cls(i);float r=rnd(i,1);r=r*r;
  if(c==0)return mix(0.06,0.17,r);
  if(c==1)return mix(0.012,0.036,r);
  return mix(0.0035,0.0095,r);
}
float bodyMass(int i){
  int c=cls(i);float r=rnd(i,2);
  if(c==0)return mix(2.5,6.0,r);
  if(c==1)return mix(0.6,1.6,r);
  return mix(0.08,0.35,r);
}
mat3 rotAxis(vec3 a,float t){
  float c=cos(t),s=sin(t),k=1.-c;
  return mat3(
    c+a.x*a.x*k, a.y*a.x*k+a.z*s, a.z*a.x*k-a.y*s,
    a.x*a.y*k-a.z*s, c+a.y*a.y*k, a.z*a.y*k+a.x*s,
    a.x*a.z*k+a.y*s, a.y*a.z*k-a.x*s, c+a.z*a.z*k);
}
`

const LIGHT = `
uniform vec3 uLight;
uniform float uLightI;
uniform vec3 uBeamDir;
uniform vec3 uCam;
uniform float uFloorY;
uniform samplerCube uShadow;
uniform float uShK;
vec3 lightCol(vec3 dirFromLight){
  float c=clamp(dot(dirFromLight,uBeamDir),0.,1.);
  float cone=c*c*c;
  return mix(vec3(1.0,.94,.84),vec3(1.0,.70,.38),cone*.85)*mix(.5,1.45,cone);
}
float atten(float d2){return uLightI/pow(.18+d2,1.35);}
const vec4 EDGE_LO=vec4(0.,.8,1.8,3.2);
const vec4 EDGE_W=vec4(.8,1.,1.4,3.6);
float occl(vec3 P,float k){
  vec3 d=P-uLight;float dl=length(d);vec3 dir=d/max(dl,1e-3);
  vec4 c=textureLod(uShadow,dir,0.);
  vec4 f=clamp((vec4(dl)-EDGE_LO)/EDGE_W,0.,1.);
  return exp(-dot(c,f)*k);
}
float occlSoft(vec3 P,float k,float rad){
  vec3 d=P-uLight;float dl=length(d);vec3 dir=d/max(dl,1e-3);
  vec3 t=normalize(cross(dir,abs(dir.y)<.9?vec3(0.,1.,0.):vec3(1.,0.,0.)));
  vec3 b=cross(dir,t);
  vec4 f=clamp((vec4(dl)-EDGE_LO)/EDGE_W,0.,1.);
  float s=dot(textureLod(uShadow,dir,0.),f)*.28;
  s+=dot(textureLod(uShadow,normalize(dir+t*rad),0.),f)*.18;
  s+=dot(textureLod(uShadow,normalize(dir-t*rad),0.),f)*.18;
  s+=dot(textureLod(uShadow,normalize(dir+b*rad),0.),f)*.18;
  s+=dot(textureLod(uShadow,normalize(dir-b*rad),0.),f)*.18;
  return exp(-s*k);
}
`

const COC = `
uniform float uFocus;
uniform float uCocScale;
uniform float uMaxCoc;
float cocOf(float z){return clamp(uCocScale*(z-uFocus)/max(z,.05),-uMaxCoc,uMaxCoc);}
`

export const FULLSCREEN_VS = `${HEAD}
out vec2 vUv;
void main(){
  vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));
  vUv=p;gl_Position=vec4(p*2.-1.,0.,1.);
}`

// ---------------------------------------------------------------- physics
export const UPDATE_FS = `${HEAD}${NOISE}${BODY}
layout(location=0) out vec4 oPos;
layout(location=1) out vec4 oVel;
uniform sampler2D uPosT;
uniform sampler2D uVelT;
uniform float uDt;
uniform float uTime;
uniform vec3 uLight;
uniform vec3 uLightVel;
uniform float uHold;
uniform float uBurst;
uniform float uFloorY;
uniform float uCycZ;
uniform float uCycR;

vec3 turb(vec3 p,float t){
  vec3 q=p*.85+vec3(0.,t*.12,t*.05);
  vec3 a=vec3(
    sin(q.y*1.7+t*.7)+sin(q.z*2.3-t*.5),
    sin(q.z*1.9+t*.6)+sin(q.x*2.1+t*.4),
    sin(q.x*1.5-t*.5)+sin(q.y*2.7+t*.3));
  vec3 b=vec3(
    sin(q.z*4.1-t*1.3),sin(q.x*3.7+t*1.1),sin(q.y*4.3-t*.9));
  return a*.5+b*.35;
}

void main(){
  ivec2 c=ivec2(gl_FragCoord.xy);
  int i=c.y*uTex+c.x;
  vec4 P=texelFetch(uPosT,c,0);
  vec4 V=texelFetch(uVelT,c,0);
  vec3 p=P.xyz;vec3 v=V.xyz;
  int k=cls(i);
  float m=bodyMass(i);
  float rad=bodySize(i)*(k==0?1.45:1.0);
  float dt=uDt;
  float R0=.55;

  vec3 d=p-uLight;float r=length(d)+1e-4;vec3 n=d/r;
  vec3 a=vec3(0.);

  // gravity (same for every body, per-body drag below gives it "weight")
  a.y-=1.9;

  // repulsive shield around the light
  float sh=pow(clamp(1.-r/(R0*3.4),0.,1.),2.)*22.;
  a+=n*sh*(1.-.92*uHold)/pow(m,.5);

  // hold = gravity well on the light
  a-=n*uHold*20.*smoothstep(.25,2.6,r)/pow(m,.4);

  // release burst
  a+=n*uBurst*150./(.4+r)/pow(m,.5);

  // slow orbit around the light's vertical axis
  vec3 tang=cross(vec3(0.,1.,0.),d);
  a+=tang/(r+.7)*.42*smoothstep(.5,1.4,r)/sqrt(m);

  // keep the cloud together
  vec3 cen=vec3(uLight.x*.55,max(uLight.y,uFloorY+1.1)*.7,uLight.z*.55);
  vec3 dc=p-cen;float lc=length(dc)+1e-4;
  a-=dc/lc*max(lc-3.0,0.)*.9;

  // turbulent air
  float tmass=pow(m,.7);
  a+=turb(p,uTime)*2.3/tmass;

  // wake of the moving light
  a+=uLightVel*1.15*exp(-r*1.25)/sqrt(m);

  // drag: light things hang in the air, heavy things fall
  float cD=.5+6.5/(1.+m*m*1.5);
  v+=a*dt;
  v*=exp(-cD*dt);
  float vmax=(k==0?3.0:(k==1?4.2:5.5))*(1.+1.6*uBurst+.6*uHold);
  float sp=length(v);
  if(sp>vmax)v*=vmax/sp;
  p+=v*dt;

  // ---- cyclorama collision: floor, quarter-pipe, back wall
  float rest=k==0?.38:(k==1?.22:.1);
  float fric=k==0?2.2:5.5;
  float yc=uFloorY+uCycR;
  if(p.z>=uCycZ){
    float fy=uFloorY+rad;
    if(p.y<fy){p.y=fy;if(v.y<0.)v.y*=-rest;v.xz*=1.-min(.9,dt*fric);}
  }else if(p.y<yc){
    vec2 q=vec2(p.y-yc,p.z-uCycZ);
    float dd=length(q);float lim=uCycR-rad;
    if(dd>lim){
      vec2 nn=q/dd;vec2 qq=nn*lim;
      p.y=yc+qq.x;p.z=uCycZ+qq.y;
      float vn=dot(v.yz,nn);
      if(vn>0.)v.yz-=(1.+rest)*vn*nn;
      v.xz*=1.-min(.9,dt*fric*.5);
    }
  }else{
    float lim=uCycZ-uCycR+rad;
    if(p.z<lim){p.z=lim;if(v.z<0.)v.z*=-rest;}
  }
  if(abs(p.x)>6.){p.x=sign(p.x)*6.;v.x*=-.3;}
  if(p.y>5.2){p.y=5.2;v.y=-abs(v.y)*.3;}
  if(p.z>4.2){p.z=4.2;v.z=-abs(v.z)*.3;}

  // respawn runaways / NaNs next to the light
  if(!(length(p-uLight)<16.)){
    vec3 rv=normalize(vec3(rnd(i,20),rnd(i,21),rnd(i,22))*2.-1.+1e-3);
    p=uLight+rv*1.6;v=vec3(0.);
  }

  float spin=(rnd(i,30)*2.-1.)*2.4;
  float w=P.w+dt*spin*(.35+length(v)*.9);
  float hot=smoothstep(R0*3.4,R0*1.1,r);
  float ex=max(V.w-dt*.9,hot);

  oPos=vec4(p,w);
  oVel=vec4(v,ex);
}`

// ------------------------------------------------------------ light shadow
export const SHADOWPT_VS = `${HEAD}${NOISE}${BODY}
uniform sampler2D uPosT;
uniform mat4 uFace;
uniform vec3 uLight;
uniform float uFocalPx;
uniform float uSoft;
out vec4 vBins;
void main(){
  int i=gl_VertexID;
  ivec2 c=ivec2(i%uTex,i/uTex);
  vec3 p=texelFetch(uPosT,c,0).xyz;
  float dl=length(p-uLight);
  vec4 cp=uFace*vec4(p,1.);
  float s=bodySize(i)*(cls(i)==0?1.45:1.);
  float phys=2.*s*uFocalPx/max(cp.w,.05);
  float ps=clamp(max(phys,uSoft),1.,48.);
  float cov=clamp(phys*phys/(ps*ps),0.,1.);
  vBins=vec4(float(dl<.8),float(dl>=.8&&dl<1.8),float(dl>=1.8&&dl<3.2),float(dl>=3.2))*cov;
  gl_Position=cp;
  gl_PointSize=ps;
}`

export const SHADOWPT_FS = `${HEAD}
in vec4 vBins;
out vec4 o;
void main(){
  float r=length(gl_PointCoord*2.-1.);
  float f=smoothstep(1.,.15,r);
  o=vBins*f*1.6;
}`

// ----------------------------------------------------------------- cyclorama
export const CYC_VS = `${HEAD}
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNrm;
uniform mat4 uVP;
out vec3 vW;
out vec3 vN;
void main(){vW=aPos;vN=aNrm;gl_Position=uVP*vec4(aPos,1.);}`

export const CYC_FS = `${HEAD}${NOISE}${LIGHT}${COC}
in vec3 vW;
in vec3 vN;
layout(location=0) out vec4 oCol;
layout(location=1) out vec4 oDist;
uniform float uAmb;
void main(){
  vec3 N=normalize(vN);
  vec3 L=uLight-vW;float d2=dot(L,L);vec3 l=L*inversesqrt(d2);
  float ndl=max(dot(N,l),0.);
  float att=atten(d2);
  vec3 lc=lightCol(-l);
  float sh=occlSoft(vW,uShK,.028);
  // faint plaster mottling so the matte surface is not perfectly synthetic
  float mott=.92+.08*sin(vW.x*3.1+sin(vW.y*2.3))*sin(vW.z*2.7+vW.x*1.7);
  vec3 alb=vec3(.34,.33,.31)*mott;
  vec3 V=normalize(uCam-vW);vec3 H=normalize(l+V);
  float spec=pow(max(dot(N,H),0.),22.)*.16;
  vec3 col=(alb*ndl+spec)*att*lc*sh;
  // bounce: the lit room softly fills itself
  col+=alb*uAmb*(.6+.4*N.y)*uLightI/(1.+.04*d2);
  float z=length(vW-uCam);
  oCol=vec4(col,cocOf(z));
  oDist=vec4(z,0.,0.,1.);
}`

// ---------------------------------------------------------- opaque big cubes
export const CUBE_VS = `${HEAD}${NOISE}${BODY}
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNrm;
uniform sampler2D uPosT;
uniform sampler2D uVelT;
uniform mat4 uVP;
out vec3 vW;
out vec3 vN;
out vec3 vAlb;
out float vGloss;
out float vHot;
void main(){
  int i=gl_InstanceID;
  ivec2 c=ivec2(i%uTex,i/uTex);
  vec4 P=texelFetch(uPosT,c,0);
  vec4 V=texelFetch(uVelT,c,0);
  float s=bodySize(i);
  vec3 ax=normalize(vec3(rnd(i,10),rnd(i,11),rnd(i,12))*2.-1.+1e-3);
  float ang=P.w+rnd(i,13)*6.2831;
  mat3 R=rotAxis(ax,ang);
  vec3 sc=vec3(1.,mix(.5,1.,rnd(i,14)),mix(.6,1.,rnd(i,15)))*s;
  vec3 w=P.xyz+R*(aPos*sc);
  vN=R*aNrm;vW=w;
  float t=rnd(i,16);
  vec3 alb=vec3(.13,.12,.105)*mix(.55,1.9,rnd(i,17));
  if(t<.025)alb=vec3(.02,.20,.17);
  else if(t<.045)alb=vec3(.30,.03,.025);
  else if(t<.06)alb=vec3(.26,.17,.05);
  vAlb=alb;vGloss=rnd(i,18);vHot=V.w;
  gl_Position=uVP*vec4(w,1.);
}`

export const CUBE_FS = `${HEAD}${NOISE}${LIGHT}${COC}
in vec3 vW;
in vec3 vN;
in vec3 vAlb;
in float vGloss;
in float vHot;
layout(location=0) out vec4 oCol;
layout(location=1) out vec4 oDist;
uniform float uAmb;
void main(){
  vec3 N=normalize(vN);
  vec3 L=uLight-vW;float d2=dot(L,L);vec3 l=L*inversesqrt(d2);
  float ndl=max(dot(N,l),0.);
  float att=atten(d2);
  vec3 lc=lightCol(-l);
  float sh=occl(vW,uShK*.3);
  vec3 V=normalize(uCam-vW);vec3 H=normalize(l+V);
  float spec=pow(max(dot(N,H),0.),mix(30.,160.,vGloss))*mix(.15,1.1,vGloss);
  float fres=pow(1.-max(dot(N,V),0.),4.)*.25;
  vec3 col=(vAlb*ndl+spec+fres*ndl)*att*lc*sh;
  col+=vAlb*uAmb*(.5+.5*N.y)*uLightI/(1.+.04*d2)*2.;
  col+=vec3(1.,.55,.2)*vHot*vHot*.06;
  float z=length(vW-uCam);
  oCol=vec4(col,cocOf(z));
  oDist=vec4(z,0.,0.,1.);
}`

// -------------------------------------------------------------- volumetric
export const FOG_FS = `${HEAD}${NOISE}${LIGHT}
uniform sampler2D uDist;
uniform vec3 uRight;
uniform vec3 uUp;
uniform vec3 uFwd;
uniform float uTanH;
uniform float uAspect;
uniform float uTime;
uniform float uHaze;
uniform vec2 uScaleInv;
in vec2 vUv;
out vec4 o;
float hg(float c,float g){float g2=g*g;return (1.-g2)/(12.566*pow(1.+g2-2.*g*c,1.5));}
void main(){
  vec2 ndc=vUv*2.-1.;
  vec3 D=normalize(uFwd+uRight*ndc.x*uTanH*uAspect+uUp*ndc.y*uTanH);
  float tmax=min(texelFetch(uDist,ivec2(gl_FragCoord.xy*uScaleInv),0).r,22.);
  const int N=30;
  float dt=tmax/float(N);
  float j=hash21(gl_FragCoord.xy+fract(uTime)*91.7);
  vec3 acc=vec3(0.);
  for(int s=0;s<N;s++){
    float t=(float(s)+j)*dt;
    vec3 P=uCam+D*t;
    vec3 dL=P-uLight;float dl=length(dL);
    vec3 dirL=dL/max(dl,1e-3);
    vec3 lc=lightCol(dirL);
    float cone=pow(clamp(dot(dirL,uBeamDir),0.,1.),7.);
    float dens=uHaze*(.35+exp(-max(P.y-uFloorY,0.)*.45))*(1.+2.2*cone);
    float ph=hg(dot(-dirL,D),.45)*12.566*.22+.35;
    float vis=occl(P,uShK*.5);
    acc+=lc*(uLightI*ph*dens*vis/pow(.12+dl*dl,1.35))*dt;
  }
  // analytic hot core (unoccluded, tiny) so the bulb itself blooms
  vec3 toL=uLight-uCam;
  float tc=dot(toL,D);
  float h=max(length(uCam+D*tc-uLight),.05);
  float core=uLightI*.0016*(atan((tmax-tc)/h)-atan(-tc/h))/(h*h+.02);
  acc+=vec3(1.,.9,.74)*max(core,0.);
  o=vec4(acc,1.);
}`

// ------------------------------------------------------------- gather DOF
export const DOF_FS = `${HEAD}${NOISE}
uniform sampler2D uScene;
uniform sampler2D uFog;
uniform vec2 uRes;
uniform float uMaxCoc;
in vec2 vUv;
out vec4 o;
void main(){
  vec4 c0=texelFetch(uScene,ivec2(gl_FragCoord.xy),0);
  float cc=c0.a;
  float w0=1./max(1.,cc*cc);
  vec3 acc=c0.rgb*w0;float ws=w0;
  const int NS=56;
  float rot=hash21(gl_FragCoord.xy)*6.2831;
  float R=uMaxCoc;
  for(int i=0;i<NS;i++){
    float fi=float(i);
    float rr=sqrt((fi+.5)/float(NS))*R;
    float th=fi*2.39996+rot;
    vec2 off=vec2(cos(th),sin(th))*rr;
    vec4 s=textureLod(uScene,(gl_FragCoord.xy+off)/uRes,0.);
    float eff=abs(s.a);
    if(s.a>cc)eff=min(eff,abs(cc)+1.5);
    float w=clamp(eff-rr+1.,0.,1.)/max(1.,eff*eff);
    acc+=s.rgb*w;ws+=w;
  }
  vec3 col=acc/max(ws,1e-6);
  col+=texture(uFog,vUv).rgb;
  o=vec4(col,1.);
}`

// ------------------------------------------- scatter bokeh sprites (mid+grit)
export const SPRITE_VS = `${HEAD}${NOISE}${BODY}${LIGHT}${COC}
uniform sampler2D uPosT;
uniform sampler2D uVelT;
uniform mat4 uVP;
uniform float uFocalPx;
uniform float uPxMax;
out vec3 vCol;
out vec2 vNdc;
out float vDiam;
void main(){
  int i=uNBig+gl_VertexID;
  ivec2 c=ivec2(i%uTex,i/uTex);
  vec4 P=texelFetch(uPosT,c,0);
  vec4 V=texelFetch(uVelT,c,0);
  vec3 w=P.xyz;
  vec4 cp=uVP*vec4(w,1.);
  float z=length(w-uCam);
  float coc=cocOf(z);
  float s=bodySize(i);
  float phys=max(2.*s*uFocalPx/max(cp.w,.05),1.4);
  float diam=clamp(max(2.*abs(coc),phys),1.5,uPxMax);
  float energy=clamp(phys*phys/(diam*diam),0.,1.);

  vec3 L=uLight-w;float d2=dot(L,L);vec3 l=L*inversesqrt(d2);
  float att=atten(d2);
  vec3 lc=lightCol(-l);
  float sh=occl(w,uShK*.5);
  vec3 Vv=normalize(uCam-w);

  float kind=float(cls(i));
  vec3 ax=normalize(vec3(rnd(i,10),rnd(i,11),rnd(i,12))*2.-1.+1e-3);
  float ang=P.w+rnd(i,13)*6.2831;
  vec3 n0=normalize(vec3(rnd(i,40),rnd(i,41),rnd(i,42))*2.-1.+1e-3);
  vec3 n=n0*cos(ang)+cross(ax,n0)*sin(ang)+ax*dot(ax,n0)*(1.-cos(ang));
  float ndl=max(dot(n,l),0.);
  vec3 alb=mix(vec3(.20,.19,.17),vec3(.82,.78,.70),rnd(i,17));
  float t=rnd(i,16);
  if(t<.025)alb=vec3(.1,.8,.7);else if(t<.045)alb=vec3(.9,.12,.09);
  vec3 H=normalize(l+Vv);
  float glint=pow(max(dot(n,H),0.),90.)*(kind<1.5?14.:5.);
  float body=kind<1.5?(.12+.9*ndl):(.45+.55*ndl);
  vec3 col=(alb*body+glint)*att*lc*sh;
  col+=vec3(1.,.55,.2)*V.w*V.w*.9*(kind>1.5?1.:.3);
  col+=alb*.012*uLightI/(1.+.04*d2);
  vCol=col*energy;
  vNdc=cp.xy/max(cp.w,.001);
  vDiam=diam;
  gl_Position=cp;
  gl_PointSize=diam;
}`

export const SPRITE_FS = `${HEAD}
in vec3 vCol;
in vec2 vNdc;
in float vDiam;
out vec4 o;
void main(){
  vec2 q=gl_PointCoord*2.-1.;
  float r=length(q);
  if(r>1.)discard;
  // cat-eye: optical vignetting clips discs toward the frame edge
  vec2 off=vNdc*.42*smoothstep(6.,24.,vDiam);
  if(length(q+off)>1.)discard;
  float soft=clamp(2.2/vDiam,.04,.6);
  float edge=smoothstep(1.,1.-soft,r);
  // onion-ring rim like a real uncorrected lens
  float big=smoothstep(6.,22.,vDiam);
  float rim=1.+big*(.9*smoothstep(.55,.97,r)-.25);
  o=vec4(vCol*edge*rim*(1.+.3*big),0.);
}`

// the bulb itself: one emissive disc, blurs like any other out-of-focus point
export const BULB_VS = `${HEAD}${LIGHT}${COC}
uniform mat4 uVP;
uniform float uFocalPx;
uniform float uPxMax;
out vec3 vCol;
out vec2 vNdc;
out float vDiam;
void main(){
  vec4 cp=uVP*vec4(uLight,1.);
  float z=length(uLight-uCam);
  float coc=cocOf(z);
  float phys=max(2.*.045*uFocalPx/max(cp.w,.05),3.);
  float diam=clamp(max(2.*abs(coc),phys),2.,uPxMax);
  float energy=clamp(phys*phys/(diam*diam),0.,1.);
  vCol=vec3(1.,.92,.76)*uLightI*16.*energy;
  vNdc=cp.xy/max(cp.w,.001);
  vDiam=diam;
  gl_Position=cp;
  gl_PointSize=diam;
}`

// ------------------------------------------------------------------- bloom
export const BLOOM_DOWN_FS = `${HEAD}
uniform sampler2D uSrc;
uniform float uThr;
uniform float uKnee;
uniform float uFirst;
in vec2 vUv;
out vec4 o;
vec3 tap(vec2 uv){
  vec3 c=textureLod(uSrc,uv,0.).rgb;
  if(uFirst>.5){
    c=min(c,vec3(24.));
    float br=max(c.r,max(c.g,c.b));
    float soft=clamp(br-uThr+uKnee,0.,2.*uKnee);
    soft=soft*soft/(4.*uKnee+1e-4);
    c*=max(soft,br-uThr)/max(br,1e-4);
  }
  return c;
}
void main(){
  vec2 t=1./vec2(textureSize(uSrc,0));
  vec3 a=tap(vUv+t*vec2(-2.,2.)),b=tap(vUv+t*vec2(0.,2.)),c=tap(vUv+t*vec2(2.,2.));
  vec3 d=tap(vUv+t*vec2(-2.,0.)),e=tap(vUv),f=tap(vUv+t*vec2(2.,0.));
  vec3 g=tap(vUv+t*vec2(-2.,-2.)),h=tap(vUv+t*vec2(0.,-2.)),i=tap(vUv+t*vec2(2.,-2.));
  vec3 j=tap(vUv+t*vec2(-1.,1.)),k=tap(vUv+t*vec2(1.,1.));
  vec3 l=tap(vUv+t*vec2(-1.,-1.)),m=tap(vUv+t*vec2(1.,-1.));
  vec3 col=e*.125+(a+c+g+i)*.03125+(b+d+f+h)*.0625+(j+k+l+m)*.125;
  o=vec4(col,1.);
}`

export const BLOOM_UP_FS = `${HEAD}
uniform sampler2D uSrc;
uniform float uW;
in vec2 vUv;
out vec4 o;
void main(){
  vec2 t=1./vec2(textureSize(uSrc,0));
  vec3 c=textureLod(uSrc,vUv,0.).rgb*4.;
  c+=(textureLod(uSrc,vUv+t*vec2(-1.,0.),0.).rgb+textureLod(uSrc,vUv+t*vec2(1.,0.),0.).rgb
     +textureLod(uSrc,vUv+t*vec2(0.,-1.),0.).rgb+textureLod(uSrc,vUv+t*vec2(0.,1.),0.).rgb)*2.;
  c+=textureLod(uSrc,vUv+t*vec2(-1.,-1.),0.).rgb+textureLod(uSrc,vUv+t*vec2(1.,-1.),0.).rgb
    +textureLod(uSrc,vUv+t*vec2(-1.,1.),0.).rgb+textureLod(uSrc,vUv+t*vec2(1.,1.),0.).rgb;
  o=vec4(c/16.*uW,1.);
}`

// --------------------------------------------------------------- composite
export const COMPOSITE_FS = `${HEAD}${NOISE}
uniform sampler2D uBase;
uniform sampler2D uBloom;
uniform sampler2D uBloomWide;
uniform vec2 uRes;
uniform float uTime;
uniform float uExposure;
uniform float uBloomK;
in vec2 vUv;
out vec4 o;
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){
  vec2 c=vUv-.5;
  float r2=dot(c,c);
  vec2 uv=.5+c*(1.+.05*r2);          // subtle barrel
  vec2 ca=c*r2*.016;                  // lateral chromatic aberration
  vec3 col;
  col.r=texture(uBase,uv+ca).r;
  col.g=texture(uBase,uv).g;
  col.b=texture(uBase,uv-ca).b;

  vec3 bl=texture(uBloom,uv).rgb*vec3(1.,.9,.78);   // warm halation
  // anamorphic streak from the wide bloom level
  vec3 st=vec3(0.);float sw=0.;
  for(int k=-7;k<=7;k++){
    float w=exp(-float(k*k)/16.);
    st+=texture(uBloomWide,uv+vec2(float(k)*.014,0.)).rgb*w;sw+=w;
  }
  st/=sw;
  // two soft lens ghosts
  vec3 gh=texture(uBloomWide,.5-(uv-.5)*.55).rgb*vec3(.35,.65,1.)*.02
         +texture(uBloomWide,.5-(uv-.5)*1.35).rgb*vec3(1.,.55,.25)*.012;
  col+=bl*uBloomK+st*vec3(.55,.75,1.)*.09+gh;

  col*=uExposure;
  col=aces(col);
  float lum=dot(col,vec3(.2126,.7152,.0722));
  // grade: cool shadows, warm highlights
  col=mix(col*vec3(.90,.96,1.10),col*vec3(1.04,1.0,.94),smoothstep(.05,.6,lum));
  col=pow(col,vec3(1./2.2));
  // vignette
  col*=1.-smoothstep(.25,.95,r2*2.4)*.65;
  // film grain, heavier in the shadows
  vec2 gp=floor(gl_FragCoord.xy/1.4);
  float n=hash21(gp+fract(uTime*7.31)*vec2(113.,71.))+hash21(gp.yx+fract(uTime*3.7)*vec2(57.,131.));
  col+=(n-1.)*.036*(.55+(1.-lum)*.9);
  col+=(hash21(gl_FragCoord.xy+uTime)-.5)/255.;
  o=vec4(col,1.);
}`
