/* ========================================================================
   Paper B Daily Sheets — App
   ======================================================================== */

const STORAGE_KEY = 'paperb_state_v1';
const PLAN_START_ISO = '2026-04-21';
const EXAM_ISO = '2026-10-05';

// ---------- State ----------

const defaultState = {
  currentIndex: 0,
  completed: {},   // { [dayIso]: [taskIdx, ...] } — tasks ticked per day
  theme: 'auto',
  size: 'md',
  seenHint: false,
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultState };
    const parsed = JSON.parse(raw);
    return { ...defaultState, ...parsed };
  } catch (e) {
    console.warn('Failed to load state', e);
    return { ...defaultState };
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save state', e);
  }
}

let state = loadState();
let DAYS = []; // loaded from days.json

// ---------- Helpers ----------

function $(sel) { return document.querySelector(sel); }
function $$(sel) { return Array.from(document.querySelectorAll(sel)); }

function isoToday() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function todayIndex() {
  // index of today's day in DAYS; clamped
  const today = isoToday();
  let idx = DAYS.findIndex(d => d.iso === today);
  if (idx === -1) {
    // before plan starts → day 0; after plan ends → last day
    if (today < DAYS[0].iso) idx = 0;
    else idx = DAYS.length - 1;
  }
  return idx;
}

function dayTasksCompleted(dayIso) {
  return state.completed[dayIso] || [];
}

function isDayFullyDone(day) {
  const done = dayTasksCompleted(day.iso);
  return done.length >= day.tasks.length;
}

function computeStreak() {
  // Number of consecutive days up to and including yesterday/today with all tasks done
  const today = isoToday();
  let streak = 0;
  for (let i = DAYS.length - 1; i >= 0; i--) {
    const d = DAYS[i];
    if (d.iso > today) continue;
    if (isDayFullyDone(d)) streak++;
    else if (d.iso < today) break; // a broken day in the past breaks the streak
    else continue; // today partially done is ok, keep checking backwards
  }
  return streak;
}

function daysUntilExam() {
  const today = new Date(isoToday());
  const exam = new Date(EXAM_ISO);
  return Math.round((exam - today) / (1000 * 60 * 60 * 24));
}

// ---------- Rendering ----------

