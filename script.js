let isPlaying = false;
let currentIndex = 0;
let intervalId;
let lastNoteTime = 0;
let lastQuarterTime = 0;
let lastHalfTime = 0;

const circles = document.querySelectorAll('.circle');
const toggleButton = document.getElementById('toggleButton');
const bpmSlider = document.getElementById('bpmSlider');
const bpmValue = document.getElementById('bpmValue');
const errorBound = document.getElementById('errorBound');
const errorValue = document.getElementById('errorValue');
const noteDiff = document.getElementById('noteDiff');
const quarterDiff = document.getElementById('quarterDiff');
const halfDiff = document.getElementById('halfDiff');
const noteBar = document.getElementById('noteBar');
const quarterBar = document.getElementById('quarterBar');
const halfBar = document.getElementById('halfBar');

const myColor1 = '#ffadae';
const myColor2 = '#ffd7a6';
const myColor3 = '#feffb7';
const myColor4 = '#c9ffbf';

const colors = [myColor1, myColor2, myColor3, myColor4];

function updateBPM() {
    const bpm = bpmSlider.value;
    bpmValue.textContent = bpm;
    if (isPlaying) {
        const interval = 60000 / bpm / 4; // 16th notes
        clearInterval(intervalId);
        intervalId = setInterval(activateNext, interval);
    }
}

function updateError() {
    errorValue.textContent = errorBound.value;
}

function activateNext() {
    const now = Date.now();
    lastNoteTime = now;
    if (currentIndex % 4 === 0) {
        lastQuarterTime = now;
    }
    if (currentIndex % 8 === 0) {
        lastHalfTime = now;
    }
    circles.forEach(circle => {
        circle.style.backgroundColor = '#333';
        circle.classList.remove('beat');
    });
    const section = Math.floor(currentIndex / 4);
    circles[currentIndex].style.backgroundColor = colors[section];
    if (currentIndex % 4 === 0) {
        circles[currentIndex].classList.add('beat');
    }
    currentIndex = (currentIndex + 1) % 16;
}

function updateFeedback(diff, diffSpan, bar) {
    const bound = parseInt(errorBound.value);
    diffSpan.textContent = diff;
    if (Math.abs(diff) > bound) {
        bar.style.backgroundColor = 'red';
    } else {
        const accuracy = 1 - Math.abs(diff) / bound;
        const hue = 120 * accuracy; // 0 red, 120 green
        bar.style.backgroundColor = `hsl(${hue}, 100%, 50%)`;
    }
}

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        const now = Date.now();
        const diffNote = now - lastNoteTime;
        const diffQuarter = now - lastQuarterTime;
        const diffHalf = now - lastHalfTime;
        updateFeedback(diffNote, noteDiff, noteBar);
        updateFeedback(diffQuarter, quarterDiff, quarterBar);
        updateFeedback(diffHalf, halfDiff, halfBar);
    }
});

toggleButton.addEventListener('click', () => {
    isPlaying = !isPlaying;
    if (isPlaying) {
        updateBPM();
        toggleButton.textContent = 'Stop';
    } else {
        clearInterval(intervalId);
        toggleButton.textContent = 'Start';
        circles.forEach(circle => circle.style.backgroundColor = '#333');
        currentIndex = 0;
    }
});

bpmSlider.addEventListener('input', updateBPM);
errorBound.addEventListener('input', updateError);