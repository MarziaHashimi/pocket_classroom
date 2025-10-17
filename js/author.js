import { loadIndex, saveIndex, loadCap, saveCap } from './library.js';
import { refreshLibrary } from './library-ui.js';

let currentId = null; // editing capsule ID
const formMeta = document.getElementById('metaForm');
const notesField = document.getElementById('notesInput');
const flashcardsContainer = document.getElementById('flashcardsEditor');
const quizContainer = document.getElementById('quizEditor');
const saveBtn = document.getElementById('btnSaveCapsule');
const newBtn = document.getElementById('btnNewCapsule');
const addFlashBtn = document.getElementById('btnAddFlashcard');
const addQuizBtn = document.getElementById('btnAddQuiz');

// ---------- Helper: Flashcard Row ----------
function addFlashcardRow(front = '', back = '') {
  const row = document.createElement('div');
  row.className = 'row g-2 align-items-end mb-2 flashcard-row';
  row.innerHTML = `
    <div class="col">
      <label class="form-label">Front</label>
      <input type="text" class="form-control fc-front" value="${front}">
    </div>
    <div class="col">
      <label class="form-label">Back</label>
      <input type="text" class="form-control fc-back" value="${back}">
    </div>
    <div class="col-auto">
      <button type="button" class="btn btn-outline-danger btnDel">X</button>
    </div>
  `;
  row.querySelector('.btnDel').addEventListener('click', () => row.remove());
  flashcardsContainer.appendChild(row);
}

// ---------- Helper: Quiz Block ----------
function addQuizBlock(question = '', choices = ['', '', '', ''], correct = 0, explanation = '') {
  const block = document.createElement('div');
  block.className = 'quiz-block border rounded p-3 mb-3';
  block.innerHTML = `
    <label class="form-label fw-semibold">Question</label>
    <input type="text" class="form-control mb-2 q-question" value="${question}">
    ${choices.map((c, i) => `
      <div class="input-group mb-2">
        <span class="input-group-text">${String.fromCharCode(65 + i)}</span>
        <input type="text" class="form-control q-choice" value="${c}">
      </div>
    `).join('')}
    <div class="row g-2 mb-2 align-items-center">
      <div class="col-auto">
        <label class="form-label mb-0">Correct index (0–3)</label>
        <input type="number" min="0" max="3" class="form-control q-correct-index" value="${correct}">
      </div>
      <div class="col">
        <label class="form-label mb-0">Explanation (optional)</label>
        <input type="text" class="form-control q-explanation" value="${explanation}">
      </div>
    </div>
    <button type="button" class="btn btn-outline-danger btn-sm btnDelQ">Remove Question</button>
  `;
  block.querySelector('.btnDelQ').addEventListener('click', () => block.remove());
  quizContainer.appendChild(block);
}


// ---------- Load Capsule for Editing ----------
document.addEventListener('pc:editCapsule', (e) => {
  const { id } = e.detail;
  const cap = loadCap(id);
  if (!cap) return alert('Capsule not found!');
  currentId = id;

  // Meta
  formMeta.title.value = cap.meta?.title || '';
  formMeta.subject.value = cap.meta?.subject || '';
  formMeta.level.value = cap.meta?.level || 'Beginner';
  formMeta.desc.value = cap.meta?.desc || '';

  // Notes
  notesField.value = Object.values(cap.notes || {}).join('\n');

  // Flashcards
  flashcardsContainer.innerHTML = '';
  (cap.flashcards || []).forEach(f => addFlashcardRow(f.front, f.back));

  // Quiz
  quizContainer.innerHTML = '';
  (cap.quiz || []).forEach(q => addQuizBlock(q.question, q.choices, q.answerIndex));
});

// ---------- New Capsule ----------
newBtn.addEventListener('click', () => {
  currentId = null;
  formMeta.reset();
  notesField.value = '';
  flashcardsContainer.innerHTML = '';
  quizContainer.innerHTML = '';
  addFlashcardRow();
  addQuizBlock();
});

// ---------- Add Flashcard / Quiz Buttons ----------
addFlashBtn?.addEventListener('click', () => addFlashcardRow());
addQuizBtn?.addEventListener('click', () => addQuizBlock());

// ---------- Save Capsule ----------
saveBtn.addEventListener('click', () => {
  const title = formMeta.title.value.trim();
  if (!title) return alert('Title is required.');

  const notes = notesField.value
    .split('\n')
    .map(t => t.trim())
    .filter(Boolean);

  const flashcards = Array.from(flashcardsContainer.querySelectorAll('.flashcard-row'))
    .map(r => ({
      front: r.querySelector('.fc-front').value.trim(),
      back: r.querySelector('.fc-back').value.trim()
    }))
    .filter(f => f.front || f.back);

const quiz = Array.from(quizContainer.querySelectorAll('.quiz-block'))
  .map(block => {
    const q = block.querySelector('.q-question').value.trim();
    const choices = Array.from(block.querySelectorAll('.q-choice')).map(c => c.value.trim());
    const correct = parseInt(block.querySelector('.q-correct-index').value, 10);
    const explanation = block.querySelector('.q-explanation').value.trim();
    return { question: q, choices, answerIndex: correct, explanation };
  })
  .filter(q => q.question && q.choices.some(Boolean));
console.log('DEBUG QUIZ SAVED:', quiz);


  if (!notes.length && !flashcards.length && !quiz.length)
    return alert('Please add at least one note, flashcard, or quiz.');

  const now = new Date().toISOString();
  const id = currentId || `cap-${Date.now()}`;
  const capsule = {
    schema: 'pocket-classroom/v1',
    id,
    meta: {
      title,
      subject: formMeta.subject.value.trim(),
      level: formMeta.level.value,
      desc: formMeta.desc.value.trim(),
      updatedAt: now,
      createdAt: currentId ? loadCap(currentId)?.meta?.createdAt : now
    },
    notes: Object.fromEntries(notes.map((n, i) => [`n${i}`, n])),
    flashcards,
    quiz
  };

  // saveCap will set canonical updatedAt on root and meta, update index, and refresh UI
  saveCap(id, capsule);
  const idx = loadIndex();
  const existing = idx.findIndex(c => c.id === id);
  if (existing >= 0)
    idx[existing] = {
      id,
      title,
      subject: capsule.meta.subject,
      level: capsule.meta.level,
      updatedAt: now,
      meta: capsule.meta
    };
  else
    idx.unshift({
      id,
      title,
      subject: capsule.meta.subject,
      level: capsule.meta.level,
      updatedAt: now,
      meta: capsule.meta
    });

  saveIndex(idx);

  refreshLibrary();

  alert('✅ Capsule saved successfully!');

  // Go back to library after saving
  setTimeout(() => {
    document.querySelector('a.nav-link[data-view="library"]').click();
    document.dispatchEvent(new CustomEvent('pc:refreshLibrary'));
  }, 300);
});