function createPageEl(day) {
  const page = document.createElement('section');
  page.className = `page p${day.phase}`;
  page.dataset.dayIndex = DAYS.indexOf(day);

  const done = dayTasksCompleted(day.iso);

  const tasksHtml = day.tasks.map((t, i) => {
    const isDone = done.includes(i);
    return `
      <div class="task t-${t.type} ${isDone ? 'is-done' : ''}" data-task-index="${i}">
        <button class="checkbox ${isDone ? 'on' : ''}" aria-label="${isDone ? 'Mark incomplete' : 'Mark complete'}" aria-pressed="${isDone}"></button>
        <div class="task-body">
          <div class="task-label">${escapeHtml(t.label)}</div>
          <div class="task-resource">${escapeHtml(t.resource)}</div>
          <div class="task-action">${escapeHtml(t.action)}</div>
        </div>
      </div>
    `;
  }).join('');

  page.innerHTML = `
    <header class="page-header">
      <div class="page-phase">${escapeHtml(day.phaseLabel)}</div>
      <div class="page-date">${escapeHtml(day.date)}</div>
      <div class="page-topic">${escapeHtml(day.topic)}</div>
      <div class="page-counter">Day ${day.dayNum} of 168</div>
    </header>
    <div class="page-body">
      ${tasksHtml}
    </div>
    <div class="page-footer">⏱ 25 min max per task &nbsp;·&nbsp; Stop when the timer goes off</div>
  `;

  if (isDayFullyDone(day)) page.classList.add('is-complete');

  return page;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderCurrentPage() {
  const deck = $('#deck');
  deck.innerHTML = '';
  const day = DAYS[state.currentIndex];
  const pageEl = createPageEl(day);
  pageEl.classList.add('active');
  deck.appendChild(pageEl);
  bindPageInteractions(pageEl);
  updateChrome();
}

function updateChrome() {
  const day = DAYS[state.currentIndex];
  $('#title-day').textContent = `Day ${day.dayNum}`;
  $('#title-date').textContent = day.date;
  $('#title-phase').textContent = shortPhaseLabel(day.phaseLabel);

  // Progress
  const totalComplete = DAYS.filter(isDayFullyDone).length;
  const pct = (totalComplete / DAYS.length) * 100;
  $('#progress-fill').style.width = pct + '%';
  $('#stat-complete').textContent = totalComplete;

  // Streak
  const streak = computeStreak();
  const streakEl = $('#stat-streak');
  if (streak >= 2) {
    streakEl.hidden = false;
    $('#stat-streak-num').textContent = streak;
  } else {
    streakEl.hidden = true;
  }

  // Nav arrows
  $('#nav-prev').disabled = state.currentIndex <= 0;
  $('#nav-next').disabled = state.currentIndex >= DAYS.length - 1;

  // Exam badge
  const d = daysUntilExam();
  const badge = $('#exam-badge');
  const badgeText = $('#exam-badge-text');
  if (d >= 0 && d <= 30) {
    badge.hidden = false;
    badgeText.textContent = d === 0 ? 'EXAM TODAY' : d === 1 ? '1 DAY TO EXAM' : `${d} DAYS TO EXAM`;
  } else {
    badge.hidden = true;
  }
}

function shortPhaseLabel(label) {
  // "PHASE 1 — CLINICAL FOUNDATION" → "Phase 1 · Clinical Foundation"
  return label.replace(/—/g, '·').replace(/PHASE/i, 'Phase').replace(/\b([A-Z])(\w+)/g, (m, a, b) => a + b.toLowerCase());
}

// ---------- Navigation ----------

function goTo(newIndex, direction = null) {
  if (newIndex < 0 || newIndex >= DAYS.length) return;
  if (newIndex === state.currentIndex) return;

  // direction is 'next' | 'prev' | null (auto)
  if (!direction) direction = newIndex > state.currentIndex ? 'next' : 'prev';

  const deck = $('#deck');
  const current = deck.querySelector('.page.active');
  const newDay = DAYS[newIndex];
  const newPage = createPageEl(newDay);

  // Incoming class depends on direction
  if (direction === 'next') {
    newPage.classList.add('is-flipping-in-left');
    current.classList.remove('active');
    current.classList.add('is-flipping-out-left');
  } else {
    newPage.classList.add('is-flipping-in-right');
    current.classList.remove('active');
    current.classList.add('is-flipping-out-right');
  }

  deck.appendChild(newPage);

  // Cleanup after animation
  setTimeout(() => {
    current.remove();
    newPage.classList.remove('is-flipping-in-left', 'is-flipping-in-right');
    newPage.classList.add('active');
    bindPageInteractions(newPage);
  }, 500);

  state.currentIndex = newIndex;
  saveState();
  updateChrome();
  updateUrlHash();
}

function goNext() { goTo(state.currentIndex + 1, 'next'); }
function goPrev() { goTo(state.currentIndex - 1, 'prev'); }

function updateUrlHash() {
  const dayNum = DAYS[state.currentIndex].dayNum;
  history.replaceState(null, '', `#/day/${dayNum}`);
}

function parseUrlHash() {
  const match = location.hash.match(/^#\/day\/(\d+)/);
  if (match) {
    const dayNum = parseInt(match[1], 10);
    const idx = DAYS.findIndex(d => d.dayNum === dayNum);
    if (idx >= 0) state.currentIndex = idx;
  }
}

// ---------- Task checkbox ----------

function toggleTask(dayIso, taskIdx) {
  const list = state.completed[dayIso] || [];
  const i = list.indexOf(taskIdx);
  if (i >= 0) list.splice(i, 1);
  else list.push(taskIdx);
  if (list.length === 0) delete state.completed[dayIso];
  else state.completed[dayIso] = list;
  saveState();
}

function bindPageInteractions(pageEl) {
  const dayIdx = parseInt(pageEl.dataset.dayIndex, 10);
  const day = DAYS[dayIdx];

  pageEl.querySelectorAll('.checkbox').forEach(cb => {
    cb.addEventListener('click', (e) => {
      e.stopPropagation();
      const taskEl = cb.closest('.task');
      const taskIdx = parseInt(taskEl.dataset.taskIndex, 10);
      toggleTask(day.iso, taskIdx);

      // Visual update (no full re-render — keeps scroll position)
      const isNowOn = cb.classList.toggle('on');
      taskEl.classList.toggle('is-done', isNowOn);
      cb.setAttribute('aria-pressed', isNowOn);
      cb.setAttribute('aria-label', isNowOn ? 'Mark incomplete' : 'Mark complete');

      // Full-day completion state on page
      pageEl.classList.toggle('is-complete', isDayFullyDone(day));

      updateChrome();

      // Gentle haptic feedback on mobile
      if (isNowOn && navigator.vibrate) navigator.vibrate(8);
    });
  });
}

// ---------- Swipe handling ----------

function setupSwipe() {
  const stage = $('#stage');
  let startX = 0, startY = 0, currentX = 0, dragging = false;
  let activePage = null;
  const threshold = 60;       // px to trigger flip
  const maxDrag = 200;         // cap drag translation

  stage.addEventListener('touchstart', onStart, { passive: true });
  stage.addEventListener('touchmove', onMove, { passive: false });
  stage.addEventListener('touchend', onEnd);
  stage.addEventListener('touchcancel', onEnd);

  stage.addEventListener('mousedown', onStart);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onEnd);

  function pt(e) {
    if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    if (e.changedTouches && e.changedTouches[0]) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  }

  function onStart(e) {
    // Ignore if starting on a checkbox or inside a scrollable page body where they may want to scroll text
    const target = e.target;
    if (target.closest('.checkbox') || target.closest('button')) return;
    const p = pt(e);
    startX = p.x;
    startY = p.y;
    currentX = p.x;
    dragging = false;
    activePage = $('#deck .page.active');
  }

  function onMove(e) {
    if (startX === 0 && startY === 0) return;
    const p = pt(e);
    const dx = p.x - startX;
    const dy = p.y - startY;

    // Only engage horizontal swipe if it's clearly more horizontal than vertical
    if (!dragging) {
      if (Math.abs(dx) < 10) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        // user is scrolling vertically, bail
        startX = 0; startY = 0;
        return;
      }
      dragging = true;
      $('#stage').classList.add('is-swiping');
      if (activePage) activePage.classList.add('is-dragging');
    }

    if (dragging) {
      e.preventDefault && e.preventDefault();
      currentX = p.x;
      const limited = Math.max(-maxDrag, Math.min(maxDrag, dx));
      const rot = limited / maxDrag * 12; // up to 12° tilt
      if (activePage) {
        activePage.style.transform = `translateX(${limited}px) rotateY(${-rot}deg)`;
        activePage.style.opacity = String(1 - Math.abs(limited) / (maxDrag * 1.6));
      }
    }
  }

  function onEnd(e) {
    if (!dragging) {
      startX = 0; startY = 0;
      return;
    }
    const dx = currentX - startX;
    $('#stage').classList.remove('is-swiping');
    if (activePage) {
      activePage.style.transform = '';
      activePage.style.opacity = '';
      activePage.classList.remove('is-dragging');
    }
    dragging = false;
    startX = 0; startY = 0;
    activePage = null;

    if (dx < -threshold) goNext();
    else if (dx > threshold) goPrev();
  }
}

