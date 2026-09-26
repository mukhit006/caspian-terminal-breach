export const PROGRESS_KEY = 'breach-caspian-progress-v1';
export function normalizeProgress(raw, skins) {
  const ids = new Set(skins.map(s => s.id));
  const defaults = [skins[0].id, 'knife-steel'];
  const owned = Array.isArray(raw?.owned) ? raw.owned.filter(id => ids.has(id)).slice(0, 10000) : [];
  for (const id of defaults) if (!owned.includes(id)) owned.push(id);
  const equipped = {};
  for (const weapon of ['vanta', 'kestrel', 'lancer', 'knife']) {
    const id = raw?.equipped?.[weapon];
    const skin = skins.find(s => s.id === id);
    equipped[weapon] = owned.includes(id) && (skin?.weapon === 'knife') === (weapon === 'knife') ? id : weapon === 'knife' ? 'knife-steel' : skins[0].id;
  }
  return { version: 1, credits: Number.isSafeInteger(raw?.credits) && raw.credits >= 0 ? raw.credits : 500, owned, equipped,
    weapon: ['vanta', 'kestrel', 'lancer', 'knife'].includes(raw?.weapon) ? raw.weapon : 'vanta',
    mode: ['training', 'assault', 'survival', 'contract', 'extraction'].includes(raw?.mode) ? raw.mode : 'assault' };
}
export function loadProgress(storage, skins) {
  try { return normalizeProgress(JSON.parse(storage.getItem(PROGRESS_KEY)), skins); }
  catch { return normalizeProgress(null, skins); }
}
export function purchaseCase(profile, price, winnerId, storage) {
  if (!Number.isSafeInteger(price) || price <= 0 || profile.credits < price) return null;
  const next = { ...profile, credits: profile.credits - price, owned: [...profile.owned, winnerId] };
  // Commit the reward with payment before the cosmetic animation. Reload cannot lose it.
  storage.setItem(PROGRESS_KEY, JSON.stringify(next));
  return next;
}
