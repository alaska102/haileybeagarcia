// In-memory stand-in for Firestore and Auth, for a demo with no accounts behind it.
// Hailey's real books come from books.json; the friends, stamps and ratings are made up.
// State lives in sessionStorage so the add-books page sees the same session; closing the tab forgets it.
import { randomCode } from './codes.js';

const KEY = 'flib_demo2';
const DAY = 86400000;
const FRIENDS = ['Maya', 'Jess', 'Priya', 'Theo', 'Sam'];
// Hailey's shelf, then each made-up friend's.
const LOOKS = [
  { wood: 'pink', wall: 'flowers', pet: { kind: 'sleepy', color: '#fff3d9', name: 'Mochi' }, decor: ['plant', 'lights', 'frame', 'candle'] },
  { wood: 'oak', wall: 'gingham', pet: { kind: 'bunny', color: '#fff3d9', name: 'Biscuit' }, decor: ['plant', 'books'] },
  { wood: 'walnut', wall: 'stars', pet: { kind: 'cat', color: '#8f8a99', name: 'Pepper' }, decor: ['lamp', 'globe', 'lights'] },
  { wood: 'mint', wall: 'dots', pet: { kind: 'frog', color: '#a9d3b5', name: 'Lily' }, decor: ['candle', 'plant'] },
  { wood: 'white', wall: 'stripes', pet: { kind: 'dog', color: '#e0b070', name: 'Noodle' }, decor: ['frame', 'lamp'] },
  { wood: 'cherry', wall: 'blush', pet: { kind: 'cat', color: '#e0b070', name: 'Toast' }, decor: ['books'] },
];

function seed(list) {
  const now = Date.now();
  // A fixed pseudo-random sequence, so every visitor sees the same demo library.
  let n = 7; const rnd = () => (n = (n * 16807) % 2147483647) / 2147483647;
  const profiles = { hailey: { name: 'Hailey', friendId: 'hailey', owner: true, canAdd: true, password: null, sample: true, joinedAt: now - 90 * DAY, look: LOOKS[0] } };
  FRIENDS.forEach((name, i) => { profiles['f' + i] = { name, friendId: 'f' + i, owner: false, canAdd: false, password: null, sample: true, joinedAt: now - (80 - i * 9) * DAY, look: LOOKS[i + 1] }; });
  const books = {}, history = {}, ratings = {};
  list.forEach((b, i) => {
    const id = 'b' + i;
    // Goodreads lists nothing as owned, so the demo puts about one read book in four on the shelf.
    const onShelf = b.onShelf || (b.status === 'read' && i % 4 === 0);
    books[id] = { title: b.title, author: b.author, isbn: b.isbn, year: b.year, pages: b.pages, coverUrl: b.coverUrl, summary: b.summary, genres: b.genres || [], addedBy: 'Hailey', hasPhoto: false, onShelf, status: b.status,
      createdAt: now - (200 - i) * DAY / 2, ratingSum: 0, ratingCount: 0, stampCount: 0, holderFriendId: null, holderName: null, holderSince: null, currentStampId: null };
    history[id] = []; ratings[id] = {};
    if (b.rating) ratings[id].hailey = { value: b.rating, friendId: 'hailey', name: 'Hailey', updatedAt: now - 30 * DAY };
    if (onShelf && rnd() < 0.6) {
      // A short borrowing history, oldest first; the newest stamp may still be out.
      let t = now - (40 + rnd() * 140) * DAY, who = null;
      const stamps = 1 + Math.floor(rnd() * 3);
      for (let s = 0; s < stamps; s++) {
        let f; do f = 'f' + Math.floor(rnd() * FRIENDS.length); while (f === who);
        who = f;
        history[id].unshift({ id: id + 's' + s, friendId: f, name: profiles[f].name, bookId: id, title: b.title, tookAt: t });
        if (rnd() < 0.7) ratings[id][f] = { value: 3 + Math.floor(rnd() * 3), friendId: f, name: profiles[f].name, updatedAt: t + 10 * DAY };
        t += (8 + rnd() * 30) * DAY;
      }
      const last = history[id][0];
      Object.assign(books[id], { stampCount: stamps, currentStampId: last.id, holderFriendId: last.friendId, holderName: last.name, holderSince: last.tookAt });
    } else if (b.status === 'read' && rnd() < 0.25) {
      const f = 'f' + Math.floor(rnd() * FRIENDS.length);
      ratings[id][f] = { value: 2 + Math.floor(rnd() * 4), friendId: f, name: profiles[f].name, updatedAt: now - rnd() * 60 * DAY };
    }
    for (const r of Object.values(ratings[id])) { books[id].ratingSum += r.value; books[id].ratingCount++; }
  });
  return { code: 'FR1E-NDSH-1PS0', profiles, books, history, ratings, covers: {}, me: null, nextId: list.length };
}

