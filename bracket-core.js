/* bracket-core.js — données + logique du bracket + simulation (partagé par index et /simulation).
   Nécessite thirds-table.js chargé avant (window.THIRD_PLACE_ALLOCATION). */
const T = {
  MEX:{n:"Mexique",f:"mx"}, RSA:{n:"Afrique du Sud",f:"za"}, KOR:{n:"Corée du Sud",f:"kr"}, CZE:{n:"Tchéquie",f:"cz"},
  CAN:{n:"Canada",f:"ca"}, BIH:{n:"Bosnie-Herz.",f:"ba"}, QAT:{n:"Qatar",f:"qa"}, SUI:{n:"Suisse",f:"ch"},
  BRA:{n:"Brésil",f:"br"}, MAR:{n:"Maroc",f:"ma"}, HAI:{n:"Haïti",f:"ht"}, SCO:{n:"Écosse",f:"gb-sct"},
  USA:{n:"États-Unis",f:"us"}, PAR:{n:"Paraguay",f:"py"}, AUS:{n:"Australie",f:"au"}, TUR:{n:"Turquie",f:"tr"},
  GER:{n:"Allemagne",f:"de"}, CUW:{n:"Curaçao",f:"cw"}, CIV:{n:"Côte d’Ivoire",f:"ci"}, ECU:{n:"Équateur",f:"ec"},
  NED:{n:"Pays-Bas",f:"nl"}, JPN:{n:"Japon",f:"jp"}, SWE:{n:"Suède",f:"se"}, TUN:{n:"Tunisie",f:"tn"},
  BEL:{n:"Belgique",f:"be"}, EGY:{n:"Égypte",f:"eg"}, IRN:{n:"Iran",f:"ir"}, NZL:{n:"Nouvelle-Zélande",f:"nz"},
  ESP:{n:"Espagne",f:"es"}, CPV:{n:"Cap-Vert",f:"cv"}, KSA:{n:"Arabie saoudite",f:"sa"}, URU:{n:"Uruguay",f:"uy"},
  FRA:{n:"France",f:"fr"}, SEN:{n:"Sénégal",f:"sn"}, IRQ:{n:"Irak",f:"iq"}, NOR:{n:"Norvège",f:"no"},
  ARG:{n:"Argentine",f:"ar"}, ALG:{n:"Algérie",f:"dz"}, AUT:{n:"Autriche",f:"at"}, JOR:{n:"Jordanie",f:"jo"},
  POR:{n:"Portugal",f:"pt"}, COD:{n:"RD Congo",f:"cd"}, UZB:{n:"Ouzbékistan",f:"uz"}, COL:{n:"Colombie",f:"co"},
  ENG:{n:"Angleterre",f:"gb-eng"}, CRO:{n:"Croatie",f:"hr"}, GHA:{n:"Ghana",f:"gh"}, PAN:{n:"Panama",f:"pa"}
};
const GROUPS = {A:["MEX","RSA","KOR","CZE"],B:["CAN","BIH","QAT","SUI"],C:["BRA","MAR","HAI","SCO"],
  D:["USA","PAR","AUS","TUR"],E:["GER","CUW","CIV","ECU"],F:["NED","JPN","SWE","TUN"],
  G:["BEL","EGY","IRN","NZL"],H:["ESP","CPV","KSA","URU"],I:["FRA","SEN","IRQ","NOR"],
  J:["ARG","ALG","AUT","JOR"],K:["POR","COD","UZB","COL"],L:["ENG","CRO","GHA","PAN"]};

