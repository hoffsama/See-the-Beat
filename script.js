let isPlaying = false;
let currentIndex = 0;
let intervalId;
let lastNoteTime = 0;
let lastQuarterTime = 0;
let lastHalfTime = 0;
let noteAwaiting = false;
let quarterAwaiting = false;
let halfAwaiting = false;
let noteTriggerTime = 0;
let quarterTriggerTime = 0;
let halfTriggerTime = 0;

let trackingActive = true;
let notesHistory = [];
let quartersHistory = [];
let halvesHistory = [];
let statsTimerId = null;
const statsButton = document.getElementById('statsButton');
const statsTimer = document.getElementById('statsTimer');
const statsText = document.getElementById('statsText');

const circles = document.querySelectorAll('.circle');
const toggleButton = document.getElementById('toggleButton');
const bpmSlider = document.getElementById('bpmSlider');
const bpmValue = document.getElementById('bpmValue');
const errorBound = document.getElementById('errorBound');
const errorValue = document.getElementById('errorValue');
const colorBound = document.getElementById('colorBound');
const colorValue = document.getElementById('colorValue');
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

function recordStat(type, diff, miss) {
    if (!trackingActive) return;
    const entry = {diff, miss, time: Date.now()};
    if (type === 'note') {
        notesHistory.push(entry);
        if (notesHistory.length > 100) notesHistory.shift();
    } else if (type === 'quarter') {
        quartersHistory.push(entry);
        if (quartersHistory.length > 100) quartersHistory.shift();
    } else if (type === 'half') {
        halvesHistory.push(entry);
        if (halvesHistory.length > 100) halvesHistory.shift();
    }
}

function formatStats(history) {
    if (history.length === 0) return 'none';
    const abs = history.map(item => Math.abs(item.diff));
    const avg = abs.reduce((sum, val) => sum + val, 0) / abs.length;
    const missCount = history.filter(item => item.miss).length;
    return `count ${history.length}, avg ${avg.toFixed(1)}ms, miss ${missCount}`;
}

function showStats() {
    const noteStats = formatStats(notesHistory);
    const quarterStats = formatStats(quartersHistory);
    const halfStats = formatStats(halvesHistory);
    statsText.textContent = `Note: ${noteStats}; Quarter: ${quarterStats}; Half: ${halfStats}`;
    trackingActive = false;
    let countdown = 5;
    statsTimer.style.display = 'inline';
    statsTimer.textContent = `Resume in ${countdown}s`;

    statsTimerId = setInterval(() => {
        countdown -= 1;
        if (countdown <= 0) {
            clearInterval(statsTimerId);
            trackingActive = true;
            notesHistory = [];
            quartersHistory = [];
            halvesHistory = [];
            statsTimer.textContent = 'Tracking';
            setTimeout(() => { statsTimer.style.display = 'none'; }, 1000);
        } else {
            statsTimer.textContent = `Resume in ${countdown}s`;
        }
    }, 1000);
}

function activateNext() {
    const now = Date.now();

    // If previous note was never pressed, mark miss; otherwise clear previous state
    if (noteAwaiting) {
        const missDiff = now - noteTriggerTime;
        updateFeedback('note', missDiff, noteDiff, noteBar);
    } else {
        clearFeedback(noteDiff, noteBar);
    }
    noteAwaiting = false;

    if (currentIndex % 4 === 0 || currentIndex === 0) {
        if (quarterAwaiting) {
            const missDiff = now - quarterTriggerTime;
            updateFeedback('quarter', missDiff, quarterDiff, quarterBar);
        } else {
            clearFeedback(quarterDiff, quarterBar);
        }
        quarterAwaiting = false;
    }

    if (currentIndex % 8 === 0 || currentIndex === 0) {
        if (halfAwaiting) {
            const missDiff = now - halfTriggerTime;
            updateFeedback('half', missDiff, halfDiff, halfBar);
        } else {
            clearFeedback(halfDiff, halfBar);
        }
        halfAwaiting = false;
    }

    // Start current note cycle
    noteAwaiting = true;
    noteTriggerTime = now;
    if (currentIndex % 4 === 0) {
        quarterAwaiting = true;
        quarterTriggerTime = now;
    }
    if (currentIndex % 8 === 0) {
        halfAwaiting = true;
        halfTriggerTime = now;
    }

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
    circles[currentIndex].style.backgroundColor = '#33ccff'; // fixed active note color (not note-type dependent)
    if (currentIndex % 4 === 0) {
        circles[currentIndex].classList.add('beat');
    }
    currentIndex = (currentIndex + 1) % 16;
}

