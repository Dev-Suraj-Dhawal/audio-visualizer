const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const canvas = document.getElementById("visualizer");
const ctx = canvas.getContext("2d");
canvas.width = canvas.offsetWidth;
canvas.height = canvas.offsetHeight;

const upload = document.getElementById("audioUpload");
const playBtn = document.getElementById("play");
const pauseBtn = document.getElementById("pause");
const stopBtn = document.getElementById("stop");
const nextBtn = document.getElementById("next");
const loopBtn = document.getElementById("loop");
const shuffleBtn = document.getElementById("shuffle");
const volumeSlider = document.getElementById("volume");
const seekSlider = document.getElementById("seek");
const songInfo = document.getElementById("song-info");
const playlistEl = document.getElementById("playlist");
const modeButtons = document.querySelectorAll(".viz-mode");

let playlist = [];
let currentIndex = 0;
let loop = false;
let shuffle = false;
let mode = "bars";

const analyser = audioCtx.createAnalyser();
const audio = new Audio();
audio.crossOrigin = "anonymous";
const audioSrc = audioCtx.createMediaElementSource(audio);
const gainNode = audioCtx.createGain();

audioSrc.connect(analyser);
analyser.connect(gainNode);
gainNode.connect(audioCtx.destination);
analyser.fftSize = 256;
const dataArray = new Uint8Array(analyser.frequencyBinCount);

volumeSlider.oninput = () => gainNode.gain.value = volumeSlider.value;
seekSlider.oninput = () => audio.currentTime = (seekSlider.value / 100) * audio.duration;

audio.ontimeupdate = () => {
  seekSlider.value = (audio.currentTime / audio.duration) * 100 || 0;
  if (audio.duration) {
    songInfo.innerText = `${playlist[currentIndex]?.name || ''} — ${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
  }
};

audio.onended = () => {
  if (loop) return playTrack();
  currentIndex = shuffle ? Math.floor(Math.random() * playlist.length) : (currentIndex + 1) % playlist.length;
  playTrack();
};

function formatTime(t) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s < 10 ? '0' + s : s}`;
}

function drawVisualizer() {
  requestAnimationFrame(drawVisualizer);
  analyser.getByteFrequencyData(dataArray);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const w = canvas.width, h = canvas.height;
  const len = dataArray.length;

  // 🔥 Calculate average volume
  const avg = dataArray.reduce((a, b) => a + b, 0) / len;
  const intensity = Math.min(1, avg / 128); // Normalize

  // 💡 Apply beat-reactive shadow to visualizer container
  const glow = Math.floor(intensity * 60) + 20;
  canvas.style.boxShadow = `0 0 ${glow}px rgba(0,255,255,${intensity})`;

  if (mode === "bars") {
    const barWidth = w / len;
    dataArray.forEach((v, i) => {
      const x = i * barWidth;
      const barHeight = v;
      ctx.fillStyle = `hsl(${i / len * 360}, 100%, 50%)`;
      ctx.fillRect(x, h - barHeight, barWidth, barHeight);
    });
  } else if (mode === "circle") {
    const cx = w / 2, cy = h / 2, radius = 100;
    dataArray.forEach((v, i) => {
      const angle = (i / len) * 2 * Math.PI;
      const r = radius + v;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, 2 * Math.PI);
      ctx.fillStyle = `hsl(${i / len * 360}, 100%, 60%)`;
      ctx.fill();
    });
  } else if (mode === "wave") {
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    for (let i = 0; i < len; i++) {
      const y = h / 2 + dataArray[i] - 128;
      ctx.lineTo(i * (w / len), y);
    }
    ctx.strokeStyle = "#00ffea";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function playTrack() {
  if (!playlist[currentIndex]) return;
  audio.src = URL.createObjectURL(playlist[currentIndex]);
  audio.play();
  updatePlaylist();
}

function updatePlaylist() {
  playlistEl.innerHTML = "";
  playlist.forEach((track, index) => {
    const item = document.createElement("div");
    item.textContent = track.name;
    if (index === currentIndex) item.classList.add("active");
    item.onclick = () => { currentIndex = index; playTrack(); };
    playlistEl.appendChild(item);
  });
}

upload.onchange = e => {
  const files = [...e.target.files];
  playlist.push(...files);
  if (audio.paused) playTrack();
  updatePlaylist();
};

playBtn.onclick = () => { audioCtx.resume(); audio.play(); };
pauseBtn.onclick = () => audio.pause();
stopBtn.onclick = () => { audio.pause(); audio.currentTime = 0; };
nextBtn.onclick = () => {
  currentIndex = shuffle ? Math.floor(Math.random() * playlist.length) : (currentIndex + 1) % playlist.length;
  playTrack();
};

loopBtn.onclick = () => {
  loop = !loop;
  loopBtn.classList.toggle("active-toggle", loop);
};
shuffleBtn.onclick = () => {
  shuffle = !shuffle;
  shuffleBtn.classList.toggle("active-toggle", shuffle);
};

modeButtons.forEach(btn => {
  btn.onclick = () => {
    mode = btn.dataset.mode;
    modeButtons.forEach(b => b.classList.remove("active-toggle"));
    btn.classList.add("active-toggle");
  };
});

drawVisualizer();
