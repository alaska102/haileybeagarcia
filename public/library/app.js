import config from './config.js';
import { connect } from './backend.js';
import { normalizeCode, formatCode } from './codes.js';
import { readExport, writeExport, enrich, sameBook } from './goodreads.js';
import { WOODS, WALLS, PETS, PET_COLORS, PET_NAMES, DECOR, DEFAULT_LOOK, cleanLook, petOf, applyLook, lightsSvg } from './shelf-look.js';

const { store, session } = await connect(config);
if (store.demo) document.body.insertAdjacentHTML('afterbegin', '<div class="demo-flag">Demo · the friends are made up and nothing you do is saved</div>');

const $=s=>document.querySelector(s);
const DAY=86400000;
// Every value that reaches innerHTML goes through esc or safeUrl: names and Open Library text are untrusted.
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl=u=>/^https:\/\/[^\s'"()<>\\]+$/.test(u||'')?u:'';
const asDate=t=>t?.toDate?t.toDate():new Date(t);
function calDays(a,b){const pa=asDate(a),pb=asDate(b);const da=Date.UTC(pa.getFullYear(),pa.getMonth(),pa.getDate()),db=Date.UTC(pb.getFullYear(),pb.getMonth(),pb.getDate());return Math.max(0,Math.round((db-da)/DAY))}
function fmtDays(d){if(d<1)return'today';if(d<7)return d+(d===1?' day':' days');const w=Math.round(d/7);if(w<9)return w+(w===1?' week':' weeks');const m=Math.round(d/30.4);return m+(m===1?' month':' months')}
function dur(a,b){return fmtDays(Math.max(1,calDays(a,b)))}
function ago(a){const d=calDays(a,new Date());return d===0?'today':fmtDays(d)+' ago'}
function dstr(t){if(!t)return'';return asDate(t).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
const stars=r=>{if(!r)return '<span style="color:#cdb2ba;font-size:11px">not rated</span>';return '<span class="stars">'+'★'.repeat(r)+'<span class="dim">'+'★'.repeat(5-r)+'</span></span>'};
function initials(n){return n.split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase()}
const PALETTE=['#e8b4b8','#b8d4c8','#f2d5a0','#c5b8e0','#a8c8e8','#e8c4a0','#d4b8d0','#b8e0d4'];
function dotColor(n){let h=0;for(const c of n)h=(h*31+c.charCodeAt(0))>>>0;return PALETTE[h%PALETTE.length]}

let CATALOG={},LENT={},SHELF='shelf',PICK=false,ME=null,OWNER=false,LOOK=DEFAULT_LOOK;
const views=['enter','home','book','owner','decorate','visit'];
function show(v){views.forEach(x=>{const el=document.getElementById('view-'+x);if(el)el.hidden=x!==v});window.scrollTo(0,0)}
function showGate(msg){show('enter');$('#enter-body').innerHTML=`<h1 class="serif">Friendship Library.</h1><p class="lede">${msg?esc(msg):'This shelf is invite-only. Ask Hailey for your invite code.'}</p>
  <input class="door-name" id="code-in" placeholder="Invite code" autocomplete="off" autocapitalize="characters" spellcheck="false"/>
  <div style="margin-top:12px"><button class="btn" id="code-btn">Use code</button></div>`;
  $('#code-btn').onclick=()=>{const c=normalizeCode($('#code-in').value);if(c.length<12)return;sessionStorage.setItem('alib_t',c);boot()}}

// --- profiles: one group invite code per device, then a profile and its password ---
const PROFILE_OK='flib_code_ok';
async function showCodeGate(msg){show('enter');
  const hint=store.demo?`<p class="where-sub">Demo: the code is <strong class="invite-code">${esc(await store.groupCode())}</strong></p>`:'';
  $('#enter-body').innerHTML=`<h1 class="serif">Friendship Library.</h1><p class="lede">${msg?esc(msg):'This shelf is invite-only. Ask Hailey for the invite code.'}</p>${hint}
  <input class="door-name" id="code-in" placeholder="Invite code" autocomplete="off" autocapitalize="characters" spellcheck="false"/>
  <div style="margin-top:12px"><button class="btn" id="code-btn">Come in</button></div>`;
  $('#code-btn').onclick=async()=>{if(!await store.checkCode($('#code-in').value))return showCodeGate("That code isn't right. Ask Hailey for the invite code.");
    sessionStorage.setItem(PROFILE_OK,'1');showProfiles()}}
async function showProfiles(){show('enter');
  const ps=await store.listProfiles();
  $('#enter-body').innerHTML=`<h1 class="serif">Who's visiting?</h1><p class="lede">Pick your profile, or make one if it's your first time.</p>
  <div class="profiles">${ps.map(p=>`<button class="profile" data-profile="${esc(p.id)}" data-name="${esc(p.name)}"><span class="dot" style="background:${dotColor(p.name)}">${esc(initials(p.name))}</span><span class="profile-name">${esc(p.name)}</span>${p.stats?`<span class="profile-stats"><b>${p.stats.read}</b> read<br><b>${p.stats.year}</b> this year</span>`:''}</button>`).join('')}
  <button class="profile profile-new" id="profile-new"><span class="dot">+</span>New profile</button></div>`;
  document.querySelectorAll('[data-profile]').forEach(b=>b.onclick=()=>showPassword(b.dataset.profile,b.dataset.name));
  $('#profile-new').onclick=showNewProfile}
const backLink='<p style="margin-top:14px"><a href="#" class="door-look" id="profiles-back">← back to profiles</a></p>';
const wireBack=()=>{$('#profiles-back').onclick=e=>{e.preventDefault();showProfiles()}};
function showPassword(id,name){
  $('#enter-body').innerHTML=`<h1 class="serif">Hi, ${esc(name)}.</h1><p class="lede">Type your password.</p>${store.demo?'<p class="where-sub">Demo: any password works for the sample profiles.</p>':''}
  <form id="pw-form"><input type="hidden" autocomplete="username" value="${esc(name)}"/><input class="door-name" id="pw-in" type="password" placeholder="Password" autocomplete="current-password"/>
  <div style="margin-top:12px"><button class="btn" id="pw-btn">Come in</button></div></form><p class="lede" id="enter-err" style="margin-top:10px"></p>${backLink}`;
  wireBack();$('#pw-in').focus();
  const go=async()=>{try{ME=await store.signInProfile(id,$('#pw-in').value)}catch(e){$('#enter-err').textContent="That password isn't right. Hailey can reset it for you.";return}
    OWNER=!!ME.owner;enterLibrary()};
  $('#pw-form').onsubmit=e=>{e.preventDefault();go()}}
function showNewProfile(){
  $('#enter-body').innerHTML=`<h1 class="serif">Make your profile.</h1><p class="lede">Your name goes on anything you borrow, next to your rating.</p>
  <form id="np-form"><input class="door-name" id="np-name" placeholder="Your name" maxlength="30" autocomplete="username"/>
  <input class="door-name" id="np-pw" type="password" placeholder="Choose a password" autocomplete="new-password" style="margin-top:10px"/>
  <div style="margin-top:12px"><button class="btn" id="np-btn">Make my profile</button></div></form><p class="lede" id="enter-err" style="margin-top:10px"></p>${backLink}`;
  wireBack();
  $('#np-form').onsubmit=async e=>{e.preventDefault();const n=$('#np-name').value.trim().replace(/\s+/g,' '),pw=$('#np-pw').value;
    if(!n)return;if(/[<>]/.test(n)){$('#enter-err').textContent='Names cannot contain < or >.';return}
    if(pw.length<4){$('#enter-err').textContent='Passwords need at least 4 characters.';return}
    try{ME=await store.createProfile(n,pw)}catch(e){$('#enter-err').textContent='Someone already has that name. Add an initial?';return}
    OWNER=false;await enterLibrary();location.hash='#decorate'}}
async function bootProfiles(){
  await session.ready();const u=session.user();
  if(u){ME=await store.getMember(u.uid);OWNER=!!ME?.owner;if(ME)return enterLibrary()}
  if(sessionStorage.getItem(PROFILE_OK))return showProfiles();
  showCodeGate()}

async function boot(){
  if(store.profiles)return bootProfiles();
  const u=new URL(location.href);const t=u.searchParams.get('t');
  // Held until the name is submitted so a refresh on the name screen doesn't lose it.
  if(t){sessionStorage.setItem('alib_t',normalizeCode(t));history.replaceState(null,'',location.pathname+location.hash)}
  const token=sessionStorage.getItem('alib_t');
  await session.ready();
  let user=session.user();
  // Read together: a second read issued right after the first has been seen to stall on a fresh connection.
  const readInvite=()=>store.getInvite(token).catch(()=>null);
  const early=token&&user?readInvite():null;
  if(user)ME=await store.getMember(user.uid);
  OWNER=!!ME?.owner;
  if(ME){sessionStorage.removeItem('alib_t');return enterLibrary()}
  if(token){
    // Anonymous accounts only ever exist for people holding a link.
    if(!user)user=await session.signIn();
    const invite=await (early||readInvite());
    if(invite&&!invite.redeemedBy&&!invite.revokedAt){renderClaim(token,invite,user);show('enter');return}
    sessionStorage.removeItem('alib_t');
    return showGate('That invite code has been used or does not exist. Ask Hailey for a new one.');
  }
  showGate();
}
async function enterLibrary(){
  LOOK=cleanLook(ME?.look);
  showWho();
  await loadWall();
  renderVisitStrip();
  if(location.hash&&location.hash!=='#home'&&location.hash!=='#'){route();return}
  show('home');
}
function renderClaim(token,invite,user){
  const fixed=invite.name;
  $('#enter-body').innerHTML=`
  <p class="section-label" style="margin:0">Friendship Library</p><h1 class="serif">${fixed?`Welcome back, ${esc(fixed)}.`:'Step inside.'}</h1>
  <p class="lede">${fixed?'This code puts you back on your library card on this device.':"Write your name so the books know who's visiting. It goes on the story of anything you take, next to your rating."}</p>
  ${fixed?'':'<input class="door-name" id="enter-name" placeholder="Your name" maxlength="30"/>'}
  <div style="margin-top:16px"><button class="btn" id="enter-btn">Step inside</button></div><p class="lede" id="enter-err" style="margin-top:10px"></p>`;
  $('#enter-btn').onclick=async()=>{
    const n=fixed||$('#enter-name').value.trim().replace(/\s+/g,' ');if(!n)return;
    if(/[<>]/.test(n)){$('#enter-err').textContent='Names cannot contain < or >.';return}
    try{ME=await store.redeemInvite(token,user.uid,n)}catch(e){$('#enter-err').textContent='That code has already been used. Ask Hailey for a new one.';return}
    OWNER=!!ME.owner;sessionStorage.removeItem('alib_t');enterLibrary()}}
function showWho(){
  $('#add-link').hidden=!(OWNER||ME?.canAdd);$('#owner-link').hidden=!OWNER;
  $('#owner-link').textContent=store.profiles?'friends':'invites';
  const n=ME?.name;if(!n)return;
  if(store.profiles){$('#who-chip').title='Switch profile';$('#who-chip').style.cursor='pointer';
    $('#who-chip').onclick=async()=>{await store.signOut();ME=null;OWNER=false;['#who-chip','#owner-link','#add-link'].forEach(x=>$(x).hidden=true);location.hash='';showProfiles()}}
  $('#who-chip').hidden=false;$('#who-name').textContent=n;$('#who-dot').textContent=initials(n);$('#who-dot').style.background=dotColor(n)}

async function loadWall(){
  [CATALOG,LENT]=await Promise.all([store.getCatalog(),store.lentBooks()]);
  renderWall();renderActivity()}
const activeFilter=()=>{const f=document.querySelector('.chip.on')?.dataset.f;return f==='all'?null:f};
function coverOf(b){return safeUrl(b.coverUrl)||(b.isbn?`https://covers.openlibrary.org/b/isbn/${encodeURIComponent(b.isbn)}-M.jpg?default=false`:'')}
const PHOTOS={};
async function hydratePhotos(){for(const img of document.querySelectorAll('img[data-photo]')){const id=img.dataset.photo;PHOTOS[id]??=store.getPhoto(id);const d=await PHOTOS[id];if(/^data:image\/jpeg;base64,/.test(d||''))img.src=d;img.removeAttribute('data-photo')}}
// A book with no cover (or a cover that fails to load) becomes a plain title card.
const mainTitle=t=>String(t||'').split(/:\s/)[0];
const titleCard=b=>`<span class="cover-card" style="background:${dotColor(b.title)}"><span>${esc(mainTitle(b.title))}</span><small>${esc(b.author||'')}</small></span>`;
document.addEventListener('error',e=>{const img=e.target;if(img.tagName==='IMG'&&img.closest('.cover')&&!img.dataset.photo){img.replaceWith(Object.assign(document.createElement('span'),{className:'cover-card',innerHTML:`<span>${esc(mainTitle(img.alt))}</span>`,style:`background:${dotColor(img.alt)}`}))}},true);

// The pet, then each decoration, takes a spot on every other shelf; fairy lights hang across the top.
function buildCase(list,look,{empty='Nothing on this shelf yet.',every=false}={}){
  const n=perRow(),rows=[];
  for(let i=0;i<list.length;i+=n)rows.push(list.slice(i,i+n));
  const pet=`<span title="${esc(look.pet.name||PET_NAMES[look.pet.kind])}">${petOf(look)}</span>`;
  const items=[pet,...look.decor.filter(d=>d!=='lights').map(d=>DECOR[d].svg)];
  const lights=look.decor.includes('lights')?lightsSvg():'';
  return lights+(rows.map((row,r)=>{
    const item=every?items[r%items.length]:rows.length===1?items[0]:r%2===1?items[((r-1)/2)%items.length]:'';
    const books=row.map(b=>`<a class="cover${PICK?' pick'+(b.onShelf?' picked':''):''}" ${PICK?`data-pick="${esc(b.id)}" href="#"`:`href="#book-${esc(b.id)}"`}>${b.hasPhoto?`<img data-photo="${esc(b.id)}" alt="${esc(b.title)}"/>`:coverOf(b)?`<img src="${esc(coverOf(b))}" alt="${esc(b.title)}" loading="lazy"/>`:titleCard(b)}${b.holderName?`<span class="ribbon">${esc(b.holderName)}</span>`:''}</a>`).join('');
    const spot=item&&row.length<n?`<span class="pet-spot">${item}</span>`:'';
    return `<div class="shelf"><div class="shelf-books" style="--n:${n}">${books}${spot}</div>${item&&!spot?`<span class="pet-perch ${(r>>1)%2?'left':'right'}">${item}</span>`:''}<div class="plank"></div></div>`}).join('')
    ||`<div class="shelf shelf-empty"><p class="lede">${esc(empty)}</p><span class="pet-spot">${items[0]}</span><div class="plank"></div></div>`)}
const perRow=()=>innerWidth>=1000?6:innerWidth>=700?5:4;
const SHELVES={shelf:b=>b.onShelf,reading:b=>b.status==='reading',read:b=>b.status==='read'};
function renderWall(filter=activeFilter(),q=$('#search-in').value){
  const all=Object.entries(CATALOG).map(([id,c])=>({...c,id,holderName:LENT[id]}));
  for(const [k,fn] of Object.entries(SHELVES)){const t=document.querySelector(`[data-shelf="${k}"]`);t.classList.toggle('on',k===SHELF);t.querySelector('b').textContent=all.filter(fn).length}
  let list=all.filter(SHELVES[SHELF]);
  if(filter)list=list.filter(b=>(b.genres||[]).some(g=>g.toLowerCase()===filter));
  if(q){const s=q.toLowerCase();list=list.filter(b=>(b.title+' '+(b.author||'')+' '+(b.genres||[]).join(' ')).toLowerCase().includes(s))}
  list.sort((a,b)=>(b.addedAt||0)-(a.addedAt||0)||a.title.localeCompare(b.title));
  $('#wall').innerHTML=buildCase(list,LOOK,{empty:q||filter?'No books match.':'Nothing on this shelf yet.'});
  applyLook($('#wall'),LOOK);
  hydratePhotos();
  $('#pick-bar').hidden=!OWNER;$('#pick-btn').textContent=PICK?'Done':'Choose what is on my shelf';$('#pick-help').hidden=!PICK;
  const counts={};all.filter(SHELVES[SHELF]).forEach(b=>(b.genres||[]).forEach(g=>{counts[g]=(counts[g]||0)+1}));
  const top=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,4).map(e=>e[0].toLowerCase());
  $('#chips').innerHTML=`<button class="chip ${!filter?'on':''}" data-f="all">All books</button>`+top.map(g=>`<button class="chip ${filter===g?'on':''}" data-f="${esc(g)}">${esc(g)}</button>`).join('');
}
let lastPerRow=perRow();
addEventListener('resize',()=>{if(perRow()!==lastPerRow&&ME){lastPerRow=perRow();renderWall()}});
async function renderActivity(){const a=await store.activity();
  $('#lately').innerHTML=a.map(x=>`<a class="stamp-chip" href="#book-${esc(x.bookId)}"><span class="dot" style="background:${dotColor(x.name)}">${esc(initials(x.name))}</span><p><strong>${esc(x.name)}</strong> took <em class="serif">${esc(x.title.length>24?x.title.slice(0,24)+'…':x.title)}</em><br/><span style="font-size:9.5px;color:var(--muted);letter-spacing:.08em;text-transform:uppercase">${esc(dstr(x.tookAt))}</span></p></a>`).join('')}

function stampRows(stamps,nextNewer,ratings,seen,currentId){
  // A stamp ended when the next one began. Each friend's rating shows on their newest stamp.
  let newer=nextNewer;
  return stamps.map(r=>{
    const rating=seen.has(r.friendId)?null:ratings[r.friendId]?.value;seen.add(r.friendId);
    const row=`<div class="entry"><span class="dot" style="background:${dotColor(r.name)}">${esc(initials(r.name))}</span><span class="who">${esc(r.name)}${r.id===currentId?'<span class="has-it">has it</span>':''}<span class="when">took ${esc(dstr(r.tookAt))}${newer?` · back ${esc(dstr(newer))} · ${esc(dur(r.tookAt,newer))}`:` · ${esc(ago(r.tookAt))}`}</span></span><span class="stars">${stars(rating)}</span></div>`;
    newer=r.tookAt;return row}).join('')}
async function openBook(id){
  const [b,h,rs]=await Promise.all([store.getBook(id),store.pageHistory(id),store.listRatings(id)]);
  if(!b){show('home');return}
  const ratings=Object.fromEntries(rs.map(r=>[r.friendId,r]));
  const seen=new Set();
  const avg=b.ratingCount?(b.ratingSum/b.ratingCount).toFixed(1):null;
  const metaChips=[b.year,b.pages?b.pages+' pages':null,...(b.genres||[])].filter(Boolean).map(x=>`<span>${esc(x)}</span>`).join('');
  const statusLine=[b.onShelf?"On Hailey's shelf":"Not on Hailey's shelf",b.status==='read'?'Hailey has read it':b.status==='reading'?'Hailey is reading it':null].filter(Boolean).join(' · ');
  const agg=b.ratingCount?`<div class="agg"><span class="agg-num">${avg}</span><span class="agg-stars">${stars(Math.round(b.ratingSum/b.ratingCount))}</span><span class="agg-n">${b.ratingCount} friend${b.ratingCount===1?'':'s'} rated</span></div>`:'';
  const syn=(b.summary||'').split(/\r?\n\r?\n/)[0].replace(/\r?\n/g,' ');
  const rest=(b.summary||'').split(/\r?\n\r?\n/).slice(1).join('\n\n').replace(/\r?\n/g,' ');
  const entries=stampRows(h.stamps,null,ratings,seen,b.currentStampId)||`<div class="card-empty">No one's taken it home yet. Be the first.</div>`;
  const mine=ME&&b.holderFriendId===ME.friendId;
  const cover=esc(coverOf(b));
  $('#book-detail').innerHTML=`<div class="sheet-head"><div class="bgblur" style="background-image:url('${cover}')"></div><img ${b.hasPhoto?`data-photo="${esc(b.id)}"`:`src="${cover}"`} alt="Cover of ${esc(b.title)}"/><h1>${esc(b.title)}</h1><p class="author">${esc(b.author)}</p><div class="sheet-meta">${metaChips}</div><p class="shelf-status">${esc(statusLine)}</p>${agg}</div><div class="sheet-body"><p class="synopsis">${esc(syn)}</p>${rest?`<details class="full-summary"><summary>Read the full summary</summary><p class="synopsis" style="margin-top:8px">${esc(rest)}</p></details>`:''}${b.summary?`<p class="src-line">Summary · Open Library</p>`:''}${OWNER?`<div class="owner-row"><label class="switch"><input type="checkbox" id="own-shelf" ${b.onShelf?'checked':''}/><span>On my shelf</span></label><select id="own-status" class="status-select">${[['none','Not read yet'],['reading','Reading'],['read','Read']].map(([v,l])=>`<option value="${v}" ${b.status===v?'selected':''}>${l}</option>`).join('')}</select></div>`:''}<div class="actions">${b.onShelf||b.holderName?'<button class="btn" id="where-btn">':'<button class="btn" id="where-btn" hidden>'}<svg viewbox="0 0 24 24" style="width:13px;height:13px;stroke:#fff;fill:none;stroke-width:2.6;vertical-align:-2px;margin-right:6px"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg>Where is it?</button>${ME?'<button class="btn ghost" id="rate-toggle">Rate it</button>':''}${OWNER?'<button class="btn ghost" id="remove-book">Remove book</button>':''}</div><div class="where-panel" id="where-panel" hidden>${b.holderName?`<p><span class="dot" style="background:${dotColor(b.holderName)};width:26px;height:26px;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;font:italic 600 13px 'Cormorant Garamond',Georgia,serif;margin-right:8px">${esc(initials(b.holderName))}</span><strong>${esc(b.holderName)}</strong> has it · took it ${esc(dstr(b.holderSince))} (${esc(ago(b.holderSince))})</p>${ME&&!mine?'<p class="where-sub">Have it yourself? Stamp your name below.</p>':''}`:`<p>Home on Hailey's shelf, as far as the card knows.</p>${ME?'<p class="where-sub">Taking it? Stamp your name below so the next friend can find it.</p>':''}`}${ME&&!mine&&b.onShelf?'<button class="btn ghost" style="margin-top:8px" id="stamp-btn">Stamp my name</button>':''}</div><div class="rate-row" id="rate-row">${[1,2,3,4,5].map(n=>`<button data-star="${n}">★</button>`).join('')}</div><p class="lede" id="rate-msg" hidden></p>${b.onShelf||b.stampCount?`<p class="section-label">Who's had it · ${b.stampCount} stamp${b.stampCount===1?'':'s'}${avg?` · ${avg}★ average`:''}</p><div class="timeline" id="hist-rows">${entries}</div>`:'<div id="hist-rows" hidden></div>'}<button class="show-all" id="show-more" ${h.done?'hidden':''}>Show more stamps</button><p class="where-sub" id="also-rated"></p></div>`;
  show('book');hydratePhotos();
  const renderAlso=()=>{const others=rs.filter(r=>!seen.has(r.friendId));$('#also-rated').innerHTML=others.length?'Also rated: '+others.map(r=>`${esc(r.name)} ${stars(r.value)}`).join(' · '):''};
  renderAlso();
  $('#where-btn').onclick=()=>{const p=$('#where-panel');p.hidden=!p.hidden};
  if(ME){
    $('#rate-toggle').onclick=()=>{const r=$('#rate-row');r.style.display=r.style.display==='flex'?'none':'flex'};
    if($('#stamp-btn'))$('#stamp-btn').onclick=async()=>{await store.stamp(id,ME);renderActivity();await openBook(id);$('#where-panel').hidden=false};
    document.querySelectorAll('#rate-row button').forEach(btn=>btn.onclick=async()=>{await store.rate(id,ME,+btn.dataset.star);await openBook(id)});
  }
  if(OWNER){
    const save=async change=>{await store.setShelf(id,change);Object.assign(CATALOG[id]||{},change);await openBook(id)};
    $('#own-shelf').onchange=e=>save({onShelf:e.target.checked});
    $('#own-status').onchange=e=>save({status:e.target.value});
  }
  if(OWNER)$('#remove-book').onclick=async e=>{
    if(e.target.dataset.armed){await store.removeBook(id);location.hash='#home';await loadWall();show('home');return}
    e.target.dataset.armed='1';e.target.textContent='Remove for good?'};
  let cursor=h.cursor,newer=h.stamps[h.stamps.length-1]?.tookAt;
  const more=$('#show-more');
  more.onclick=async()=>{const p=await store.pageHistory(id,cursor);$('#hist-rows').insertAdjacentHTML('beforeend',stampRows(p.stamps,newer,ratings,seen,b.currentStampId));cursor=p.cursor;newer=p.stamps[p.stamps.length-1]?.tookAt||newer;more.hidden=p.done;renderAlso()};
}
function route(){const h=(location.hash||'').slice(1);
  if(!ME)return;
  if(h.startsWith('book-')){openBook(h.slice(5));return}
  if(h==='owner'&&OWNER){renderOwner();return}
  if(h==='decorate'&&store.profiles){showDecorate();return}
  if(h.startsWith('visit-')&&store.profiles){openVisit(h.slice(6));return}
  if(h==='home'||h===''){renderWall();show('home')}}
window.addEventListener('hashchange',route);
// A friend revoked mid-session sees the gate on their next read rather than a dead page.
window.addEventListener('unhandledrejection',e=>{if(e.reason?.code==='permission-denied')showGate()});
document.addEventListener('click',e=>{
  const c=e.target.closest('.chip');if(c){const f=c.dataset.f;renderWall(f==='all'?null:f)}
  const t=e.target.closest('[data-shelf]');if(t){SHELF=t.dataset.shelf;renderWall(null)}
  if(e.target.id==='pick-btn'){PICK=!PICK;renderWall()}
  // Picking mode: a tap puts a book on the shelf or takes it off, without opening it.
  const pk=e.target.closest('[data-pick]');
  if(pk){e.preventDefault();const id=pk.dataset.pick,onShelf=!CATALOG[id].onShelf;CATALOG[id].onShelf=onShelf;pk.classList.toggle('picked',onShelf);store.setShelf(id,{onShelf}).then(()=>{for(const [k,fn] of Object.entries(SHELVES))document.querySelector(`[data-shelf="${k}"] b`).textContent=Object.values(CATALOG).filter(fn).length})}});
document.addEventListener('input',e=>{if(e.target.id==='search-in')renderWall()});

// --- decorating your shelf, and visiting other people's ---
async function renderVisitStrip(){
  if(!store.profiles)return;
  const ps=(await store.listProfiles()).sort((a,b)=>(b.id===ME.friendId)-(a.id===ME.friendId));
  $('#visit-wrap').hidden=false;
  $('#visit-strip').innerHTML=ps.map(p=>{const l=cleanLook(p.look),[wood]=WOODS[l.wood];
    return `<a class="visit-card" href="#visit-${esc(p.id)}"><span class="mini" style="--wood:${wood};background:${esc(WALLS[l.wall])}">${petOf(l)}</span>${p.id===ME.friendId?'Your shelf':esc(p.name)}${l.pet.name?`<small>with ${esc(l.pet.name)}</small>`:''}</a>`}).join('')}
async function openVisit(id){
  const p=(await store.listProfiles()).find(x=>x.id===id);if(!p){location.hash='#home';return}
  const l=cleanLook(p.look),mine=id===ME.friendId,ids=await store.friendBooks(id);
  const list=ids.map(b=>CATALOG[b]&&{...CATALOG[b],id:b,holderName:LENT[b]}).filter(Boolean);
  const petLine=l.pet.name?`${l.pet.name} the ${PET_NAMES[l.pet.kind].toLowerCase()} lives here. `:'';
  $('#visit-title').textContent=mine?'Your shelf.':`${p.name}'s shelf.`;
  $('#visit-sub').textContent=petLine+(p.owner?`Every book ${mine?'you have':'Hailey has'} read.`:`Books ${mine?'you have':p.name+' has'} borrowed or rated: ${list.length}.`);
  $('#visit-stats').innerHTML=p.stats?`<span><b>${p.stats.read}</b>books read</span><span><b>${p.stats.year}</b>this year</span>`:'';
  $('#visit-edit').hidden=!mine;
  $('#visit-case').innerHTML=buildCase(list,l,{empty:mine?'Borrow or rate a book and it shows up here.':'Nothing here yet.'});
  applyLook($('#visit-case'),l);hydratePhotos();show('visit')}
let DRAFT=null;
function showDecorate(){
  DRAFT=cleanLook(LOOK);
  $('#deco-title').textContent=ME.look?'Decorate your shelf.':'Make your shelf yours.';
  $('#deco-cancel').hidden=!ME.look;
  show('decorate');drawDecorate()}
function drawDecorate(){
  const sample=Object.entries(CATALOG).filter(([,b])=>b.coverUrl).slice(0,perRow()*Math.max(2,1+DRAFT.decor.filter(d=>d!=='lights').length)).map(([id,b])=>({...b,id}));
  $('#deco-preview').innerHTML=buildCase(sample,DRAFT,{every:true});applyLook($('#deco-preview'),DRAFT);
  $('#deco-preview').querySelectorAll('a').forEach(a=>a.removeAttribute('href'));
  const on=(c)=>c?' on':'';
  $('#deco-controls').innerHTML=`<h3>Wood</h3><div class="swatches">${Object.entries(WOODS).map(([k,[w,t]])=>`<button class="swatch${on(DRAFT.wood===k)}" data-wood="${k}" title="${k}" style="background:linear-gradient(${t},${w})"></button>`).join('')}</div>
  <h3>Wallpaper</h3><div class="swatches">${Object.entries(WALLS).map(([k,w])=>`<button class="swatch${on(DRAFT.wall===k)}" data-wall="${k}" title="${k}" style="background:${esc(w)}"></button>`).join('')}</div>
  <h3>Pet</h3><div class="swatches">${Object.entries(PETS).map(([k,f])=>`<button class="pick-tile${on(DRAFT.pet.kind===k)}" data-pet="${k}">${f(DRAFT.pet.color)}${PET_NAMES[k]}</button>`).join('')}</div>
  <h3>Pet color</h3><div class="swatches">${PET_COLORS.map(c=>`<button class="swatch round${on(DRAFT.pet.color===c)}" data-color="${c}" style="background:${c}"></button>`).join('')}</div>
  <h3>Pet's name</h3><input class="door-name" id="pet-name" maxlength="20" placeholder="Biscuit" value="${esc(DRAFT.pet.name)}"/>
  <h3>On the shelves <span style="text-transform:none;letter-spacing:0">(up to 4)</span></h3><div class="swatches">${Object.entries(DECOR).map(([k,d])=>`<button class="pick-tile${on(DRAFT.decor.includes(k))}" data-decor="${k}">${k==='lights'?lightsSvg():d.svg}${esc(d.label)}</button>`).join('')}</div>`;
  $('#pet-name').oninput=e=>{DRAFT.pet.name=e.target.value.slice(0,20)}}
document.addEventListener('click',async e=>{
  if($('#view-decorate').hidden)return;
  const t=e.target.closest('[data-wood],[data-wall],[data-pet],[data-color],[data-decor]');
  if(t){const d=t.dataset;
    if(d.wood)DRAFT.wood=d.wood;if(d.wall)DRAFT.wall=d.wall;if(d.pet)DRAFT.pet.kind=d.pet;if(d.color)DRAFT.pet.color=d.color;
    if(d.decor)DRAFT.decor=DRAFT.decor.includes(d.decor)?DRAFT.decor.filter(x=>x!==d.decor):[...DRAFT.decor,d.decor].slice(-4);
    drawDecorate();return}
  if(e.target.id==='deco-save'){LOOK=cleanLook(DRAFT);await store.saveLook(LOOK);ME.look=LOOK;renderVisitStrip();location.hash='#home'}});

// --- owner view (#owner): invite management ---
const linkFor=(t,scan)=>`${location.origin}${location.pathname.replace(/[^/]*$/,'')}${scan?'scan.html':''}?t=${t}`;
const showInvite=(t,scan)=>{$('#owner-new-out').innerHTML=`Code <strong class="invite-code">${esc(formatCode(t))}</strong><br>or link: ${esc(linkFor(t,scan))}`};
async function renderOwner(){
  show('owner');
  if(store.profiles)return renderFriends();
  const invites=await store.listInvites();
  const friends=new Map();
  // Newest first, so the first invite seen for a friend is their current one.
  invites.forEach(i=>{const f=friends.get(i.friendId)||{friendId:i.friendId,name:null,invite:i,active:false,canAdd:i.canAdd,owner:i.owner};f.name=f.name||i.name;if(!i.revokedAt)f.active=true;friends.set(i.friendId,f)});
  $('#owner-list').innerHTML=[...friends.values()].map(f=>{
    const n=f.name||'?',open=!f.invite.redeemedBy&&!f.invite.revokedAt;
    return `<div class="entry" data-friend="${esc(f.friendId)}" data-name="${esc(f.name||'')}" data-canadd="${f.canAdd?'1':''}" data-owner="${f.owner?'1':''}"><span class="dot" style="background:${dotColor(n)}">${esc(initials(n))}</span><span class="who">${f.name?esc(f.name):'<em>unclaimed</em>'}<span class="when">${f.owner?'owner · ':f.canAdd?'adds books · ':''}${open?'code '+esc(formatCode(f.invite.id)):f.active?'code used':'revoked'}</span></span><span>${f.name?`<button class="btn ghost" data-relink="1">new code</button> `:''}${f.active&&f.friendId!==ME.friendId?'<button class="btn ghost" data-revoke="1">revoke</button>':''}</span></div>`}).join('')||'<p class="lede">No invites yet.</p>';
}
// Profiles mode: one group code, and a list of profiles Hailey can reset or remove.
async function renderFriends(){
  $('#view-owner h1').textContent='Friends.';
  $('#view-owner .lede').textContent='Send everyone the same invite code. Each friend makes a profile with their own password.';
  $('#owner-tools').innerHTML=`<p class="section-label" style="margin-top:0">Invite code</p><p><strong class="invite-code">${esc(await store.groupCode())}</strong></p><p class="where-sub">A new code stops the old one working. Profiles already made keep working.</p><button class="btn ghost" id="code-new">New code</button>`;
  const ps=await store.listProfiles();
  $('#owner-list').innerHTML=ps.map(p=>`<div class="entry" data-profile-row="${esc(p.id)}"><span class="dot" style="background:${dotColor(p.name)}">${esc(initials(p.name))}</span><span class="who">${esc(p.name)}<span class="when">${p.owner?'owner':'friend'}</span></span><span>${p.owner?'':'<button class="btn ghost" data-reset="1">reset password</button> <button class="btn ghost" data-remove="1">remove</button>'}</span></div>`).join('')}
document.addEventListener('click',async e=>{
  const prow=e.target.closest?.('[data-profile-row]');
  if(e.target.id==='code-new'){await store.newGroupCode();renderFriends()}
  if(prow&&e.target.dataset.reset){await store.resetPassword(prow.dataset.profileRow);e.target.textContent='reset: they set a new one next time';e.target.disabled=true}
  if(prow&&e.target.dataset.remove){if(!e.target.dataset.armed){e.target.dataset.armed='1';e.target.textContent='remove for good?';return}await store.removeProfile(prow.dataset.profileRow);renderFriends()}
});
document.addEventListener('click',async e=>{
  const row=e.target.closest?.('[data-friend]');
  if(e.target.id==='owner-scan'){showInvite(await store.createInvite({canAdd:true}),true);renderOwner()}
  if(e.target.id==='owner-new'){showInvite(await store.createInvite());renderOwner()}
  if(row&&e.target.dataset.revoke){await store.revokeFriend(row.dataset.friend);renderOwner()}
  // Same friendId and name: for a friend on a new device, or one being let back in.
  if(e.target.id==='gr-go')importGoodreads();
  if(e.target.id==='gr-export'){
    e.target.disabled=true;$('#gr-out').textContent='Preparing the file…';
    const csv=writeExport(await store.exportBooks(ME.friendId));
    const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([csv],{type:'text/csv'})),download:`friendship-library-${new Date().toISOString().slice(0,10)}.csv`});
    document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),10000);
    $('#gr-out').textContent='Exported. It opens in a spreadsheet, and Goodreads can import it.';e.target.disabled=false}
  if(row&&e.target.dataset.relink){showInvite(await store.createInvite({friendId:row.dataset.friend,name:row.dataset.name,canAdd:!!row.dataset.canadd,owner:!!row.dataset.owner}),!!row.dataset.canadd&&!row.dataset.owner);renderOwner()}
});
// --- Goodreads import (owner) ---
let GR=null;
$('#gr-file').onchange=async e=>{
  const f=e.target.files[0];if(!f)return;
  try{GR=readExport(await f.text())}catch(err){GR=null;$('#gr-out').textContent='That file does not look like a Goodreads export.';return}
  const n=s=>GR.filter(b=>b.shelf===s).length;
  $('#gr-out').textContent=`${GR.length} books: ${n('read')} read, ${n('currently-reading')} reading, ${n('to-read')} to read. ${GR.filter(b=>b.owned).length} marked as owned on Goodreads.`;
  $('#gr-options').hidden=false};
