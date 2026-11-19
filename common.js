// Avatar de gatinho (do protótipo original)

const SG={
 fur:[["Cinza","#9b9ba1"],["Laranja","#e8932f"],["Preto","#24242a"],["Branco","#f2eee6"],["Marrom","#8a6a45"],["Grafite","#5b5c66"],["Creme","#e6c99a"],["Azulado","#7d8ca6"],["Chocolate","#4a3226"],["Rosa (Sphynx)","#efb6c4"]],
 pat:["Liso","Tigrado","Pintado","Smoking","Máscara"],
 eye:[["Âmbar","#e6a21a"],["Verde","#5bbf3a"],["Azul","#2f8cff"],["Esmeralda","#19c29a"],["Roxo","#9a5cff"]],
 acc:[["Nenhum","🚫"],["Óculos redondo","👓"],["Óculos escuro","🕶️"],["Boné","🧢"],["Gorro","🧶"],["Fone","🎧"],["Bandana","🧣"],["Corrente","⛓️"],["Monóculo","🧐"]],
 clo:[["Hoodie","#1c1c24"],["Camiseta","#ececec"],["Jaqueta jeans","#3d6aa8"],["Maletom","#cfc7b4"],["Jaqueta bomber","#4b5a3a"],["Camisa xadrez","#b3262d"],["Regata","#22222a"],["Pelado","#0000"]],
 bg:[["Azul",["#2a6bff","#0a2a8a"]],["Roxo",["#7a4dff","#2a1070"]],["Rosa",["#ff6bd0","#7a2aa8"]],["Verde",["#19c29a","#06503f"]],["Sol",["#ffb12a","#d9561a"]],["Noite",["#1a1f4a","#05060f"]],["Menta",["#7ef0c8","#1a8a7a"]],["Vermelho",["#ff5a6a","#7a1030"]]]
};
let sgN=0;
const SPHYNX=9; // "Rosa" vira gato Sphynx (sem pelo)
function catSVG(o){
  const sph=o.fur===SPHYNX;
  const id="g"+(sgN++),fur=sph?"#efb6c4":SG.fur[o.fur][1],eye=SG.eye[o.eye][1],bg=SG.bg[o.bg][1],clo=o.clo,acc=o.acc,pat=sph?0:o.pat;
  const dk="rgba(0,0,0,.28)",shade="#d48a9f";
  let s=`<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="${id}" cx="50%" cy="35%" r="75%"><stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></radialGradient>
  <pattern id="${id}p" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M0 6H12M6 0V12" stroke="#00000055" stroke-width="2"/></pattern>
  ${sph?`<radialGradient id="${id}s" cx="45%" cy="35%" r="70%"><stop offset="0" stop-color="#f7cdd7"/><stop offset="1" stop-color="#e7a2b4"/></radialGradient>`:""}</defs>
  <rect width="200" height="200" fill="url(#${id})"/>`;
  const skin=sph?`url(#${id}s)`:fur;
  // corpo
  s+=`<path d="M28 205Q30 150 72 140L128 140Q170 150 172 205Z" fill="${skin}"/>`;
  if(sph) s+=`<g stroke="${shade}" stroke-width="2" fill="none" stroke-linecap="round"><path d="M84 146q16 7 32 0M80 154q20 8 40 0"/></g>`;
  const cc=SG.clo[clo][1];
  if(clo===0) s+=`<path d="M28 205Q30 150 72 140Q100 166 128 140Q170 150 172 205Z" fill="${cc}"/><path d="M60 146Q100 176 140 146" stroke="#2b2b38" stroke-width="7" fill="none"/><path d="M92 165v26M108 165v26" stroke="#ddd" stroke-width="2"/><path d="M70 188h60l6 17H64z" fill="#15151c"/>`;
  else if(clo===1) s+=`<path d="M28 205Q30 150 72 140Q100 158 128 140Q170 150 172 205Z" fill="${cc}"/><path d="M76 142Q100 160 124 142" stroke="#bbb" stroke-width="3" fill="none"/>`;
  else if(clo===2) s+=`<path d="M28 205Q30 150 72 140L100 168L128 140Q170 150 172 205Z" fill="${cc}"/><path d="M100 168V205M72 140L88 176M128 140L112 176" stroke="#25497c" stroke-width="2.5"/><rect x="40" y="178" width="20" height="9" fill="#2f5a95"/>`;
  else if(clo===3) s+=`<path d="M28 205Q30 150 72 140Q100 154 128 140Q170 150 172 205Z" fill="${cc}"/><path d="M72 146Q100 164 128 146" stroke="#a99f88" stroke-width="6" fill="none"/>`;
  else if(clo===4) s+=`<path d="M28 205Q30 150 72 140Q100 158 128 140Q170 150 172 205Z" fill="${cc}"/><path d="M100 158V205" stroke="#2c3a20" stroke-width="3"/><path d="M62 144Q100 164 138 144" stroke="#d98a2a" stroke-width="6" fill="none"/>`;
  else if(clo===5) s+=`<path d="M28 205Q30 150 72 140Q100 158 128 140Q170 150 172 205Z" fill="${cc}"/><path d="M28 205Q30 150 72 140Q100 158 128 140Q170 150 172 205Z" fill="url(#${id}p)"/><path d="M80 144L100 166L120 144" stroke="#7a1218" stroke-width="3" fill="none"/>`;
  else if(clo===6) s+=`<path d="M68 142L76 205M132 142L124 205" stroke="${cc}" stroke-width="10"/><path d="M76 205Q100 180 124 205" fill="${skin}"/>`;
  // bandana atrás do rosto
  if(acc===6) s+=`<path d="M62 138Q100 150 138 138L100 182Z" fill="#d6282f"/><circle cx="90" cy="150" r="2" fill="#fff"/><circle cx="108" cy="150" r="2" fill="#fff"/><circle cx="99" cy="164" r="2" fill="#fff"/>`;
  if(sph){
    // Sphynx: orelhas enormes, rosto anguloso, pele com rugas, sem bigode
    s+=`<path d="M52 86L34 8L102 50Z" fill="${skin}"/><path d="M148 86L166 8L98 50Z" fill="${skin}"/>
    <path d="M60 72L45 24L90 52Z" fill="#e58aa1"/><path d="M140 72L155 24L110 52Z" fill="#e58aa1"/>
    <path d="M60 72L45 24" stroke="${shade}" stroke-width="1.5"/><path d="M140 72L155 24" stroke="${shade}" stroke-width="1.5"/>`;
    s+=`<ellipse cx="100" cy="97" rx="51" ry="48" fill="${skin}"/><ellipse cx="68" cy="114" rx="18" ry="15" fill="${skin}"/><ellipse cx="132" cy="114" rx="18" ry="15" fill="${skin}"/>`;
    s+=`<g stroke="${shade}" stroke-width="2.2" fill="none" stroke-linecap="round"><path d="M80 60Q100 52 120 60"/><path d="M84 68Q100 62 116 68"/><path d="M91 75Q100 71 109 75"/><path d="M64 80q9-6 18-1"/><path d="M118 79q9-5 18 1"/></g>`;
    s+=`<ellipse cx="100" cy="120" rx="19" ry="12" fill="#fff" opacity=".18"/>`;
    [[80,96,-10],[120,96,10]].forEach(([x,y,r])=>{s+=`<g transform="rotate(${r} ${x} ${y})"><path d="M${x-14} ${y}Q${x} ${y-17} ${x+14} ${y}Q${x} ${y+17} ${x-14} ${y}Z" fill="${eye}" stroke="${shade}" stroke-width="1.5"/><ellipse cx="${x}" cy="${y}" rx="4.4" ry="9.5" fill="#101018"/><circle cx="${x-3.5}" cy="${y-4.5}" r="2.8" fill="#fff"/><circle cx="${x+3}" cy="${y+4}" r="1.3" fill="#fff" opacity=".8"/></g>`});
    s+=`<path d="M94 112h12l-6 7z" fill="#c9667f"/><path d="M100 119v4M100 123q-6 6-12 2M100 123q6 6 12 2" stroke="#7a3a4a" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
  } else {
    // orelhas
    const ear=pat===4?"#4b3a30":fur;
    s+=`<path d="M54 76L56 26L96 56Z" fill="${ear}"/><path d="M146 76L144 26L104 56Z" fill="${ear}"/><path d="M62 64L63 38L84 55Z" fill="#e89aa8"/><path d="M138 64L137 38L116 55Z" fill="#e89aa8"/>`;
    // cabeça
    s+=`<ellipse cx="100" cy="98" rx="54" ry="47" fill="${fur}"/>`;
    if(pat===1) s+=`<g stroke="${dk}" stroke-width="4" stroke-linecap="round" fill="none"><path d="M100 53v15M88 55l3 13M112 55l-3 13M48 96h14M50 107h14M152 96h-14M150 107h-14"/></g>`;
    if(pat===2) s+=`<g fill="${dk}"><circle cx="70" cy="68" r="7"/><circle cx="132" cy="72" r="6"/><circle cx="56" cy="104" r="6"/><circle cx="146" cy="100" r="7"/><circle cx="104" cy="62" r="4"/></g>`;
    if(pat===3) s+=`<path d="M100 52Q92 74 94 96L106 96Q108 74 100 52Z" fill="#f4f1ea"/><ellipse cx="100" cy="120" rx="26" ry="18" fill="#f4f1ea"/>`;
    if(pat===4) s+=`<ellipse cx="100" cy="106" rx="34" ry="30" fill="#4b3a30" opacity=".6"/>`;
    s+=`<ellipse cx="100" cy="118" rx="20" ry="13" fill="#fff" opacity=".22"/>`;
    // olhos
    [[80,96],[120,96]].forEach(([x,y])=>{s+=`<ellipse cx="${x}" cy="${y}" rx="11.5" ry="12.5" fill="${eye}"/><ellipse cx="${x}" cy="${y}" rx="4.6" ry="9.5" fill="#101018"/><circle cx="${x-3.5}" cy="${y-4.5}" r="2.8" fill="#fff"/><circle cx="${x+3}" cy="${y+4}" r="1.3" fill="#fff" opacity=".8"/>`});
    s+=`<path d="M94 112h12l-6 7z" fill="#e58b9b"/><path d="M100 119v4M100 123q-6 6-12 2M100 123q6 6 12 2" stroke="#3a2a2a" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <g stroke="#fff" stroke-opacity=".75" stroke-width="1.2" stroke-linecap="round"><path d="M70 116L38 110M70 122L40 126M130 116L162 110M130 122L160 126"/></g>`;
  }
  // acessórios
  if(acc===1) s+=`<g fill="none" stroke="#2a2a30" stroke-width="3"><circle cx="80" cy="96" r="15"/><circle cx="120" cy="96" r="15"/><path d="M95 94h10M65 92L52 86M135 92L148 86"/></g>`;
  if(acc===2) s+=`<g fill="#0c0c12"><rect x="62" y="84" width="34" height="22" rx="8"/><rect x="104" y="84" width="34" height="22" rx="8"/></g><path d="M96 90h8M62 90L50 84M138 90L150 84" stroke="#0c0c12" stroke-width="3"/><path d="M68 90h12" stroke="#fff" stroke-opacity=".4" stroke-width="2"/>`;
  if(acc===3) s+=`<path d="M52 66Q54 24 100 24Q146 24 148 66Q100 54 52 66Z" fill="#2d5bd1"/><path d="M52 64Q100 50 148 64Q170 68 176 76Q120 62 52 70Z" fill="#1c3f9c"/><circle cx="100" cy="24" r="4" fill="#1c3f9c"/>`;
  if(acc===4) s+=`<path d="M50 70Q52 20 100 20Q148 20 150 70Q100 58 50 70Z" fill="#c8402f"/><rect x="48" y="62" width="104" height="14" rx="7" fill="#9e2e20"/><circle cx="100" cy="16" r="7" fill="#e2e2e2"/>`;
  if(acc===5) s+=`<path d="M50 100Q42 20 100 20Q158 20 150 100" stroke="#222" stroke-width="7" fill="none"/><rect x="38" y="82" width="18" height="34" rx="9" fill="#2a2a36"/><rect x="144" y="82" width="18" height="34" rx="9" fill="#2a2a36"/><rect x="42" y="88" width="8" height="22" rx="4" fill="#3d8bff"/><rect x="150" y="88" width="8" height="22" rx="4" fill="#3d8bff"/>`;
  if(acc===7) s+=`<path d="M66 144Q100 178 134 144" stroke="#f0c040" stroke-width="5" fill="none" stroke-dasharray="7 3"/>`;
  if(acc===8) s+=`<circle cx="120" cy="96" r="16" fill="#ffffff14" stroke="#d4a82a" stroke-width="3"/><path d="M134 108Q142 140 130 170" stroke="#d4a82a" stroke-width="1.8" fill="none"/>`;
  return s+"</svg>";
}
const rnd=n=>Math.floor(Math.random()*n);
let sgO={fur:0,pat:1,eye:0,acc:0,clo:0,bg:0},sgTab=0;
const SG_TABS=["Pelo","Acessórios","Roupa","Fundo"];
function sgRender(){
  document.getElementById("sgBig").innerHTML=catSVG(sgO);const br=document.getElementById("sgBreed");if(br)br.innerHTML=sgO.fur===SPHYNX?"Raça: <b>Sphynx</b> · sem pelo, orelhas grandes e muitas ruguinhas":"Raça: <b>Gato padrão</b> · "+SG.fur[sgO.fur][0].toLowerCase();
  document.getElementById("sgTabs").innerHTML=SG_TABS.map((t,i)=>`<button class="${i===sgTab?'on':''}" onclick="sgTab=${i};sgRender()">${t}</button>`).join("");
  const sel=(k,i)=>sgO[k]===i?" on":"";
  let h="";
  if(sgTab===0){
    h+=`<h5>COR DO PELO</h5><div class="sg-row">${SG.fur.map((f,i)=>`<button class="sg-o${sel('fur',i)}" title="${f[0]}" onclick="sgSet('fur',${i})"><i style="background:${f[1]}"></i></button>`).join("")}</div>`;
    const sph=sgO.fur===SPHYNX;
    h+=`<h5>PADRÃO${sph?'<em>Sphynx não tem pelo, então não tem padrão</em>':''}</h5><div class="sg-row">${SG.pat.map((p,i)=>`<button class="sg-o sq${sph?'':sel('pat',i)}" ${sph?'disabled':''} onclick="sgSet('pat',${i})">${p}</button>`).join("")}</div>`;
    h+=`<h5>COR DOS OLHOS</h5><div class="sg-row">${SG.eye.map((f,i)=>`<button class="sg-o${sel('eye',i)}" title="${f[0]}" onclick="sgSet('eye',${i})"><i style="background:${f[1]}"></i></button>`).join("")}</div>`;
  }
  if(sgTab===1) h+=`<h5>ACESSÓRIOS (OPCIONAL)</h5><div class="sg-row">${SG.acc.map((a,i)=>`<button class="sg-o sq${sel('acc',i)}" onclick="sgSet('acc',${i})"><span>${a[1]}</span>${a[0]}</button>`).join("")}</div>`;
  if(sgTab===2) h+=`<h5>ROUPA (OPCIONAL)</h5><div class="sg-row">${SG.clo.map((c,i)=>`<button class="sg-o sq${sel('clo',i)}" onclick="sgSet('clo',${i})"><i style="background:${c[1]==='#0000'?'#222':c[1]};width:26px;height:26px;margin-bottom:4px"></i>${c[0]}</button>`).join("")}</div>`;
  if(sgTab===3) h+=`<h5>FUNDO</h5><div class="sg-row">${SG.bg.map((b,i)=>`<button class="sg-o${sel('bg',i)}" title="${b[0]}" onclick="sgSet('bg',${i})"><i style="background:radial-gradient(circle at 35% 30%,${b[1][0]},${b[1][1]})"></i></button>`).join("")}</div>`;
  document.getElementById("sgOpts").innerHTML=h;
}
function sgSet(k,i){sgO[k]=i;sgRender()}
function sgShuffle(){sgO={fur:rnd(SG.fur.length),pat:rnd(SG.pat.length),eye:rnd(SG.eye.length),acc:rnd(SG.acc.length),clo:rnd(SG.clo.length),bg:rnd(SG.bg.length)};sgRender()}

// =====================================================================
//  NÃO SALVO — estado compartilhado entre Acervo, Álbum e Economia
//  (protótipo: tudo fica no navegador; num site real isso vira backend)
// =====================================================================
const NS_KEY="naosalvo2_state";

// ---- Economia (números da proposta do grupo) ----
const RARITIES=["Comum","Relevante","Raro","Relíquia","Lendário","Mítico"];
const DUP_VALUE={Comum:5,Relevante:10,Raro:20,"Relíquia":40,"Lendário":80,"Mítico":150}; // carta repetida vira moeda
const ODDS={Comum:44,Relevante:26,Raro:15,"Relíquia":9,"Lendário":5,"Mítico":1};          // chance por carta no pacote
const REWARD={approved:25,oldLink:5,collection:100};                                      // moedas
const XP_GAIN={visit:10,pack:5,approved:50,oldLink:10,collection:100,newCard:{Comum:2,Relevante:4,Raro:8,"Relíquia":15,"Lendário":30,"Mítico":60}};
const PACK_SIZE=5;

// ---- Patentes (quem tem patente maior modera quem tem menor) ----
const RANKS=[
 {id:"discado",name:"Discado",xp:0,color:"#9aa3b2",can:"Navega no acervo, abre pacotes e coleciona cartas."},
 {id:"banda",name:"Banda larga",xp:150,color:"#2fbf5b",can:"Pode enviar memes (vídeos e fotos) para o acervo."},
 {id:"colab",name:"Colaborador",xp:500,color:"#2f86ff",can:"Pode salvar o link de virais antigos que estão sem vídeo."},
 {id:"mod",name:"Moderador",xp:1500,color:"#a855f7",can:"Modera envios de quem tem patente menor."},
 {id:"dono",name:"Dono de comunidade",xp:4000,color:"#f5b70a",can:"Selo dourado no perfil e voto de minerva na moderação."},
 {id:"lenda",name:"Lenda da internet",xp:10000,color:"#ff3b47",can:"Selo vermelho de lenda. Respeito máximo."}
];
const rankOf=xp=>{let r=RANKS[0];RANKS.forEach(k=>{if(xp>=k.xp)r=k});return r};
const rankIdx=xp=>RANKS.indexOf(rankOf(xp));
const nextRank=xp=>RANKS.find(k=>k.xp>xp);

// ---- Estado ----
function nsFresh(){return{acct:null,xp:0,coins:0,owned:{},completed:{},daily:{d:"",used:false},welcome:false,lastVisit:"",streak:0,subs:[],links:{},dayOffset:0,approvedCount:0,modDone:{}}}
let NS=nsFresh();
try{const s=JSON.parse(localStorage.getItem(NS_KEY)||"null");if(s)NS=Object.assign(nsFresh(),s)}catch(e){}
function nsSave(){try{localStorage.setItem(NS_KEY,JSON.stringify(NS))}catch(e){}}
function nsToday(){const d=new Date();d.setDate(d.getDate()+(NS.dayOffset||0));return d.toISOString().slice(0,10)}

// visita diária: XP + sequência (o pacote grátis do dia é aberto no álbum)
(function dailyVisit(){
  const t=nsToday();if(NS.lastVisit===t)return;
  const y=new Date(t);y.setDate(y.getDate()-1);
  NS.streak=NS.lastVisit===y.toISOString().slice(0,10)?NS.streak+1:1;
  NS.lastVisit=t;NS.xp+=XP_GAIN.visit;nsSave();
})();
// estoque de pacotes fechados: boas-vindas (1x) + 1 grátis por dia (acumula até 7) + comprados na loja
(function grantPacks(){
  if(!Array.isArray(NS.inv))NS.inv=[];
  if(!NS.welcome){NS.welcome=true;NS.inv.push({id:"boas"})}
  const t=nsToday();
  if(NS.daily.d!==t){NS.daily={d:t,used:true};if(NS.inv.filter(p=>p.id==="diario").length<7)NS.inv.push({id:"diario"})}
  nsSave();
})();

// Revelação em curso (ex.: abrir pacote): quem está revelando liga holdWallet(true). Enquanto isso o estado
// (NS, nsSave) muda na hora, mas a carteira não é redesenhada e o aviso de patente fica na fila.
// holdWallet(false) desenha a carteira e mostra o aviso.
let walletHold=false,pendingRank=null;
function showRankToast(r){setTimeout(()=>toast(`🎖️ Nova patente: ${r.name}! ${r.can}`,4200),600)}
function holdWallet(on){walletHold=!!on;if(walletHold)return;renderWallet();if(pendingRank){const r=pendingRank;pendingRank=null;showRankToast(r)}}
function addXP(n){const before=rankOf(NS.xp);NS.xp+=n;const after=rankOf(NS.xp);nsSave();if(after!==before){if(walletHold)pendingRank=after;else showRankToast(after)}renderWallet()}
function addCoins(n,why){NS.coins+=n;nsSave();renderWallet();if(why)toast(`+${n} 🪙 ${why}`)}

// ---- UI compartilhada ----
function toast(m,ms){let t=document.getElementById("toast");if(!t){t=document.createElement("div");t.id="toast";t.className="toast";document.body.appendChild(t)}
  t.textContent=m;t.style.display="block";clearTimeout(t._t);t._t=setTimeout(()=>t.style.display="none",ms||2400)}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
const fmt=n=>Number(n).toLocaleString("pt-BR");

const compactCoins=new Intl.NumberFormat("pt-BR",{notation:"compact",maximumSignificantDigits:3});

function renderWallet(){
  if(walletHold)return;
  const el=document.getElementById("wallet");if(!el)return;
  const r=rankOf(NS.xp),nx=nextRank(NS.xp);
  const pct=nx?Math.round((NS.xp-r.xp)/(nx.xp-r.xp)*100):100;
  const balance=fmt(NS.coins);
  const progress=`${fmt(NS.xp)} XP${nx?` · ${fmt(nx.xp-NS.xp)} p/ ${nx.name}`:""}`;
  const description=`${balance} moedas · ${r.name} · ${progress}`;
  el.innerHTML=`<button class="wl" onclick="openTestPanel()" title="${description}" aria-label="Abrir perfil: ${description}">
    <span class="wl-c">${icon("coin")}<b>${NS.coins>=10000?compactCoins.format(NS.coins):balance}</b></span>
    <span class="wl-r"><em style="color:${r.color}">${r.name}</em><i><s style="width:${pct}%;background:${r.color}"></s></i><small>${progress}</small></span></button>`;
  updateAccount();
  if(typeof onWalletRendered==="function")onWalletRendered();
}

// ---- Cadastro com avatar de gatinho (layout original) ----
function openSignup(){
  const a=NS.acct;if(a){sgO={...a.av};document.getElementById("sgU").value=a.user;document.getElementById("sgE").value=a.email||"";document.getElementById("sgChat").checked=!!a.chat}
  document.getElementById("sgErr").textContent="";document.getElementById("sgm").classList.add("open");sgMeth(NS.acct&&NS.acct.via?NS.acct.via:"email");sgRender();
}
let sgM="email";
function sgMeth(m){sgM=m;const b=document.getElementById("sgm");b.dataset.m=m;b.querySelectorAll(".sg-meth button").forEach(x=>x.classList.toggle("on",x.dataset.m===m));
  document.getElementById("sgSoc").innerHTML=m==="email"?"":`${icon("clock")} Login com ${m==="google"?"Google":"Discord"} entra quando o site for ao ar. Por enquanto, escolha seu nome e crie o gatinho.`;
  document.getElementById("sgGoT").textContent=NS.acct?"Salvar":m==="email"?"Criar conta":"Continuar com "+(m==="google"?"Google":"Discord");document.getElementById("sgErr").textContent=""}
function closeSignup(){document.getElementById("sgm").classList.remove("open")}
function submitSignup(){
  const u=document.getElementById("sgU").value.trim(),e=document.getElementById("sgE").value.trim(),p=document.getElementById("sgP").value,chat=document.getElementById("sgChat").checked;
  const er=document.getElementById("sgErr");
  if(!/^[\w.-]{3,20}$/.test(u))return er.textContent="Usuário: 3 a 20 caracteres (letras, números, _ . -).";
  if(sgM==="email"){
    if(!/^\S+@\S+\.\S+$/.test(e))return er.textContent="Digite um e-mail válido.";
    if(!NS.acct&&p.length<6)return er.textContent="A senha precisa de pelo menos 6 caracteres.";}
  const isNew=!NS.acct;
  NS.acct={user:u,email:sgM==="email"?e:"",via:sgM,av:{...sgO},chat};
  if(chat&&NS.xp<RANKS[1].xp)NS.xp=RANKS[1].xp; // quem é do chat já entra com patente maior
  nsSave();closeSignup();renderWallet();
  if(isNew)toast(chat?"Bem-vindo! Por ser do Xet da live do Cid, você já entra como Banda larga":"Conta criada! Seu gatinho já está no ranking",3200);
  if(typeof onAccountChange==="function")onAccountChange();
}
function updateAccount(){
  const el=document.getElementById("acct");if(!el)return;const a=NS.acct;
  el.innerHTML=a?`<button class="sg-acct" onclick="openSignup()"><span class="sg-av">${catSVG(a.av)}</span><span>${escapeHtml(a.user)}<b>Gato nível ${rankIdx(NS.xp)+1}</b></span></button>`:`<div class="account-actions">
    <button type="button" class="account-login" onclick="document.getElementById('login-dialog').showModal()">${icon("login")}Entrar</button>
    <button type="button" onclick="openSignup()">${icon("user")}Criar conta</button>
  </div>`;
}
const needAccount=()=>{if(NS.acct)return false;toast("Crie sua conta (e seu gatinho) primeiro 🐱");openSignup();return true};

// ---- Modo teste (para demonstrar a progressão) ----
function openTestPanel(){
  let m=document.getElementById("tp");
  if(!m){m=document.createElement("div");m.id="tp";m.onclick=e=>{if(e.target===m)m.classList.remove("open")};document.body.appendChild(m)}
  const r=rankOf(NS.xp);
  m.innerHTML=`<div class="tp-box"><button class="sg-x" onclick="document.getElementById('tp').classList.remove('open')">×</button>
   <h3>Seu perfil</h3>
   <div class="tp-kv"><span>Moedas</span><b>🪙 ${fmt(NS.coins)}</b></div>
   <div class="tp-kv"><span>XP</span><b>${fmt(NS.xp)}</b></div>
   <div class="tp-kv"><span>Patente</span><b style="color:${r.color}">${r.name}</b></div>
   <div class="tp-kv"><span>Sequência de visitas</span><b>${NS.streak} dia(s)</b></div>
   <div class="tp-kv"><span>Envios aprovados</span><b>${NS.approvedCount}</b></div>
   <h4>Patentes</h4>${RANKS.map(k=>`<div class="tp-rk ${k===r?'on':''}"><i style="background:${k.color}"></i><b>${k.name}</b><small>${fmt(k.xp)} XP · ${k.can}</small></div>`).join("")}
   <h4>Modo teste do protótipo</h4>
   <div class="tp-btns"><button onclick="testDay()">⏭ Avançar 1 dia</button><button onclick="addXP(500);openTestPanel()">+500 XP</button><button onclick="addCoins(300);openTestPanel()">+300 🪙</button><button onclick="if(window.confirmReset!==1){window.confirmReset=1;this.textContent='Clique de novo p/ confirmar';return}localStorage.removeItem(NS_KEY);location.reload()">↺ Zerar tudo</button></div>
   <p class="tp-note">Avançar o dia libera um novo pacote grátis no álbum.</p></div>`;
  m.classList.add("open");
}
function testDay(){NS.dayOffset=(NS.dayOffset||0)+1;nsSave();location.reload()}


// ---- Ícones dos menus (SVG próprios, traço único) ----
const ICONS={
 book:'<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5"/><path d="M9 7.5h7M9 11h5"/>',
 care:'<path d="M12 3 4.5 6v5.5c0 4.6 3.1 8.2 7.5 9.5 4.4-1.3 7.5-4.9 7.5-9.5V6L12 3Z"/><path d="M12 8.5v4.5M12 16h.01"/>',
 eye:'<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>',
 extlink:'<path d="M14 4h6v6M20 4l-9 9"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
 edit:'<path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>',
 fire:'<path d="M12 21c-4 0-6.5-2.7-6.5-6.2 0-3.6 3-5.8 3.6-9.3 2.4 1.4 3.6 3.6 3.6 5.6 1-.6 1.7-1.7 1.9-3 2 1.6 3.9 4.1 3.9 6.9 0 3.4-2.5 6-6.5 6Z"/>',
 cursor:'<path d="M5 3.5 19 11l-6.2 1.6L10.5 19 5 3.5Z"/>',
 login:'<path d="M14 4h5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-5M3 12h12m-5-5 5 5-5 5"/>',
 home:'<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h5v-5.5h3v5.5h5V10"/>',
 timeline:'<path d="M3 12h18"/><circle cx="6" cy="12" r="1.9" fill="currentColor"/><circle cx="12" cy="12" r="1.9" fill="currentColor"/><circle cx="18" cy="12" r="1.9" fill="currentColor"/><path d="M6 8.5V5M12 15.5V19M18 8.5V5"/>',
 categories:'<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="3.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="3.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
 random:'<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1.2" fill="currentColor"/>',
 ranking:'<path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/><path d="M8 6H4.5a3 3 0 0 0 3.5 4M16 6h3.5a3 3 0 0 1-3.5 4"/><path d="M12 13v4M8.5 20h7M10 17h4v3h-4z"/>',
 moderation:'<path d="M12 3 4.5 6v5.5c0 4.4 3.1 8 7.5 9.5 4.4-1.5 7.5-5.1 7.5-9.5V6L12 3Z"/><path d="m8.8 12 2.3 2.3 4.2-4.6"/>',
 album:'<rect x="7" y="3.5" width="12" height="16" rx="2" transform="rotate(8 13 11.5)"/><rect x="4" y="5" width="12" height="16" rx="2"/><path d="M7.5 9.5h5M7.5 13h3"/>',
 send:'<path d="M12 16V5M7.5 9.5 12 5l4.5 4.5"/><path d="M4.5 15v3.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V15"/>',
 collections:'<path d="M12 3.5 3.5 8 12 12.5 20.5 8 12 3.5Z"/><path d="m3.5 12 8.5 4.5 8.5-4.5"/><path d="m3.5 16 8.5 4.5 8.5-4.5"/>',
 pack:'<rect x="3.5" y="8.5" width="17" height="12" rx="1.5"/><path d="M3.5 12.5h17M12 8.5v12"/><path d="M12 8.5C10 4 6.5 4.5 7 7c.3 1.4 2.7 1.5 5 1.5ZM12 8.5c2-4.5 5.5-4 5-1.5-.3 1.4-2.7 1.5-5 1.5Z"/>',
 shop:'<path d="M5 8h14l-1.2 11.2a1.5 1.5 0 0 1-1.5 1.3H7.7a1.5 1.5 0 0 1-1.5-1.3L5 8Z"/><path d="M9 10.5V7a3 3 0 0 1 6 0v3.5"/>',
 convert:'<path d="M4.5 12a7.5 7.5 0 0 1 13-5.1L19.5 9"/><path d="M19.5 4.5V9H15"/><path d="M19.5 12a7.5 7.5 0 0 1-13 5.1L4.5 15"/><path d="M4.5 19.5V15H9"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.5 1.5M17.2 17.2l1.5 1.5M5.3 18.7l1.5-1.5M17.2 6.8l1.5-1.5"/>',
 moon:'<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/>',
 coin:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5.5"/><path d="M12 9.5v5"/>',
 cat:'<path d="M5 9.5 4.5 3.5l4.5 3.2a9 9 0 0 1 6 0l4.5-3.2-.5 6"/><path d="M5 9.5C4 15 7.5 20 12 20s8-5 7-10.5"/><path d="M9.5 13h.01M14.5 13h.01" stroke-width="2.6"/><path d="M11 16h2l-1 1Z"/>',
 flame:'<path d="M12 21c-4 0-6.5-2.7-6.5-6.2 0-3.4 2.6-5.3 3.6-8.3.4 1.6 1.4 2.8 2.6 3.3.2-2.6 1.4-5 3.6-6.8-.4 2.9.8 4.6 2 6.3 1 1.4 1.7 3 1.7 5.1C19 18.3 16 21 12 21Z"/><path d="M12 21c-1.7 0-2.8-1.2-2.8-2.8 0-1.8 1.4-2.8 2.1-4.2.6 1 2.9 2.3 2.9 4.4 0 1.5-.9 2.6-2.2 2.6Z"/>',
 new:'<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>',
 lock:'<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><path d="M12 14.5v2.5"/>',
 cloud:'<path d="M7 18.5h10.5a4 4 0 0 0 .4-8 6 6 0 0 0-11.6 1.3A3.4 3.4 0 0 0 7 18.5Z"/><path d="M12 16v-5M9.8 13 12 10.8l2.2 2.2"/>',
 link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
 check:'<path d="m5 12.5 4.5 4.5L19 7.5"/>',
 xmark:'<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
 alert:'<path d="M12 4 2.8 19.5h18.4L12 4Z"/><path d="M12 10v4.5M12 17.2h.01"/>',
 clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
 thumbUp:'<path d="M7 10.5v9.5H4.5a1 1 0 0 1-1-1v-7.5a1 1 0 0 1 1-1H7Z"/><path d="M7 10.5 11 3.5c1.4 0 2.3 1.1 2 2.5l-.7 3.5h5.4a2 2 0 0 1 2 2.4l-1.3 6.4a2 2 0 0 1-2 1.6H7"/>',
 thumbDown:'<path d="M17 13.5V4h2.5a1 1 0 0 1 1 1v7.5a1 1 0 0 1-1 1H17Z"/><path d="M17 13.5 13 20.5c-1.4 0-2.3-1.1-2-2.5l.7-3.5H6.3a2 2 0 0 1-2-2.4l1.3-6.4a2 2 0 0 1 2-1.6H17"/>',
 bell:'<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15L6 16.5Z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
 heart:'<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z"/>',
 comment:'<path d="M20.5 11.5a8.5 8 0 0 1-12.4 7.1L3.5 20l1.4-4.1a8 8 0 1 1 15.6-4.4Z"/>',
 share:'<path d="M21 3.5 10 14.5M21 3.5l-6.5 17-4.5-6-6-4.5 17-6.5Z"/>',
 bookmark:'<path d="M6.5 3.5h11v17L12 16l-5.5 4.5v-17Z"/>',
 reblog:'<path d="M4 11V8.5a2 2 0 0 1 2-2h12l-3-3M20 13v2.5a2 2 0 0 1-2 2H6l3 3"/>',
 more:'<circle cx="5.5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="18.5" cy="12" r="1.3" fill="currentColor"/>',
 menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
 mic:'<rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3"/>',
 volume:'<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4v-5Z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
 mute:'<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4v-5Z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/>',
 star:'<path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.9l-5.3 2.7 1-5.8-4.2-4.1 5.9-.9L12 3.5Z"/>',
 upload:'<path d="M12 16V5M7.5 9.5 12 5l4.5 4.5"/><path d="M4.5 15v3.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V15"/>',
 mail:'<rect x="3.5" y="5.5" width="17" height="13" rx="1.5"/><path d="m4 6.5 8 6.5 8-6.5"/>',
 user:'<circle cx="12" cy="8.5" r="4"/><path d="M4.5 20.5c1.2-4 4-6 7.5-6s6.3 2 7.5 6"/>',
 arrowUp:'<path d="M12 19V5M5.5 11.5 12 5l6.5 6.5"/>',
 arrowDown:'<path d="M12 5v14M5.5 12.5 12 19l6.5-6.5"/>',
 clipboard:'<rect x="5" y="4.5" width="14" height="17" rx="2"/><path d="M9 4.5V3h6v1.5M8.5 10.5l1.5 1.5 3-3M8.5 16l1.5 1.5 3-3M15 11h1.5M15 16.5h1.5"/>',
 search:'<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
 all:'<path d="M12 3.5l2 5 5 .4-3.8 3.3 1.2 5-4.4-2.7-4.4 2.7 1.2-5L5 8.9l5-.4 2-5Z"/>',
 video:'<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M3.5 9h17M3.5 15h17M8 5.5v3.5M8 15v3.5M16 5.5v3.5M16 15v3.5"/>',
 tv:'<rect x="3.5" y="6.5" width="17" height="12" rx="2"/><path d="M8.5 3 12 6.5 15.5 3M8 21h8"/>',
 music:'<path d="M9 18V5.5l11-2V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
 culture:'<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 3.5 5.4 3.5 8.5s-1 5.9-3.5 8.5c-2.5-2.6-3.5-5.4-3.5-8.5s1-5.9 3.5-8.5Z"/>',
 zoeira:'<circle cx="12" cy="12" r="8.5"/><path d="M8 14.5a4.5 4.5 0 0 0 8 0Z"/><path d="M8.5 9.5l1.5 1M15.5 9.5l-1.5 1"/>',
 photo:'<path d="M4 8.5h3l1.5-2.5h7L17 8.5h3v11H4z"/><circle cx="12" cy="13.5" r="3.5"/>',
 sports:'<circle cx="12" cy="12" r="8.5"/><path d="m12 7.5 3.5 2.6-1.3 4.1H9.8L8.5 10.1 12 7.5Z"/><path d="M12 3.5v4M15.5 10.1l4.5-1.4M14.2 14.2l2.6 3.8M9.8 14.2l-2.6 3.8M8.5 10.1 4 8.7"/>',
};
const icon=(k,cls)=>`<svg class="ico ${cls||""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k]||""}</svg>`;

// ---- Tema claro / escuro ----
function setTheme(t){document.documentElement.dataset.theme=t;try{localStorage.setItem("ns_theme",t)}catch(e){}const b=document.getElementById("themeB");if(b){b.setAttribute("aria-checked",t==="dark");b.title=t==="dark"?"Modo escuro ativo · clique para o modo claro":"Modo claro ativo · clique para o modo escuro"}}
function toggleTheme(){setTheme(document.documentElement.dataset.theme==="light"?"dark":"light")}

// ---- Cabeçalho + sub-menu compartilhados ----
// page: "inicio" | "album"; sub: [{k,ic,label,fn,cta,dd,href}]
function renderHeader(page,opt={}){
  const hd=document.createElement("header");hd.className="hd";
  hd.innerHTML=`<a class="brand" href="index.html" aria-label="Não Salvo — início"><img src="logo-word.png" alt="Não Salvo"><small>Museu da internet brasileira</small></a>
   <div class="tools">${opt.search?`<label class="srch">${icon("search","s-ic")}<input id="q" type="search" placeholder="Buscar memes, anos, categorias…" aria-label="Buscar"></label>`:""}
   <div id="wallet"></div><div id="acct"></div><button class="tsw" id="themeB" role="switch" aria-label="Modo escuro" onclick="toggleTheme()">${icon("sun","t-l")}${icon("moon","t-d")}</button></div>`;
  document.body.prepend(hd);
  const tools=hd.querySelector(".tools");
  tools.insertAdjacentHTML("beforebegin",`<button type="button" class="hd-icon menu-toggle" aria-label="Menu principal" aria-expanded="false" aria-controls="header-menu">${icon("menu")}</button>
    <div class="header-menu" id="header-menu">
      <nav class="sub" id="sub" aria-label="Menu principal"></nav><div class="account-tools"></div>
    </div>`);
  hd.querySelector(".account-tools").append(hd.querySelector("#wallet"),hd.querySelector("#acct"));
  renderSub(opt.sub);
  const menu=hd.querySelector(".menu-toggle");
  const panel=hd.querySelector(".header-menu");
  const search=hd.querySelector(".srch");
  const field=search?.querySelector("input");
  if(search){
    search.hidden=true;
    search.insertAdjacentHTML("beforebegin",`<button type="button" class="hd-icon search-toggle" aria-label="Buscar no acervo" aria-expanded="false" aria-controls="q">${icon("search")}</button>`);
    field.setAttribute("aria-label","Buscar no acervo");
  }
  const searchButton=hd.querySelector(".search-toggle");
  function closeMenu(){
    menu.setAttribute("aria-expanded","false");
    hd.querySelector("#pop")?.remove();
    hd.querySelector(".dd")?.setAttribute("aria-expanded","false");
  }
  function closeSearch(){
    if(!field)return;
    search.hidden=true;
    searchButton.setAttribute("aria-expanded","false");
  }
  menu.onclick=()=>{
    const opening=menu.getAttribute("aria-expanded")==="false";
    closeMenu();
    closeSearch();
    menu.setAttribute("aria-expanded",String(opening));
  };
  if(searchButton)searchButton.onclick=()=>{
    closeMenu();
    if(!search.hidden)return closeSearch();
    search.hidden=false;
    searchButton.setAttribute("aria-expanded","true");
    field.focus();
  };
  function dismissOutside(event){
    if(!panel.contains(event.target) && !menu.contains(event.target))closeMenu();
    if(!search?.contains(event.target) && !searchButton?.contains(event.target))closeSearch();
  }
  document.addEventListener("pointerdown",dismissOutside);
  document.addEventListener("focusin",dismissOutside);
  panel.addEventListener("click",event=>{
    if(event.target.closest("button,a") && !event.target.closest(".dd")){
      if(menu.getAttribute("aria-expanded")==="true")menu.focus();
      closeMenu();
    }
  },true);
  hd.addEventListener("keydown",event=>{
    if(event.key!=="Escape")return;
    if(field && !search.hidden){closeSearch();searchButton.focus()}
    else if(hd.querySelector("#pop")){
      const categories=hd.querySelector(".dd");
      hd.querySelector("#pop").remove();
      categories.setAttribute("aria-expanded","false");
      categories.focus();
    }
    else if(menu.getAttribute("aria-expanded")==="true"){closeMenu();menu.focus()}
  });
  matchMedia("(max-width: 1199px)").addEventListener("change",()=>{closeMenu();closeSearch()});
  setTheme(document.documentElement.dataset.theme||"light");
  new ResizeObserver(()=>document.documentElement.style.setProperty("--hdh",hd.offsetHeight+"px")).observe(hd);
}
let SUB=[],subOn=null;
function renderSub(items){if(items)SUB=items;const n=document.getElementById("sub");if(!n)return;
  n.innerHTML=SUB.map((x,i)=>x.sp?`<span class="sp"></span>`:x.href?`<a href="${x.href}" class="${x.k===subOn?"on":""} ${x.cta?"cta":""}"${x.k===subOn?' aria-current="page"':""}>${icon(x.ic)}${x.label}</a>`:`<button data-i="${i}" class="${x.k===subOn?"on":""} ${x.cta?"cta":""} ${x.dd?"dd":""}">${icon(x.ic)}${x.label}</button>`).join("");
  n.querySelector(".dd")?.setAttribute("aria-expanded","false");
  n.querySelectorAll("button[data-i]").forEach(b=>b.onclick=e=>{const x=SUB[+b.dataset.i];x.fn&&x.fn(e,b)});
}
function setSubOn(k){subOn=k;renderSub()}
function openPop(anchor,items){
  const previous=document.getElementById("pop");
  anchor.setAttribute("aria-expanded",String(!previous));
  if(previous){previous.remove();return}
  const p=document.createElement("div");p.id="pop";p.className="pop open";
  anchor.after(p);
  p.innerHTML=items.map((x,i)=>`<button data-i="${i}">${x.ic?icon(x.ic):""}${x.label}${x.note?`<small>${x.note}</small>`:""}</button>`).join("");
  p.querySelectorAll("button").forEach(b=>b.onclick=()=>{p.classList.remove("open");items[+b.dataset.i].fn()});
  p.style.left=anchor.offsetLeft+"px";
}

// injeta o modal de cadastro
(function inject(){
  const G='<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.7c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.7H2.1v2.8A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.7 14c-.2-.7-.4-1.3-.4-2s.1-1.4.4-2V7.2H2.1a11 11 0 0 0 0 9.6L5.7 14z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.1-3.1A11 11 0 0 0 2.1 7.2L5.7 10c.9-2.7 3.4-4.6 6.3-4.6z"/></svg>';
  const D='<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#5865F2" d="M20.3 4.4A19.6 19.6 0 0 0 15.4 3l-.6 1.3a18 18 0 0 0-5.6 0L8.6 3a19.5 19.5 0 0 0-4.9 1.5C.6 9.1-.3 13.6.1 18.1a19.8 19.8 0 0 0 6 3l1.3-2.1a12.8 12.8 0 0 1-2-1l.5-.4a14 14 0 0 0 12.1 0l.5.4-2 1 1.3 2.1a19.7 19.7 0 0 0 6-3c.5-5.2-.9-9.7-3.5-13.7zM8 15.4c-1.2 0-2.2-1.1-2.2-2.4S6.8 10.6 8 10.6s2.2 1.1 2.2 2.4-1 2.4-2.2 2.4zm8 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4z"/></svg>';
  const d=document.createElement("div");d.innerHTML=`<div id="sgm" onclick="if(event.target===this)closeSignup()">
  <div class="sg-box">
    <button class="sg-x" onclick="closeSignup()" aria-label="Fechar">${icon("xmark")}</button>
    <div class="sg-form">
      <div class="sg-steps"><span class="on"><b>1</b>Sua conta</span><i></i><span class="on"><b>2</b>Seu gatinho</span></div>
      <h2>Entre para o <em>museu.</em></h2>
      <p class="s">Junte figurinhas, avalie vídeos e suba no ranking. Todo mundo começa com o mesmo gato.</p>
      <div class="sg-meth" role="tablist">
        <button data-m="google" onclick="sgMeth('google')">${G}<span>Google</span></button>
        <button data-m="discord" onclick="sgMeth('discord')">${D}<span>Discord</span></button>
        <button data-m="email" onclick="sgMeth('email')">${icon("mail")}<span>E-mail</span></button>
      </div>
      <div class="sg-soc-note" id="sgSoc"></div>
      <div class="sg-fl"><input class="t" id="sgU" placeholder=" " maxlength="20" autocomplete="username"><label for="sgU">Nome de usuário</label></div>
      <div class="sg-em">
        <div class="sg-fl"><input class="t" id="sgE" type="email" placeholder=" " autocomplete="email"><label for="sgE">E-mail</label></div>
        <div class="sg-fl"><input class="t" id="sgP" type="password" placeholder=" " autocomplete="new-password"><label for="sgP">Senha (mín. 6 caracteres)</label></div>
      </div>
      <label class="sg-chk"><input type="checkbox" id="sgChat"><span class="bx">${icon("check")}</span><span>Sou do Xet da live do Cid<small>Já entra como Banda larga e pode enviar memes</small></span></label>
      <div class="sg-err" id="sgErr"></div>
      <button class="sg-go" onclick="submitSignup()"><span id="sgGoT">Criar conta</span> →</button>
      <p class="sg-note">Protótipo: nenhuma conta real é criada. Avatar, moedas e cartas ficam salvos só neste navegador, e a senha não é guardada.</p>
    </div>
    <div class="sg-studio">
      <div class="sg-pv">
        <div class="sg-pv-h">Personalize seu gato</div>
        <div class="big" id="sgBig"></div><div class="sg-breed" id="sgBreed"></div>
        <button class="sg-shuf" onclick="sgShuffle()">${icon("random")} Embaralhar tudo</button>
      </div>
      <div class="sg-opts">
        <div class="sg-tabs" id="sgTabs"></div>
        <div id="sgOpts"></div>
      </div>
    </div>
  </div>
</div>`;document.body.appendChild(d.firstElementChild);
  document.body.insertAdjacentHTML("beforeend",`<dialog id="login-dialog" aria-labelledby="login-heading">
    <h2 id="login-heading">Entrar</h2><p>Em construção. Ainda em fase de testes.</p>
    <form method="dialog"><button>Fechar</button></form>
  </dialog>`);
  document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeSignup();const t=document.getElementById("tp");t&&t.classList.remove("open");const p=document.getElementById("pop");p&&p.classList.remove("open")}});
})();


