import {matches, normalize, isBoth, isSelectCurrent, programColor, programName} from './directory.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${name==='heart'?'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>':'<path d="M4 12h16m-6-6 6 6-6 6"/>'}</svg>`;
const params = new URLSearchParams(location.search);
const state = {q:params.get('q')||'',program:params.get('program')||'all',country:params.get('country')||'',brand:params.get('brand')||'',overlap:params.get('overlap')==='1',saved:false,view:matchMedia('(max-width:700px)').matches?'list':'split',limit:30};
if(!['all','FHR','THC','The Edit','select','both'].includes(state.program)) state.program='all';
let snapshot, hotels=[], filtered=[], visible=[], byId=new Map(), map, layer, favorites={}, toastTimer, searchTimer, selectedId, mapFrame, storageWorks=true, directoryReady=false;
try { const raw=JSON.parse(localStorage.getItem('hotel-atlas-favorites-v1')||'{}'); if(raw&&typeof raw==='object'&&!Array.isArray(raw)) favorites=raw; } catch { storageWorks=false; }

function toast(message){ $('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3000); }
function persistFavorites(){try{localStorage.setItem('hotel-atlas-favorites-v1',JSON.stringify(favorites));return true;}catch{storageWorks=false;toast('Saved for this visit only. Export to keep a backup.');return false;}}
function updateSavedCount(){ $('#saved-count').textContent=Object.keys(favorites).length; }
function toggleSaved(id){if(!byId.has(id))return;const was=Boolean(favorites[id]);if(was)delete favorites[id];else favorites[id]=byId.get(id);const persisted=persistFavorites();updateSavedCount();render(false);if(selectedId===id && $('#hotel-dialog').open) renderDetails(byId.get(id));if(persisted)toast(was?'Removed from saved hotels.':'Hotel saved in this browser.');}
function saveButton(h){return `<button class="save-button" data-save="${esc(h.id)}" aria-label="${favorites[h.id]?'Unsave':'Save'} ${esc(h.name)}" aria-pressed="${Boolean(favorites[h.id])}">${icon('heart')}</button>`;}
function badges(h){return `<div class="badges">${h.programs.map(p=>`<span class="badge ${p==='The Edit'?'edit':''}">${esc(programName(p))}</span>`).join('')}${h.selectCandidate?`<span class="badge select">${isSelectCurrent()?'Select candidate':'Select candidate · 2026 ended'}</span>`:''}</div>`;}
function row(h){return `<article class="hotel-row" data-hotel="${esc(h.id)}"><p class="hotel-location">${esc(h.location)}${normalize(h.location).includes(normalize(h.country))?'':' · '+esc(h.country)}</p><button class="hotel-name" data-details="${esc(h.id)}">${esc(h.name)}</button><p class="hotel-brand">${esc(h.brand)}</p>${saveButton(h)}${badges(h)}<div class="row-bottom"><span>Reported listing · verify before booking</span><button class="details-button" data-details="${esc(h.id)}">Hotel details ${icon('arrow')}</button></div></article>`;}
function updateURL(){const p=new URLSearchParams();for(const k of ['q','country','brand'])if(state[k])p.set(k,state[k]);if(state.program!=='all')p.set('program',state.program);if(state.overlap)p.set('overlap','1');const q=p.toString();history.replaceState(null,'',location.pathname+(q?'?'+q:''));}
function options(id,key,label){const values=[...new Set(hotels.map(h=>h[key]).filter(Boolean))].sort((a,b)=>a.localeCompare(b));$(id).innerHTML=`<option value="">${label}</option>`+values.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');if(values.includes(state[key]))$(id).value=state[key];else state[key]='';}
function render(fit=true){
  if(!directoryReady)return;
  state.q=$('#search').value;state.country=$('#country').value;state.brand=$('#brand').value;state.overlap=$('#overlap').checked;
  const source=state.saved?Object.values(favorites).filter(h=>h&&Array.isArray(h.programs)&&typeof h.name==='string'&&typeof h.id==='string'):hotels;
  filtered=source.filter(h=>matches(h,state));
  visible=$('#in-map').checked && map?filtered.filter(h=>Number.isFinite(h.lat)&&Number.isFinite(h.lng)&&map.getBounds().contains([h.lat,h.lng])):filtered;
  $('#result-count').textContent=`${visible.length.toLocaleString()} ${state.saved?'saved ':''}hotel${visible.length===1?'':'s'}`;
  $('#result-description').textContent=state.program==='select'?'Brand-based candidates in this directory; verify with Chase.':$('#in-map').checked?'Showing filtered hotels inside the visible map area.':state.saved?'Your favorites, saved on this device.':'Browse the map or explore the list.';
  $('#results').innerHTML=visible.length?visible.slice(0,state.limit).map(row).join(''):`<div class="empty"><h3>${state.saved?'Your next stay starts here.':'No hotels found.'}</h3><p>${state.saved?(Object.keys(favorites).length?'No saved hotels match these filters.':'Tap a heart to keep a hotel in your personal shortlist.'):'Try another destination, a shorter search, or reset the filters. This directory is a snapshot and may not include every participating hotel.'}</p><button class="secondary" data-empty-reset>${state.saved&&!Object.keys(favorites).length?'Explore hotels':'Reset filters'}</button></div>`;
  $('#load-more').hidden=state.limit>=visible.length;$('#load-more').textContent=`Show ${Math.min(30,Math.max(0,visible.length-state.limit))} more hotels`;
  document.querySelectorAll('[data-program]').forEach(b=>{const active=b.dataset.program===state.program;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',active);});
  for(const [id,active] of [['#explore',!state.saved],['#saved',state.saved]]){$(id).classList.toggle('active',active);$(id).setAttribute('aria-pressed',active);}
  $('#map-count').textContent=`${filtered.length.toLocaleString()} hotels`;
  updateURL();
  if(map){if(fit&&!$('#in-map').checked)fitResults();drawMap();}
}
function clearFilters(){state.program='all';state.limit=30;$('#search').value='';$('#country').value='';$('#brand').value='';$('#overlap').checked=false;$('#in-map').checked=false;render();}
function initMap(){
  if(!window.L){$('#map-fallback').hidden=false;setView('list');return;}
  map=L.map('map',{zoomControl:false,worldCopyJump:true,minZoom:2,maxZoom:18}).setView([24,8],2);
  L.control.zoom({position:'topright'}).addTo(map);
  const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'}).addTo(map);
  let tileErrors=0;tiles.on('tileerror',()=>{if(++tileErrors>=3)$('#map-fallback').hidden=false;});tiles.on('tileload',()=>{$('#map-fallback').hidden=true;tileErrors=0;});
  layer=L.layerGroup().addTo(map);
  map.on('moveend zoomend',()=>{cancelAnimationFrame(mapFrame);mapFrame=requestAnimationFrame(()=>{$('#in-map').checked?render(false):drawMap();});});
  new ResizeObserver(()=>map.invalidateSize()).observe($('#map'));
}
function fitResults(){const points=filtered.filter(h=>Number.isFinite(h.lat)&&Number.isFinite(h.lng)).map(h=>[h.lat,h.lng]);if(points.length)map.fitBounds(L.latLngBounds(points),{padding:[45,55],maxZoom:13,animate:false});}
function drawMap(){
  if(!map||!layer)return;layer.clearLayers();const groups=new Map();
  for(const h of filtered){if(!Number.isFinite(h.lat)||!Number.isFinite(h.lng))continue;const point=map.project([h.lat,h.lng],map.getZoom()),key=`${Math.floor(point.x/46)}:${Math.floor(point.y/46)}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(h);}
  for(const group of groups.values()){
    const h=group[0],lat=group.reduce((s,h)=>s+h.lat,0)/group.length,lng=group.reduce((s,h)=>s+h.lng,0)/group.length;
    if(group.length>1){const color=group.some(isBoth)?'both':group.every(h=>h.programs.includes('The Edit')&&!h.programs.some(p=>p==='FHR'||p==='THC'))?'chase':'';const size=group.length>99?38:32;const marker=L.marker([lat,lng],{icon:L.divIcon({className:`cluster ${color}`,html:String(group.length),iconSize:[size,size]}),title:`${group.length} hotels. Zoom to explore.`,keyboard:true});marker.on('click',()=>{if(map.getZoom()>=17){const wrap=document.createElement('div');wrap.innerHTML=`<strong>${group.length} nearby hotels</strong>`;for(const item of group.slice(0,12)){const b=document.createElement('button');b.textContent=item.name;b.onclick=()=>showDetails(item.id);wrap.append(b,document.createElement('br'));}marker.bindPopup(wrap).openPopup();}else map.fitBounds(L.latLngBounds(group.map(x=>[x.lat,x.lng])),{padding:[55,75],maxZoom:map.getZoom()+3});});marker.addTo(layer);
    }else{const color=programColor(h);const marker=L.circleMarker([h.lat,h.lng],{radius:6,color:'#ffffff',weight:2,fillColor:color,fillOpacity:1});const popup=document.createElement('div');popup.innerHTML=`<strong>${esc(h.name)}</strong><span>${esc(h.location)}</span>`;const b=document.createElement('button');b.textContent='View hotel details';b.addEventListener('click',()=>showDetails(h.id));popup.append(document.createElement('br'),b);marker.bindPopup(popup);marker.addTo(layer);}
  }
}
function setView(view){state.view=view;$('#workspace').dataset.view=view;document.querySelectorAll('[data-view]').forEach(b=>{if(b.tagName!=='BUTTON')return;const active=b.dataset.view===view;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',active);});if(map)requestAnimationFrame(()=>{map.invalidateSize();if(view!=='list')fitResults();drawMap();});}
function renderDetails(h){
  const officialAmex=h.amexUrl||'https://www.americanexpress.com/en-us/travel/discover/hotel-finder';
  $('#hotel-details').innerHTML=`<p class="hotel-location">${esc(h.location)}</p><h2 id="hotel-title">${esc(h.name)}</h2>${badges(h)}<p class="detail-address">${esc(h.address)}<br>${esc(h.brand)}</p><div class="verify-note"><strong>Third-party reported · verify with the issuer</strong><br>Program participation comes from a directory snapshot, not an individual issuer check. Credit availability also depends on your account, payment method, and booking terms.</div>${h.programs.some(p=>p==='FHR'||p==='THC')?`<section class="detail-program"><h3>Amex Platinum · ${h.programs.includes('FHR')?'Fine Hotels + Resorts':'The Hotel Collection'}</h3><p>Book an eligible prepaid stay through Amex Travel using your Platinum Card. ${h.programs.includes('THC')?'A two-night minimum applies.':'FHR requires two nights for credit eligibility starting January 1, 2027.'}</p><a href="${esc(officialAmex)}" target="_blank" rel="noopener noreferrer">Open official Amex ${h.amexUrl?'hotel page':'Hotel Finder'} ↗</a></section>`:''}${h.programs.includes('The Edit')?`<section class="detail-program"><h3>Chase Sapphire Reserve · The Edit</h3><p>Find this hotel in The Edit through Chase Travel. Eligible prepaid stays require at least two nights. The link opens Chase’s collection, not a hotel-specific booking.</p><a href="https://www.chase.com/travel/the-edit" target="_blank" rel="noopener noreferrer">Open The Edit at Chase Travel ↗</a></section>`:''}${h.selectCandidate?`<section class="detail-program"><h3>Chase Select Hotels · ${isSelectCurrent()?'candidate':'2026 benefit ended'}</h3><p>Inferred from the directory’s Chase brand: ${esc(h.selectBasis)}. Verify the property’s Select Hotels credit label in Chase Travel. The published 2026 credit covers qualifying purchases through December 31, 2026; do not assume an extension.</p></section>`:''}<div class="detail-actions"><button class="primary" data-save="${esc(h.id)}" aria-pressed="${Boolean(favorites[h.id])}">${favorites[h.id]?'Remove from saved':'Save this hotel'} ${icon('heart')}</button><a class="secondary" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(h.name+' '+h.address)}" target="_blank" rel="noopener noreferrer">Open in Google Maps ↗</a><button class="secondary" data-copy-name="${esc(h.name)}">Copy hotel name</button></div><p class="detail-source">Directory source: <a href="${esc(snapshot.source)}" target="_blank" rel="noopener noreferrer">AwardHack public hotel map</a><br>Retrieved November 13, 2026 · No live prices or availability.<br>${isBoth(h)?'Listed in both Amex and Chase programs. Credits require separate eligible bookings through the relevant issuer.':''}</p>`;
}
function showDetails(id){const h=byId.get(id)||favorites[id];if(!h)return;selectedId=id;renderDetails(h);if(!$('#hotel-dialog').open)$('#hotel-dialog').showModal();}
function exportSaved(){const data=Object.values(favorites);if(!data.length){toast('Save a hotel first, then export your shortlist.');return;}const fields=['name','location','country','brand','programs','selectCandidate','address'];const csv='\uFEFF'+[fields,...data.map(h=>fields.map(k=>Array.isArray(h[k])?h[k].join('; '):String(h[k]??'')))].map(row=>row.map(v=>`"${String(v).replace(/^[=+@\-\t\r]/,"'$&").replace(/"/g,'""')}"`).join(',')).join('\r\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='hotel-atlas-saved.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Your saved hotel list has been exported.');}

$('#search').value=state.q;
$('#overlap').checked=state.overlap;
$('#search-form').addEventListener('submit',e=>{e.preventDefault();clearTimeout(searchTimer);state.limit=30;render();});
$('#search').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{state.limit=30;render();},180);});
for(const id of ['#country','#brand','#overlap'])$(id).addEventListener('change',()=>{state.limit=30;render();});
$('#in-map').addEventListener('change',()=>{state.limit=30;render(false);});
$('#fit-map').addEventListener('click',()=>{if(map){$('#in-map').checked=false;render();}});
$('#reset').addEventListener('click',clearFilters);
$('#explore').addEventListener('click',()=>{state.saved=false;state.limit=30;render();});
$('#saved').addEventListener('click',()=>{state.saved=true;state.limit=30;render();});
$('#load-more').addEventListener('click',()=>{state.limit+=30;render(false);});
$('#export').addEventListener('click',exportSaved);
document.querySelectorAll('[data-program]').forEach(b=>b.addEventListener('click',()=>{state.program=b.dataset.program;state.limit=30;render();}));
document.querySelectorAll('button[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
for(const id of ['#guide','#data-details','#footer-sources'])$(id).addEventListener('click',()=>$('#guide-dialog').showModal());
document.querySelectorAll('.close-dialog').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
document.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.save)toggleSaved(b.dataset.save);if(b.dataset.details)showDetails(b.dataset.details);if(b.hasAttribute('data-empty-reset')){if(state.saved&&!Object.keys(favorites).length)state.saved=false;clearFilters();}if(b.dataset.copyName){try{await navigator.clipboard.writeText(b.dataset.copyName);toast('Hotel name copied.');}catch{toast('Copy unavailable here. Select the hotel name to copy it.');}}});
document.addEventListener('keydown',e=>{if(e.key==='/'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&!document.querySelector('dialog[open]')){e.preventDefault();$('#search').focus();}});
window.addEventListener('storage',e=>{if(e.key==='hotel-atlas-favorites-v1'){try{const value=JSON.parse(e.newValue||'{}');favorites=value&&typeof value==='object'&&!Array.isArray(value)?value:{};updateSavedCount();render(false);if(selectedId&&$('#hotel-dialog').open)renderDetails(byId.get(selectedId));}catch{toast('Could not read updated saved hotels.');}}});
updateSavedCount();setView(state.view);
try{
  const response=await fetch('./hotels.json');if(!response.ok)throw Error('Directory unavailable');snapshot=await response.json();hotels=snapshot.hotels;if(!Array.isArray(hotels)||!hotels.length)throw Error('Directory empty');
  byId=new Map(hotels.map(h=>[h.id,h]));for(const h of Object.values(favorites))if(h&&typeof h.id==='string'&&!byId.has(h.id))byId.set(h.id,h);
  options('#country','country','Anywhere');options('#brand','brand','All brands');
  $('#total-count').textContent=hotels.length.toLocaleString();$('#coverage').textContent=`${hotels.length.toLocaleString()} reported hotels · Snapshot Nov 13, 2026 · Verify credit eligibility with Amex or Chase.`;
  $('#source-description').textContent=`${hotels.length.toLocaleString()} hotel records from AwardHack’s publicly available combined hotel map, retrieved November 13, 2026. ${new Set(hotels.map(h=>h.country)).size} country labels. Hotel names, coordinates, and program participation are retained; prices, reviews, and photography are not copied.`;
  directoryReady=true;initMap();render();if(!storageWorks)toast('Favorites may not persist here. Export to keep a backup.');
}catch(error){$('#coverage').textContent='The hotel directory could not be loaded.';$('#result-count').textContent='Directory unavailable';$('#results').innerHTML='<div class="empty"><h3>Let’s try that again.</h3><p>The directory could not load. Reload this page to retry.</p><button class="secondary" id="retry">Reload directory</button></div>';$('#retry').addEventListener('click',()=>location.reload());$('#load-more').hidden=true;}
