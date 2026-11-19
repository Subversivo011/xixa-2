// =====================================================================
//  NÃO SALVO — tela do vídeo/foto no visual da época
//  Vídeos: página no estilo do YouTube do ano do meme (canal Não Salvo).
//  Fotos: página no estilo da rede social de fotos da época.
//  Votos (curtidas/estrelas) e visualizações vêm das funções do Netlify
//  (/api/votos e /api/yt-stats). Sem elas, funciona só no navegador.
// =====================================================================
const API={votos:"/api/votos",stats:"/api/yt-stats"};
const CANAL="Não Salvo",AV="avatar-ns.png";
const MESES=["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
async function apiGet(u){try{const r=await fetch(u,{headers:{accept:"application/json"}});if(!r.ok)return null;const t=r.headers.get("content-type")||"";return t.includes("json")?await r.json():null}catch(e){return null}}
async function apiPost(u,b){try{const r=await fetch(u,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(b)});if(!r.ok)return null;return await r.json()}catch(e){return null}}
const STATS={};
async function ytStats(ids){ids=ids.filter(i=>i&&!(i in STATS));if(ids.length){const d=await apiGet(API.stats+"?ids="+ids.join(","));ids.forEach(i=>STATS[i]=d&&d[i]?d[i]:null)}return STATS}

// ---- votos: curtir/não curtir e estrelas ----
function myVote(id){NS.votes=NS.votes||{};return NS.votes[id]||(NS.votes[id]={v:0,s:0})}
async function loadVotes(id){const d=await apiGet(API.votos+"?ids="+encodeURIComponent(id));return d&&d[id]?d[id]:null}
function localTotals(id){const v=myVote(id);return{up:v.v===1?1:0,down:v.v===-1?1:0,sum:v.s||0,n:v.s?1:0,local:true}}
async function sendVote(id,patch){const r=await apiPost(API.votos,{id,...patch});return r}

// ---- formatos de data e números por época ----
const ago=y=>{const n=Math.max(1,new Date().getFullYear()-(parseInt(y)||2020));return`há ${n} ano${n>1?"s":""}`};
const dExt=d=>{const x=new Date((d||"2010-01-01")+"T12:00:00");return`${x.getDate()} de ${MESES[x.getMonth()]} de ${x.getFullYear()}`};
const dNum=d=>{const x=new Date((d||"2010-01-01")+"T12:00:00");return x.toLocaleDateString("pt-BR")};
const short=n=>n>=1e6?(n/1e6).toFixed(n>=1e7?0:1).replace(".",",")+" mi":n>=1e3?(n/1e3).toFixed(n>=1e4?0:1).replace(".",",")+" mil":String(n);

