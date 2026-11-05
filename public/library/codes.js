// Invite codes: 12 Crockford base32 characters (60 random bits), short enough to type.
const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export function randomCode() { return [...crypto.getRandomValues(new Uint8Array(12))].map(x => CODE_ALPHABET[x % 32]).join(''); }
export function normalizeCode(s) { return String(s || '').toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1').replace(/[^0-9A-Z]/g, ''); }
export function formatCode(c) { return c.length === 12 ? c.match(/.{4}/g).join('-') : c; }
