// ============================================================================
// BEAT SEQUENCER - Refactored Architecture
// ============================================================================

// Config: Note types and their timing subdivisions
const NOTE_TYPES = {
    whole: { label: 'Whole', interval: 4 },
    quarter: { label: 'Quarter', interval: 1 },
    half: { label: 'Half', interval: 8 }
};

// Calibration offset (ms) — subtract from raw timing to correct for input latency
const CALIBRATION_OFFSET = 18;

// State
const state = {
    isPlaying: false,
    currentIndex: 0,
    intervalId: null,
    trackingActive: true,
    statsTimerId: null,
    sessionStart: Date.now(),
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
    history.push({
        diff,
        miss,
        time: Date.now(),
        calibratedDiff: diff - CALIBRATION_OFFSET
    });
    if (history.length > 100) history.shift();
}

function calculateDetailedStats(history) {
    if (history.length === 0) {
        return {
            count: 0,
            accuracy: 0,
            avgAbsDiff: 0,
            stdDev: 0,
            best: 0,
            worst: 0,
            misses: 0
        };
    }

    const absDiffs = history.map(item => Math.abs(item.calibratedDiff));
    const avgAbsDiff = absDiffs.reduce((sum, val) => sum + val, 0) / absDiffs.length;
    const misses = history.filter(item => item.miss).length;
    const accuracy = ((history.length - misses) / history.length) * 100;

    // Standard deviation
    const variance = absDiffs.reduce((sum, val) => sum + Math.pow(val - avgAbsDiff, 2), 0) / absDiffs.length;
    const stdDev = Math.sqrt(variance);

    // Best and worst (closest to 0)
    const best = Math.min(...absDiffs);
    const worst = Math.max(...absDiffs);

    return {
        count: history.length,
        accuracy: accuracy.toFixed(1),
        avgAbsDiff: avgAbsDiff.toFixed(1),
        stdDev: stdDev.toFixed(1),
        best: best.toFixed(1),
        worst: worst.toFixed(1),
        misses
    };
}

function formatStats(history) {
    if (history.length === 0) return 'none';
    const abs = history.map(item => Math.abs(item.diff));
    const avg = abs.reduce((sum, val) => sum + val, 0) / abs.length;
    const missCount = history.filter(item => item.miss).length;
    return `count ${history.length}, avg ${avg.toFixed(1)}ms, miss ${missCount}`;
}