// ---- sons da época (gerados na hora, sem arquivos) ----
const SND={on:true,ctx:null};
try{const s=localStorage.getItem("ns_snd");if(s)SND.on=s==="1"}catch(e){}
function actx(){if(!SND.ctx){try{SND.ctx=new(window.AudioContext||window.webkitAudioContext)()}catch(e){}}if(SND.ctx&&SND.ctx.state==="suspended")SND.ctx.resume();return SND.ctx}
function tone(c,fs,t,d,v,type){fs.forEach(f=>{const o=c.createOscillator(),g=c.createGain();o.type=type||"sine";o.frequency.setValueAtTime(f,t);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.01);g.gain.setValueAtTime(v,t+d-.02);g.gain.linearRampToValueAtTime(0,t+d);o.connect(g).connect(c.destination);o.start(t);o.stop(t+d+.02)})}
function sweep(c,f1,f2,t,d,v,type){const o=c.createOscillator(),g=c.createGain();o.type=type||"square";o.frequency.setValueAtTime(f1,t);o.frequency.linearRampToValueAtTime(f2,t+d);g.gain.setValueAtTime(v,t);g.gain.setValueAtTime(0,t+d);o.connect(g).connect(c.destination);o.start(t);o.stop(t+d+.02)}
function hiss(c,t,d,v,f){const n=Math.floor(c.sampleRate*d),b=c.createBuffer(1,n,c.sampleRate),x=b.getChannelData(0);for(let i=0;i<n;i++)x[i]=Math.random()*2-1;const s=c.createBufferSource(),bp=c.createBiquadFilter(),g=c.createGain();s.buffer=b;bp.type="bandpass";bp.frequency.value=f||1800;bp.Q.value=.7;g.gain.setValueAtTime(v,t);g.gain.linearRampToValueAtTime(0,t+d);s.connect(bp).connect(g).connect(c.destination);s.start(t)}
const DTMF={0:[941,1336],1:[697,1209],2:[697,1336],3:[697,1477],4:[770,1209],5:[770,1336],6:[770,1477],7:[852,1209],8:[852,1336],9:[852,1477]};
function sndModem(){if(!SND.on)return;const c=actx();if(!c)return;let t=c.currentTime+.05;
  tone(c,[350,440],t,.9,.05);t+=1;
  for(const d of "08004441956"){tone(c,DTMF[d],t,.08,.06);t+=.12}
  t+=.3;tone(c,[440,480],t,.9,.04);t+=1.3;
  tone(c,[2100],t,1.1,.05);t+=1.15;
  for(let i=0;i<14;i++){sweep(c,980+Math.random()*400,1180+Math.random()*1200,t,.09,.025);t+=.1}
  hiss(c,t-.6,2.2,.09,2000);for(let i=0;i<10;i++){tone(c,[1200+(i%2)*1200],t,.07,.02,"square");t+=.08}
  hiss(c,t,1.4,.07,1600)}
function sndChime(){if(!SND.on)return;const c=actx();if(!c)return;const t=c.currentTime+.02;[[740,0],[988,.11],[1319,.22]].forEach(([f,o])=>tone(c,[f],t+o,.32,.05,"triangle"))}
function sndPop(){if(!SND.on)return;const c=actx();if(!c)return;const t=c.currentTime+.02;sweep(c,520,1040,t,.09,.05,"sine");tone(c,[1040],t+.09,.08,.03)}
function sndClick(){if(!SND.on)return;const c=actx();if(!c)return;hiss(c,c.currentTime+.01,.04,.08,3000)}

// ---- configuração de cada época ----
function vEra(y){y=parseInt(y)||2020;return y<=2004?0:y<=2007?1:y<=2009?2:y<=2012?3:y<=2016?4:5}
function pEra(y){y=parseInt(y)||2020;return y<=2006?"fotolog":y<=2011?"orkut":y<=2014?"tumblr":y<=2015?"ig15":"ig"}
const discada=y=>(parseInt(y)||2020)<=2006, lanhouse=y=>{y=parseInt(y)||0;return y>=2004&&y<=2009};
const TOAST=y=>{y=parseInt(y)||0;return y>=2007&&y<=2009?{t:"msn",h:"Fernandinha acabou de entrar.",s:sndChime}:y>=2010&&y<=2012?{t:"scrap",h:"Você tem 1 scrap novo: “kkkkk viu esse vídeo???”",s:sndPop}:y>=2013&&y<=2016?{t:"zap",h:"Família ❤ · 47 mensagens novas",s:sndPop}:null};