function clearFeedback(diffSpan, bar) {
    diffSpan.textContent = '--';
    bar.style.backgroundColor = 'gray';
}

function updateFeedback(type, diff, diffSpan, bar) {
    const hitBound = parseInt(errorBound.value);
    const colorBoundVal = parseInt(colorBound.value);
    const sign = diff < 0 ? 'early' : diff > 0 ? 'late' : 'on time';
    const absSec = (Math.abs(diff) / 1000).toFixed(3);
    const miss = Math.abs(diff) > hitBound;

    diffSpan.textContent = `${diff}ms (${absSec}s ${sign})${miss ? ' - Miss' : ''}`;

    if (miss) {
        bar.style.backgroundColor = 'red';
        recordStat(type, diff, miss);
        return;
    }

    const normalized = Math.min(Math.abs(diff), colorBoundVal) / colorBoundVal;
    const hue = 120 * (1 - normalized); // 0=green, 120=red as diff increases
    bar.style.backgroundColor = `hsl(${hue}, 100%, 50%)`;
    recordStat(type, diff, miss);
}

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && isPlaying) {
        e.preventDefault();
        const now = Date.now();
        const bpm = parseInt(bpmSlider.value);
        const interval = 60000 / bpm / 4;

        if (showNote.checked && noteAwaiting) {
            const noteDiffVal = now - noteTriggerTime;
            updateFeedback('note', noteDiffVal, noteDiff, noteBar);
            noteAwaiting = false;
        }
        if (showQuarter.checked && quarterAwaiting) {
            const quarterDiffVal = now - quarterTriggerTime;
            updateFeedback('quarter', quarterDiffVal, quarterDiff, quarterBar);
            quarterAwaiting = false;
        }
        if (showHalf.checked && halfAwaiting) {
            const halfDiffVal = now - halfTriggerTime;
            updateFeedback('half', halfDiffVal, halfDiff, halfBar);
            halfAwaiting = false;
        }

        // Optional: preserve existing behavior for remainder of cycle
        const diff = now - lastNoteTime;
        if (showNote.checked) {
            const noteOffset = Math.round(diff / interval);
            const closestNoteTime = lastNoteTime + noteOffset * interval;
            const noteDiffVal = now - closestNoteTime;
            updateFeedback('note', noteDiffVal, noteDiff, noteBar);
        }

        if (showQuarter.checked) {
            const currentMod4 = currentIndex % 4;
            const offsetToNextQuarter = (4 - currentMod4) % 4;
            const nextQuarterTime = lastNoteTime + offsetToNextQuarter * interval;
            const prevQuarterTime = lastNoteTime + (offsetToNextQuarter - 4) * interval;
            const diffNextQ = Math.abs(now - nextQuarterTime);
            const diffPrevQ = Math.abs(now - prevQuarterTime);
            const quarterDiffVal = diffNextQ < diffPrevQ ? now - nextQuarterTime : now - prevQuarterTime;
            updateFeedback('quarter', quarterDiffVal, quarterDiff, quarterBar);
        }

        if (showHalf.checked) {
            const currentMod8 = currentIndex % 8;
            const offsetToNextHalf = (8 - currentMod8) % 8;
            const nextHalfTime = lastNoteTime + offsetToNextHalf * interval;
            const prevHalfTime = lastNoteTime + (offsetToNextHalf - 8) * interval;
            const diffNextH = Math.abs(now - nextHalfTime);
            const diffPrevH = Math.abs(now - prevHalfTime);
            const halfDiffVal = diffNextH < diffPrevH ? now - nextHalfTime : now - prevHalfTime;
            updateFeedback('half', halfDiffVal, halfDiff, halfBar);
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
colorBound.addEventListener('input', updateColorBound);
statsButton.addEventListener('click', showStats);
showNote.addEventListener('change', updateDisplays);
noteDisplay.addEventListener('change', updateDisplays);
showQuarter.addEventListener('change', updateDisplays);
quarterDisplay.addEventListener('change', updateDisplays);
showHalf.addEventListener('change', updateDisplays);
halfDisplay.addEventListener('change', updateDisplays);

// Initialize displays
updateDisplays();