// ---------- Overlays ----------

function openOverlay(id) {
  $('#' + id).hidden = false;
  document.body.style.overflow = 'hidden';
}
function closeOverlay(id) {
  $('#' + id).hidden = true;
  document.body.style.overflow = '';
}

function buildContentsGrid() {
  const grid = $('#contents-grid');
  grid.innerHTML = '';
  const todayIso = isoToday();
  DAYS.forEach((day, i) => {
    const cell = document.createElement('button');
    cell.className = `cell p${day.phase}`;
    cell.textContent = day.dayNum;
    cell.title = `${day.date} · ${day.topic}`;
    if (isDayFullyDone(day)) cell.classList.add('is-complete');
    if (day.iso === todayIso) cell.classList.add('is-today');
    if (i === state.currentIndex) cell.classList.add('is-current');
    cell.addEventListener('click', () => {
      closeOverlay('overlay-contents');
      goTo(i);
    });
    grid.appendChild(cell);
  });
}

// ---------- Theme & size ----------

function applyTheme() {
  const theme = state.theme;
  const html = document.documentElement;
  if (theme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    html.dataset.theme = prefersDark ? 'dark' : 'light';
  } else {
    html.dataset.theme = theme;
  }
  document.querySelector('meta[name="theme-color"]').setAttribute(
    'content',
    html.dataset.theme === 'dark' ? '#141210' : '#ffffff'
  );
  // Update picker
  $$('#theme-picker button').forEach(b => b.classList.toggle('on', b.dataset.theme === theme));
}

function applySize() {
  document.documentElement.dataset.size = state.size;
  $$('#size-picker button').forEach(b => b.classList.toggle('on', b.dataset.size === state.size));
}

// ---------- Settings actions ----------