// ---- partes comuns ----
const relList=(rel,n)=>rel.slice(0,n||8);
const thumb=(r,c)=>(r.img||r.yt)?`<span class="${c||"th"}" style="background-image:url(${r.img||"https://i.ytimg.com/vi/"+r.yt+"/mqdefault.jpg"}),${vpGrad(r.t)}"></span>`:`<span class="${c||"th"}" style="background:${vpGrad(r.t)}">${r.art||""}</span>`;
function relHTML(e,rel){
  const L=relList(rel,e===5?10:8);
  if(e===1)return`<div class="rel1"><h5>Vídeos relacionados</h5>${L.map(r=>`<a class="ri" data-id="${r.id}">${thumb(r)}<span><b>${escapeHtml(r.t)}</b><small>De: <u>${CANAL}</u></small><small>Exibições: ${fmt(r.views)}</small></span></a>`).join("")}</div>`;
  if(e===2)return`<div class="rel2"><h5>Vídeos relacionados</h5>${L.map(r=>`<a class="ri" data-id="${r.id}">${thumb(r)}<span><b>${escapeHtml(r.t)}</b><small>${fmt(r.views)} exibições</small><small>${CANAL}</small></span></a>`).join("")}</div>`;
  if(e===3)return`<div class="rel3"><h5>Vídeos sugeridos</h5>${L.map(r=>`<a class="ri" data-id="${r.id}">${thumb(r)}<span><b>${escapeHtml(r.t)}</b><small>de ${CANAL}</small><small>${fmt(r.views)} exibições</small></span></a>`).join("")}</div>`;
  if(e===4)return`<div class="rel4"><h5>A seguir <em>REPRODUÇÃO AUTOMÁTICA <i></i></em></h5>${L.map(r=>`<a class="ri" data-id="${r.id}">${thumb(r)}<span><b>${escapeHtml(r.t)}</b><small>${CANAL}</small><small>${fmt(r.views)} visualizações</small></span></a>`).join("")}</div>`;
  return`<div class="rel5"><div class="chipsr"><b>Tudo</b><span>Do ${CANAL}</span><span>Relacionados</span></div>${L.map(r=>`<a class="ri" data-id="${r.id}">${thumb(r)}<span><b>${escapeHtml(r.t)}</b><small>${CANAL} ${icon("check","vf")}</small><small>${short(r.views)} visualizações · ${ago(r.y)}</small></span></a>`).join("")}</div>`;
}
const headBar=e=>{
  const logo=`<img class="yl" src="logo-word.png" alt="Não Salvo">`,snd=`<button class="snd" data-act="snd" title="Sons da época">${icon(SND.on?"volume":"mute")}<span>Sons da época</span></button>`,x=`<button class="vx" data-act="close" title="Fechar (Esc)">${icon("xmark")}</button>`;
  if(e===1)return`<header class="yh1"><div class="t1">${logo}<div class="lk"><a>Cadastre-se</a> | <a>Login</a> | <a>Ajuda</a>${snd}${x}</div></div><nav><a class="on">Vídeos</a><a>Categorias</a><a>Canais</a><a>Comunidade</a></nav><div class="sr"><input placeholder=""><button>Pesquisar</button><a>Enviar vídeos</a></div></header>`;
  if(e===2)return`<header class="yh2">${logo}<div class="sr"><input><button>Pesquisar</button></div><a class="up">Enviar</a><div class="lk">${snd}${x}</div></header>`;
  if(e===3)return`<header class="yh3">${logo}<div class="sr"><input><button>${icon("search")}</button></div><a class="up">Enviar</a><div class="lk">${snd}${x}</div></header>`;
  if(e===4)return`<header class="yh4"><i class="mn">${icon("menu")}</i>${logo}<div class="sr"><input placeholder="Pesquisar"><button>${icon("search")}</button></div><div class="lk"><i>${icon("upload")}</i>${snd}${x}</div></header>`;
  return`<header class="yh5"><i class="mn">${icon("menu")}</i>${logo}<div class="sr"><input placeholder="Pesquisar"><button>${icon("search")}</button><i class="mc">${icon("mic")}</i></div><div class="lk"><i>${icon("upload")}</i><i>${icon("bell")}</i>${snd}${x}</div></header>`;
};
const btns=y=>`<div class="vbs"><button class="vb" data-act="year">Ver o ano ${y}</button><button class="vb sec" data-act="close">Fechar</button></div>`;
const linkBox=m=>m.yt||m.url?"":`<div class="lbx"><b>Este viral ainda está sem o vídeo original.</b> Tem o link? Salve aqui e ganhe +${REWARD.oldLink} moedas.<div class="in"><input class="ol" placeholder="https://youtube.com/watch?v=…"><button data-act="savelink">Salvar</button></div><div class="olm"></div></div>`;
const descTxt=m=>escapeHtml(m.d||"");

