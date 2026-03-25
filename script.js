let isPlaying = false;
let currentIndex = 0;
let intervalId;

const circles = document.querySelectorAll('.circle');
const toggleButton = document.getElementById('toggleButton');
const bpmSlider = document.getElementById('bpmSlider');
const bpmValue = document.getElementById('bpmValue');

const myColor1 = #ffadae;
const myColor2 = #ffd7a6;
const myColor3 = #feffb7;
const myColor4 = #c9ffbf;

const colors = [myColor1, myColor2, myColor3, myColor4];

function updateBPM() {
    const bpm = bpmSlider.value;
    bpmValue.textContent = bpm;
    const interval = 60000 / bpm / 4; // 16th notes
    if (isPlaying) {
        clearInterval(intervalId);
        intervalId = setInterval(activateNext, interval);
    }
}

function activateNext() {
    circles.forEach(circle => {
        circle.style.backgroundColor = 'gray';
        circle.classList.remove('beat');
    });
    const section = Math.floor(currentIndex / 4);
    circles[currentIndex].style.backgroundColor = colors[section];
    if (currentIndex % 4 === 0) {
        circles[currentIndex].classList.add('beat');
    }
    currentIndex = (currentIndex + 1) % 16;
}

toggleButton.addEventListener('click', () => {
    isPlaying = !isPlaying;
    if (isPlaying) {
        updateBPM();
        toggleButton.textContent = 'Stop';
    } else {
        clearInterval(intervalId);
        toggleButton.textContent = 'Start';
        circles.forEach(circle => circle.style.backgroundColor = 'gray');
        currentIndex = 0;
    }
});

bpmSlider.addEventListener('input', updateBPM);