// [no, group, home, away, "UTC", city, hs, as, status]   status: 'FT' | '' (à venir)
const G = (no,g,h,a,utc,city,hs,as,st)=>({no,stage:'G',g,h,a,utc:Date.parse(utc),city,hs,as,st:st||''});
const MATCHES = [
G(1,'A','MEX','RSA','2026-06-11T19:00Z','Mexico',2,0,'FT'),
G(2,'A','KOR','CZE','2026-06-12T02:00Z','Guadalajara',2,1,'FT'),
G(3,'B','CAN','BIH','2026-06-12T19:00Z','Toronto',1,1,'FT'),
G(4,'D','USA','PAR','2026-06-13T01:00Z','Los Angeles',4,1,'FT'),
G(5,'B','QAT','SUI','2026-06-13T19:00Z','San Francisco',1,1,'FT'),
G(6,'C','BRA','MAR','2026-06-13T22:00Z','New York/NJ',1,1,'FT'),
G(7,'C','HAI','SCO','2026-06-14T01:00Z','Boston',0,1,'FT'),
G(8,'D','AUS','TUR','2026-06-14T04:00Z','Vancouver',2,0,'FT'),
G(9,'E','GER','CUW','2026-06-14T17:00Z','Houston',null,null,''),
G(10,'F','NED','JPN','2026-06-14T20:00Z','Dallas',null,null,''),
G(11,'E','CIV','ECU','2026-06-14T23:00Z','Philadelphie',null,null,''),
G(12,'F','SWE','TUN','2026-06-15T02:00Z','Monterrey',null,null,''),
G(13,'H','ESP','CPV','2026-06-15T16:00Z','Atlanta',null,null,''),
G(14,'G','BEL','EGY','2026-06-15T19:00Z','Vancouver',null,null,''),
G(15,'H','KSA','URU','2026-06-15T22:00Z','Miami',null,null,''),
G(16,'G','IRN','NZL','2026-06-16T01:00Z','Los Angeles',null,null,''),
G(17,'I','FRA','SEN','2026-06-16T19:00Z','New York/NJ',null,null,''),
G(18,'I','IRQ','NOR','2026-06-16T22:00Z','Boston',null,null,''),
G(19,'J','ARG','ALG','2026-06-17T01:00Z','Kansas City',null,null,''),
G(20,'J','AUT','JOR','2026-06-17T04:00Z','San Francisco',null,null,''),
G(21,'K','POR','COD','2026-06-17T17:00Z','Houston',null,null,''),
G(22,'L','ENG','CRO','2026-06-17T20:00Z','Dallas',null,null,''),
G(23,'L','GHA','PAN','2026-06-17T23:00Z','Toronto',null,null,''),
G(24,'K','UZB','COL','2026-06-18T02:00Z','Mexico',null,null,''),
G(25,'A','CZE','RSA','2026-06-18T16:00Z','Atlanta',null,null,''),
G(26,'B','SUI','BIH','2026-06-18T19:00Z','Los Angeles',null,null,''),
G(27,'B','CAN','QAT','2026-06-18T22:00Z','Vancouver',null,null,''),
G(28,'A','MEX','KOR','2026-06-19T01:00Z','Guadalajara',null,null,''),
G(29,'D','USA','AUS','2026-06-19T19:00Z','Seattle',null,null,''),
G(30,'C','SCO','MAR','2026-06-19T22:00Z','Boston',null,null,''),
G(31,'C','BRA','HAI','2026-06-20T00:30Z','Philadelphie',null,null,''),
G(32,'D','TUR','PAR','2026-06-20T03:00Z','San Francisco',null,null,''),
G(33,'F','NED','SWE','2026-06-20T17:00Z','Houston',null,null,''),
G(34,'E','GER','CIV','2026-06-20T20:00Z','Toronto',null,null,''),
G(35,'E','ECU','CUW','2026-06-21T03:00Z','Kansas City',null,null,''),
G(36,'F','TUN','JPN','2026-06-21T04:00Z','Monterrey',null,null,''),
G(37,'H','ESP','KSA','2026-06-21T16:00Z','Atlanta',null,null,''),
G(38,'G','BEL','IRN','2026-06-21T19:00Z','Los Angeles',null,null,''),
G(39,'H','URU','CPV','2026-06-21T22:00Z','Miami',null,null,''),
G(40,'G','NZL','EGY','2026-06-22T01:00Z','Vancouver',null,null,''),
G(41,'J','ARG','AUT','2026-06-22T17:00Z','Dallas',null,null,''),
G(42,'I','FRA','IRQ','2026-06-22T21:00Z','Philadelphie',null,null,''),
G(43,'I','NOR','SEN','2026-06-23T00:00Z','New York/NJ',null,null,''),
G(44,'J','JOR','ALG','2026-06-23T03:00Z','San Francisco',null,null,''),
G(45,'K','POR','UZB','2026-06-23T17:00Z','Houston',null,null,''),
G(46,'L','ENG','GHA','2026-06-23T20:00Z','Boston',null,null,''),
G(47,'L','PAN','CRO','2026-06-23T23:00Z','Toronto',null,null,''),
G(48,'K','COL','COD','2026-06-24T02:00Z','Guadalajara',null,null,''),
G(49,'B','SUI','CAN','2026-06-24T19:00Z','Vancouver',null,null,''),
G(50,'B','BIH','QAT','2026-06-24T19:00Z','Seattle',null,null,''),
G(51,'C','SCO','BRA','2026-06-24T22:00Z','Miami',null,null,''),
G(52,'C','MAR','HAI','2026-06-24T22:00Z','Atlanta',null,null,''),
G(53,'A','CZE','MEX','2026-06-25T01:00Z','Mexico',null,null,''),
G(54,'A','RSA','KOR','2026-06-25T01:00Z','Monterrey',null,null,''),
G(55,'E','ECU','GER','2026-06-25T20:00Z','New York/NJ',null,null,''),
G(56,'E','CUW','CIV','2026-06-25T20:00Z','Philadelphie',null,null,''),
G(57,'F','JPN','SWE','2026-06-25T23:00Z','Dallas',null,null,''),
G(58,'F','TUN','NED','2026-06-25T23:00Z','Kansas City',null,null,''),
G(59,'D','TUR','USA','2026-06-26T02:00Z','Los Angeles',null,null,''),
G(60,'D','PAR','AUS','2026-06-26T02:00Z','San Francisco',null,null,''),
G(61,'I','NOR','FRA','2026-06-26T19:00Z','Boston',null,null,''),
G(62,'I','SEN','IRQ','2026-06-26T19:00Z','Toronto',null,null,''),
G(63,'H','CPV','KSA','2026-06-27T00:00Z','Houston',null,null,''),
G(64,'H','URU','ESP','2026-06-27T00:00Z','Guadalajara',null,null,''),
G(65,'G','EGY','IRN','2026-06-27T03:00Z','Seattle',null,null,''),
G(66,'G','NZL','BEL','2026-06-27T03:00Z','Vancouver',null,null,''),
G(67,'L','PAN','ENG','2026-06-27T21:00Z','New York/NJ',null,null,''),
G(68,'L','CRO','GHA','2026-06-27T21:00Z','Philadelphie',null,null,''),
G(69,'K','COL','POR','2026-06-27T23:30Z','Miami',null,null,''),
G(70,'K','COD','UZB','2026-06-27T23:30Z','Atlanta',null,null,''),
G(71,'J','ALG','AUT','2026-06-28T02:00Z','Kansas City',null,null,''),
G(72,'J','JOR','ARG','2026-06-28T02:00Z','Dallas',null,null,'')
];

