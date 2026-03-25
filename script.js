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
const showNote = document.getElementById('showNote');
const noteDisplay = document.getElementById('noteDisplay');
const showQuarter = document.getElementById('showQuarter');
const quarterDisplay = document.getElementById('quarterDisplay');
const showHalf = document.getElementById('showHalf');
const halfDisplay = document.getElementById('halfDisplay');

function updateDisplays() {
    const noteFeedback = document.getElementById('noteFeedback');
    const noteSpan = document.getElementById('noteDiff');
    const noteBar = document.getElementById('noteBar');
    noteFeedback.style.display = showNote.checked ? 'block' : 'none';
    const nMode = noteDisplay.value;
    noteSpan.style.display = (nMode === 'ms' || nMode === 'both') ? 'inline' : 'none';
    noteBar.style.display = (nMode === 'color' || nMode === 'both') ? 'block' : 'none';

    const quarterFeedback = document.getElementById('quarterFeedback');
    const quarterSpan = document.getElementById('quarterDiff');
    const quarterBar = document.getElementById('quarterBar');
    quarterFeedback.style.display = showQuarter.checked ? 'block' : 'none';
    const qMode = quarterDisplay.value;
    quarterSpan.style.display = (qMode === 'ms' || qMode === 'both') ? 'inline' : 'none';
    quarterBar.style.display = (qMode === 'color' || qMode === 'both') ? 'block' : 'none';

    const halfFeedback = document.getElementById('halfFeedback');
    const halfSpan = document.getElementById('halfDiff');
    const halfBar = document.getElementById('halfBar');
    halfFeedback.style.display = showHalf.checked ? 'block' : 'none';
    const hMode = halfDisplay.value;
    halfSpan.style.display = (hMode === 'ms' || hMode === 'both') ? 'inline' : 'none';
    halfBar.style.display = (hMode === 'color' || hMode === 'both') ? 'block' : 'none';
}

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
    const sign = diff < 0 ? 'early' : diff > 0 ? 'late' : 'on time';
    const absSec = (Math.abs(diff) / 1000).toFixed(3);
    diffSpan.textContent = `${diff}ms (${absSec}s ${sign})`;
    if (Math.abs(diff) > bound) {
        bar.style.backgroundColor = 'red';
    } else {
        const accuracy = 1 - Math.abs(diff) / bound;
        const hue = 120 * accuracy; // 0 red, 120 green
        bar.style.backgroundColor = `hsl(${hue}, 100%, 50%)`;
    }
}

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && isPlaying) {
        e.preventDefault();
        const now = Date.now();
        const bpm = parseInt(bpmSlider.value);
        const interval = 60000 / bpm / 4;
        const diff = now - lastNoteTime;

        // Note (16th)
        if (showNote.checked) {
            const noteOffset = Math.round(diff / interval);
            const closestNoteTime = lastNoteTime + noteOffset * interval;
            const noteDiffVal = now - closestNoteTime;
            updateFeedback(noteDiffVal, noteDiff, noteBar);
        }

        // Quarter
        if (showQuarter.checked) {
            const currentMod4 = currentIndex % 4;
            const offsetToNextQuarter = (4 - currentMod4) % 4;
            const nextQuarterTime = lastNoteTime + offsetToNextQuarter * interval;
            const prevQuarterTime = lastNoteTime + (offsetToNextQuarter - 4) * interval;
            const diffNextQ = Math.abs(now - nextQuarterTime);
            const diffPrevQ = Math.abs(now - prevQuarterTime);
            const quarterDiffVal = diffNextQ < diffPrevQ ? now - nextQuarterTime : now - prevQuarterTime;
            updateFeedback(quarterDiffVal, quarterDiff, quarterBar);
        }

        // Half
        if (showHalf.checked) {
            const currentMod8 = currentIndex % 8;
            const offsetToNextHalf = (8 - currentMod8) % 8;
            const nextHalfTime = lastNoteTime + offsetToNextHalf * interval;
            const prevHalfTime = lastNoteTime + (offsetToNextHalf - 8) * interval;
            const diffNextH = Math.abs(now - nextHalfTime);
            const diffPrevH = Math.abs(now - prevHalfTime);
            const halfDiffVal = diffNextH < diffPrevH ? now - nextHalfTime : now - prevHalfTime;
            updateFeedback(halfDiffVal, halfDiff, halfBar);
        }
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
showNote.addEventListener('change', updateDisplays);
noteDisplay.addEventListener('change', updateDisplays);
showQuarter.addEventListener('change', updateDisplays);
quarterDisplay.addEventListener('change', updateDisplays);
showHalf.addEventListener('change', updateDisplays);
halfDisplay.addEventListener('change', updateDisplays);

// Initialize displays
updateDisplays();