function showStats() {
    const sessionDuration = Math.round((Date.now() - state.sessionStart) / 1000);
    const totalHits = Object.values(state.notes).reduce((sum, note) => sum + note.history.length, 0);
    const totalMisses = Object.values(state.notes).reduce((sum, note) => sum + note.history.filter(h => h.miss).length, 0);
    const overallAccuracy = totalHits > 0 ? ((totalHits - totalMisses) / totalHits * 100).toFixed(1) : 0;

    let statsHTML = `
        <div class="stats-header">
            <div class="session-info">
                <span class="session-time">Session: ${formatDuration(sessionDuration)}</span>
                <span class="overall-accuracy">Overall: ${overallAccuracy}% accuracy</span>
            </div>
            <div class="stats-actions">
                <button id="resetStats" class="reset-btn">Reset</button>
                <button id="exportStats" class="export-btn">Export</button>
            </div>
        </div>
        <div class="stats-grid">
    `;

    Object.keys(NOTE_TYPES).forEach(type => {
        const stats = calculateDetailedStats(state.notes[type].history);
        const noteType = NOTE_TYPES[type];

        statsHTML += `
            <div class="stat-card ${type}-card">
                <div class="card-header">
                    <h3>${noteType.label} Notes</h3>
                    <div class="accuracy-badge ${stats.accuracy >= 90 ? 'excellent' : stats.accuracy >= 75 ? 'good' : 'needs-work'}">
                        ${stats.accuracy}%
                    </div>
                </div>
                <div class="card-metrics">
                    <div class="metric">
                        <span class="metric-label">Hits</span>
                        <span class="metric-value">${stats.count - stats.misses}/${stats.count}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Avg Timing</span>
                        <span class="metric-value">${stats.avgAbsDiff}ms</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Consistency</span>
                        <span class="metric-value">±${stats.stdDev}ms</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Best</span>
                        <span class="metric-value">${stats.best}ms</span>
                    </div>
                </div>
                <div class="accuracy-bar">
                    <div class="accuracy-fill" style="width: ${stats.accuracy}%"></div>
                </div>
            </div>
        `;
    });

    statsHTML += `
        </div>
        <div class="stats-footer">
            <span id="statsTimer" class="countdown">Resume in 5s</span>
        </div>
    `;

    dom.statsText.innerHTML = statsHTML;
    dom.statsText.classList.add('detailed-stats');

    // Add event listeners for new buttons
    setTimeout(() => {
        const resetBtn = document.getElementById('resetStats');
        const exportBtn = document.getElementById('exportStats');

        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm('Reset all stats for this session?')) {
                    Object.keys(state.notes).forEach(type => state.notes[type].history = []);
                    state.sessionStart = Date.now();
                    showStats();
                }
            });
        }

        if (exportBtn) {
            exportBtn.addEventListener('click', exportStats);
        }
    }, 0);

    state.trackingActive = false;
    let countdown = 5;
    const timerElement = document.getElementById('statsTimer');

    state.statsTimerId = setInterval(() => {
        countdown--;
        if (timerElement) {
            timerElement.textContent = countdown > 0 ? `Resume in ${countdown}s` : 'Resuming...';
        }

        if (countdown <= 0) {
            clearInterval(state.statsTimerId);
            state.trackingActive = true;
            dom.statsText.innerHTML = '';
            dom.statsText.classList.remove('detailed-stats');
            if (timerElement) {
                timerElement.style.display = 'none';
            }
        }
    }, 1000);
}

function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function exportStats() {
    const data = {
        session: {
            start: state.sessionStart,
            duration: Date.now() - state.sessionStart,
            overallAccuracy: calculateOverallAccuracy()
        },
        notes: {}
    };

    Object.keys(NOTE_TYPES).forEach(type => {
        data.notes[type] = {
            label: NOTE_TYPES[type].label,
            stats: calculateDetailedStats(state.notes[type].history),
            history: state.notes[type].history
        };
    });

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `beat-sequencer-stats-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function calculateOverallAccuracy() {
    const totalHits = Object.values(state.notes).reduce((sum, note) => sum + note.history.length, 0);
    const totalMisses = Object.values(state.notes).reduce((sum, note) => sum + note.history.filter(h => h.miss).length, 0);
    return totalHits > 0 ? ((totalHits - totalMisses) / totalHits * 100).toFixed(1) : 0;
}

function updateFeedback(type, diff, forceMiss = false) {
    const fb = dom.feedback[type];
    const hitBound = parseInt(dom.errorBound.value);
    const colorBoundVal = parseInt(dom.colorBound.value);
    
    // Apply calibration offset to correct for input latency
    const calibratedDiff = diff - CALIBRATION_OFFSET;
    
    const sign = calibratedDiff < 0 ? 'early' : calibratedDiff > 0 ? 'late' : 'on time';
    const absSec = (Math.abs(calibratedDiff) / 1000).toFixed(3);
    const miss = forceMiss || Math.abs(diff) > hitBound; // Use raw diff for miss detection
    const diffMs = `${Math.round(calibratedDiff)}ms`;

    fb.diffText.textContent = `${diffMs} (${absSec}s ${sign})${miss ? ' - Miss' : ''}`;
    
    // Debug logging for timing analysis
    console.log(`[${type}] raw=${diff}ms | calibrated=${calibratedDiff}ms | miss=${miss}`);

    if (miss) {
        fb.bar.style.backgroundColor = 'red';
        recordStat(type, diff, true);
    } else {
        const normalized = Math.min(Math.abs(calibratedDiff), colorBoundVal) / colorBoundVal;
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