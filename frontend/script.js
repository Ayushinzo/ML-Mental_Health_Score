// ============================================================
// Theme toggle (light / dark) — respects system preference,
// state kept in memory only (no localStorage per platform rules)
// ============================================================
const root = document.documentElement;
const themeSwitch = document.getElementById('themeSwitch');
const sunIcon = document.getElementById('sunIcon');
const moonIcon = document.getElementById('moonIcon');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

function applyTheme(dark){
  root.setAttribute('data-theme', dark ? 'dark' : 'light');
  sunIcon.classList.toggle('icon-active', !dark);
  moonIcon.classList.toggle('icon-active', dark);
}
customElements.whenDefined('md-switch').then(() => {
  themeSwitch.selected = prefersDark;
  applyTheme(prefersDark);
  themeSwitch.addEventListener('change', () => applyTheme(themeSwitch.selected));
});

// ============================================================
// Infinite-scroll wheel picker (e.g. 4.1, 4.2, 4.3, 4.4 ...)
// Tiles the value range several times and silently re-centers
// scrollLeft near the edges so scrolling feels endless.
// ============================================================
class InfiniteWheel {
  constructor({ scroller, track, badge, min, max, step, defaultValue, itemWidth = 46, tiles = 9 }) {
    this.scroller = scroller;
    this.track = track;
    this.badge = badge;
    this.min = min; this.max = max; this.step = step;
    this.decimals = (step.toString().split('.')[1] || '').length;
    this.itemWidth = itemWidth;
    this.tiles = tiles;
    this.count = Math.round((max - min) / step) + 1;
    this.activeEl = null;
    this._raf = null;

    this._buildTrack();
    this._setupPadding();
    this._bindEvents();

    const startIndex = Math.round((defaultValue - min) / step);
    const middleTileStart = this.count * Math.floor(tiles / 2);
    this._jumpTo(middleTileStart + startIndex);
    this._settle();
  }

  valueAt(i) {
    const idx = ((i % this.count) + this.count) % this.count;
    return +(this.min + idx * this.step).toFixed(this.decimals);
  }

  _buildTrack() {
    this.track.innerHTML = '';
    const total = this.count * this.tiles;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < total; i++) {
      const el = document.createElement('div');
      el.className = 'wheel-item';
      el.style.width = this.itemWidth + 'px';
      el.textContent = this.valueAt(i).toFixed(this.decimals);
      frag.appendChild(el);
    }
    this.track.appendChild(frag);
    this.items = this.track.children;
    this.total = total;
  }

  _setupPadding() {
    // pad both sides so the first/last logical items can still center under the indicator
    requestAnimationFrame(() => {
      const pad = Math.max(0, this.scroller.clientWidth / 2 - this.itemWidth / 2);
      this.scroller.style.paddingLeft = pad + 'px';
      this.scroller.style.paddingRight = pad + 'px';
      this._pad = pad;
    });
  }

  _indexFromScroll() {
    return Math.round(this.scroller.scrollLeft / this.itemWidth);
  }

  _jumpTo(index) {
    this.scroller.scrollLeft = index * this.itemWidth;
  }

  _bindEvents() {
    this.scroller.addEventListener('scroll', () => {
      cancelAnimationFrame(this._raf);
      this._raf = requestAnimationFrame(() => this._onScroll());
    }, { passive: true });

    // convert vertical wheel gestures to horizontal scroll
    this.scroller.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        this.scroller.scrollLeft += e.deltaY;
      }
    }, { passive: false });

    // desktop mouse drag-to-scroll
    let dragging = false, startX = 0, startScroll = 0;
    this.scroller.addEventListener('pointerdown', (e) => {
      dragging = true; startX = e.clientX; startScroll = this.scroller.scrollLeft;
      this.scroller.setPointerCapture(e.pointerId);
    });
    this.scroller.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      this.scroller.scrollLeft = startScroll - (e.clientX - startX);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(evt =>
      this.scroller.addEventListener(evt, () => { if (dragging) { dragging = false; this._settle(); } })
    );

    // keyboard support
    this.scroller.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); this.scroller.scrollLeft += this.itemWidth; this._settle(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); this.scroller.scrollLeft -= this.itemWidth; this._settle(); }
    });

    let settleTimer;
    this.scroller.addEventListener('scroll', () => {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(() => this._settle(), 90);
    }, { passive: true });
  }

  _settle() {
    const idx = this._indexFromScroll();
    this.scroller.scrollTo({ left: idx * this.itemWidth, behavior: 'smooth' });
  }

  _onScroll() {
    const idx = this._indexFromScroll();
    const value = this.valueAt(idx);
    this.badge.textContent = value.toFixed(this.decimals) + ' hrs';
    this.scroller.setAttribute('aria-valuenow', value);
    this.value = value;

    // highlight the active (centered) item
    const clamped = ((idx % this.total) + this.total) % this.total;
    const el = this.items[clamped];
    if (el && el !== this.activeEl) {
      if (this.activeEl) this.activeEl.classList.remove('is-active');
      el.classList.add('is-active');
      this.activeEl = el;
    }

    // seamless infinite wrap: recenter once we drift near either edge
    const oneTile = this.count;
    if (idx < oneTile) {
      this.scroller.scrollLeft += oneTile * this.itemWidth * (this.tiles - 2);
    } else if (idx > this.total - oneTile) {
      this.scroller.scrollLeft -= oneTile * this.itemWidth * (this.tiles - 2);
    }
  }
}