/* Bracket structurel (équipes à déterminer) */
const KO = [
 {no:73,r:'R32',h:'2ᵉ Gr. A',a:'2ᵉ Gr. B'},
 {no:74,r:'R32',h:'1ᵉʳ Gr. E',a:'3ᵉ A/B/C/D/F'},
 {no:75,r:'R32',h:'1ᵉʳ Gr. F',a:'2ᵉ Gr. C'},
 {no:76,r:'R32',h:'1ᵉʳ Gr. C',a:'2ᵉ Gr. F'},
 {no:77,r:'R32',h:'1ᵉʳ Gr. I',a:'3ᵉ C/D/F/G/H'},
 {no:78,r:'R32',h:'2ᵉ Gr. E',a:'2ᵉ Gr. I'},
 {no:79,r:'R32',h:'1ᵉʳ Gr. A',a:'3ᵉ C/E/F/H/I'},
 {no:80,r:'R32',h:'1ᵉʳ Gr. L',a:'3ᵉ E/H/I/J/K'},
 {no:81,r:'R32',h:'1ᵉʳ Gr. D',a:'3ᵉ B/E/F/I/J'},
 {no:82,r:'R32',h:'1ᵉʳ Gr. G',a:'3ᵉ A/E/H/I/J'},
 {no:83,r:'R32',h:'2ᵉ Gr. K',a:'2ᵉ Gr. L'},
 {no:84,r:'R32',h:'1ᵉʳ Gr. H',a:'2ᵉ Gr. J'},
 {no:85,r:'R32',h:'1ᵉʳ Gr. B',a:'3ᵉ E/F/G/I/J'},
 {no:86,r:'R32',h:'1ᵉʳ Gr. J',a:'2ᵉ Gr. H'},
 {no:87,r:'R32',h:'1ᵉʳ Gr. K',a:'3ᵉ D/E/I/J/L'},
 {no:88,r:'R32',h:'2ᵉ Gr. D',a:'2ᵉ Gr. G'},
 {no:89,r:'R16',h:'V74',a:'V77'},{no:90,r:'R16',h:'V73',a:'V75'},
 {no:91,r:'R16',h:'V76',a:'V78'},{no:92,r:'R16',h:'V79',a:'V80'},
 {no:93,r:'R16',h:'V83',a:'V84'},{no:94,r:'R16',h:'V81',a:'V82'},
 {no:95,r:'R16',h:'V86',a:'V88'},{no:96,r:'R16',h:'V85',a:'V87'},
 {no:97,r:'QF',h:'V89',a:'V90'},{no:98,r:'QF',h:'V93',a:'V94'},
 {no:99,r:'QF',h:'V91',a:'V92'},{no:100,r:'QF',h:'V95',a:'V96'},
 {no:101,r:'SF',h:'V97',a:'V98'},{no:102,r:'SF',h:'V99',a:'V100'},
 {no:103,r:'3P',h:'Perdant 101',a:'Perdant 102'},
 {no:104,r:'F',h:'V101',a:'V102'}
];
/* Créneaux officiels des phases finales (date · ville · heure) */
const S=(r,utc,city)=>({r,utc:Date.parse(utc),city});
const SLOTS=[
 S('R32','2026-06-28T19:00Z','Los Angeles'),S('R32','2026-06-29T17:00Z','Houston'),
 S('R32','2026-06-29T20:30Z','Boston'),S('R32','2026-06-30T01:00Z','Monterrey'),
 S('R32','2026-06-30T17:00Z','Dallas'),S('R32','2026-06-30T21:00Z','New York/NJ'),
 S('R32','2026-07-01T01:00Z','Mexico'),S('R32','2026-07-01T16:00Z','Atlanta'),
 S('R32','2026-07-01T20:00Z','Seattle'),S('R32','2026-07-02T00:00Z','San Francisco'),
 S('R32','2026-07-02T19:00Z','Los Angeles'),S('R32','2026-07-02T23:00Z','Toronto'),
 S('R32','2026-07-03T03:00Z','Vancouver'),S('R32','2026-07-03T18:00Z','Dallas'),
 S('R32','2026-07-03T22:00Z','Miami'),S('R32','2026-07-04T01:30Z','Kansas City'),
 S('R16','2026-07-04T17:00Z','Houston'),S('R16','2026-07-04T21:00Z','Philadelphie'),
 S('R16','2026-07-05T20:00Z','New York/NJ'),S('R16','2026-07-06T00:00Z','Mexico'),
 S('R16','2026-07-06T19:00Z','Dallas'),S('R16','2026-07-07T00:00Z','Seattle'),
 S('R16','2026-07-07T16:00Z','Atlanta'),S('R16','2026-07-07T20:00Z','Vancouver'),
 S('QF','2026-07-09T20:00Z','Boston'),S('QF','2026-07-10T19:00Z','Los Angeles'),
 S('QF','2026-07-11T21:00Z','Miami'),S('QF','2026-07-12T01:00Z','Kansas City'),
 S('SF','2026-07-14T19:00Z','Dallas'),S('SF','2026-07-15T19:00Z','Atlanta'),
 S('3P','2026-07-18T21:00Z','Miami'),S('F','2026-07-19T19:00Z','New York/NJ')
];
const RLABEL={R32:'Barrages',R16:'8ᵉ de finale',QF:'Quart',SF:'Demi-finale','3P':'3ᵉ place',F:'Finale'};
/* ============ Logique du bracket + simulation (partagé) ============ */
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function flag(code,cls){const f=T[code].f;return `<img class="flag${cls?' '+cls:''}" src="https://flagcdn.com/w40/${f}.png" srcset="https://flagcdn.com/w80/${f}.png 2x" alt="" loading="lazy">`;}
function fmini(code){const f=T[code].f;return `<img class="fmini" src="https://flagcdn.com/w40/${f}.png" alt="" loading="lazy">`;}
const pairKey=(a,b)=>[a,b].sort().join('|');
// un match d'élim. est "tranché" s'il a un vainqueur, ou un score final décisif.
// Les matchs LIVE / à venir / nuls sans vainqueur ne le sont PAS → la simulation doit les jouer
// (sinon un match en cours bloque tout le bracket et aucun champion n'est désigné).
function koDecided(sc){ return !!(sc && sc.hs!=null && (sc.winner || (sc.st==='FT' && sc.hs!==sc.as))); }
let koScores={}, koOfficial={};
let THIRDS_TABLE=(typeof window!=='undefined'&&window.THIRD_PLACE_ALLOCATION)?window.THIRD_PLACE_ALLOCATION:{};
const HOST_NODE={E:74,I:77,A:79,L:80,D:81,G:82,B:85,K:87};

