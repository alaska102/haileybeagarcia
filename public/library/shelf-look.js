// How someone's bookcase looks: wood, wallpaper, a pet and a few decorations.
// Everything is drawn here as small inline SVGs in the same ink-outline style.
const INK = '#571f36';
const g = inner => `<g stroke="${INK}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round">${inner}</g>`;
const eyes = (y, a = 20.5, b = 27.5) => `<circle cx="${a}" cy="${y}" r="1.3" fill="${INK}"/><circle cx="${b}" cy="${y}" r="1.3" fill="${INK}"/>`;

export const WOODS = {
  cherry: ['#8a5a48', '#b07a60'], oak: ['#b98756', '#d9ab78'], walnut: ['#5e3b2e', '#86584a'],
  white: ['#e9dfd3', '#fbf5ec'], pink: ['#e39aac', '#f4c3cf'], mint: ['#86bea6', '#b3dcca'],
};
const svgUrl = s => `url("data:image/svg+xml,${encodeURIComponent(s)}")`;
export const WALLS = {
  blush: 'linear-gradient(180deg,#ecd0cc,#f3dcd8)',
  stripes: 'repeating-linear-gradient(90deg,#f6e2de 0 14px,#edc9c8 14px 28px)',
  dots: 'radial-gradient(#e0aab2 2.2px,transparent 2.7px) 0 0/18px 18px,#f7e6e2',
  gingham: 'linear-gradient(90deg,rgba(150,196,176,.4) 50%,transparent 0) 0 0/22px 22px,linear-gradient(rgba(150,196,176,.4) 50%,transparent 0) 0 0/22px 22px,#f5f2e7',
  flowers: `${svgUrl('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><g fill="#f2b8c0"><circle cx="10" cy="6" r="3"/><circle cx="14" cy="10" r="3"/><circle cx="10" cy="14" r="3"/><circle cx="6" cy="10" r="3"/></g><circle cx="10" cy="10" r="2.2" fill="#f2c96b"/><g fill="#b9d8c4"><circle cx="30" cy="26" r="2.6"/><circle cx="33.5" cy="29.5" r="2.6"/><circle cx="30" cy="33" r="2.6"/><circle cx="26.5" cy="29.5" r="2.6"/></g><circle cx="30" cy="29.5" r="1.8" fill="#fff6dc"/></svg>')} 0 0/40px 40px,#fdf1e6`,
  stars: `${svgUrl('<svg xmlns="http://www.w3.org/2000/svg" width="46" height="46"><g fill="#f2d58a"><path d="M10 4l1.6 4.4L16 10l-4.4 1.6L10 16l-1.6-4.4L4 10l4.4-1.6z"/><circle cx="34" cy="30" r="1.6"/><circle cx="24" cy="40" r="1"/><circle cx="40" cy="8" r="1"/></g></svg>')} 0 0/46px 46px,#3d3763`,
};

export const PET_COLORS = ['#f4c6b9', '#fff3d9', '#e8a9ae', '#e0b070', '#c9c4d6', '#a9d3b5', '#8f8a99'];
export const PETS = {
  cat: c => `<svg class="pet" viewBox="0 0 48 48" aria-hidden="true">${g(`<path d="M34 44c7 0 9-6 6-11" fill="none"/><path d="M14 47c-2-10 1-19 10-19s12 9 10 19z" fill="${c}"/><path d="M15 20l-1-11 7 6h6l7-6-1 11c0 6-4 9-9 9s-9-3-9-9z" fill="${c}"/><path d="M22.5 23q1.5 1.5 3 0" fill="none"/>`)}${eyes(19)}</svg>`,
  sleepy: c => `<svg class="pet pet-wide" viewBox="0 0 60 34" aria-hidden="true">${g(`<path d="M52 33c5 0 6-5 2-7" fill="none"/><path d="M8 33c0-10 8-16 20-16h8c10 0 16 6 16 16z" fill="${c}"/><path d="M5 33c-1-7 2-13 6-15l-1-8 6 5h6l6-5-1 8c4 2 6 8 5 15z" fill="${c}"/><path d="M11 25q2 2 4 0M19 25q2 2 4 0" fill="none"/>`)}</svg>`,
  dog: c => `<svg class="pet" viewBox="0 0 48 48" aria-hidden="true">${g(`<path d="M33 44c5 0 7-4 7-8" fill="none"/><path d="M15 47c-1-9 2-17 9-17s10 8 9 17z" fill="${c}"/><path d="M16 21c0-6 4-10 8-10s8 4 8 10-3 9-8 9-8-3-8-9z" fill="${c}"/><path d="M17 13c-5 1-7 7-4 11l4-2zM31 13c5 1 7 7 4 11l-4-2z" fill="${INK}"/>`)}${eyes(20)}<ellipse cx="24" cy="24.5" rx="2" ry="1.4" fill="${INK}"/></svg>`,
  bunny: c => `<svg class="pet" viewBox="0 0 48 48" aria-hidden="true">${g(`<circle cx="34" cy="43" r="3.2" fill="#fffaf0"/><path d="M15 47c-1-9 2-17 9-17s10 8 9 17z" fill="${c}"/><path d="M19.5 16c-2.5-6-2-13 1.5-13s4 7 1.5 13zM28.5 16c2.5-6 2-13-1.5-13s-4 7-1.5 13z" fill="${c}"/><circle cx="24" cy="22" r="8.5" fill="${c}"/>`)}${eyes(21)}<ellipse cx="24" cy="24.6" rx="1.6" ry="1.1" fill="#d9788a"/></svg>`,
  frog: c => `<svg class="pet" viewBox="0 0 48 48" aria-hidden="true">${g(`<path d="M9 47c0-10 6-17 15-17s15 7 15 17z" fill="${c}"/><path d="M11 31c0-7 6-11 13-11s13 4 13 11c0 3-6 4-13 4s-13-1-13-4z" fill="${c}"/><circle cx="17" cy="19" r="5" fill="${c}"/><circle cx="31" cy="19" r="5" fill="${c}"/><path d="M18 29q6 4 12 0" fill="none"/>`)}<circle cx="17" cy="19" r="2.4" fill="#fffaf0"/><circle cx="31" cy="19" r="2.4" fill="#fffaf0"/><circle cx="17.4" cy="19.3" r="1.2" fill="${INK}"/><circle cx="31.4" cy="19.3" r="1.2" fill="${INK}"/></svg>`,
};
export const PET_NAMES = { cat: 'Cat', sleepy: 'Sleepy cat', dog: 'Dog', bunny: 'Bunny', frog: 'Frog' };

