// Reads a Goodreads library export (My Books > Import and export > Export Library).
import { lookupIsbn } from './openlibrary.js';

// RFC 4180: quoted fields may hold commas, doubled quotes, and newlines (reviews do).
export function parseCsv(text) {
  const rows = []; let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows.filter(r => r.some(f => f.trim()));
  if (!head) return [];
  const keys = head.map(h => h.trim().replace(/^﻿/, ''));
  return body.map(r => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? '').trim()])));
}

const SHELF_STATUS = { read: 'read', 'currently-reading': 'reading', 'to-read': 'none' };

// One plain record per book. ISBNs arrive as ="9780…" so Excel keeps the digits.
export function readExport(text) {
  const rows = parseCsv(text);
  if (rows.length && !('Exclusive Shelf' in rows[0])) throw new Error('NOT_GOODREADS');
  return rows.map(r => {
    const isbn = (r.ISBN13 || r.ISBN || '').replace(/[^0-9Xx]/g, '') || null;
    return {
      title: r.Title.replace(/\s*\([^)]*#\d+[^)]*\)\s*$/, '').trim() || r.Title,
      author: r.Author || null,
      isbn,
      year: r['Original Publication Year'] || r['Year Published'] || null,
      pages: +r['Number of Pages'] || null,
      // Goodreads writes 2026/11/04; empty when she never set it.
      dateRead: /^\d{4}\/\d{2}\/\d{2}$/.test(r['Date Read'] || '') ? r['Date Read'].replace(/\//g, '-') : null,
      shelf: r['Exclusive Shelf'],
      status: SHELF_STATUS[r['Exclusive Shelf']] || 'none',
      owned: (+r['Owned Copies'] || 0) > 0,
      // Goodreads allows partial stars (4.75); the library uses whole ones.
      rating: Math.max(0, Math.min(5, Math.round(+r['My Rating'] || 0))),
    };
  }).filter(b => b.title);
}

// Cover, summary and subjects from Open Library: by ISBN, else by title and author.
export async function enrich(b) {
  let meta = null;
  if (b.isbn) { try { meta = await lookupIsbn(b.isbn); } catch (e) {} }
  if (!meta?.coverUrl) {
    try {
      const q = new URLSearchParams({ title: b.title, author: b.author || '', limit: '1', fields: 'cover_i,subject,first_publish_year' });
      const hit = (await (await fetch(`https://openlibrary.org/search.json?${q}`)).json()).docs?.[0];
      if (hit) meta = { ...(meta || {}), coverUrl: hit.cover_i ? `https://covers.openlibrary.org/b/id/${hit.cover_i}-M.jpg` : meta?.coverUrl ?? null, genres: meta?.genres?.length ? meta.genres : (hit.subject || []).slice(0, 3), year: meta?.year ?? (hit.first_publish_year ? String(hit.first_publish_year) : null) };
    } catch (e) {}
  }
  return {
    title: b.title, author: b.author, isbn: b.isbn,
    year: b.year || meta?.year || null, pages: b.pages || meta?.pages || null,
    coverUrl: meta?.coverUrl || null, summary: meta?.summary || null, genres: meta?.genres || [],
  };
}

export const sameBook = (a, b) => (a.isbn && b.isbn && a.isbn === b.isbn) || (a.title.toLowerCase() === b.title.toLowerCase() && (a.author || '').toLowerCase() === (b.author || '').toLowerCase());

// Goodreads' own export columns (so the file can be imported back into Goodreads,
// or here), followed by what only this library knows.
const STATUS_SHELF = { read: 'read', reading: 'currently-reading', none: 'to-read' };
// Text starting with = + - @ would run as a spreadsheet formula, so it gets a leading quote.
const cell = v => { let t = String(v ?? ''); if (/^[=+\-@\t\r]/.test(t) && !/^="\d+X?"$/.test(t) && !/^-?\d/.test(t)) t = "'" + t; return /[",\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
export function writeExport(books) {
  const head = ['Title', 'Author', 'ISBN13', 'My Rating', 'Year Published', 'Number of Pages', 'Exclusive Shelf', 'Owned Copies', "On Hailey's Shelf", 'Borrowed By', "Friends' Average", "Friends' Ratings"];
  const rows = books.map(b => [b.title, b.author, b.isbn ? `="${b.isbn}"` : '', b.myRating || 0, b.year, b.pages, STATUS_SHELF[b.status] || 'to-read', b.onShelf ? 1 : 0, b.onShelf ? 'yes' : 'no', b.holderName || '', b.ratingCount ? (b.ratingSum / b.ratingCount).toFixed(1) : '', b.ratingCount || 0]);
  return [head, ...rows].map(r => r.map(cell).join(',')).join('\r\n') + '\r\n';
}
