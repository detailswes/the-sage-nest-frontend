import data from './location-data.json';

// Region → province (Italy) / region → landsdel (Denmark) cascade used by the
// home-visit area picker in the services form. The dataset keeps the two
// second-level concepts under different keys ("provinces" vs "landsdele") on
// purpose — they are not equivalent — so the helpers below read whichever one
// a country's region entry carries rather than normalising them into one.

// Expert.address_country is stored as a lowercase ISO 3166-1 alpha-2 code.
const ISO_TO_COUNTRY_KEY = {
  it: 'italy',
  dk: 'denmark',
};

// Chip / stored value shape: "Region — Province". The separator is a spaced
// em dash, which never appears inside a region or province name, so the pair
// stays splittable if it ever needs parsing back.
export const AREA_SEPARATOR = ' — ';

export function countryKeyFromIso(iso) {
  if (!iso || typeof iso !== 'string') return null;
  return ISO_TO_COUNTRY_KEY[iso.trim().toLowerCase()] || null;
}

export function isHomeVisitCountrySupported(iso) {
  return Boolean(countryKeyFromIso(iso));
}

function countryData(countryKey) {
  return (countryKey && data.countries[countryKey]) || null;
}

function subLevelList(regionEntry) {
  return regionEntry.provinces || regionEntry.landsdele || [];
}

// Second-level field name for a country: 'province' (Italy) | 'landsdel' (Denmark).
export function getSubLevel(countryKey) {
  const c = countryData(countryKey);
  return c ? c.levels[1] : null;
}

export function getRegions(countryKey) {
  const c = countryData(countryKey);
  return c ? c.regions.map((r) => r.region) : [];
}

export function getSubregions(countryKey, region) {
  const c = countryData(countryKey);
  if (!c || !region) return [];
  const entry = c.regions.find((r) => r.region === region);
  return entry ? subLevelList(entry) : [];
}

export function formatArea(region, sub) {
  return `${region}${AREA_SEPARATOR}${sub}`;
}

// True when `value` is a "Region — Sub" pair that exists in this country's
// dataset. Used to flag legacy free-text values saved before this picker.
export function isValidArea(countryKey, value) {
  if (typeof value !== 'string') return false;
  const idx = value.indexOf(AREA_SEPARATOR);
  if (idx === -1) return false;
  const region = value.slice(0, idx);
  const sub = value.slice(idx + AREA_SEPARATOR.length);
  return getSubregions(countryKey, region).includes(sub);
}