// ---- notas: estrelas (2004–2009) ou curtidas (2010+) ----
function ratingHTML(e,tot,mine){
  if(e<=2){const avg=tot.n?tot.sum/tot.n:0,shown=mine.s||Math.round(avg);
    return`<div class="stars s${e}" data-stars>${[1,2,3,4,5].map(i=>`<button data-star="${i}" class="${i<=shown?"on":""}" title="${["Ruim","Mais ou menos","Bom","Muito bom","Excelente!"][i-1]}">${icon("star")}</button>`).join("")}<small>${tot.n?`${fmt(tot.n)} avaliaç${tot.n>1?"ões":"ão"}${tot.local?"":` · média ${avg.toFixed(1).replace(".",",")}`}`:"Seja o primeiro a avaliar"}${mine.s?" · sua nota: "+mine.s:""}</small></div>`}
  const pct=tot.up+tot.down?tot.up/(tot.up+tot.down)*100:0;
  if(e===3)return`<div class="lk3"><button data-like="1" class="${mine.v===1?"on":""}">${icon("thumbUp")}Gostei</button><button data-like="-1" class="${mine.v===-1?"on":""}">${icon("thumbDown")}</button><span class="bar"><i style="width:${pct}%"></i></span><small>${fmt(tot.up)} curtida${tot.up===1?"":"s"}, ${fmt(tot.down)} não curti${tot.down===1?"u":"ram"}</small></div>`;
  if(e===4)return`<div class="lk4"><button data-like="1" class="${mine.v===1?"on":""}">${icon("thumbUp")}<span>${fmt(tot.up)}</span></button><button data-like="-1" class="${mine.v===-1?"on":""}">${icon("thumbDown")}<span>${fmt(tot.down)}</span></button><span class="bar"><i style="width:${pct}%"></i></span></div>`;
  return`<div class="lk5"><button data-like="1" class="${mine.v===1?"on":""}">${icon("thumbUp")}<span>${short(tot.up)}</span></button><i></i><button data-like="-1" class="${mine.v===-1?"on":""}">${icon("thumbDown")}</button></div>`;
}