// ---- redes sociais (logos oficiais) ----
const SOC_P={"twitch": "M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z", "x": "M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z", "instagram": "M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077", "youtube": "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"};
const socSvg=k=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="${SOC_P[k]}"/></svg>`;
const YT_CH=[["Cid Cidoso","@CidCidoso","698 mil inscritos"],["Cortes CidCidoso [OFICIAL]","@CortesCidCidoso","68,5 mil inscritos"],["Lives CidCidoso [OFICIAL]","@LivesCidCidoso","25,6 mil inscritos"]];
function socialHTML(){
  return `<div class="soc"><span class="soc-t">Siga o Não Salvo</span>
   <a class="sb s-tw" href="https://twitch.tv/cidcidoso" target="_blank" rel="noopener" aria-label="Twitch">${socSvg("twitch")}</a>
   <a class="sb s-x" href="https://x.com/naosalvo" target="_blank" rel="noopener" aria-label="X (Twitter)">${socSvg("x")}</a>
   <a class="sb s-ig" href="https://www.instagram.com/naosalvo" target="_blank" rel="noopener" aria-label="Instagram">${socSvg("instagram")}</a>
   <span class="ytw"><button class="sb s-yt" onclick="this.parentElement.classList.toggle('open');event.stopPropagation()" aria-label="Canais no YouTube" aria-haspopup="true">${socSvg("youtube")}</button>
    <span class="ytpop" role="menu"><b>Canais no YouTube</b>${YT_CH.map(([n,h,i])=>`<a href="https://www.youtube.com/${h}" target="_blank" rel="noopener" role="menuitem"><span class="yi">${socSvg("youtube")}</span><span><em>${n}</em><small>${h} · ${i}</small></span></a>`).join("")}</span></span>
  </div>`;
}
document.addEventListener("click",e=>{if(!e.target.closest(".ytw"))document.querySelectorAll(".ytw.open").forEach(x=>x.classList.remove("open"))});

// ---- Rodapé: feedback + links + aviso legal ----
const PHONE_SVG=`<svg viewBox="0 0 160 150" aria-hidden="true"><defs><linearGradient id="phg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff6b6b"/><stop offset="1" stop-color="#c81e3a"/></linearGradient></defs>
<ellipse cx="80" cy="16" rx="34" ry="9" fill="none" stroke="#ffd23f" stroke-width="6"/><ellipse cx="80" cy="16" rx="34" ry="9" fill="none" stroke="#fff6" stroke-width="2"/>
<path d="M34 92c0-14 10-26 24-28h44c14 2 24 14 24 28l8 36c1 6-3 10-9 10H35c-6 0-10-4-9-10z" fill="url(#phg)" stroke="#7a0f22" stroke-width="3"/>
<circle cx="80" cy="102" r="24" fill="#fff" stroke="#7a0f22" stroke-width="3"/>
${[0,1,2,3,4,5,6,7].map(i=>{const a=(i/8)*Math.PI*1.6-Math.PI*1.3;return`<circle cx="${80+16*Math.cos(a)}" cy="${102+16*Math.sin(a)}" r="3.6" fill="#c81e3a"/>`}).join("")}
<circle cx="80" cy="102" r="6" fill="#7a0f22"/>
<path d="M22 58c-4-18 10-30 26-30h64c16 0 30 12 26 30l-4 8c-2 4-6 5-10 3l-14-6c-4-2-5-5-4-9l2-6H52l2 6c1 4 0 7-4 9l-14 6c-4 2-8 1-10-3z" fill="url(#phg)" stroke="#7a0f22" stroke-width="3"/>
<path d="M40 34c10-4 70-4 80 0" stroke="#fff8" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;
function nsPage(){return /album\.html/.test(location.pathname)?"album":"index"}
function ftGo(k){
  const onIdx=nsPage()==="index";
  const fns={rank:"openRank",mod:"openMod",send:"openSubmit",rand:"randomPick"};
  if(k==="feedback")return openFeedback();
  if(onIdx&&fns[k]&&typeof window[fns[k]]==="function")return window[fns[k]]();
  if(onIdx&&k==="tl"){document.getElementById("tl").scrollIntoView({behavior:"smooth"});return}
  if(onIdx&&k==="todos"&&typeof setView==="function")return setView("todos");
  if(onIdx&&k==="top")return window.scrollTo({top:0,behavior:"smooth"});
  location.href=k==="album"?"album.html":"index.html#"+k;
}
function renderFooter(){
  if(document.getElementById("nsft"))return;
  const f=document.createElement("footer");f.id="nsft";f.className="nsft nsft2";
  f.innerHTML=`  <div class="ft-band"><div class="ft-band-in">
    <div class="ft-legal">${socialHTML()}<b>Aviso legal</b>
      <p>O Não Salvo é apenas um compilado de vídeos e fotos que já estão publicados na internet. Não hospedamos nenhum vídeo: todos são exibidos direto do YouTube, pelo player oficial, e continuam pertencendo aos seus autores e canais de origem. As fotos e marcas citadas pertencem aos seus respectivos donos.</p>
      <p>É dono de algum conteúdo e quer que ele saia daqui? <button onclick="openFeedback('remocao')">Peça a remoção</button> e a gente tira.</p>
      <small>© ${new Date().getFullYear()} Não Salvo · projeto do Xet, sem fins lucrativos</small></div>
    <div class="fq fq-in">
      <button class="fq-art" onclick="openFeedback()" aria-label="Mandar feedback">${PHONE_SVG}</button>
      <span class="fq-txt"><span class="fq-logo">fala<i>.</i>que<i>.</i>eu<i>.</i>te<i>.</i>escut<span class="fq-o">o</span></span>
        <span class="fq-l1">feedback? <em>Quer contribuir com ideias?</em></span><span class="fq-l2">a pessoa amada em 7 dias?</span><span class="fq-l3">ajoelha e envia.</span></span>
      <span class="fq-acts"><button class="fq-go" onclick="openFeedback()">${icon("send")}Mandar feedback</button><a class="fq-go alt" href="/contribuir/">${icon("user")}Quero contribuir</a></span>
    </div>
    <img class="ft-boneco" src="boneco.png?v=2" alt="" width="478" height="600">
  </div></div>`;
  document.body.appendChild(f);
}
function openFeedback(tipo){
  let m=document.getElementById("fbm");
  if(!m){m=document.createElement("div");m.id="fbm";m.onclick=e=>{if(e.target===m)m.classList.remove("open")};
    m.innerHTML=`<form class="fb-box" id="fbF" name="feedback" onsubmit="return sendFeedback(event)">
      <button type="button" class="fb-x" onclick="document.getElementById('fbm').classList.remove('open')" aria-label="Fechar">${icon("xmark")}</button>
      <div class="fb-top"><span class="fb-art">${PHONE_SVG}</span><div><span class="fq-logo sm">fala<i>.</i>que<i>.</i>eu<i>.</i>te<i>.</i>escut<span class="fq-o">o</span></span><p>Ideia, bug, crítica ou pedido de remoção. A gente lê tudo.</p></div></div>
      <div class="fb-tipos">${[["ideia","Ideia"],["bug","Bug"],["elogio","Elogio"],["remocao","Remoção"]].map(([k,t])=>`<label><input type="radio" name="tipo" value="${k}"><span>${t}</span></label>`).join("")}</div>
      <textarea name="msg" id="fbMsg" rows="5" maxlength="2000" placeholder="Escreve aqui, sem vergonha…" required></textarea>
      <input name="contato" id="fbC" placeholder="Seu e-mail ou nick (opcional, pra gente responder)" maxlength="120">
      <p class="fb-hp"><input name="bot-field" tabindex="-1" autocomplete="off"></p>
      <div class="fb-err" id="fbErr"></div>
      <button class="fb-go" type="submit">${icon("send")}Ajoelha e envia</button>
    </form>`;document.body.appendChild(m)}
  const r=m.querySelector(`input[value="${tipo||"ideia"}"]`);if(r)r.checked=true;
  m.querySelector("#fbErr").textContent="";m.classList.add("open");setTimeout(()=>m.querySelector("#fbMsg").focus(),60);
}
async function sendFeedback(e){
  e.preventDefault();const f=e.target,msg=f.msg.value.trim(),er=document.getElementById("fbErr");
  if(msg.length<5){er.textContent="Escreve um pouquinho mais.";return false}
  const data={"form-name":"feedback",tipo:(f.tipo.value||"ideia"),msg,contato:f.contato.value.trim(),pagina:location.pathname+location.hash,"bot-field":f["bot-field"].value};
  const btn=f.querySelector(".fb-go");btn.disabled=true;
  let ok=false;
  try{const r=await fetch("/api/feedback",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});ok=r.ok}catch(_){}
  if(!ok){try{const k="ns_feedback",a=JSON.parse(localStorage.getItem(k)||"[]");a.push({...data,ts:Date.now()});localStorage.setItem(k,JSON.stringify(a))}catch(_){}}
  btn.disabled=false;f.reset();document.getElementById("fbm").classList.remove("open");
  toast(ok?"Amém! Feedback recebido.":"Sem conexão: feedback salvo neste navegador.",3400);
  return false;
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",renderFooter);else renderFooter();

