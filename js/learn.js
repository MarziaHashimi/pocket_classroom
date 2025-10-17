import { loadIndex, loadCap, loadProg, saveProg } from './library.js';

const sel = (s) => document.querySelector(s);

const capsuleSelect = sel('#learnCapsuleSelect');
const notesTab = sel('#notesTab');
const flashTab = sel('#flashTab');
const quizTab = sel('#quizTab');
const tabButtons = document.querySelectorAll('.learn-tab-btn');

let currentCapsule = null;
let currentIndex = 0;
let known = new Set();
let Q = [];
let qIndex = 0;
let correct = 0;

/* ---------- Load capsule dropdown ---------- */
function loadCapsuleList() {
  capsuleSelect.innerHTML = '<option value="">Select Capsule</option>';
  const idx = loadIndex();
  idx.forEach((c) => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.title;
    capsuleSelect.appendChild(opt);
  });
}
document.addEventListener('pc:appReady', loadCapsuleList);
document.addEventListener('pc:refreshLibrary', loadCapsuleList);

/* ---------- When capsule selected ---------- */
capsuleSelect.addEventListener('change', () => {
  const id = capsuleSelect.value;
  if (!id) return;
  const cap = loadCap(id);
  if (!cap) return alert('Capsule not found');
  currentCapsule = cap;
  known = new Set(loadProg(id).knownFlashcards || []);
  renderNotes();
  renderFlashcard();
  renderQuizIntro();
});

/* ---------- Tabs switching ---------- */
tabButtons.forEach((btn) =>
  btn.addEventListener('click', () => showTab(btn.dataset.tab))
);
function showTab(tabName) {
  document.querySelectorAll('.learn-tab').forEach((t) =>
    t.classList.add('d-none')
  );
  sel(`#${tabName}Tab`).classList.remove('d-none');
}

/* =============== NOTES TAB =============== */
function renderNotes() {
  const notesList = sel('#notesList');
  const search = sel('#notesSearch');
  const lines = Object.values(currentCapsule.notes || {});
  notesList.innerHTML = lines.map((n) => `<li>${n}</li>`).join('');
  search.value = '';
  search.addEventListener('input', () => {
    const q = search.value.toLowerCase();
    notesList.innerHTML = lines
      .filter((n) => n.toLowerCase().includes(q))
      .map((n) => `<li>${n}</li>`)
      .join('');
  });
}

/* =============== FLASHCARDS TAB =============== */
function renderFlashcard() {
  const cards = currentCapsule.flashcards || [];
  const front = sel('#fcFront');
  const back = sel('#fcBack');
  const count = sel('#fcCount');
  const knownCount = sel('#knownCount');
  const btnPrev = sel('#btnPrev');
  const btnNext = sel('#btnNext');
  const btnKnown = sel('#btnKnown');
  const btnUnknown = sel('#btnUnknown');

  if (!cards.length) {
    front.textContent = back.textContent = 'No flashcards';
    return;
  }

  function updateCard() {
    const c = cards[currentIndex];
    front.textContent = c.front || '(empty front)';
    back.textContent = c.back || '(empty back)';
    count.textContent = `${currentIndex + 1}/${cards.length}`;
    knownCount.textContent = known.size;
  }

  btnPrev.onclick = () => {
    currentIndex = (currentIndex - 1 + cards.length) % cards.length;
    updateCard();
  };
  btnNext.onclick = () => {
    currentIndex = (currentIndex + 1) % cards.length;
    updateCard();
  };
  btnKnown.onclick = () => {
    known.add(currentIndex);
    saveProg(currentCapsule.id, {
      ...loadProg(currentCapsule.id),
      knownFlashcards: [...known],
    });
    updateCard();
  };
  btnUnknown.onclick = () => {
    known.delete(currentIndex);
    saveProg(currentCapsule.id, {
      ...loadProg(currentCapsule.id),
      knownFlashcards: [...known],
    });
    updateCard();
  };

  // Flip animation
  const card = sel('#flashcard');
  card.addEventListener('click', () => {
    card.classList.toggle('flipped');
  });
  document.body.onkeydown = (e) => {
    if (e.code === 'Space') card.classList.toggle('flipped');
    if (e.key === '[') showTab('notes');
    if (e.key === ']') showTab('quiz');
  };

  updateCard();
}

/* =============== QUIZ TAB =============== */
function renderQuizIntro() {
  const startBtn = sel('#btnStartQuiz');
  startBtn.onclick = () => startQuiz();
}

function startQuiz() {
  Q = currentCapsule.quiz || [];
  qIndex = 0;
  correct = 0;
  renderQuizQuestion();
}

function renderQuizQuestion() {
  const area = sel('#quizArea');
  if (!Q.length) {
    area.innerHTML = '<p>No quiz questions available.</p>';
    return;
  }
  if (qIndex >= Q.length) return finishQuiz();

  const q = Q[qIndex];
  area.innerHTML = `
    <div class="mb-3">
      <h5>${q.question}</h5>
      ${q.choices
        .map(
          (c, i) => `
        <button class="btn btn-outline-light w-100 my-1" data-i="${i}">
          ${String.fromCharCode(65 + i)}. ${c}
        </button>`
        )
        .join('')}
    </div>`;
  area.querySelectorAll('button[data-i]').forEach((btn) =>
    btn.addEventListener('click', () => pickAnswer(parseInt(btn.dataset.i)))
  );
}

function pickAnswer(i) {
  const q = Q[qIndex];
  if (i === q.answerIndex) correct++;
  qIndex++;
  setTimeout(renderQuizQuestion, 400);
}

function finishQuiz() {
  const score = Math.round((correct / Q.length) * 100);
  const prog = loadProg(currentCapsule.id);
  saveProg(currentCapsule.id, {
    ...prog,
    bestScore: Math.max(score, prog.bestScore || 0),
  });
  sel('#quizArea').innerHTML = `
    <div class="text-center">
      <h4>Your score: ${score}%</h4>
      <button class="btn btn-outline-light mt-3" id="btnRetryQuiz">Retry</button>
    </div>`;
  sel('#btnRetryQuiz').onclick = startQuiz;
}
