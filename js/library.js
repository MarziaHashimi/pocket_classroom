export const IDX_KEY = 'pc_capsules_index';
export const CAP_KEY = id => `pc_cap_${id}`;
export const PROG_KEY = id => `pc_progress_${id}`;

function safeParse(raw, fallback) {
  try {
    if (raw === null || raw === undefined) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/* Index */
export const loadIndex = () => safeParse(localStorage.getItem(IDX_KEY), []);
export const saveIndex = idx => localStorage.setItem(IDX_KEY, JSON.stringify(idx));

/* Capsule */
export const loadCap = id => safeParse(localStorage.getItem(CAP_KEY(id)), null);

export const saveCap = (id, cap) => {
  const nowIso = new Date().toISOString();
  cap.updatedAt = nowIso;
  if (cap.meta) cap.meta.updatedAt = nowIso;

  localStorage.setItem(CAP_KEY(id), JSON.stringify(cap));

  const idx = loadIndex();
  const found = idx.find(i => i.id === id);
  const entry = {
    id,
    title: cap.meta?.title || cap.title || 'Untitled',
    subject: cap.meta?.subject || cap.subject || '',
    level: cap.meta?.level || cap.level || 'Beginner',
    updatedAt: nowIso
  };
  if (found) Object.assign(found, entry);
  else idx.unshift(entry);
  saveIndex(idx);

  document.dispatchEvent(new CustomEvent('pc:refreshLibrary'));
};

/* Progress */
export const loadProg = id => safeParse(localStorage.getItem(PROG_KEY(id)), {});
export const saveProg = (id, p) => {
  localStorage.setItem(PROG_KEY(id), JSON.stringify(p));
  updateCapTime(id);
};

/* Time helper */
export function timeAgo(iso) {
  if (!iso) return 'just now';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return 'just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} minute${mins > 1 ? 's' : ''}`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''}`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? 's' : ''}`;
}

/* HTML escape */
export function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/* Update capsule timestamp */
export function updateCapTime(id) {
  const cap = loadCap(id);
  if (!cap) return;
  const nowIso = new Date().toISOString();
  cap.updatedAt = nowIso;
  if (cap.meta) cap.meta.updatedAt = nowIso;
  localStorage.setItem(CAP_KEY(id), JSON.stringify(cap));

  const idx = loadIndex();
  const found = idx.find(i => i.id === id);
  if (found) found.updatedAt = nowIso;
  else idx.unshift({ id, title: cap.meta?.title || 'Untitled', updatedAt: nowIso });
  saveIndex(idx);
  document.dispatchEvent(new CustomEvent('pc:refreshLibrary'));
}