// Links <a onclick> sem href não recebem foco do teclado: viram botões acessíveis.
(function(){
  function fix(root){
    (root||document).querySelectorAll("a[onclick]:not([href])").forEach(a=>{
      if(a.dataset.kb)return;a.dataset.kb="1";a.setAttribute("role","button");a.tabIndex=0;
      a.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();a.click()}});
    });
  }
  const run=()=>{fix();new MutationObserver(()=>fix()).observe(document.body,{childList:true,subtree:true})};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",run);else run();
})();


// ---- visitas e cliques (Sobe.Desce de verdade) ----
// visita = abriu o meme; clique = deu play. O servidor conta 1 por meme, pessoa e dia.
// Aqui fica uma cópia local (só deste navegador) para o Sobe.Desce funcionar antes de a API estar no ar.
function registrarEvento(id,tipo){
  if(!id||!/^(visita|clique)$/.test(tipo))return;
  NS.ev=NS.ev||{};const d=nsToday(),e=NS.ev[id]||(NS.ev[id]={});const k=tipo==="visita"?"v":"c";
  const dias=e[k]||(e[k]={});if(!dias[d]){dias[d]=1;e[k+"t"]=(e[k+"t"]||0)+1;
    // guarda só os últimos 3 dias por meme
    Object.keys(dias).sort().slice(0,-3).forEach(x=>delete dias[x]);nsSave()}
  try{fetch("/api/eventos",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({id,tipo}),keepalive:true}).catch(()=>{})}catch(err){}
}
