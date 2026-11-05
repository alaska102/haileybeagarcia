// ISBN lookup against Open Library (free, no key, CORS-open). Returns null when unknown.
// coverUrl is null when Open Library has no cover, so the caller can ask for a photo.
export async function lookupIsbn(isbn) {
  const r = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&jscmd=data&format=json`);
  const d = (await r.json())[`ISBN:${isbn}`];
  if (!d?.title) return null;
  let summary = null;
  try { const w = await (await fetch(`https://openlibrary.org${d.key}.json`)).json(); summary = typeof w.description === 'string' ? w.description : w.description?.value; } catch (e) {}
  const cover = d.cover?.medium;
  return {
    isbn, title: d.title,
    year: (d.publish_date || '').match(/\d{4}/)?.[0] ?? null,
    pages: d.number_of_pages ?? null,
    author: (d.authors || []).map(a => a.name).join(', ') || null,
    coverUrl: /^https:\/\/[^\s'"()<>\\]+$/.test(cover || '') ? cover : null,
    summary: summary ?? null,
    genres: (d.subjects || []).slice(0, 3).map(s => s.name),
  };
}
