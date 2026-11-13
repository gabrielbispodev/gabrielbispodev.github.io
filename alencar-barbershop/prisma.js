/* Fundo em prisma: faixas diagonais de "vidro" que refratam um gradiente suave em movimento.
   Parâmetros iguais aos do componente de referência (ângulo 143°, 8 faixas, glow 1.55, velocidade 0.45).
   Até a animação começar, a página mostra a versão estática em CSS (.fundo + .luz). */
(()=>{
  const cv=document.getElementById('prisma'); if(!cv)return;
  const P={angulo:143,densidade:8,vidro:1.4,brilho:1.2,glow:1.55,velocidade:.45,
    cor1:[143,166,189],qtd1:1.1,cor2:[216,195,165],qtd2:.9,branco:[244,247,250],qtdBranco:.7};
  const vs='attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  const fs=`precision highp float;
uniform vec2 r;uniform float t;
uniform vec3 c1,c2,cw;uniform float ang,dens,vidro,brilho,glow,qw;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*n(p);p=p*2.03+1.7;a*=.5;}return s;}
void main(){
 vec2 p=gl_FragCoord.xy/r.y;
 p.y-=t*.09;                                        // o campo sobe
 float A=radians(ang-90.);
 vec2 ac=vec2(cos(A),sin(A)), al=vec2(-ac.y,ac.x);  // através e ao longo das faixas
 float x=dot(p,ac), y=dot(p,al);
 vec2 q=vec2(x*1.7,y*.42);                          // manchas esticadas na diagonal
 q+=.45*vec2(fbm(q*1.1+vec2(0.,t*.06)),fbm(q*1.1+vec2(5.2,-t*.05)));
 float v=fbm(q*.95);
 float s=fbm(vec2(x*dens*2.2,y*.9)+vec2(t*.04,0.)); // estrias finas
 v=v*.85+(s-.5)*.38*vidro;
 float m=fbm(q*.7+vec2(11.,t*.03));
 v=smoothstep(.16,.84,v);                           // mais contraste: manchas pretas e realces claros
 vec3 col=mix(vec3(0.),c1,smoothstep(0.,.38,v));
 col=mix(col,c2,smoothstep(.32,.62,m)*smoothstep(.1,.5,v));
 col=mix(col,cw,smoothstep(.55,.9,v)*qw*brilho);
 col*=glow*.72;
 gl_FragColor=vec4(col,1.);
}`;
  const parado=matchMedia('(prefers-reduced-motion: reduce)').matches;

  // todo o WebGL (contexto e shader) só é criado aqui, quando a animação começa
  function iniciarGL(){
    const gl=cv.getContext('webgl',{antialias:false,premultipliedAlpha:false,powerPreference:'low-power'});
    if(!gl)return; // sem WebGL fica a versão estática em CSS
    const sh=(tp,src)=>{const s=gl.createShader(tp);gl.shaderSource(s,src);gl.compileShader(s);return s};
    const pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,vs));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,fs));gl.linkProgram(pr);
    if(!gl.getProgramParameter(pr,gl.LINK_STATUS))return;
    gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    const la=gl.getAttribLocation(pr,'a');gl.enableVertexAttribArray(la);gl.vertexAttribPointer(la,2,gl.FLOAT,false,0,0);
    const U=nome=>gl.getUniformLocation(pr,nome), rgb=(c,q)=>c.map(v=>v/255*q);
    gl.uniform3fv(U('c1'),rgb(P.cor1,P.qtd1));gl.uniform3fv(U('c2'),rgb(P.cor2,P.qtd2));gl.uniform3fv(U('cw'),rgb(P.branco,1));
    gl.uniform1f(U('ang'),P.angulo);gl.uniform1f(U('dens'),P.densidade);gl.uniform1f(U('vidro'),P.vidro);
    gl.uniform1f(U('brilho'),P.brilho);gl.uniform1f(U('glow'),P.glow);gl.uniform1f(U('qw'),P.qtdBranco);
    const ur=U('r'),ut=U('t');
    // meia resolução, como na referência: o desfoque de 9px por cima deixa liso
    function tamanho(){const s=.5;cv.width=Math.max(1,innerWidth*s|0);cv.height=Math.max(1,innerHeight*s|0);gl.viewport(0,0,cv.width,cv.height);gl.uniform2f(ur,cv.width,cv.height)}
    addEventListener('resize',tamanho);tamanho();
    const t0=performance.now(); let ultimo=0;
    // até 24 quadros por segundo; o movimento é lento, não precisa de mais
    function quadro(agora){if(agora-ultimo>=41){ultimo=agora;gl.uniform1f(ut,(agora-t0)/1000*P.velocidade);gl.drawArrays(gl.TRIANGLES,0,3)}
      if(!parado&&!document.hidden)requestAnimationFrame(quadro)}
    document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!parado)requestAnimationFrame(quadro)});
    requestAnimationFrame(t=>{quadro(t);cv.classList.add('on');document.querySelector('.fundo').classList.add('vivo')});
  }

  // começa no primeiro toque/rolagem/tecla; até lá a página mostra um quadro do próprio prisma (img/o/prisma.webp)
  let iniciado=false;
  const eventos=['scroll','pointerdown','keydown','touchstart'];
  const comecar=()=>{if(iniciado)return;iniciado=true;eventos.forEach(ev=>removeEventListener(ev,comecar));
    (window.requestIdleCallback||setTimeout)(iniciarGL)};
  if(parado)return; // movimento reduzido: fica o quadro estático
  eventos.forEach(ev=>addEventListener(ev,comecar,{passive:true,once:true}));
  if(location.hash==='#prisma-ja')comecar();
})();
