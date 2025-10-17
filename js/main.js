// main.js 
import { loadIndex, saveIndex, loadCap, saveCap, escapeHtml } from './library.js';
import './library-ui.js';
import './author.js';
import './learn.js';
import { exportAllCapsules, importCapsules } from './data-tools.js';

const $ = s => document.querySelector(s);

// ==========================
// 🌟 SPLASH SCREEN LOGIC
// ==========================
window.addEventListener('load', () => {
  const splash = document.getElementById('splash-screen');
  const progress = document.getElementById('splash-progress');
  const appRoot = document.getElementById('app-root');
  let percent = 0;

  const interval = setInterval(() => {
    percent += 12;
    progress.style.width = `${percent}%`;
    if (percent >= 100) {
      clearInterval(interval);
      setTimeout(() => {
        splash.classList.add('fade-out');
        setTimeout(() => {
          splash.remove();
          appRoot.classList.remove('d-none');
          document.dispatchEvent(new CustomEvent('pc:refreshLibrary'));
        }, 500);
      }, 300);
    }
  }, 200);
});

// ==========================
// 📚 SPA VIEW NAVIGATION
// ==========================
const sections = document.querySelectorAll('section[id^="view-"]');
const navLinks = document.querySelectorAll('.nav-link[data-view]');

function showView(viewName) {
  sections.forEach(sec => sec.classList.add('d-none'));
  const target = document.getElementById(`view-${viewName}`);
  if (target) target.classList.remove('d-none');

  navLinks.forEach(link => {
    link.classList.toggle('active', link.dataset.view === viewName);
  });
}

navLinks.forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    showView(link.dataset.view);
  });
});

// Default view
showView('library');


//  NEW CAPSULE BUTTON
// ==========================
$('#btnNew')?.addEventListener('click', () => {
  showView('author');
});


//  IMPORT / EXPORT LOGIC
// ==========================
$('#fileImport')?.addEventListener('change', async e => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    const txt = await f.text();
    const j = JSON.parse(txt);

    if (!j.schema || j.schema !== 'pocket-classroom/v1')
      throw new Error('Schema mismatch');
    if (!j.meta || !j.meta.title)
      throw new Error('Missing title');

    const id = 'cap_' + Date.now();
    j.id = id;
    const now = new Date().toISOString();
    j.meta.createdAt = now;
    j.meta.updatedAt = now;

    saveCap(id, j);

    const idx = loadIndex().filter(i => i.id !== id);
    idx.unshift({
      id,
      title: j.meta.title,
      subject: j.meta.subject || '',
      level: j.meta.level || 'Beginner',
      updatedAt: now
    });
    saveIndex(idx);

    alert('✅ Capsule imported successfully!');
    document.dispatchEvent(new CustomEvent('pc:refreshLibrary'));
  } catch (err) {
    alert('Import failed: ' + (err.message || 'Invalid JSON'));
  } finally {
    e.target.value = '';
  }
});

$('#btnExport')?.addEventListener('click', exportAllCapsules);

// ==========================
//  FLASHCARD FLIP ANIMATION
// ==========================
const flashcard = document.getElementById('flashcard');
if (flashcard) {
  flashcard.addEventListener('click', () => {
    flashcard.classList.toggle('flipped');
  });
}

// ==========================
// APP READY EVENT
// ==========================
document.dispatchEvent(new CustomEvent('pc:appReady'));

// Theme Toggle Logic
const themeToggle = document.getElementById('themeToggle');
const currentTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', currentTheme);
updateToggleIcon(currentTheme);

themeToggle.addEventListener('click', () => {
  const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateToggleIcon(newTheme);
});

function updateToggleIcon(theme) {
  const icon = themeToggle.querySelector('i');
  if (theme === 'dark') {
    icon.classList.replace('bi-sun-fill', 'bi-moon-fill');
  } else {
    icon.classList.replace('bi-moon-fill', 'bi-sun-fill');
  }
}

