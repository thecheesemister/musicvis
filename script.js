const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth * 0.8;
canvas.height = 400;

// List of songs (add your songs here)
const songs = [
  { name: "Carousel", file: "Carousel.mp3" },
  { name: "Placeholder 2", file: "Song2.mp3" },
  { name: "Placeholder 3", file: "Song3.mp3" }
];

// Dynamically create buttons for each song
const songButtonsDiv = document.getElementById('songButtons');
songs.forEach(song => {
  const button = document.createElement('button');
  button.textContent = song.name;
  button.addEventListener('click', () => playSong(song.file));
  songButtonsDiv.appendChild(button);
});

// Play a selected song
function playSong(file) {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;

  fetch(file)
    .then(response => response.arrayBuffer())
    .then(buffer => audioContext.decodeAudioData(buffer))
    .then(audioBuffer => {
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(analyser);
      analyser.connect(audioContext.destination);
      source.start();

      visualize(analyser);
    })
    .catch(err => console.error('Error loading audio file:', err));
}

function visualize(analyser) {
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  function draw() {
    requestAnimationFrame(draw);
    analyser.getByteFrequencyData(dataArray);

    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const barWidth = (canvas.width / bufferLength) * 2.5;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const barHeight = dataArray[i];
      const r = barHeight + 25;
      const g = 50 + i * 2;
      const b = 150;

      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

      x += barWidth + 1;
    }
  }

  draw();
}
