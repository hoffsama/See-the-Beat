// ============================================================================
// BEAT SEQUENCER - Refactored Architecture
// ============================================================================

// Config: Note types and their timing subdivisions
const NOTE_TYPES = {
    whole: { label: 'Whole', interval: 4 },
    quarter: { label: 'Quarter', interval: 1 },
    half: { label: 'Half', interval: 8 }
};

// State
const state = {
    isPlaying: false,
    currentIndex: 0,
    intervalId: null,
    trackingActive: true,
    statsTimerId: null,
    notes: {
        whole: { awaiting: false, triggerTime: 0, lastTime: 0, history: [] },
        quarter: { awaiting: false, triggerTime: 0, lastTime: 0, history: [] },
        half: { awaiting: false, triggerTime: 0, lastTime: 0, history: [] }
    }
};

// DOM Cache
const dom = {
    circles: document.querySelectorAll('.circle'),
    toggleButton: document.getElementById('toggleButton'),
    bpmSlider: document.getElementById('bpmSlider'),
    bpmValue: document.getElementById('bpmValue'),
    errorBound: document.getElementById('errorBound'),
    errorValue: document.getElementById('errorValue'),
    colorBound: document.getElementById('colorBound'),
    colorValue: document.getElementById('colorValue'),
    statsButton: document.getElementById('statsButton'),
    statsTimer: document.getElementById('statsTimer'),
    statsText: document.getElementById('statsText'),
    feedback: {}
};

// Populate feedback DOM references
Object.keys(NOTE_TYPES).forEach(type => {
    dom.feedback[type] = {
        container: document.getElementById(`${type}Feedback`),
        diffText: document.getElementById(`${type}Diff`),
        bar: document.getElementById(`${type}Bar`),
        checkbox: document.getElementById(`show${type.charAt(0).toUpperCase() + type.slice(1)}`),
        display: document.getElementById(`${type}Display`)
    };
});

// ============================================================================
// Update Functions
// ============================================================================

function updateBPM() {
    const bpm = dom.bpmSlider.value;
    dom.bpmValue.textContent = bpm;
    if (state.isPlaying) {
        const interval = 60000 / bpm / 4;
        clearInterval(state.intervalId);
        state.intervalId = setInterval(activateNext, interval);
    }
}

function updateError() {
    dom.errorValue.textContent = dom.errorBound.value;
}

function updateColorBound() {
    dom.colorValue.textContent = dom.colorBound.value;
}

function updateDisplays() {
    Object.keys(NOTE_TYPES).forEach(type => {
        const fb = dom.feedback[type];
        const isShown = fb.checkbox.checked;
        const mode = fb.display.value;
        
        fb.container.style.display = isShown ? 'block' : 'none';
        fb.diffText.style.display = (mode === 'ms' || mode === 'both') ? 'inline' : 'none';
        fb.bar.style.display = (mode === 'color' || mode === 'both') ? 'block' : 'none';
    });
}

// ============================================================================
// Feedback & Recording
// ============================================================================

function recordStat(type, diff, miss) {
    if (!state.trackingActive) return;
    const history = state.notes[type].history;
    history.push({ diff, miss, time: Date.now() });
    if (history.length > 100) history.shift();
}

function formatStats(history) {
    if (history.length === 0) return 'none';
    const abs = history.map(item => Math.abs(item.diff));
    const avg = abs.reduce((sum, val) => sum + val, 0) / abs.length;
    const missCount = history.filter(item => item.miss).length;
    return `count ${history.length}, avg ${avg.toFixed(1)}ms, miss ${missCount}`;
}

function showStats() {
    const stats = Object.keys(NOTE_TYPES).map(type => 
        `${NOTE_TYPES[type].label}: ${formatStats(state.notes[type].history)}`
    ).join(' | ');
    
    dom.statsText.textContent = stats;
    state.trackingActive = false;
    let countdown = 5;
    dom.statsTimer.style.display = 'inline';
    dom.statsTimer.textContent = `Resume in ${countdown}s`;

    state.statsTimerId = setInterval(() => {
        countdown--;
        if (countdown <= 0) {
            clearInterval(state.statsTimerId);
            state.trackingActive = true;
            Object.keys(state.notes).forEach(type => state.notes[type].history = []);
            dom.statsTimer.textContent = 'Tracking';
            setTimeout(() => { dom.statsTimer.style.display = 'none'; }, 1000);
        } else {
            dom.statsTimer.textContent = `Resume in ${countdown}s`;
        }
    }, 1000);
}

