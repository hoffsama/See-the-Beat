let isPlaying = false;
let currentIndex = 0;
let intervalId;
let lastNoteTime = 0;
let lastQuarterTime = 0;
let lastHalfTime = 0;
let wholeAwaiting = false;
let quarterAwaiting = false;
let halfAwaiting = false;
let wholeTriggerTime = 0;
let quarterTriggerTime = 0;
let halfTriggerTime = 0;

let trackingActive = true;
let wholesHistory = [];
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
const wholeDiff = document.getElementById('wholeDiff');
const quarterDiff = document.getElementById('quarterDiff');
const halfDiff = document.getElementById('halfDiff');
const wholeBar = document.getElementById('wholeBar');
const quarterBar = document.getElementById('quarterBar');
const halfBar = document.getElementById('halfBar');
const showWhole = document.getElementById('showWhole');
const wholeDisplay = document.getElementById('wholeDisplay');
const showQuarter = document.getElementById('showQuarter');
const quarterDisplay = document.getElementById('quarterDisplay');
const showHalf = document.getElementById('showHalf');
const halfDisplay = document.getElementById('halfDisplay');

function updateDisplays() {
    const wholeFeedback = document.getElementById('wholeFeedback');
    const wholeSpan = document.getElementById('wholeDiff');
    const wholeBar = document.getElementById('wholeBar');
    wholeFeedback.style.display = showWhole.checked ? 'block' : 'none';
    const nMode = wholeDisplay.value;
    wholeSpan.style.display = (nMode === 'ms' || nMode === 'both') ? 'inline' : 'none';
    wholeBar.style.display = (nMode === 'color' || nMode === 'both') ? 'block' : 'none';

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

function updateColorBound() {
    colorValue.textContent = colorBound.value;
}

function recordStat(type, diff, miss) {
    if (!trackingActive) return;
    const entry = {diff, miss, time: Date.now()};
    if (type === 'whole') {
        wholesHistory.push(entry);
        if (wholesHistory.length > 100) wholesHistory.shift();
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
    const wholeStats = formatStats(wholesHistory);
    const quarterStats = formatStats(quartersHistory);
    const halfStats = formatStats(halvesHistory);
    statsText.textContent = `Whole: ${wholeStats}; Quarter: ${quarterStats}; Half: ${halfStats}`;
    trackingActive = false;
    let countdown = 5;
    statsTimer.style.display = 'inline';
    statsTimer.textContent = `Resume in ${countdown}s`;

    statsTimerId = setInterval(() => {
        countdown -= 1;
        if (countdown <= 0) {
            clearInterval(statsTimerId);
            trackingActive = true;
            wholesHistory = [];
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

    // Quarter note (every step): if it was pending, mark miss
    if (quarterAwaiting) {
        const missDiff = now - quarterTriggerTime;
        updateFeedback('quarter', missDiff, quarterDiff, quarterBar, true);
    } else {
        clearFeedback(quarterDiff, quarterBar);
    }

    // Whole note (every 4 steps)
    if (currentIndex % 4 === 0) {
        if (wholeAwaiting) {
            const missDiff = now - wholeTriggerTime;
            updateFeedback('whole', missDiff, wholeDiff, wholeBar, true);
        } else {
            clearFeedback(wholeDiff, wholeBar);
        }
    }

    // Half note (every 8 steps)
    if (currentIndex % 8 === 0) {
        if (halfAwaiting) {
            const missDiff = now - halfTriggerTime;
            updateFeedback('half', missDiff, halfDiff, halfBar, true);
        } else {
            clearFeedback(halfDiff, halfBar);
        }
    }

    // Start current whole/quarter/half cycle
    quarterAwaiting = true;
    quarterTriggerTime = now;

    if (currentIndex % 4 === 0) {
        wholeAwaiting = true;
        wholeTriggerTime = now;
    } else {
        wholeAwaiting = false;
    }

    if (currentIndex % 8 === 0) {
        halfAwaiting = true;
        halfTriggerTime = now;
    } else {
        halfAwaiting = false;
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

function updateFeedback(type, diff, diffSpan, bar, forceMiss = false) {
    const hitBound = parseInt(errorBound.value);
    const colorBoundVal = parseInt(colorBound.value);
    const sign = diff < 0 ? 'early' : diff > 0 ? 'late' : 'on time';
    const absSec = (Math.abs(diff) / 1000).toFixed(3);
    const miss = forceMiss || Math.abs(diff) > hitBound;

    diffSpan.textContent = `${diff}ms (${absSec}s ${sign})${miss ? ' - Miss' : ''}`;

    if (miss) {
        bar.style.backgroundColor = 'red';
        recordStat(type, diff, true);
        return;
    }

    const normalized = Math.min(Math.abs(diff), colorBoundVal) / colorBoundVal;
    const hue = 120 * (1 - normalized); // 0=green, 120=red as diff increases
    bar.style.backgroundColor = `hsl(${hue}, 100%, 50%)`;
    recordStat(type, diff, false);
}

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && isPlaying) {
        e.preventDefault();
        const now = Date.now();
        const bpm = parseInt(bpmSlider.value);
        const interval = 60000 / bpm / 4;

        if (showQuarter.checked && quarterAwaiting) {
            const quarterDiffVal = now - quarterTriggerTime;
            updateFeedback('quarter', quarterDiffVal, quarterDiff, quarterBar);
            quarterAwaiting = false;
        }
        if (showWhole.checked && wholeAwaiting) {
            const wholeDiffVal = now - wholeTriggerTime;
            updateFeedback('whole', wholeDiffVal, wholeDiff, wholeBar);
            wholeAwaiting = false;
        }
        if (showHalf.checked && halfAwaiting) {
            const halfDiffVal = now - halfTriggerTime;
            updateFeedback('half', halfDiffVal, halfDiff, halfBar);
            halfAwaiting = false;
        }

        // Accepted accuracy is handled by the awaiting state above, no extra offsets needed.
        // This avoids duplicate updateFeedback calls and stale readouts.
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
showQuarter.addEventListener('change', updateDisplays);
quarterDisplay.addEventListener('change', updateDisplays);
showHalf.addEventListener('change', updateDisplays);
halfDisplay.addEventListener('change', updateDisplays);

// Initialize displays
updateDisplays();