// Static, read-only Friendship Library: Hailey's shelves from books.json. No accounts, nothing saved.

const $=s=>document.querySelector(s);
// Every value that reaches innerHTML goes through esc or safeUrl: Open Library text is untrusted.
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl=u=>/^https:\/\/[^\s'"()<>\\]+$/.test(u||'')?u:'';
const stars=r=>'<span class="stars">'+'★'.repeat(r)+'<span class="dim">'+'★'.repeat(5-r)+'</span></span>';
const PALETTE=['#e8b4b8','#b8d4c8','#f2d5a0','#c5b8e0','#a8c8e8','#e8c4a0','#d4b8d0','#b8e0d4'];
function dotColor(n){let h=0;for(const c of n)h=(h*31+c.charCodeAt(0))>>>0;return PALETTE[h%PALETTE.length]}
const views=['home','book'];
function show(v){views.forEach(x=>{$('#view-'+x).hidden=x!==v});window.scrollTo(0,0)}


let BOOKS=[],SHELF='read';
// A book with no cover (or a cover that fails to load) becomes a plain title card.
const mainTitle=t=>String(t||'').split(/:\s/)[0];
const titleCard=b=>`<span class="cover-card" style="background:${dotColor(b.title)}"><span>${esc(mainTitle(b.title))}</span><small>${esc(b.author||'')}</small></span>`;
document.addEventListener('error',e=>{const img=e.target;if(img.tagName==='IMG'&&img.closest('.cover')){img.replaceWith(Object.assign(document.createElement('span'),{className:'cover-card',innerHTML:`<span>${esc(mainTitle(img.alt))}</span>`,style:`background:${dotColor(img.alt)}`}))}},true);
const coverOf=b=>safeUrl(b.coverUrl)||(b.isbn?`https://covers.openlibrary.org/b/isbn/${encodeURIComponent(b.isbn)}-M.jpg?default=false`:'');

// Small drawn pets that sit on the shelves. Illustration only.
const INK='#571f36';
const PETS=[
  `<svg class="pet" viewBox="0 0 48 48" aria-hidden="true"><g stroke="${INK}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><path d="M34 44c7 0 9-6 6-11" fill="none"/><path d="M14 47c-2-10 1-19 10-19s12 9 10 19z" fill="#f4c6b9"/><path d="M15 20l-1-11 7 6h6l7-6-1 11c0 6-4 9-9 9s-9-3-9-9z" fill="#f4c6b9"/><path d="M22.5 23q1.5 1.5 3 0" fill="none"/></g><circle cx="20.5" cy="19" r="1.3" fill="${INK}"/><circle cx="27.5" cy="19" r="1.3" fill="${INK}"/></svg>`,
  `<svg class="pet pet-wide" viewBox="0 0 60 34" aria-hidden="true"><g stroke="${INK}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><path d="M52 33c5 0 6-5 2-7" fill="none"/><path d="M8 33c0-10 8-16 20-16h8c10 0 16 6 16 16z" fill="#fff3d9"/><path d="M5 33c-1-7 2-13 6-15l-1-8 6 5h6l6-5-1 8c4 2 6 8 5 15z" fill="#fff3d9"/><path d="M11 25q2 2 4 0M19 25q2 2 4 0" fill="none"/></g></svg>`,
  `<svg class="pet" viewBox="0 0 48 48" aria-hidden="true"><g stroke="${INK}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><path d="M33 44c5 0 7-4 7-8" fill="none"/><path d="M15 47c-1-9 2-17 9-17s10 8 9 17z" fill="#e8a9ae"/><path d="M16 21c0-6 4-10 8-10s8 4 8 10-3 9-8 9-8-3-8-9z" fill="#e8a9ae"/><path d="M17 13c-5 1-7 7-4 11l4-2zM31 13c5 1 7 7 4 11l-4-2z" fill="${INK}"/></g><circle cx="20.5" cy="20" r="1.3" fill="${INK}"/><circle cx="27.5" cy="20" r="1.3" fill="${INK}"/><ellipse cx="24" cy="24.5" rx="2" ry="1.4" fill="${INK}"/></svg>`,
];
const perRow=()=>innerWidth>=1000?6:innerWidth>=700?5:4;
const SHELVES={shelf:b=>b.onShelf,reading:b=>b.status==='reading',read:b=>b.status==='read'};
const activeFilter=()=>{const f=document.querySelector('.chip.on')?.dataset.f;return f==='all'?null:f};
function renderWall(filter=activeFilter(),q=$('#search-in').value){
  for(const [k,fn] of Object.entries(SHELVES)){const t=$(`[data-shelf="${k}"]`),n=BOOKS.filter(fn).length;t.classList.toggle('on',k===SHELF);t.querySelector('b').textContent=n;t.hidden=k==='shelf'&&!n}
  let list=BOOKS.filter(SHELVES[SHELF]);
  if(filter)list=list.filter(b=>(b.genres||[]).some(g=>g.toLowerCase()===filter));
  if(q){const s=q.toLowerCase();list=list.filter(b=>(b.title+' '+(b.author||'')+' '+(b.genres||[]).join(' ')).toLowerCase().includes(s))}
  const n=perRow(),rows=[];
  for(let i=0;i<list.length;i+=n)rows.push(list.slice(i,i+n));
  // A pet on every third shelf, alternating sides; on a short last shelf it takes an empty spot.
  $('#wall').innerHTML=rows.map((row,r)=>{
    const pet=r%3===1||(rows.length===1&&r===0)?PETS[Math.floor(r/3)%PETS.length]:'';
    const books=row.map(b=>`<a class="cover" href="#book-${b.id}">${coverOf(b)?`<img src="${esc(coverOf(b))}" alt="${esc(b.title)}" loading="lazy"/>`:titleCard(b)}</a>`).join('');
    const spot=pet&&row.length<n?`<span class="pet-spot">${pet}</span>`:'';
    return `<div class="shelf"><div class="shelf-books" style="--n:${n}">${books}${spot}</div>${pet&&!spot?`<span class="pet-perch ${r%2?'left':'right'}">${pet}</span>`:''}<div class="plank"></div></div>`}).join('')
    ||`<div class="shelf shelf-empty"><p class="lede">${q||filter?'No books match.':'Nothing on this shelf yet.'}</p><span class="pet-spot">${PETS[1]}</span><div class="plank"></div></div>`;
  const counts={};BOOKS.filter(SHELVES[SHELF]).forEach(b=>(b.genres||[]).forEach(g=>{counts[g]=(counts[g]||0)+1}));
  const top=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,4).map(e=>e[0].toLowerCase());
  $('#chips').innerHTML=`<button class="chip ${!filter?'on':''}" data-f="all">All books</button>`+top.map(g=>`<button class="chip ${filter===g?'on':''}" data-f="${esc(g)}">${esc(g)}</button>`).join('');
}