function standings(g){
  const rows={}; GROUPS[g].forEach(c=>rows[c]={c,J:0,G:0,N:0,P:0,bp:0,bc:0,Pts:0});
  MATCHES.filter(m=>m.g===g&&m.hs!=null&&m.as!=null).forEach(m=>{
    const H=rows[m.h],A=rows[m.a]; H.J++;A.J++;H.bp+=m.hs;H.bc+=m.as;A.bp+=m.as;A.bc+=m.hs;
    if(m.hs>m.as){H.G++;A.P++;H.Pts+=3;}else if(m.hs<m.as){A.G++;H.P++;A.Pts+=3;}else{H.N++;A.N++;H.Pts++;A.Pts++;}
  });
  return Object.values(rows).sort((a,b)=>b.Pts-a.Pts||(b.bp-b.bc)-(a.bp-a.bc)||b.bp-a.bp||T[a.c].n.localeCompare(T[b.c].n));
}
function groupPlayed(g){return MATCHES.filter(m=>m.g===g&&m.hs!=null&&m.as!=null).length;}
function groupFinal(g){return groupPlayed(g)===6;}
function computeThirds(){
  if(!Object.keys(GROUPS).every(groupFinal)) return {};
  const qualif=bestThirds().ranked.slice(0,8).map(t=>t.g);
  const row=THIRDS_TABLE[qualif.slice().sort().join('')];
  if(!row) return {};
  const map={};
  Object.keys(row).forEach(host=>{ const n=HOST_NODE[host]; if(n) map[n]=row[host]; });
  return map;
}
function resolveBracket(useOfficial){
  if(useOfficial===undefined) useOfficial=true;
  const teams={}, res={}, tmap=computeThirds();
  function fromLabel(label){
    let mm=label.match(/Gr\. ([A-L])$/);
    if(mm){ const g=mm[1]; if(groupPlayed(g)===0) return null;
      const st=standings(g), row=/^2/.test(label)?st[1]:st[0];
      return row?{code:row.c,prov:!groupFinal(g)}:null;
    }
    if(mm=label.match(/^V(\d+)$/)){ const r=res[+mm[1]]; return r&&r.w?{code:r.w,prov:r.prov}:null; }
    if(/Perdant/.test(label)){ mm=label.match(/(\d+)/); const r=res[+mm[1]]; return r&&r.l?{code:r.l,prov:r.prov}:null; }
    return null;
  }
  function nodeSide(k,label){
    if(/^3/.test(label)){ const g=tmap[k.no]; if(!g||groupPlayed(g)===0) return null; const st=standings(g); return st[2]?{code:st[2].c,prov:!groupFinal(g)}:null; }
    return fromLabel(label);
  }
  for(let pass=0;pass<7;pass++){
    KO.forEach(k=>{
      let h,a;
      const off=useOfficial?koOfficial[k.no]:null;
      if(off){ h=off.h&&T[off.h]?{code:off.h,prov:false}:null; a=off.a&&T[off.a]?{code:off.a,prov:false}:null; }
      else { h=nodeSide(k,k.h); a=nodeSide(k,k.a); }
      teams[k.no]={h,a};
      if(h&&a){
        const sc=koScores[pairKey(h.code,a.code)];
        if(sc&&sc.hs!=null){
          const hs=sc.h===h.code?sc.hs:sc.as, as=sc.h===h.code?sc.as:sc.hs;
          let w=sc.winner||null,l=null;
          if(w) l=(w===h.code?a.code:h.code);
          else if(sc.st==='FT'){ if(hs>as){w=h.code;l=a.code;} else if(as>hs){w=a.code;l=h.code;} }
          res[k.no]={hs,as,st:sc.st,w,l,prov:(h.prov||a.prov||sc.st==='LIVE')};
        } else delete res[k.no];
      } else delete res[k.no];
    });
  }
  return {teams,res};
}
function bestThirds(){
  const gs=Object.keys(GROUPS).filter(g=>groupPlayed(g)>0);
  const thirds=gs.map(g=>{const st=standings(g),r=st[2];return r?{g,c:r.c,Pts:r.Pts,gd:r.bp-r.bc,gf:r.bp,prov:!groupFinal(g)}:null;}).filter(Boolean);
  thirds.sort((a,b)=>b.Pts-a.Pts||b.gd-a.gd||b.gf-a.gf||T[a.c].n.localeCompare(T[b.c].n));
  return {ranked:thirds, complete:Object.keys(GROUPS).every(groupFinal)};
}

