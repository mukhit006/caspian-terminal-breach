export const KNIFE = Object.freeze({ damage: 60, range: 1.8, interval: .65, contact: .24 });
export const ASSASSIN = Object.freeze({ hp: 80, speed: 2.08 * 1.25, damage: 25, range: 1.8, interval: 1.2, contact: .45 });

// Simulation time only: pausing must not advance an attack.
export class MeleeSwing {
  constructor(spec) { this.spec = spec; this.cancel(); }
  cancel() { this.elapsed = 0; this.active = false; this.contacted = false; }
  start() { if (this.active) return false; this.elapsed = 0; this.active = true; this.contacted = false; return true; }
  tick(delta) {
    if (!this.active || !Number.isFinite(delta) || delta <= 0) return false;
    this.elapsed += delta;
    const contact = !this.contacted && this.elapsed >= this.spec.contact;
    if (contact) this.contacted = true;
    if (this.elapsed >= this.spec.interval) this.active = false;
    return contact;
  }
  get progress() { return this.active ? Math.min(1, this.elapsed / this.spec.interval) : 0; }
}

export function meleeCanHit({ distance, blocked, facing = 1, range = KNIFE.range }) {
  return Number.isFinite(distance) && distance <= range && distance >= 0 && !blocked && facing > .55;
}

export function shouldSpawnAssassin({ mode, wave = 1, count = 0, alive = 0, reinforcement = false }) {
  if (mode === 'assault' || mode === 'contract' || mode === 'training') return count === 1 && alive === 0;
  if (mode === 'survival') return wave >= 2 && count % 4 === 1 && alive < 2;
  return mode === 'extraction' && reinforcement && alive < 2;
}