// ---- página do vídeo por época ----
function videoPage(m,rel){
  const e=vEra(m.y),T=escapeHtml(m.t),pl=playerHTML(m,true);
  const vw=`<span class="vwc" data-views></span>`;
  if(e===0)return`<div class="xp">
    <div class="xpw wmp"><div class="xtb"><span>${icon("video","xi")}${escapeHtml(m.id)}.wmv - Reprodutor de Mídia</span><span class="xc"><i>_</i><i>□</i><b data-act="close">✕</b></span></div>
      <div class="xmn"><span>Arquivo</span><span>Exibir</span><span>Reproduzir</span><span>Ferramentas</span><span>Ajuda</span></div>
      <div class="xbody">${pl}</div>
      <div class="xinfo"><h2>${T}</h2><p>${descTxt(m)}</p><div class="xmeta">Recebido por e-mail em ${dNum(m.date)} · ${escapeHtml(m.c)} · ${vw}</div>
        <div class="xrt"><b>Gostou? Dê sua nota antes de encaminhar para 10 amigos:</b><div data-rt></div></div>${linkBox(m)}${btns(m.y)}</div></div>
    <div class="xtask"><span class="xstart">iniciar</span><span class="xt on">${icon("video","xi")}Reprodutor de Mídia</span><span class="xtray">${icon("culture","xi")}Conectado a 52,0 Kbps <b data-clock></b></span></div></div>`;
  const chan=(k)=>{
    if(k===1)return`<div class="cb1"><img src="${AV}" alt=""><div><small>De:</small> <a>${CANAL}</a><br><small>Adicionado: ${dExt(m.date)}</small><br><span class="vs1">${icon("check","in")}Inscrito</span></div><p>${descTxt(m)}</p><dl><dt>Categoria:</dt><dd><a>${escapeHtml(m.c)}</a></dd><dt>Tags:</dt><dd><a>meme</a> <a>${m.y}</a> <a>viral</a> <a>naosalvo</a></dd></dl></div>`;
    if(k===2)return`<div class="cb2"><div class="r"><img src="${AV}" alt=""><div><a>${CANAL}</a><small>${dNum(m.date)}</small></div><span class="vs2">${icon("check","in")}Inscrito</span></div><p>${descTxt(m)}</p></div>`;
  };
  if(e===1)return`<div class="ytp e1">${headBar(1)}<div class="yc"><main><h1>${T}</h1>${pl}
    <div class="ub1"><div data-rt></div><div class="vw1">Exibições: <b>${vw}</b></div></div>
    <div class="tabs1"><a>Compartilhar</a><a>Favoritos</a><a>Adicionar a listas</a><a>Sinalizar</a></div>${chan(1)}${linkBox(m)}${btns(m.y)}</main></div></div>`;
  if(e===2)return`<div class="ytp e2">${headBar(2)}<div class="yc"><main><h1>${T}</h1>${pl}
    <div class="ub2"><div data-rt></div><div class="vw2">${vw}</div></div>
    <div class="tabs2"><a>${icon("heart","in")}Favorito</a><a>${icon("share","in")}Compartilhar</a><a>Listas de reprodução</a><a>Sinalizar</a></div>${chan(2)}${linkBox(m)}${btns(m.y)}</main></div></div>`;
  if(e===3)return`<div class="ytp e3">${headBar(3)}<div class="yc"><main><h1>${T}</h1>${pl}
    <div class="ub3"><div class="cr"><img src="${AV}" alt=""><a>${CANAL}</a><span class="vs3">${icon("check","in")}Inscrito</span></div><div class="vw3">${vw}</div></div>
    <div class="ac3"><div data-rt></div><span class="a">Adicionar a</span><span class="a">Compartilhar</span></div>
    <div class="ds3"><b>Enviado em ${dExt(m.date)}</b><p>${descTxt(m)}</p><small>Categoria: <a>${escapeHtml(m.c)}</a></small></div>${linkBox(m)}${btns(m.y)}</main></div></div>`;
  if(e===4)return`<div class="ytp e4">${headBar(4)}<div class="yc"><main>${pl}<h1>${T}</h1>
    <div class="ub4"><div class="cr"><img src="${AV}" alt=""><div><a>${CANAL}</a></div><span class="vs4">${icon("check","in")}Inscrito</span></div><div class="vw4">${vw}</div></div>
    <div class="ac4"><span>${icon("share","in")}Compartilhar</span><span>${icon("more","in")}Mais</span><div data-rt></div></div>
    <div class="ds4"><b>Publicado em ${dExt(m.date)}</b><p>${descTxt(m)}</p><small>Categoria <a>${escapeHtml(m.c)}</a></small></div>${linkBox(m)}${btns(m.y)}</main></div></div>`;
  return`<div class="ytp e5">${headBar(5)}<div class="yc"><main>${pl}<h1>${T}</h1>
    <div class="ub5"><div class="cr"><img src="${AV}" alt=""><div><a>${CANAL} ${icon("check","vf")}</a></div><span class="vs5">${icon("bell","in")}Inscrito</span></div><div class="ac5"><div data-rt></div><span class="p">${icon("share","in")}Compartilhar</span><span class="p">${icon("more","in")}</span></div></div>
    <div class="ds5"><b>${vw} ${ago(m.y)}</b> <span class="tg">#${escapeHtml(m.c.toLowerCase())} #meme #${m.y}</span><p>${descTxt(m)}</p></div>${linkBox(m)}${btns(m.y)}</main></div></div>`;
}