export async function createDemo({ books: url = 'books.json' } = {}) {
  let S;
  try { S = JSON.parse(sessionStorage.getItem(KEY)); } catch (e) {}
  if (!S) S = seed(await (await fetch(url)).json());
  const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
  save();
  const copy = o => o && JSON.parse(JSON.stringify(o));
  const member = p => p && { name: p.name, friendId: p.friendId, owner: p.owner, canAdd: p.canAdd, look: copy(p.look) || null };
  const catalogEntry = b => ({ title: b.title, author: b.author || null, coverUrl: b.coverUrl || null, isbn: b.isbn || null, genres: b.genres || [], hasPhoto: !!b.hasPhoto, onShelf: !!b.onShelf, status: b.status || 'none', addedAt: b.createdAt });
  const allStamps = () => Object.values(S.history).flat().sort((a, b) => b.tookAt - a.tookAt);
  const sameCode = c => String(c || '').toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1').replace(/[^0-9A-Z]/g, '') === S.code.replace(/-/g, '');

  const store = {
    profiles: true, demo: true,
    // --- the group code, and profiles with passwords ---
    checkCode: async c => sameCode(c),
    listProfiles: async () => Object.values(S.profiles).map(p => ({ id: p.friendId, name: p.name, owner: p.owner, look: copy(p.look) || null })),
    async saveLook(look) { if (S.profiles[S.me]) S.profiles[S.me].look = look; save(); },
    // What shows on someone's shelf: Hailey's is everything she has read; a friend's is what they borrowed or rated.
    async friendBooks(id) {
      const p = S.profiles[id]; if (!p) return [];
      if (p.owner) return Object.keys(S.books).filter(b => S.books[b].status === 'read');
      return Object.keys(S.books).filter(b => S.ratings[b]?.[id] || S.history[b]?.some(s => s.friendId === id));
    },
    async createProfile(name, password) {
      if (Object.values(S.profiles).some(p => p.name.toLowerCase() === name.toLowerCase())) throw new Error('NAME_TAKEN');
      const id = 'p' + (S.nextId++);
      S.profiles[id] = { name, friendId: id, owner: false, canAdd: false, password, joinedAt: Date.now() };
      S.me = id; save(); return member(S.profiles[id]);
    },
    // The made-up friends and Hailey take any password in the demo. After a reset,
    // the next password typed becomes the new one.
    async signInProfile(id, password) {
      const p = S.profiles[id];
      if (!p || (p.password !== null && p.password !== password)) throw new Error('WRONG_PASSWORD');
      if (p.password === null && !p.sample) p.password = password;
      S.me = id; save(); return member(p);
    },
    async signOut() { S.me = null; save(); },
    groupCode: async () => S.code,
    async newGroupCode() { S.code = randomCode().match(/.{4}/g).join('-'); save(); return S.code; },
    async resetPassword(id) { if (S.profiles[id]) S.profiles[id].password = null; save(); },
    async removeProfile(id) { if (id !== 'hailey') delete S.profiles[id]; save(); },
    async getMember(uid) { return member(S.profiles[uid]); },

    // --- reading ---
    async lentBooks() { return Object.fromEntries(Object.entries(S.books).filter(([, b]) => b.holderFriendId).map(([id, b]) => [id, b.holderName])); },
    async getBook(id) { return S.books[id] ? { id, ...copy(S.books[id]) } : null; },
    async getCatalog() { return Object.fromEntries(Object.entries(S.books).map(([id, b]) => [id, catalogEntry(b)])); },
    async pageHistory(id, after = 0) { const h = S.history[id] || []; return { stamps: copy(h.slice(after, after + 10)), cursor: after + 10, done: after + 10 >= h.length }; },
    async exportBooks(friendId) { return Object.entries(S.books).map(([id, b]) => ({ id, ...copy(b), myRating: S.ratings[id]?.[friendId]?.value || 0 })); },
    async listRatings(id) { return copy(Object.values(S.ratings[id] || {})); },
    async activity() { return copy(allStamps().slice(0, 8)); },

    // --- friend writes ---
    async stamp(id, m) {
      const b = S.books[id]; if (!b) throw new Error('NO_BOOK');
      if (b.holderFriendId === m.friendId) return;
      const s = { id: id + 's' + Date.now(), friendId: m.friendId, name: m.name, bookId: id, title: b.title, tookAt: Date.now() };
      S.history[id].unshift(s);
      Object.assign(b, { holderFriendId: m.friendId, holderName: m.name, holderSince: s.tookAt, currentStampId: s.id, stampCount: b.stampCount + 1 });
      save(); return s.id;
    },
    async rate(id, m, value) {
      const b = S.books[id], prior = S.ratings[id][m.friendId]?.value ?? null;
      S.ratings[id][m.friendId] = { value, friendId: m.friendId, name: m.name, updatedAt: Date.now() };
      b.ratingSum += value - (prior ?? 0); b.ratingCount += prior === null ? 1 : 0; save();
    },

    // --- owner writes ---
    async addBook(meta, { addedBy = null, photo = null, onShelf = true, status = 'none' } = {}) {
      const id = 'b' + (S.nextId++);
      S.books[id] = { title: meta.title, author: meta.author ?? null, isbn: meta.isbn ?? null, year: meta.year ?? null, pages: meta.pages ?? null, coverUrl: meta.coverUrl ?? null, summary: meta.summary ?? null, genres: meta.genres ?? [], addedBy, hasPhoto: !!photo, onShelf, status,
        createdAt: Date.now(), ratingSum: 0, ratingCount: 0, stampCount: 0, holderFriendId: null, holderName: null, holderSince: null, currentStampId: null };
      S.history[id] = []; S.ratings[id] = {};
      if (photo) S.covers[id] = photo;
      save(); return id;
    },
    async setShelf(id, change) { Object.assign(S.books[id], change); save(); },
    async getPhoto(id) { return S.covers[id] || null; },
    async removeBook(id) { delete S.books[id]; delete S.history[id]; delete S.ratings[id]; delete S.covers[id]; save(); },
  };
  const session = {
    ready: async () => {},
    user: () => (S.me && S.profiles[S.me] ? { uid: S.me } : null),
    signIn: async () => null,
  };
  return { store, session };
}
