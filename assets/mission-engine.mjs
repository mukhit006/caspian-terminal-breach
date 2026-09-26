/** Mission rules shared by the game and the lightweight rule tests. */
export class MissionSession {
  constructor({ mode = 'training', totalTargets = 5 } = {}) {
    this.mode = mode;
    this.totalTargets = Math.max(1, Math.floor(Number(totalTargets) || 5));
    this.elapsed = 0;
    this.shots = 0;
    this.hits = 0;
    this.kills = 0;
    this.reward = 0;
    this.status = 'active';
    this.phase = mode === 'extraction' ? 'retrieve' : 'combat';
    this.holdElapsed = 0;
    this.wave = 1;
  }

  tick(delta, { paused = false, inExtractionZone = false } = {}) {
    if (this.status !== 'active' || paused || !Number.isFinite(delta) || delta <= 0) return;
    this.elapsed += delta;
    if (this.mode !== 'extraction' || this.phase !== 'hold' || !inExtractionZone) return;
    this.holdElapsed = Math.min(20, this.holdElapsed + delta);
    if (this.holdElapsed >= 20) this.status = 'won';
  }

  recordShot() {
    if (this.status === 'active') this.shots += 1;
  }

  recordHit() {
    if (this.status === 'active') this.hits = Math.min(this.shots, this.hits + 1);
  }

  recordKill({ commander = false } = {}) {
    if (this.status !== 'active') return;
    this.kills += 1;
    this.reward += commander ? 200 : 25;
    if ((this.mode === 'assault' && this.kills >= this.totalTargets)
      || (this.mode === 'contract' && commander)) this.status = 'won';
  }

  interact({ nearCargo = false, nearExtraction = false } = {}) {
    if (this.status !== 'active' || this.mode !== 'extraction') return false;
    if (this.phase === 'retrieve' && nearCargo) {
      this.phase = 'reach-zone';
      return true;
    }
    if (this.phase === 'reach-zone' && nearExtraction) {
      this.phase = 'hold';
      return true;
    }
    return false;
  }

  fail() {
    if (this.status === 'active') this.status = 'lost';
  }

  snapshot() {
    return {
      mode: this.mode,
      elapsed: this.elapsed,
      shots: this.shots,
      hits: this.hits,
      kills: this.kills,
      reward: this.reward,
      accuracy: this.shots ? Math.round(this.hits / this.shots * 100) : 0,
      status: this.status,
      phase: this.phase,
      holdElapsed: this.holdElapsed,
      wave: this.wave,
    };
  }
}
