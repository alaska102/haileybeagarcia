// The hidden add-books page: scan or type an ISBN, or add by hand with a photo.
import config from './config.js';
import { connect } from './backend.js';
import { normalizeCode } from './codes.js';
import { lookupIsbn } from './openlibrary.js';

const { store, session } = await connect(config);
if (store.demo) document.body.insertAdjacentHTML('afterbegin', '<div class="demo-flag">Demo · the friends are made up and nothing you do is saved</div>');

const $ = s => document.querySelector(s);
const PHOTO_MAX_BYTES = 150000;
let ME = null, OWNER = false, scanner = null, draft = null, photo = null, catalog = {};

function show(id) { ['s-gate', 's-name', 's-scan', 's-book'].forEach(x => { $('#' + x).hidden = x !== id; }); window.scrollTo(0, 0); }

async function boot() {
  const t = new URL(location.href).searchParams.get('t');
  if (t) { sessionStorage.setItem('alib_t', normalizeCode(t)); history.replaceState(null, '', location.pathname); }
  const token = sessionStorage.getItem('alib_t');
  await session.ready();
  let user = session.user();
  // Read together: a second read issued right after the first has been seen to stall on a fresh connection.
  const readInvite = () => store.getInvite(token).catch(() => null);
  const early = token && user ? readInvite() : null;
  if (user) ME = await store.getMember(user.uid);
  OWNER = !!ME?.owner;
  if (OWNER || ME?.canAdd) return ready();
  if (token && !ME) {
    if (!user) user = await session.signIn();
    const invite = await (early || readInvite());
    if ((invite?.canAdd || invite?.owner) && !invite.redeemedBy && !invite.revokedAt) return askName(token, invite, user);
  }
  show('s-gate');
}
function askName(token, invite, user) {
  show('s-name');
  if (invite.name) $('#scan-name').value = invite.name;
  $('#scan-join').onclick = async () => {
    const n = $('#scan-name').value.trim().replace(/\s+/g, ' ');
    if (!n) return;
    if (/[<>]/.test(n)) { $('#join-msg').textContent = 'Names cannot contain < or >.'; return; }
    try { ME = await store.redeemInvite(token, user.uid, n); } catch (e) { $('#join-msg').textContent = 'That code has already been used. Ask Hailey for a new one.'; return; }
    sessionStorage.removeItem('alib_t');
    ready();
  };
}
async function ready() { sessionStorage.removeItem('alib_t'); catalog = await store.getCatalog(); show('s-scan'); }

// --- camera ---
async function loadScanner() {
  if (window.Html5Qrcode) return;
  await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js'; s.integrity = 'sha384-c9d8RFSL+u3exBOJ4Yp3HUJXS4znl9f+z66d1y54ig+ea249SpqR+w1wyvXz/lk+'; s.crossOrigin = 'anonymous'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
}
async function stopCamera() {
  if (!scanner) return;
  const s = scanner; scanner = null;
  try { await s.stop(); s.clear(); } catch (e) {}
  $('#scan-box').innerHTML = ''; $('#scan-box').hidden = true;
  $('#cam-btn').textContent = 'Scan a barcode';
}
$('#cam-btn').onclick = async () => {
  if (scanner) return stopCamera();
  $('#scan-msg').textContent = 'Starting the camera…';
  try {
    await loadScanner();
    // The library sizes its video from this box when it starts, so the box must be visible first.
    $('#scan-box').hidden = false;
    // Book barcodes are EAN-13 and start 978 or 979, which is the ISBN itself.
    scanner = new window.Html5Qrcode('scan-box', { formatsToSupport: [window.Html5QrcodeSupportedFormats.EAN_13], verbose: false });
    await scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: (w, h) => ({ width: Math.floor(w * 0.85), height: Math.floor(Math.min(h, w) * 0.45) }) }, async text => {
      if (!/^97[89]\d{10}$/.test(text)) { $('#scan-msg').textContent = "That barcode isn't a book's. Try the one on the back cover."; return; }
      await stopCamera();
      findBook(text);
    }, () => {});
    $('#cam-btn').textContent = 'Stop the camera';
    $('#scan-msg').textContent = 'Point the camera at the barcode.';
  } catch (e) {
    scanner = null; $('#scan-box').hidden = true;
    $('#scan-msg').textContent = 'The camera is not available here. Typing the ISBN works everywhere.';
  }
};

