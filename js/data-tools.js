// data-tools.js
import { loadIndex, loadCap, saveIndex, saveCap } from './library.js';

const sel = (s) => document.querySelector(s);

/* ========== EXPORT ALL CAPSULES ========== */
export function exportAllCapsules() {
  const idx = loadIndex();
  const data = idx.map((c) => ({
    id: c.id,
    title: c.title,
    capsule: loadCap(c.id)
  }));
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'pocket_classroom_backup.json';
  a.click();
}

/* ========== IMPORT CAPSULES ========== */
export function importCapsules(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data)) throw new Error('Invalid file format');
      data.forEach((item) => {
        saveCap(item.id, item.capsule);
      });
      const idx = data.map((d) => ({ id: d.id, title: d.title }));
      saveIndex(idx);
      document.dispatchEvent(new CustomEvent('pc:refreshLibrary'));
      alert('Capsules imported successfully!');
    } catch (err) {
      alert('Import failed: ' + err.message);
    }
  };
  reader.readAsText(file);
}