// ---- página da foto por rede social ----
function photoPage(m,rel){
  const k=pEra(m.y),T=escapeHtml(m.t);
  const img=m.img?`<img class="pimg" src="${escapeHtml(m.img)}" alt="${T}" referrerpolicy="no-referrer">`:`<div class="pimg ph" style="background:${vpGrad(m.t)}">${m.art||""}<small>foto do acervo</small></div>`;
  const x=`<button class="vx" data-act="close" title="Fechar (Esc)">${icon("xmark")}</button>`;
  if(k==="fotolog")return`<div class="pg fotolog"><header><b class="fl">fotolog</b><span>${CANAL.toLowerCase().replace(" ","")}</span>${x}</header>
    <div class="flw"><main><div class="fr">${img}</div><h2>${T}</h2><p class="fx">${descTxt(m)}<br><i>~*~ postado em ${dNum(m.date)} ~*~ flash no espelho não ~*~</i></p>
      <div class="gb"><h4>livro de visitas</h4><div data-like-photo></div><div class="gbl">${relList(rel,4).map((r,i)=>`<div><b>${["xXJuuhXx","Lipe_Skt","Gabi*Fofa","DaniEmo"][i]}</b> disse: ${["aaaaaain q lindo!!! passa no meu flog? ;*","kkkkkkk mto bom, assina o meu tb","amei!!! add no msn?","tudo d bom! bjooo"][i]}</div>`).join("")}</div></div>${btns(m.y)}</main></div></div>`;
  if(k==="orkut")return`<div class="pg orkut"><header><b class="ok">orkut</b><nav><a>Início</a><a>Perfil</a><a>Recados</a><a>Amigos</a><a>Comunidades</a></nav>${x}</header>
    <div class="okw"><aside class="okp"><img src="${AV}" alt=""><b>${CANAL}</b><small>masculino, enrolado, Brasil</small><a>recados</a><a>fotos</a><a>vídeos</a><a>depoimentos</a></aside>
    <main><div class="okb">Início › ${CANAL} › Álbuns › Memes ${m.y}</div><h2>${T}</h2><div class="okn"><a>« anterior</a><span>foto 1 de ${relList(rel,12).length+1}</span><a>próxima »</a></div><div class="okf">${img}</div><p>${descTxt(m)}</p><div data-like-photo></div>
      <div class="okc"><h4>comentários</h4>${relList(rel,3).map((r,i)=>`<div><b>${["Carlinha ♥","Rafa","Tio Zé"][i]}:</b> ${["hahahaha mto bom! deixa um scrap pra mim :*","esse é clássico kkkkkkkkk","não entendi mas achei engraçado"][i]}</div>`).join("")}</div>${btns(m.y)}</main></div></div>`;
  if(k==="tumblr")return`<div class="pg tumblr"><header><b class="tl">t</b><div class="sr"><input placeholder="Pesquisar no Tumblr"></div>${x}</header>
    <div class="tw"><main><div class="tpost"><img class="tav" src="${AV}" alt=""><div class="tc"><div class="tth"><b>naosalvo</b><span>Seguindo</span></div>${img}<div class="tcap"><b>${T}</b><p>${descTxt(m)}</p><small>#meme #${m.y} #brasil #naosalvo</small></div>
      <div class="tf"><span data-notes></span><div class="ti"><i>${icon("share","in")}</i><i>${icon("comment","in")}</i><i>${icon("reblog","in")}</i><div data-like-photo></div></div></div></div></div>${btns(m.y)}</main></div></div>`;
  const old=k==="ig15";
  return`<div class="pg ig ${old?"ig15":"ig16"}"><header><b class="igl">${old?"Instagram":"Instagram"}</b><div class="sr"><input placeholder="Pesquisar"></div><div class="lk">${icon("heart","in")}${icon("user","in")}${x}</div></header>
    <div class="igw"><article><div class="igh"><img src="${AV}" alt=""><b>naosalvo</b>${old?`<span class="igt">${ago(m.y).replace("há ","")}</span>`:`<i>${icon("more","in")}</i>`}</div>${img}
      <div class="igb"><div data-like-photo></div><i>${icon("comment","in")}</i>${old?"":`<i>${icon("share","in")}</i><i class="bm">${icon("bookmark","in")}</i>`}</div>
      <div class="igc"><b data-likes></b><p><b>naosalvo</b> ${T} — ${descTxt(m)}</p><small>${old?"":ago(m.y).toUpperCase()}</small><div class="igin">Adicione um comentário…</div></div>${btns(m.y)}</article></div></div>`;
}