// --- finding a book ---
$('#isbn-btn').onclick = () => { const v = $('#isbn-in').value.replace(/[^0-9Xx]/g, ''); if (v) findBook(v); };
$('#manual-btn').onclick = async () => { await stopCamera(); edit({ isbn: $('#isbn-in').value.replace(/[^0-9Xx]/g, '') || null }, 'Add by hand'); };

async function findBook(isbn) {
  $('#scan-msg').textContent = 'Looking it up…';
  let meta = null, failed = false;
  try { meta = await lookupIsbn(isbn); } catch (e) { failed = true; }
  $('#scan-msg').textContent = '';
  if (meta) return edit(meta, 'Is this it?');
  edit({ isbn }, 'Add by hand', failed ? 'Could not reach Open Library. You can add this one by hand.' : 'No match for that ISBN. You can add it by hand.');
}
function edit(meta, heading, note) {
  draft = meta; photo = null;
  $('#pv-head').textContent = heading;
  $('#pv-title').value = meta.title || ''; $('#pv-author').value = meta.author || ''; $('#pv-isbn').value = meta.isbn || '';
  $('#pv-photo').value = '';
  if (meta.coverUrl) $('#pv-img').src = meta.coverUrl; else $('#pv-img').removeAttribute('src');
  $('#pv-photo-label').firstChild.textContent = meta.coverUrl ? 'Use your own photo instead (optional)' : 'Photo of the cover';
  const dup = meta.isbn && Object.values(catalog).some(b => b.isbn === meta.isbn);
  $('#pv-msg').textContent = note || (dup ? 'Already on the shelf. Adding it again makes a second copy.' : meta.coverUrl ? '' : 'No cover found. Take a photo of it to add it.');
  show('s-book');
}

// --- photo: shrunk on the phone, since the free tier has no file storage ---
async function shrink(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    for (const [edge, quality] of [[640, 0.75], [480, 0.7], [360, 0.6], [240, 0.5]]) {
      const scale = Math.min(1, edge / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * scale); c.height = Math.round(img.naturalHeight * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      const data = c.toDataURL('image/jpeg', quality);
      if (data.length <= PHOTO_MAX_BYTES) return data;
    }
    return null;
  } finally { URL.revokeObjectURL(url); }
}
$('#pv-photo').onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  $('#pv-msg').textContent = 'Preparing the photo…';
  photo = await shrink(f).catch(() => null);
  if (!photo) { $('#pv-msg').textContent = 'That photo could not be used. Try another.'; return; }
  $('#pv-img').src = photo;
  $('#pv-msg').textContent = '';
};
$('#pv-cancel').onclick = () => { $('#isbn-in').value = ''; $('#scan-msg').textContent = ''; show('s-scan'); };
$('#pv-add').onclick = async () => {
  const title = $('#pv-title').value.trim();
  if (!title) { $('#pv-msg').textContent = 'A title is needed.'; return; }
  if (!photo && !draft.coverUrl) { $('#pv-msg').textContent = 'A picture is needed: take a photo of the cover.'; return; }
  const meta = { ...draft, title, author: $('#pv-author').value.trim() || null, isbn: $('#pv-isbn').value.replace(/[^0-9Xx]/g, '') || null };
  $('#pv-add').disabled = true;
  try {
    await store.addBook(meta, { addedBy: ME?.name || null, photo });
    catalog = await store.getCatalog();
    const row = document.createElement('div'); row.className = 'added'; row.textContent = title;
    $('#added-list').prepend(row); $('#s-log').hidden = false;
    $('#isbn-in').value = ''; $('#scan-msg').textContent = `Added ${title}.`;
    show('s-scan');
  } catch (e) { $('#pv-msg').textContent = 'That did not save. Check the connection and try again.'; }
  $('#pv-add').disabled = false;
};
const unavailable = () => { $('#s-gate').querySelector('p').textContent = 'The library is not answering. Check your connection and refresh.'; show('s-gate'); };
const stuck = setTimeout(unavailable, 20000);
boot().then(() => clearTimeout(stuck)).catch(e => { clearTimeout(stuck); console.error(e); unavailable(); });