function updateFeedback(type, diff, forceMiss = false) {
    const fb = dom.feedback[type];
    const hitBound = parseInt(dom.errorBound.value);
    const colorBoundVal = parseInt(dom.colorBound.value);
    
    const sign = diff < 0 ? 'early' : diff > 0 ? 'late' : 'on time';
    const absSec = (Math.abs(diff) / 1000).toFixed(3);
    const miss = forceMiss || Math.abs(diff) > hitBound;
    const diffMs = `${Math.round(diff)}ms`;

    fb.diffText.textContent = `${diffMs} (${absSec}s ${sign})${miss ? ' - Miss' : ''}`;
    
    // Debug logging for timing analysis
    console.log(`[${type}] trigger=${state.notes[type].triggerTime} | now=${Date.now()} | diff=${diff}ms | miss=${miss}`);

    if (miss) {
        fb.bar.style.backgroundColor = 'red';
        recordStat(type, diff, true);
    } else {
        const normalized = Math.min(Math.abs(diff), colorBoundVal) / colorBoundVal;
        const hue = 120 * (1 - normalized);
        fb.bar.style.backgroundColor = `hsl(${hue}, 100%, 50%)`;
        recordStat(type, diff, false);
    }
}

function clearFeedback(type) {
    const fb = dom.feedback[type];
    fb.diffText.textContent = '--';
    fb.bar.style.backgroundColor = 'gray';
}

function activateNext() {
    const now = Date.now();

    // Check & mark missed notes
    Object.keys(NOTE_TYPES).forEach(type => {
        const noteType = NOTE_TYPES[type];
        const note = state.notes[type];
        
        if (state.currentIndex % noteType.interval === 0) {
            if (note.awaiting) {
                const missDiff = now - note.triggerTime;
                updateFeedback(type, missDiff, true);
            } else {
                clearFeedback(type);
            }
        }
    });

    // Start new note cycles
    Object.keys(NOTE_TYPES).forEach(type => {
        const noteType = NOTE_TYPES[type];
        const note = state.notes[type];
        
        const shouldTrigger = state.currentIndex % noteType.interval === 0;
        
        if (shouldTrigger) {
            note.awaiting = true;
            note.triggerTime = now;
            note.lastTime = now;
        } else {
            note.awaiting = false;
        }
    });

    // Update circle display
    dom.circles.forEach(circle => {
        circle.style.backgroundColor = '#333';
        circle.classList.remove('beat');
    });
    
    dom.circles[state.currentIndex].style.backgroundColor = '#33ccff';
    if (state.currentIndex % 4 === 0) {
        dom.circles[state.currentIndex].classList.add('beat');
    }
    
    state.currentIndex = (state.currentIndex + 1) % 16;
}

// ============================================================================
// Event Handlers
// ============================================================================

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && state.isPlaying) {
        e.preventDefault();
        const now = Date.now();
        console.log(`--- SPACEBAR PRESSED at ${now} ---`);

        Object.keys(NOTE_TYPES).forEach(type => {
            const fb = dom.feedback[type];
            const note = state.notes[type];
            
            if (fb.checkbox.checked && note.awaiting) {
                const diffVal = now - note.triggerTime;
                console.log(`[${type}] awaiting=true | trigger was ${note.triggerTime} | diff=${diffVal}ms`);
                updateFeedback(type, diffVal);
                note.awaiting = false;
            } else if (fb.checkbox.checked) {
                console.log(`[${type}] awaiting=false (skipped)`);
            }
        });
    }
});

dom.toggleButton.addEventListener('click', () => {
    state.isPlaying = !state.isPlaying;
    if (state.isPlaying) {
        updateBPM();
        dom.toggleButton.textContent = 'Stop';
    } else {
        clearInterval(state.intervalId);
        dom.toggleButton.textContent = 'Start';
        dom.circles.forEach(circle => circle.style.backgroundColor = '#333');
        state.currentIndex = 0;
    }
});

dom.bpmSlider.addEventListener('input', updateBPM);
dom.errorBound.addEventListener('input', updateError);
dom.colorBound.addEventListener('input', updateColorBound);
dom.statsButton.addEventListener('click', showStats);

Object.keys(NOTE_TYPES).forEach(type => {
    const fb = dom.feedback[type];
    fb.checkbox.addEventListener('change', updateDisplays);
    fb.display.addEventListener('change', updateDisplays);
});

// Initialize