/* ---- rendu de l'arbre (deux côtés vers la finale) ---- */
function bracketTreeHTML(rb){
  const Lcols=[['Barrages','r32',[74,77,73,75,83,84,81,82]],['8ᵉ de finale','r16',[89,90,93,94]],['Quarts','qf',[97,98]],['Demi-finale','sf',[101]]];
  const Rcols=[['Demi-finale','sf',[102]],['Quarts','qf',[99,100]],['8ᵉ de finale','r16',[91,92,95,96]],['Barrages','r32',[76,78,79,80,86,88,85,87]]];
  const btside=(label,resolved,win,score)=>{
    const sc=score!=null?`<span class="ts">${score}</span>`:'';
    if(resolved) return `<div class="trow${win?' w':''}${resolved.prov?' prov':''}">${fmini(resolved.code)}<span class="tn">${T[resolved.code].n}</span>${sc}</div>`;
    return `<div class="trow ph"><span class="tn">${esc(label)}</span>${sc}</div>`;
  };
  const bcard=(no)=>{
    const k=KO.find(x=>x.no===no), t=rb.teams[no]||{}, res=rb.res[no];
    const hWin=res&&res.w&&t.h&&res.w===t.h.code, aWin=res&&res.w&&t.a&&res.w===t.a.code;
    return `<div class="tmatch"><div class="tcard${k.r==='F'?' final':''}">`
      +`<div class="tno">${k.r==='3P'?'Petite finale':'M'+no}</div>`
      +btside(k.h,t.h,hWin,res?res.hs:null)+btside(k.a,t.a,aWin,res?res.as:null)+`</div></div>`;
  };
  const bcol=(c)=>`<div class="tcol ${c[1]}"><div class="tch">${c[0]}</div><div class="tmatches">${c[2].map(bcard).join('')}</div></div>`;
  let html='<div class="bracket-scroll"><div class="tree">';
  html+='<div class="tside l">'+Lcols.map(bcol).join('')+'</div>';
  html+='<div class="tcenter"><div class="tfinal"><div class="tch">Finale · 19 juil.</div><div class="trophy">🏆</div>'+bcard(104)+'</div><div class="tthird"><div class="tch">Match pour la 3ᵉ place</div>'+bcard(103)+'</div></div>';
  html+='<div class="tside r">'+Rcols.map(bcol).join('')+'</div>';
  html+='</div></div>';
  return html;
}