// ---- abrir / fechar ----
let VW=null;
function closeViewer(){if(!VW)return;VW.player&&VW.player.stop();clearInterval(VW.clock);clearTimeout(VW.toastT);VW.el.remove();document.body.classList.remove("vw-open");document.removeEventListener("keydown",VW.key);const cb=VW.onClose;VW=null;cb&&cb()}
function openViewer(m,opt={}){
  closeViewer();
  const isPhoto=m.tipo==="foto",rel=(opt.related||[]).filter(r=>r.id!==m.id);
  const cls=isPhoto?"vw-photo":`vw-e${vEra(m.y)}`;
  const el=document.createElement("div");el.className="vw "+cls;el.setAttribute("role","dialog");el.setAttribute("aria-label",m.t);
  el.innerHTML=`<div class="vw-win ${cls}">${isPhoto?photoPage(m,rel):videoPage(m,rel)}</div>`;
  document.body.appendChild(el);document.body.classList.add("vw-open");el.firstElementChild.scrollTop=0;
  VW={el,m,onClose:opt.onClose};
  VW.key=ev=>{if(ev.key==="Escape"&&!el.querySelector(".dial"))closeViewer()};document.addEventListener("keydown",VW.key);
  el.addEventListener("click",ev=>{if(ev.target===el){closeViewer();return}const a=ev.target.closest("[data-act],[data-id],[data-like],[data-star]");if(!a)return;
    if(a.dataset.id){ev.preventDefault();sndClick();opt.onPick&&opt.onPick(a.dataset.id);return}
    const act=a.dataset.act;
    if(act==="close")closeViewer();
    else if(act==="year"){const y=m.y;closeViewer();opt.onYear&&opt.onYear(y)}
    else if(act==="snd"){SND.on=!SND.on;try{localStorage.setItem("ns_snd",SND.on?"1":"0")}catch(e){}a.innerHTML=icon(SND.on?"volume":"mute")+"<span>Sons da época</span>"}
    else if(act==="savelink"){const u=el.querySelector(".ol").value.trim(),r=opt.onSaveLink?opt.onSaveLink(u):"";el.querySelector(".olm").innerHTML=r||""}
    else if(a.dataset.like){vote(+a.dataset.like)}
    else if(a.dataset.star){rate(+a.dataset.star)}
  });
  // notas e visualizações
  const e=isPhoto?null:vEra(m.y);let tot=localTotals(m.id);
  const paint=()=>{const mine=myVote(m.id);
    if(isPhoto){const n=tot.up;el.querySelectorAll("[data-like-photo]").forEach(b=>b.innerHTML=`<button class="plk ${mine.v===1?"on":""}" data-like="1">${icon("heart")}${pEra(m.y)==="fotolog"?`<span>${mine.v===1?"Livro assinado":"Assinar o livro de visitas"} (${fmt(n)})</span>`:pEra(m.y)==="orkut"?`<span>${mine.v===1?"Você curtiu":"Curtir"} · ${fmt(n)}</span>`:""}</button>`);
      const l=el.querySelector("[data-likes]");if(l)l.textContent=`${fmt(n)} curtida${n===1?"":"s"}`;const no=el.querySelector("[data-notes]");if(no)no.textContent=`${fmt(n)} nota${n===1?"":"s"}`;return}
    const rt=el.querySelector("[data-rt]");if(rt)rt.innerHTML=ratingHTML(e,tot,mine)};
  paint();
  loadVotes(m.id).then(d=>{if(d&&VW&&VW.m===m){tot=d;paint()}});
  async function vote(v){const mine=myVote(m.id),from=mine.v,to=from===v?0:v;mine.v=to;nsSave();sndClick();
    if(tot.local)tot=localTotals(m.id);else{if(from===1)tot.up--;if(from===-1)tot.down--;if(to===1)tot.up++;if(to===-1)tot.down++}
    paint();const r=await sendVote(m.id,{from,to});if(r&&VW&&VW.m===m){tot=r;paint()}}
  async function rate(s){const mine=myVote(m.id),from=mine.s||0;mine.s=s;nsSave();sndClick();
    if(tot.local)tot=localTotals(m.id);else{if(from){tot.sum-=from;tot.n--}tot.sum+=s;tot.n++}
    paint();const r=await sendVote(m.id,{starFrom:from,starTo:s});if(r&&VW&&VW.m===m){tot=r;paint()}}
  if(!isPhoto){
    const setViews=n=>{const t=n==null?"":e===1?fmt(n):e===2?`${fmt(n)} exibições`:e===3?fmt(n):e===4?`${fmt(n)} visualizações`:e===5?`${short(n)} de visualizações`:`${fmt(n)} exibições no YouTube`;
      el.querySelectorAll("[data-views]").forEach(x=>x.textContent=t)};
    if(m.yt){setViews(null);ytStats([m.yt,...rel.slice(0,10).map(r=>r.yt)].filter(Boolean)).then(s=>{if(VW&&VW.m===m&&s[m.yt])setViews(s[m.yt].views)})}
    // imersão: discada, lan house, avisos da época
    const hooks={};
    if(discada(m.y))hooks.beforeStart=()=>dialUp(el);
    const tz=TOAST(m.y);if(tz)hooks.onPlay=()=>{if(VW.toasted)return;VW.toasted=1;VW.toastT=setTimeout(()=>{if(!VW)return;tz.s();const t=document.createElement("div");t.className="etoast "+tz.t;t.innerHTML=`<b>${tz.t==="msn"?icon("user","in"):tz.t==="scrap"?icon("comment","in"):icon("comment","in")}</b><span>${tz.h}</span>`;el.appendChild(t);setTimeout(()=>t.remove(),6500)},4000)};
    VW.player=initPlayer(el.querySelector(".vp"),m,rel,id=>opt.onPick&&opt.onPick(id),hooks);
    if(lanhouse(m.y)){const b=document.createElement("div");b.className="lan";let s=29*60+59;b.innerHTML=`<b>LAN HOUSE</b><span>Máquina 07</span><span class="lt"></span><small>R$ 1,50/hora</small>`;el.appendChild(b);const lt=b.querySelector(".lt");
      const tick=()=>{lt.textContent="Tempo restante "+String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0");if(s>0)s--};tick();VW.clock=setInterval(tick,1000)}
    const ck=el.querySelector("[data-clock]");if(ck){const f=()=>ck.textContent=new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});f();VW.clock=setInterval(f,30000)}
  }
}