async function importGoodreads(){
  const shelves=[...document.querySelectorAll('#gr-options input[name=gr-shelf]:checked')].map(i=>i.value);
  const own=document.querySelector('#gr-options input[name=gr-own]:checked').value;
  const have=Object.values(CATALOG);
  const todo=GR.filter(b=>shelves.includes(b.shelf)||(b.owned&&own==='owned')).filter(b=>!have.some(c=>sameBook(c,b)));
  const skipped=GR.filter(b=>shelves.includes(b.shelf)).length-todo.length;
  $('#gr-go').disabled=true;
  let done=0,failed=0;
  const queue=[...todo];
  // A few at a time keeps Open Library happy and still finishes a few hundred books in a couple of minutes.
  await Promise.all([0,1,2].map(async()=>{for(let b;(b=queue.shift());){
    try{
      const meta=await enrich(b);
      const onShelf=own==='all'||(own==='owned'&&b.owned);
      const id=await store.addBook(meta,{addedBy:ME.name,onShelf,status:b.status});
      if(b.rating)await store.rate(id,ME,b.rating);
    }catch(err){failed++}
    done++;$('#gr-out').textContent=`Adding ${done} of ${todo.length}…`}}));
  $('#gr-out').textContent=`Imported ${done-failed} books.${skipped?` ${skipped} were already here.`:''}${failed?` ${failed} could not be added.`:''}`;
  $('#gr-go').disabled=false;await loadWall()}

// Never leave someone on "Opening the door…" if the connection fails or stalls.
const doorStuck=()=>{if(!$('#view-enter').hidden&&$('#enter-body').textContent.includes('Opening the door'))$('#enter-body').innerHTML='<p class="lede">The library is not answering. Check your connection and refresh.</p>'};
setTimeout(doorStuck,20000);
boot().catch(e=>{console.error(e);doorStuck()});