/* ---- moteur de simulation ---- */
function simGoals(){const r=Math.random();return r<0.30?0:r<0.60?1:r<0.82?2:r<0.94?3:4;}
function simStepOnce(){
  const g=MATCHES.filter(m=>m.hs==null).sort((a,b)=>a.utc-b.utc)[0];
  if(g){ g.hs=simGoals(); g.as=simGoals(); g.st='FT'; return 'group'; }
  const rb=resolveBracket();
  for(const k of KO){
    const t=rb.teams[k.no];
    if(t&&t.h&&t.a){
      const key=pairKey(t.h.code,t.a.code);
      if(!koDecided(koScores[key])){
        let hs=simGoals(),as=simGoals(),w;
        w=hs===as?(Math.random()<0.5?t.h.code:t.a.code):(hs>as?t.h.code:t.a.code);
        koScores[key]={h:t.h.code,a:t.a.code,hs,as,st:'FT',winner:w};
        return 'ko';
      }
    }
  }
  return null;
}
function simReset(){ MATCHES.forEach(m=>{m.hs=null;m.as=null;m.st='';}); koScores={}; koOfficial={}; }

/* ---- ESPN : résultats réels + affiches officielles ---- */
const ESPN='https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=';
function ymd(ms){const d=new Date(ms);return d.getUTCFullYear()+String(d.getUTCMonth()+1).padStart(2,'0')+String(d.getUTCDate()).padStart(2,'0');}
function dateList(fromMs,toMs){const out=[];for(let t=fromMs;t<=toMs+1;t+=86400000)out.push(ymd(t));return [...new Set(out)];}
async function fetchScores(dates,includePre){
  const want=includePre?['pre','in','post']:['in','post'];
  const out=[];
  for(let i=0;i<dates.length;i+=6){                 // petits lots pour rester poli
    const batch=dates.slice(i,i+6);
    const settled=await Promise.allSettled(batch.map(d=>fetch(ESPN+d).then(r=>r.ok?r.json():null)));
    settled.forEach(s=>{
      if(s.status!=='fulfilled'||!s.value) return;
      (s.value.events||[]).forEach(e=>{
        const comp=e.competitions&&e.competitions[0]; if(!comp||!comp.competitors) return;
        const state=e.status&&e.status.type&&e.status.type.state;   // 'pre' | 'in' | 'post'
        if(want.indexOf(state)<0) return;                           // selon includePre
        const pre=(state==='pre');
        let H,A,winner=null;
        comp.competitors.forEach(c=>{
          let code=c.team&&c.team.abbreviation;                     // ex: 'GER','CUW' = nos codes
          if(!T[code]) code=toCode(c.team&&c.team.displayName);     // filet de sécurité par le nom
          const o={code,score:parseInt(c.score,10)};
          if(c.winner===true) winner=code;                          // ESPN marque le qualifié (gère les tirs au but)
          if(c.homeAway==='home')H=o; else A=o;
        });
        if(!H||!A||!T[H.code]||!T[A.code]) return;
        if(!pre&&(isNaN(H.score)||isNaN(A.score))) return;
        out.push({h:H.code,a:A.code,hs:pre?null:H.score,as:pre?null:A.score,st:pre?'PRE':(state==='in'?'LIVE':'FT'),winner:(winner&&T[winner])?winner:null});
      });
    });
  }
  return out;
}
function mergeScores(arr){
  let n=0;
  arr.forEach(o=>{
    if(o.hs==null) return;                                   // ignore les affiches non commencées (PRE)
    const m=MATCHES.find(x=>(x.h===o.h&&x.a===o.a)||(x.h===o.a&&x.a===o.h));
    if(m){
      const swap=(m.h!==o.h);
      const nh=swap?o.as:o.hs, na=swap?o.hs:o.as;
      if(m.hs!==nh||m.as!==na||m.st!==o.st){m.hs=nh;m.as=na;m.st=o.st;n++;}
      return;
    }
    // pas un match de poule → résultat de phase finale (indexé par paire d'équipes)
    const k=pairKey(o.h,o.a), prev=koScores[k];
    if(!prev||prev.hs!==o.hs||prev.as!==o.as||prev.st!==o.st||prev.winner!==o.winner){
      koScores[k]={h:o.h,a:o.a,hs:o.hs,as:o.as,st:o.st,winner:o.winner||null}; n++;
    }
  });
  return n;
}
/* Récupère les AFFICHES officielles des phases finales sur ESPN (équipes connues même avant le coup
   d'envoi) et les rattache à chaque n° de match via un côté déjà déterminé par les groupes.
   Sert de juge de paix : corrige automatiquement l'affectation des 3ᵉˢ une fois la FIFA passée. */