// ============================================================
// Range sliders (usage / study / activity / sleep)
// Wraps an <md-slider> + its value badge, keeping .value in sync.
// ============================================================
function bindSlider(sliderId, badgeId) {
  const slider = document.getElementById(sliderId);
  const badge = document.getElementById(badgeId);
  const sync = () => {
    const v = Number(slider.value);
    badge.textContent = v.toFixed(1) + ' hrs';
    badge.classList.remove('bump');
    void badge.offsetWidth; // restart animation
    badge.classList.add('bump');
    slider.value = v; // keep wrapper.value accurate for payload reads
  };
  customElements.whenDefined('md-slider').then(() => {
    badge.textContent = Number(slider.value).toFixed(1) + ' hrs';
    slider.addEventListener('input', sync);
  });
  return slider;
}

const usageWheel = bindSlider('usageSlider', 'usageBadge');
const studyWheel = bindSlider('studySlider', 'studyBadge');
const activityWheel = bindSlider('activitySlider', 'activityBadge');
const sleepWheel = bindSlider('sleepSlider', 'sleepBadge');

// ============================================================
// Stress level — single-select filter chips
// ============================================================
const stressGroup = document.getElementById('stressGroup');
let stressValue = 'Medium';
customElements.whenDefined('md-filter-chip').then(() => {
  stressGroup.querySelectorAll('md-filter-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      stressGroup.querySelectorAll('md-filter-chip').forEach((c) => { if (c !== chip) c.selected = false; });
      chip.selected = true;
      stressValue = chip.dataset.level;
    });
  });
});

// ============================================================
// Gauge helpers
// ============================================================
const needle = document.getElementById('needle');
const needleGlow = document.getElementById('needleGlow');
const gaugeWrap = document.querySelector('.gauge-wrap');
const scoreDisplay = document.getElementById('scoreDisplay');
const statusPill = document.getElementById('statusPill');
const statusLabel = document.getElementById('statusLabel');
const statusDot = statusPill.querySelector('.status-dot');

function zoneFor(score) {
  if (score <= 10 / 3) return { name: 'Struggling', color: '#E4514F', tint: 'rgba(228,81,79,0.18)' };
  if (score <= 20 / 3) return { name: 'Getting by', color: '#E8A628', tint: 'rgba(232,166,40,0.18)' };
  return { name: 'Thriving', color: '#1FAA6D', tint: 'rgba(31,170,109,0.18)' };
}

// restarts a CSS animation by toggling a class via forced reflow
function replay(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

// counts the score readout up/down from its current value to the target,
// landing on a precise 2-decimal float (e.g. 8.22) with a slight overshoot
// for a livelier, more "alive" finish
let displayedScore = null;

// easeOutBack — overshoots past the target then settles back, so the
// number feels like it "arrives" rather than just stopping
function easeOutBack(p) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
}

function animateScoreNumber(target, color) {
  const start = displayedScore ?? target;
  const startTime = performance.now();
  const duration = 1100;
  cancelAnimationFrame(animateScoreNumber._raf);
  scoreDisplay.classList.add('counting');

  function tick(now) {
    const p = Math.min(1, (now - startTime) / duration);
    // fast, punchy overshoot for the first 85% of the tween, then a
    // final short settle onto the exact decimal value
    const eased = p < 0.85 ? easeOutBack(p / 0.85) : 1;
    const val = p < 0.85 ? start + (target - start) * eased : target;
    scoreDisplay.innerHTML = val.toFixed(2) + '<span class="max">/10</span>';
    scoreDisplay.style.color = color;
    if (p < 1) {
      animateScoreNumber._raf = requestAnimationFrame(tick);
    } else {
      scoreDisplay.innerHTML = target.toFixed(2) + '<span class="max">/10</span>';
      scoreDisplay.classList.remove('counting');
      displayedScore = target;
    }
  }
  animateScoreNumber._raf = requestAnimationFrame(tick);
}

function setGauge(score) {
  score = Math.max(0, Math.min(10, score));
  const angle = -85 + (score / 10) * 170;
  needle.style.transform = `rotate(${angle}deg)`;
  const zone = zoneFor(score);

  animateScoreNumber(score, zone.color);
  replay(scoreDisplay, 'animate');

  statusLabel.textContent = zone.name;
  statusPill.style.color = zone.color;
  statusPill.style.background = zone.tint;
  statusDot.classList.add('beat');
  replay(statusPill, 'pop');

  // needle glow ping + ring pulse around the whole gauge; once the ping
  // burst finishes, drop back to the perpetual idle glow animation
  needleGlow.setAttribute('stroke', zone.color);
  replay(needleGlow, 'ping');
  needleGlow.addEventListener('animationend', () => needleGlow.classList.remove('ping'), { once: true });
  replay(gaugeWrap, 'pulse-once');
}

