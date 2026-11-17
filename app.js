const STORAGE_KEY = 'topo-bidoigt-carnet-v1';
let voies = [];
let carnet = loadCarnet();
let selectedId = null;
let deferredInstallPrompt = null;

const $ = (id) => document.getElementById(id);
const els = {
  niveau: $('niveauFilter'), ligne: $('ligneFilter'), suivi: $('suiviFilter'),
  list: $('routeList'), empty: $('emptyState'), result: $('resultCount'), progress: $('progressCount'),
  dialog: $('detailDialog'), title: $('detailTitle'), lieu: $('detailLieu'), meta: $('detailMeta'),
  moulinette: $('moulinetteInput'), tete: $('teteInput'), comment: $('commentInput'), status: $('saveStatus')
};

function loadCarnet() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}
function persistCarnet() { localStorage.setItem(STORAGE_KEY, JSON.stringify(carnet)); }
function cleanString(value) { return String(value ?? '').trim(); }
function colorFor(name) {
  const colors = { rose:'#d76c9f', jaune:'#e7b72f', bleue:'#3f74c9', bleu:'#3f74c9', verte:'#4e9c61', vert:'#4e9c61', rouge:'#c74c43', violette:'#8466b5', violet:'#8466b5', blanche:'#d4d4ce', blanc:'#d4d4ce', orange:'#db7b2c', noire:'#343a36', noir:'#343a36' };
  return colors[cleanString(name).toLowerCase()] || '#87958b';
}
function isDone(entry) { return Boolean(entry?.moulinette || entry?.tete); }

async function init() {
  try {
    const response = await fetch('./voies.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    voies = (await response.json()).filter(v => v.active !== false);
    populateFilters();
    render();
  } catch (error) {
    els.empty.textContent = "Impossible de charger le topo. Ouvrez l'application depuis son adresse web, pas directement comme un fichier.";
    els.empty.classList.remove('hidden');
    console.error(error);
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js').catch(console.error);
}

function populateFilters() {
  const niveaux = [...new Set(voies.map(v => v.niveau))].sort((a,b) => a-b);
  const lignes = [...new Set(voies.map(v => v.ligne))].sort((a,b) => a-b);
  niveaux.forEach(v => els.niveau.add(new Option(String(v), String(v))));
  lignes.forEach(v => els.ligne.add(new Option(String(v), String(v))));
}

function filteredVoies() {
  const niveau = els.niveau.value;
  const ligne = els.ligne.value;
  const suivi = els.suivi.value;
  return voies.filter(v => {
    const entry = carnet[v.id];
    if (niveau && String(v.niveau) !== niveau) return false;
    if (ligne && String(v.ligne) !== ligne) return false;
    if (suivi === 'faites' && !isDone(entry)) return false;
    if (suivi === 'moulinette' && !entry?.moulinette) return false;
    if (suivi === 'tete' && !entry?.tete) return false;
    if (suivi === 'commentee' && !cleanString(entry?.commentaire)) return false;
    if (suivi === 'nonfaite' && isDone(entry)) return false;
    return true;
  }).sort((a,b) => a.ligne - b.ligne || a.niveau - b.niveau || a.cotation.localeCompare(b.cotation, 'fr'));
}

function render() {
  const displayed = filteredVoies();
  els.list.replaceChildren();
  const template = $('routeTemplate');
  displayed.forEach(voie => {
    const node = template.content.cloneNode(true);
    const card = node.querySelector('.route-card');
    node.querySelector('.route-accent').style.background = colorFor(voie.couleur);
    node.querySelector('.route-title').textContent = `${voie.cotation} · ${voie.couleur}`;
    node.querySelector('.route-subtitle').textContent = `${voie.lieu} · Ligne ${voie.ligne}`;
    const badges = node.querySelector('.route-badges');
    const entry = carnet[voie.id];
    if (entry?.moulinette) badges.append(makeBadge('M', 'Moulinette'));
    if (entry?.tete) badges.append(makeBadge('T', 'En tête', 'head'));
    if (cleanString(entry?.commentaire)) badges.append(makeBadge('✎', 'Commentaire', 'note'));
    card.addEventListener('click', () => openDetail(voie.id));
    els.list.append(node);
  });
  const done = voies.filter(v => isDone(carnet[v.id])).length;
  els.result.textContent = `${displayed.length} voie${displayed.length > 1 ? 's' : ''}`;
  els.progress.textContent = `${done} réalisée${done > 1 ? 's' : ''} sur ${voies.length}`;
  els.empty.classList.toggle('hidden', displayed.length !== 0);
}
function makeBadge(text, title, className='') {
  const badge = document.createElement('span');
  badge.className = `badge ${className}`.trim();
  badge.textContent = text; badge.title = title; badge.setAttribute('aria-label', title);
  return badge;
}

function openDetail(id) {
  const voie = voies.find(v => v.id === id);
  if (!voie) return;
  selectedId = id;
  const entry = carnet[id] || {};
  els.lieu.textContent = voie.lieu;
  els.title.textContent = `${voie.cotation} · ${voie.couleur}`;
  els.meta.innerHTML = `<span class="meta-pill">Ligne ${voie.ligne}</span><span class="meta-pill">Niveau ${voie.niveau}</span><span class="meta-pill">ID ${voie.id}</span>`;
  els.moulinette.checked = Boolean(entry.moulinette);
  els.tete.checked = Boolean(entry.tete);
  els.comment.value = entry.commentaire || '';
  els.status.textContent = '';
  els.dialog.showModal();
}

$('saveEntry').addEventListener('click', () => {
  if (selectedId == null) return;
  carnet[selectedId] = {
    moulinette: els.moulinette.checked,
    tete: els.tete.checked,
    commentaire: els.comment.value.trim(),
    modifieLe: new Date().toISOString()
  };
  persistCarnet();
  els.status.textContent = 'Enregistré sur cet appareil.';
  render();
});
$('deleteEntry').addEventListener('click', () => {
  if (selectedId == null || !confirm('Effacer le suivi personnel de cette voie ?')) return;
  delete carnet[selectedId]; persistCarnet();
  els.moulinette.checked = false; els.tete.checked = false; els.comment.value = '';
  els.status.textContent = 'Suivi effacé.'; render();
});
[els.niveau, els.ligne, els.suivi].forEach(el => el.addEventListener('change', render));
$('resetFilters').addEventListener('click', () => { els.niveau.value=''; els.ligne.value=''; els.suivi.value=''; render(); });

$('exportBtn').addEventListener('click', () => {
  const payload = { application: 'Topo Bidoigt', version: 1, exporteLe: new Date().toISOString(), carnet };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `topo-bidoigt-sauvegarde-${new Date().toISOString().slice(0,10)}.json` });
  a.click(); URL.revokeObjectURL(a.href);
});
$('importInput').addEventListener('change', async (event) => {
  const file = event.target.files?.[0]; if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const imported = data.carnet ?? data;
    if (!imported || typeof imported !== 'object' || Array.isArray(imported)) throw new Error('Format invalide');
    if (!confirm('Remplacer le suivi présent sur ce téléphone par cette sauvegarde ?')) return;
    carnet = imported; persistCarnet(); render(); alert('Sauvegarde importée.');
  } catch { alert('Le fichier de sauvegarde est invalide.'); }
  event.target.value = '';
});

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault(); deferredInstallPrompt = event; $('installBtn').classList.remove('hidden');
});
$('installBtn').addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt(); await deferredInstallPrompt.userChoice; deferredInstallPrompt = null; $('installBtn').classList.add('hidden');
});

init();