function exportProgress() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `paperb-progress-${isoToday()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importProgress(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (typeof imported !== 'object' || !imported.completed) throw new Error('Bad file');
      state = { ...defaultState, ...imported };
      saveState();
      applyTheme();
      applySize();
      renderCurrentPage();
      closeOverlay('overlay-settings');
      toast('Progress restored');
    } catch (err) {
      toast('Could not read that file');
    }
  };
  reader.readAsText(file);
}

function resetAll() {
  if (!confirm('Reset all progress? This will clear every ticked task and cannot be undone.')) return;
  state = { ...defaultState, theme: state.theme, size: state.size, seenHint: true };
  saveState();
  renderCurrentPage();
  closeOverlay('overlay-settings');
  toast('Progress reset');
}

function toast(msg) {
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = `
    position:fixed; bottom: calc(var(--footbar-h) + 20px + var(--safe-bot)); left:50%; transform:translateX(-50%);
    background:rgba(30,25,18,0.92); color:white; font:500 14px/1 var(--f-body);
    padding:12px 20px; border-radius:999px; z-index:200;
    animation: hint-fade 2.5s ease-out forwards;
    pointer-events:none;
  `;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

// ---------- Keyboard ----------

function setupKeyboard() {
  document.addEventListener('keydown', (e) => {
    // ignore if typing in a field, or overlay is open
    if (e.target.matches('input, textarea, select')) return;
    const anyOverlay = $$('.overlay').some(o => !o.hidden);
    if (anyOverlay) {
      if (e.key === 'Escape') {
        $$('.overlay').forEach(o => { if (!o.hidden) closeOverlay(o.id); });
      }
      return;
    }
    if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
    else if (e.key === 'c' || e.key === 'C') { openOverlay('overlay-contents'); buildContentsGrid(); }
    else if (e.key === 't' || e.key === 'T') { goTo(todayIndex()); }
    else if (['1','2','3'].includes(e.key)) {
      const idx = parseInt(e.key, 10) - 1;
      const day = DAYS[state.currentIndex];
      if (day.tasks[idx]) {
        toggleTask(day.iso, idx);
        const cb = $$('#deck .page.active .checkbox')[idx];
        if (cb) cb.click(); // reuse handler for visual update
      }
    }
  });
}

// ---------- Init ----------

async function init() {
  // Load days data
  try {
    const resp = await fetch('days.json');
    DAYS = await resp.json();
  } catch (e) {
    document.body.innerHTML = `<div style="padding:40px;font-family:sans-serif;">Could not load days.json. Check that it's in the same folder as index.html.</div>`;
    return;
  }

  // URL hash
  parseUrlHash();

  // If no saved index and today is within plan, jump to today
  if (state.currentIndex === 0 && !localStorage.getItem(STORAGE_KEY)) {
    state.currentIndex = todayIndex();
  }
  if (state.currentIndex < 0 || state.currentIndex >= DAYS.length) {
    state.currentIndex = 0;
  }

  applyTheme();
  applySize();
  renderCurrentPage();
  setupSwipe();
  setupKeyboard();

  // First-visit swipe hint
  if (!state.seenHint) {
    $('#hint').hidden = false;
    setTimeout(() => {
      state.seenHint = true;
      saveState();
    }, 3500);
  }

  // Wire UI
  $('#btn-contents').addEventListener('click', () => { openOverlay('overlay-contents'); buildContentsGrid(); });
  $('#close-contents').addEventListener('click', () => closeOverlay('overlay-contents'));
  $('#btn-today').addEventListener('click', () => goTo(todayIndex()));
  $('#btn-settings').addEventListener('click', () => openOverlay('overlay-settings'));
  $('#close-settings').addEventListener('click', () => closeOverlay('overlay-settings'));
  $('#nav-prev').addEventListener('click', goPrev);
  $('#nav-next').addEventListener('click', goNext);

  // Close overlay on backdrop click
  $$('.overlay').forEach(o => {
    o.addEventListener('click', (e) => {
      if (e.target === o) closeOverlay(o.id);
    });
  });

  // Theme picker
  $$('#theme-picker button').forEach(b => {
    b.addEventListener('click', () => {
      state.theme = b.dataset.theme;
      saveState();
      applyTheme();
    });
  });
  // Size picker
  $$('#size-picker button').forEach(b => {
    b.addEventListener('click', () => {
      state.size = b.dataset.size;
      saveState();
      applySize();
    });
  });

  // Settings actions
  $('#btn-export').addEventListener('click', exportProgress);
  $('#input-import').addEventListener('change', (e) => {
    if (e.target.files[0]) importProgress(e.target.files[0]);
  });
  $('#btn-reset').addEventListener('click', resetAll);

  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (state.theme === 'auto') applyTheme();
  });

  // Register service worker for offline support
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

init();