function openBook(id){
  const b=BOOKS[id];if(!b){location.hash='home';return}
  const metaChips=[b.year,b.pages?b.pages+' pages':null,...(b.genres||[])].filter(Boolean).map(x=>`<span>${esc(x)}</span>`).join('');
  const statusLine=[b.onShelf?"On Hailey's shelf":null,b.status==='read'?'Hailey has read it':b.status==='reading'?'Hailey is reading it':null].filter(Boolean).join(' · ');
  const mine=b.rating?`<div class="agg"><span class="agg-stars">${stars(b.rating)}</span><span class="agg-n">Hailey's rating</span></div>`:'';
  const paras=(b.summary||'').split(/\r?\n\r?\n/).map(p=>p.replace(/\r?\n/g,' '));
  const rest=paras.slice(1).join(' ');
  const cover=esc(coverOf(b));
  $('#book-detail').innerHTML=`<div class="sheet-head">${cover?`<div class="bgblur" style="background-image:url('${cover}')"></div><img src="${cover}" alt="Cover of ${esc(b.title)}"/>`:''}<h1>${esc(b.title)}</h1><p class="author">${esc(b.author)}</p><div class="sheet-meta">${metaChips}</div><p class="shelf-status">${esc(statusLine)}</p>${mine}</div><div class="sheet-body"><p class="synopsis">${esc(paras[0])}</p>${rest?`<details class="full-summary"><summary>Read the full summary</summary><p class="synopsis" style="margin-top:8px">${esc(rest)}</p></details>`:''}${b.summary?`<p class="src-line">Summary · Open Library</p>`:''}</div>`;
  show('book')}

function route(){
  const m=location.hash.match(/^#book-(\d+)$/);
  if(m)openBook(+m[1]);else{show('home');renderWall()}}

document.querySelector('.shelf-tabs').onclick=e=>{const t=e.target.closest('[data-shelf]');if(!t)return;SHELF=t.dataset.shelf;$('#search-in').value='';renderWall(null)};
$('#chips').onclick=e=>{const c=e.target.closest('.chip');if(c)renderWall(c.dataset.f==='all'?null:c.dataset.f)};
$('#search-in').oninput=()=>renderWall();
let lastPerRow=perRow();
addEventListener('resize',()=>{if(perRow()!==lastPerRow&&!$('#view-home').hidden){lastPerRow=perRow();renderWall()}});
addEventListener('hashchange',route);

BOOKS=(await (await fetch('books.json')).json()).map((b,id)=>({...b,id}));
if(BOOKS.some(b=>b.onShelf))SHELF='shelf';
route();
