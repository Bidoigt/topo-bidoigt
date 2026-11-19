const STORAGE_KEY = 'topo-bidoigt-carnet-v1';
let voies = [];
let carnet = loadCarnet();
let selectedId = null;
let deferredInstallPrompt = null;

const $ = id => document.getElementById(id);
const els = {
  niveau:$('niveauFilter'), ligne:$('ligneFilter'), suivi:$('suiviFilter'), list:$('routeList'),
  empty:$('emptyState'), result:$('resultCount'), progress:$('progressCount'), dialog:$('detailDialog'),
  title:$('detailTitle'), lieu:$('detailLieu'), meta:$('detailMeta'), moulinette:$('moulinetteInput'),
  tete:$('teteInput'), enchaineeMoulinette:$('enchaineeMoulinetteInput'), enchaineeTete:$('enchaineeTeteInput'),
  comment:$('commentInput'), status:$('saveStatus')
};

function loadCarnet(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY))||{}}catch{return {}}}
function persistCarnet(){localStorage.setItem(STORAGE_KEY,JSON.stringify(carnet))}
function cleanString(value){return String(value??'').trim()}
function normalize(value){return cleanString(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function displayColorFor(name){return {vert:'#43a35b',bleu:'#3875d7',violet:'#8057b2',rouge:'#d5473f'}[normalize(name)]||'#87958b'}
function holdColorFor(name){
  const n=normalize(name);
  if(n.includes('azur'))return '#35aee8'; if(n.includes('fluo')&&n.includes('vert'))return '#68f04d';
  if(n.includes('saumon'))return '#fa8f7b'; if(n.includes('rose'))return '#df6fa5'; if(n.includes('jaun'))return '#f2c72e';
  if(n.includes('bleu'))return '#3e7bd8'; if(n.includes('vert'))return '#54a967'; if(n.includes('roug'))return '#d94f47';
  if(n.includes('violet'))return '#8b68be'; if(n.includes('blanc'))return '#f7f7f1'; if(n.includes('gris'))return '#929995';
  if(n.includes('orange'))return '#ed872f'; if(n.includes('noir'))return '#303632'; return '#87958b';
}
function isDone(entry){return Boolean(entry?.moulinette||entry?.tete)}
function normalizeEntry(entry={}){return {moulinette:Boolean(entry.moulinette),enchaineeMoulinette:Boolean(entry.moulinette&&entry.enchaineeMoulinette),tete:Boolean(entry.tete),enchaineeTete:Boolean(entry.tete&&(entry.enchaineeTete??entry.enchainee)),commentaire:cleanString(entry.commentaire),modifieLe:entry.modifieLe||''}}

async function init(){
  try{
    const response=await fetch('./voies.json',{cache:'no-store'}); if(!response.ok)throw new Error(`HTTP ${response.status}`);
    voies=(await response.json()).filter(v=>v.active!==false); populateFilters(); render();
  }catch(error){els.empty.textContent="Impossible de charger le topo. Ouvrez l'application depuis son adresse web.";els.empty.classList.remove('hidden');console.error(error)}
  if('serviceWorker'in navigator)navigator.serviceWorker.register('./service-worker.js').catch(console.error);
}
function populateFilters(){
  [...new Set(voies.map(v=>v.niveau))].sort((a,b)=>a-b).forEach(v=>els.niveau.add(new Option(String(v),String(v))));
  [...new Set(voies.map(v=>v.ligne))].sort((a,b)=>a-b).forEach(v=>els.ligne.add(new Option(String(v),String(v))));
}
function filteredVoies(){
  const niveau=els.niveau.value,ligne=els.ligne.value,suivi=els.suivi.value;
  return voies.filter(v=>{const e=normalizeEntry(carnet[v.id]);
    if(niveau&&String(v.niveau)!==niveau)return false;if(ligne&&String(v.ligne)!==ligne)return false;
    if(suivi==='faites'&&!isDone(e))return false;if(suivi==='moulinette'&&!e.moulinette)return false;
    if(suivi==='tete'&&!e.tete)return false;if(suivi==='enchainee'&&!(e.enchaineeMoulinette||e.enchaineeTete))return false;
    if(suivi==='commentee'&&!e.commentaire)return false;if(suivi==='nonfaite'&&isDone(e))return false;return true;
  }).sort((a,b)=>a.ligne-b.ligne||a.niveau-b.niveau||a.cotation.localeCompare(b.cotation,'fr'));
}
function makeBadge(text,title,className=''){const b=document.createElement('span');b.className=`badge ${className}`.trim();b.textContent=text;b.title=title;b.setAttribute('aria-label',title);return b}
function render(){
  const displayed=filteredVoies();els.list.replaceChildren();const template=$('routeTemplate');
  displayed.forEach(voie=>{
    const node=template.content.cloneNode(true),card=node.querySelector('.route-card'),e=normalizeEntry(carnet[voie.id]);
    node.querySelector('.route-accent').style.background=displayColorFor(voie.affichage);
    node.querySelector('.route-grade').textContent=`${voie.cotation} ·`;
    node.querySelector('.route-hold').style.setProperty('--hold-color',holdColorFor(voie.couleur));
    node.querySelector('.route-color-label').textContent=voie.couleur;
    node.querySelector('.route-subtitle').textContent=`${voie.lieu} · Ligne ${voie.ligne}`;
    if(e.commentaire)node.querySelector('.slot-note').append(makeBadge('✎','Commentaire','note'));
    if(e.moulinette)node.querySelector('.slot-m').append(makeBadge('M',e.enchaineeMoulinette?'Moulinette · Enchaînée':'Moulinette',e.enchaineeMoulinette?'chained':''));
    if(e.tete)node.querySelector('.slot-t').append(makeBadge('T',e.enchaineeTete?'En tête · Enchaînée':'En tête',`head${e.enchaineeTete?' chained':''}`));
    card.addEventListener('click',()=>openDetail(voie.id));els.list.append(node);
  });
  const done=voies.filter(v=>isDone(normalizeEntry(carnet[v.id]))).length;
  els.result.textContent=`${displayed.length} voie${displayed.length>1?'s':''}`;els.progress.textContent=`${done} réalisée${done>1?'s':''} sur ${voies.length}`;
  els.empty.classList.toggle('hidden',displayed.length!==0);
}
function syncChainedState(){
  els.enchaineeMoulinette.disabled=!els.moulinette.checked;
  if(!els.moulinette.checked)els.enchaineeMoulinette.checked=false;
  els.enchaineeTete.disabled=!els.tete.checked;
  if(!els.tete.checked)els.enchaineeTete.checked=false;
}
function openDetail(id){
  const voie=voies.find(v=>v.id===id);if(!voie)return;selectedId=id;const e=normalizeEntry(carnet[id]);
  els.lieu.textContent=voie.lieu;els.title.textContent=`${voie.cotation} · ${voie.couleur}`;
  els.meta.innerHTML=`<span class="meta-pill">Ligne ${voie.ligne}</span><span class="meta-pill">Niveau ${voie.niveau}</span><span class="meta-pill">ID ${voie.id}</span>`;
  els.moulinette.checked=e.moulinette;els.enchaineeMoulinette.checked=e.enchaineeMoulinette;els.tete.checked=e.tete;els.enchaineeTete.checked=e.enchaineeTete;els.comment.value=e.commentaire;els.status.textContent='';syncChainedState();els.dialog.showModal();
}
els.moulinette.addEventListener('change',syncChainedState);
els.tete.addEventListener('change',syncChainedState);
$('saveEntry').addEventListener('click',()=>{if(selectedId==null)return;carnet[selectedId]={moulinette:els.moulinette.checked,enchaineeMoulinette:els.moulinette.checked&&els.enchaineeMoulinette.checked,tete:els.tete.checked,enchaineeTete:els.tete.checked&&els.enchaineeTete.checked,commentaire:els.comment.value.trim(),modifieLe:new Date().toISOString()};persistCarnet();els.status.textContent='Enregistré sur cet appareil.';render()});
$('deleteEntry').addEventListener('click',()=>{if(selectedId==null||!confirm('Effacer le suivi personnel de cette voie ?'))return;delete carnet[selectedId];persistCarnet();els.moulinette.checked=false;els.enchaineeMoulinette.checked=false;els.tete.checked=false;els.enchaineeTete.checked=false;els.comment.value='';syncChainedState();els.status.textContent='Suivi effacé.';render()});
[els.niveau,els.ligne,els.suivi].forEach(el=>el.addEventListener('change',render));
$('resetFilters').addEventListener('click',()=>{els.niveau.value='';els.ligne.value='';els.suivi.value='';render()});
$('exportBtn').addEventListener('click',()=>{const payload={application:'Topo Bidoigt',version:'1.2',exporteLe:new Date().toISOString(),carnet};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(blob),download:`topo-bidoigt-sauvegarde-${new Date().toISOString().slice(0,10)}.json`});a.click();URL.revokeObjectURL(a.href)});
$('importInput').addEventListener('change',async event=>{const file=event.target.files?.[0];if(!file)return;try{const data=JSON.parse(await file.text()),imported=data.carnet??data;if(!imported||typeof imported!=='object'||Array.isArray(imported))throw new Error();if(!confirm('Remplacer le suivi présent sur ce téléphone par cette sauvegarde ?'))return;carnet=Object.fromEntries(Object.entries(imported).map(([id,e])=>[id,normalizeEntry(e)]));persistCarnet();render();alert('Sauvegarde importée.')}catch{alert('Le fichier de sauvegarde est invalide.')}event.target.value=''});
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredInstallPrompt=event;$('installBtn').classList.remove('hidden')});
$('installBtn').addEventListener('click',async()=>{if(!deferredInstallPrompt)return;deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;$('installBtn').classList.add('hidden')});
init();