const deco = inner => `<svg class="decor" viewBox="0 0 40 48" aria-hidden="true">${g(inner)}</svg>`;
export const DECOR = {
  plant: { label: 'Plant', svg: deco('<path d="M20 33c-2-8-8-12-13-12 0 6 5 11 13 12zM20 33c2-9 7-14 13-14 0 7-5 12-13 14zM20 33c-1-8 0-16 2-22 3 5 2 14-2 22z" fill="#a9cfa0"/><path d="M11 47l-2-14h22l-2 14z" fill="#e8a9ae"/>') },
  lamp: { label: 'Lamp', svg: deco('<path d="M13 47h14M20 47V25" fill="none"/><path d="M10 25l4-15h12l4 15z" fill="#f2d5a0"/>') },
  candle: { label: 'Candle', svg: deco('<path d="M8 47h24" fill="none"/><path d="M15 47V26h10v21z" fill="#fff3d9"/><path d="M20 24c-3.5-3-2.5-8 0-11 2.5 3 3.5 8 0 11z" fill="#f2b84b"/>') },
  globe: { label: 'Snow globe', svg: deco('<path d="M9 47l3-8h16l3 8z" fill="#c9a27a"/><circle cx="20" cy="26" r="12" fill="#dbeefa"/><path d="M20 22l-4 8h8z" fill="#a9cfa0"/>') + '' },
  frame: { label: 'Photo', svg: deco('<path d="M8 15h24v32H8z" fill="#f2d5a0"/><path d="M12 19h16v24H12z" fill="#fff3d9"/><path d="M20 35c-5-3-6-6-4-8 1.5-1.5 3.3-.8 4 .6.7-1.4 2.5-2.1 4-.6 2 2 1 5-4 8z" fill="#e8a9ae" stroke-width="1.6"/>') },
  books: { label: 'Little books', svg: deco('<path d="M7 47v-7h26v7z" fill="#b8d4c8"/><path d="M9 40v-7h22v7z" fill="#e8b4b8"/><path d="M11 33v-7h17v7z" fill="#f2d5a0"/>') },
  lights: { label: 'Fairy lights' },
};
const BULBS = ['#f2c96b', '#e8a9ae', '#a9d3b5', '#a8c8e8'];
export const lightsSvg = () => `<svg class="lights" viewBox="0 0 300 22" preserveAspectRatio="none" aria-hidden="true"><path d="M0 4Q37 20 75 6T150 6T225 6T300 4" fill="none" stroke="${INK}" stroke-width="1.4"/>${Array.from({ length: 12 }, (_, i) => { const x = 12 + i * 25; const y = 7 + 6 * Math.abs(Math.sin((x / 75) * Math.PI)); return `<circle cx="${x}" cy="${y + 4}" r="3.6" fill="${BULBS[i % 4]}" stroke="${INK}" stroke-width="1"/>`; }).join('')}</svg>`;

export const DEFAULT_LOOK = { wood: 'cherry', wall: 'blush', pet: { kind: 'cat', color: PET_COLORS[0], name: '' }, decor: ['plant'] };
// Anything unknown falls back to the default, so a stored look can never break the page.
export function cleanLook(l) {
  const pet = l?.pet || {};
  return {
    wood: WOODS[l?.wood] ? l.wood : DEFAULT_LOOK.wood,
    wall: WALLS[l?.wall] ? l.wall : DEFAULT_LOOK.wall,
    pet: { kind: PETS[pet.kind] ? pet.kind : 'cat', color: PET_COLORS.includes(pet.color) ? pet.color : PET_COLORS[0], name: String(pet.name || '').slice(0, 20) },
    decor: (Array.isArray(l?.decor) ? l.decor : DEFAULT_LOOK.decor).filter(d => DECOR[d]).slice(0, 4),
  };
}
export const petOf = look => PETS[look.pet.kind](look.pet.color);
export function applyLook(el, look) {
  const [wood, top] = WOODS[look.wood];
  el.style.setProperty('--wood', wood); el.style.setProperty('--wood-top', top);
  el.style.background = WALLS[look.wall];
  el.classList.toggle('dark-wall', look.wall === 'stars');
}
