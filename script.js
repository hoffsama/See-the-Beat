document.getElementById('toggleButton').addEventListener('click', function() {
    const circle = document.getElementById('circle');
    if (circle.style.backgroundColor === 'red') {
        circle.style.backgroundColor = 'green';
    } else {
        circle.style.backgroundColor = 'red';
    }
});