function renderBreakdown(score, inputs) {
  const zone = zoneFor(score);
  const area = document.getElementById('breakdownArea');
  const tips = [];
  if (inputs.sleep < 6) tips.push('Sleep is on the low side — even 30–60 extra minutes tends to move this score.');
  if (inputs.usage > 6) tips.push('Daily usage is high relative to your other habits — a wind-down cutoff can help.');
  if (inputs.activity < 1) tips.push('Very little movement logged — short daily walks show up in this metric.');
  if (inputs.stress === 'high' || inputs.stress === 'very-high') tips.push('Stress is elevated — pairing this with support or downtime is worth prioritizing.');
  if (tips.length === 0) tips.push('Your inputs are well balanced across sleep, activity and screen time.');

  area.innerHTML =
    `<p class="pop">Reading of <strong style="color:${zone.color}">${score.toFixed(2)} / 10</strong> — categorized as <strong>${zone.name}</strong> based on the balance of your usage, rhythm and stress inputs.</p>` +
    `<div class="tips pop">` + tips.map(t =>
      `<div class="tip-row"><svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="6" fill="none" stroke="#8CA0FF" stroke-width="1.4"/><path d="M4.2 7.2l1.8 1.8 3.8-3.8" fill="none" stroke="#8CA0FF" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg><span>${t}</span></div>`
    ).join('') + `</div>`;
}

// local fallback estimate if the API isn't reachable yet
function estimateScoreLocally(d) {
  let score = 5;
  score += (d.sleep - 7) * 0.33;
  score += (d.activity - 2) * 0.28;
  score += (d.study >= 1 && d.study <= 6) ? 0.33 : -0.17;
  score -= (d.usage - 3) * 0.25;
  const stressPenalty = { low: 0.9, medium: 0, high: -1.0, 'very-high': -1.9 };
  score += stressPenalty[d.stress];
  if (d.purpose === 'Education' || d.purpose === 'Networking') score += 0.28;
  if (d.purpose === 'Entertainment') score -= 0.17;
  return +Math.max(0, Math.min(10, score)).toFixed(2);
}

// ============================================================
// Submit
// ============================================================
const form = document.getElementById('predictForm');
const submitBtn = document.getElementById('submitBtn');
const errorBanner = document.getElementById('errorBanner');

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const ageEl = document.getElementById('age');
  const genderEl = document.getElementById('gender');
  const countryEl = document.getElementById('country');
  const academicEl = document.getElementById('academicLevel');
  const platformEl = document.getElementById('platform');
  const purposeEl = document.getElementById('purpose');
  const unlocks = document.getElementById('Unlocks');

  if (!ageEl.value || !genderEl.value || !countryEl.value || !academicEl.value || !platformEl.value || !purposeEl.value) {
    errorBanner.textContent = 'Please fill in every field before requesting a score.';
    errorBanner.style.display = 'block';
    return;
  }

  const payload = {
    age: parseInt(ageEl.value, 10),
    gender: genderEl.value,
    country: countryEl.value,
    academicLevel: academicEl.value,
    platform: platformEl.value,
    purpose: purposeEl.value,
    unlocks: Number(unlocks.value),
    usage: Number(usageWheel.value),
    study: Number(studyWheel.value),
    activity: Number(activityWheel.value),
    sleep: Number(sleepWheel.value),
    stress: stressValue
  };

  submitBtn.classList.add('loading');
  submitBtn.disabled = true;
  errorBanner.style.display = 'none';

  // ---- REPLACE THIS URL WITH YOUR OWN BACKEND ENDPOINT ----
  fetch('https://mental-health-score-w283.onrender.com/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then((res) => { if (!res.ok) throw new Error('Bad response'); return res.json(); })
    .then((data) => {
        finish(data.score, payload);
    })
    .catch(() => {
      // errorBanner.textContent = "Couldn't reach the prediction service — showing an estimate instead.";
      // errorBanner.style.display = 'block';
      // setTimeout(() => finish(estimateScoreLocally(payload), payload), 500);
      alert("Server error occured. Please check the backend server and try again.");
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
      const placeholder = document.getElementById('resultPlaceholder');
      if (placeholder) placeholder.remove();
    });

  function finish(score, inputs) {
    submitBtn.classList.remove('loading');
    submitBtn.disabled = false;
    const placeholder = document.getElementById('resultPlaceholder');
    if (placeholder) placeholder.remove();
    setGauge(score);
    // renderBreakdown(score, inputs);
  }
});