async function syncKoOfficial(){
  const koDates=dateList(Date.parse('2026-06-28T00:00Z'), Date.parse('2026-07-20T00:00Z'));
  const fixtures=await fetchScores(koDates,true);              // inclut les matchs « pre »
  if(!fixtures.length) return 0;
  const base=resolveBracket(false).teams;                     // résolution SANS override, pour les côtés connus
  let n=0;
  fixtures.forEach(fx=>{
    for(const k of KO){
      const t=base[k.no]; if(!t) continue;
      const known=[t.h&&t.h.code,t.a&&t.a.code].filter(Boolean);
      if(!known.length) continue;
      if(known.indexOf(fx.h)>=0||known.indexOf(fx.a)>=0){       // un côté connu correspond → c'est ce match
        const cur=koOfficial[k.no];
        if(!cur||cur.h!==fx.h||cur.a!==fx.a){ koOfficial[k.no]={h:fx.h,a:fx.a}; n++; }
        break;
      }
    }
  });
  return n;
}
const NAME2CODE=(()=>{
  const map={};
  const add=(code,...names)=>names.forEach(x=>map[norm(x)]=code);
  Object.keys(T).forEach(c=>add(c,T[c].n,c));
  add('MEX','mexico','mexique');add('RSA','south africa','afrique du sud');add('KOR','south korea','korea republic','korea','corée du sud','south-korea');
  add('CZE','czechia','czech republic','tchequie');add('CAN','canada');add('BIH','bosnia','bosnia and herzegovina','bosnie');add('QAT','qatar');add('SUI','switzerland','suisse');
  add('BRA','brazil','bresil');add('MAR','morocco','maroc');add('HAI','haiti');add('SCO','scotland','ecosse');
  add('USA','usa','united states','etats-unis','us');add('PAR','paraguay');add('AUS','australia','australie');add('TUR','turkiye','turkey','turquie','türkiye');
  add('GER','germany','allemagne');add('CUW','curacao','curaçao');add('CIV','ivory coast','cote divoire','côte divoire','cote d ivoire');add('ECU','ecuador','equateur');
  add('NED','netherlands','pays-bas','holland');add('JPN','japan','japon');add('SWE','sweden','suede');add('TUN','tunisia','tunisie');
  add('BEL','belgium','belgique');add('EGY','egypt','egypte');add('IRN','iran','ir iran');add('NZL','new zealand','nouvelle-zelande');
  add('ESP','spain','espagne');add('CPV','cape verde','cabo verde','cap-vert');add('KSA','saudi arabia','arabie saoudite','saudi');add('URU','uruguay');
  add('FRA','france');add('SEN','senegal');add('IRQ','iraq','irak');add('NOR','norway','norvege');
  add('ARG','argentina','argentine');add('ALG','algeria','algerie');add('AUT','austria','autriche');add('JOR','jordan','jordanie');
  add('POR','portugal');add('COD','dr congo','democratic republic of congo','drc','rd congo','congo dr');add('UZB','uzbekistan','ouzbekistan');add('COL','colombia','colombie');
  add('ENG','england','angleterre');add('CRO','croatia','croatie');add('GHA','ghana');add('PAN','panama');
  return map;
})();
function norm(s){return (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z ]/g,' ').replace(/\s+/g,' ').trim();}
function toCode(name){return NAME2CODE[norm(name)]||null;}
function snapshotReal(){return{
  matches:MATCHES.map(m=>({no:m.no,hs:m.hs,as:m.as,st:m.st})),
  koScores:JSON.parse(JSON.stringify(koScores)),
  koOfficial:JSON.parse(JSON.stringify(koOfficial))
};}
function restoreReal(b){
  b.matches.forEach(s=>{const m=MATCHES.find(x=>x.no===s.no); m.hs=s.hs;m.as=s.as;m.st=s.st;});
  // copie profonde : sinon simOnce()/simOnceModel() muteraient koScores ET le snapshot partagé,
  // polluant les simulations suivantes (bracket incohérent → pas de champion). Chaque restore = état propre.
  koScores=JSON.parse(JSON.stringify(b.koScores)); koOfficial=JSON.parse(JSON.stringify(b.koOfficial));
}

async function loadReal(){
  // récupère les vrais résultats déjà connus (poules + élim. directe) — ne simule rien
  const dates=dateList(Date.parse('2026-06-11T00:00Z'), Date.now()+86400000);
  try{ mergeScores(await fetchScores(dates)); }catch(e){}
  try{ await syncKoOfficial(); }catch(e){}
}
