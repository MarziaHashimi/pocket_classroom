import { loadIndex, saveIndex, loadCap, loadProg, timeAgo, escapeHtml, updateCapTime } from './library.js';

const grid = document.getElementById('capsulesGrid');
const emptyMsg = document.getElementById('emptyLibrary');

/* Re-render Library */
export function refreshLibrary() {
  const idx = loadIndex() || [];
  grid.innerHTML = '';

  if (!idx.length) {
    emptyMsg.classList.remove('d-none');
    return;
  }
  emptyMsg.classList.add('d-none');

  for (const cap of idx) {
    const card = document.createElement('div');
    card.className = 'col-12 col-md-6 col-lg-4';

    // Load stored progress (quiz scores, known flashcards, etc.)
    const prog = loadProg(cap.id) || {};
    const bestScore = prog.bestScore || 0;

    // Progress bar color depending on score
    let barColor = 'bg-danger';
    if (bestScore >= 80) barColor = 'bg-success';
    else if (bestScore >= 50) barColor = 'bg-warning';

    // Updated time text
    const updatedAt = cap.updatedAt || cap.meta?.updatedAt;
    const updatedText = updatedAt ? `Updated ${timeAgo(updatedAt)}` : 'Never updated';

    card.innerHTML = `
      <div class="card bg-dark border-info text-light shadow-sm h-100">
        <div class="card-body d-flex flex-column justify-content-between">
          <div>
            <h5 class="fw-semibold mb-1 text-info">${escapeHtml(cap.title)}</h5>
            <p class="small text-secondary mb-1">
              ${escapeHtml(cap.subject || 'No subject')}
              <span class="text-muted ms-1">• ${updatedText}</span>
            </p>
            <span class="badge bg-gradient bg-info text-dark mb-2">${escapeHtml(cap.level || 'Beginner')}</span>

            <div class="mt-2">
              <div class="d-flex justify-content-between small mb-1">
                <span>Quiz best</span>
                <span>${bestScore}%</span>
              </div>
              <div class="progress" style="height: 6px;">
                <div class="progress-bar ${barColor}" role="progressbar"
                  style="width: ${bestScore}%"
                  aria-valuenow="${bestScore}" aria-valuemin="0" aria-valuemax="100">
                </div>
              </div>
            </div>
          </div>

          <div class="d-flex flex-wrap gap-2 mt-3">
            <button class="btn btn-sm btn-outline-light flex-fill" data-action="learn" data-id="${cap.id}">▶ Learn</button>
            <button class="btn btn-sm btn-outline-warning flex-fill" data-action="edit" data-id="${cap.id}">✏ Edit</button>
            <button class="btn btn-sm btn-outline-info flex-fill" data-action="export" data-id="${cap.id}">⬇ Export</button>
            <button class="btn btn-sm btn-outline-danger flex-fill" data-action="delete" data-id="${cap.id}">🗑 Delete</button>
          </div>
        </div>
      </div>
    `;
    grid.appendChild(card);
  }
}

/* Handle button clicks */
grid.addEventListener('click', e => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const id = btn.dataset.id;
  const act = btn.dataset.action;

  switch (act) {
    case 'edit':
      updateCapTime(id); // instantly update time when edited
      document.querySelector('a.nav-link[data-view="author"]').click();
      document.dispatchEvent(new CustomEvent('pc:editCapsule', { detail: { id } }));
      break;

    case 'learn':
      updateCapTime(id); // update time when user opens Learn
      document.querySelector('a.nav-link[data-view="learn"]').click();
      document.dispatchEvent(new CustomEvent('pc:learnCapsule', { detail: { id } }));
      break;

    case 'export':
      exportCapsule(id);
      break;

    case 'delete':
      deleteCapsule(id);
      break;
  }
});

/* Export handler */
function exportCapsule(id) {
  const cap = loadCap(id);
  if (!cap) return alert('Capsule not found');
  const blob = new Blob([JSON.stringify(cap, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${cap.meta?.title || 'capsule'}.json`;
  a.click();
}

/* Delete handler */
function deleteCapsule(id) {
  if (!confirm('Delete this capsule?')) return;
  try {
    localStorage.removeItem(`pc_cap_${id}`);
    const idx = loadIndex().filter(i => i.id !== id);
    saveIndex(idx);
    refreshLibrary();
  } catch (err) {
    console.error('Delete failed', err);
    alert('Delete failed');
  }
}

/* Refresh when app or capsule updates */
document.addEventListener('pc:refreshLibrary', refreshLibrary);
document.addEventListener('pc:appReady', refreshLibrary);
document.addEventListener('pc:capsuleUpdated', refreshLibrary);

/* Auto-refresh every minute */
setInterval(refreshLibrary, 60000);