// discagem: tela de conexão + som do modem (anos de internet discada)
function dialUp(root){return new Promise(res=>{
  const d=document.createElement("div");d.className="dial";
  d.innerHTML=`<div class="dw"><div class="xtb"><span>${icon("culture","xi")}Conectando a Discador Internet Grátis</span><span class="xc"><i>✕</i></span></div><div class="db"><div class="dicon"><i></i><i></i><i></i></div><div><p class="ds">Discando...</p><div class="dp"><s></s></div><small>Linha telefônica ocupada? Avise a família que você vai usar a internet.</small></div></div><div class="dbt"><button class="sk">Pular</button><button>Cancelar</button></div></div>`;
  root.appendChild(d);sndModem();
  const steps=[["Discando 0800 444 1956...",0],["Verificando nome de usuário e senha...",3200],["Registrando seu computador na rede...",5000],["Conectado a 52,0 Kbps",6600]];
  const T=steps.map(([t,ms],i)=>setTimeout(()=>{d.querySelector(".ds").textContent=t;d.querySelector(".dp s").style.width=((i+1)/steps.length*100)+"%"},ms));
  const done=()=>{T.forEach(clearTimeout);clearTimeout(fin);if(SND.ctx){try{SND.ctx.close()}catch(e){}SND.ctx=null}d.remove();res()};
  const fin=setTimeout(done,7400);d.querySelectorAll("button").forEach(b=>b.onclick=done);
})}
