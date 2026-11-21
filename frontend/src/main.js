import './style.css';
import { voiceSupported, listenOnce } from './voice.js';
import { startPalmDetection } from './gesture.js';

const API_BASE = 'http://localhost:8080';
let player;
let playerReady = false;

function setStatus(text) {
    document.getElementById('status').textContent = text;
}

function loadYouTubeApi() {
    return new Promise((resolve) => {
        window.onYouTubeIframeAPIReady = resolve;
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
    });
}

function createPlayer() {
    player = new YT.Player('player', {
        width: '100%',
        height: '100%',
        playerVars: { autoplay: 1, playsinline: 1 },
        events: {
            onReady: () => {
                playerReady = true;
                setStatus('Ready: search, tap 🎤, or show your palm ✋');
            },
            onError: (e) => setStatus(`Can't play this video (code ${e.data}). Try another search.`),
        },
    });
}

async function playQuery(query) {
    if (!query.trim()) return;
    if (!playerReady) {
        setStatus('Player still loading…');
        return;
    }

    setStatus(`Searching "${query}"…`);
    try {
        const res = await fetch(
            `${API_BASE}/api/youtube/search?q=${encodeURIComponent(query)}&limit=5`
        );

        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            setStatus(body.error ?? `Search failed (${res.status})`);
            return;
        }

        const results = await res.json();
        if (results.length === 0) {
            setStatus(`No results for "${query}"`);
            return;
        }

        player.loadVideoById(results[0].videoId);
        setStatus(`Playing: ${results[0].title}`);
    } catch (err) {
        setStatus('Cannot reach the backend. Is it running?');
    }
}

function togglePlayPause() {
    if (!playerReady) return;
    if (player.getPlayerState() === YT.PlayerState.PLAYING) {
        player.pauseVideo();
        setStatus('Paused ✋');
    } else {
        player.playVideo();
        setStatus('Resumed ✋');
    }
}

function handleCommand(text) {
    const cmd = text.toLowerCase().trim().replace(/[.!?]$/, '');

    if (cmd.startsWith('play ')) {
        playQuery(cmd.slice(5));
    } else if (cmd === 'pause' || cmd === 'stop') {
        player.pauseVideo();
        setStatus('Paused');
    } else if (cmd === 'resume' || cmd === 'play') {
        player.playVideo();
        setStatus('Resumed');
    } else {
        setStatus(`Heard "${text}". Try: play <something>`);
    }
}

const VOICE_ERRORS = {
    'no-speech': "Didn't hear anything. Try again.",
    'not-allowed': 'Microphone is blocked. Allow it in the browser.',
    'network': "Speech service can't be reached. Check internet.",
};

function startVoice() {
    const micBtn = document.getElementById('mic-btn');
    micBtn.classList.add('listening');
    setStatus('Listening…');

    listenOnce({
        onResult: (text) => handleCommand(text),
        onError: (err) => setStatus(VOICE_ERRORS[err] ?? `Voice error: ${err}`),
        onEnd: () => micBtn.classList.remove('listening'),
    });
}

async function startGestures() {
    const gestureStatus = document.getElementById('gesture-status');
    gestureStatus.textContent = 'Starting camera…';
    try {
        await startPalmDetection({
            video: document.getElementById('cam'),
            onPalm: togglePlayPause,
            onStatus: (s) => (gestureStatus.textContent = s),
        });
    } catch (err) {
        console.error(err);
        gestureStatus.textContent = 'Camera unavailable';
    }
}

document.getElementById('start-btn').addEventListener('click', async () => {
    document.getElementById('start-screen').hidden = true;
    document.getElementById('app').hidden = false;
    setStatus('Loading player…');
    await loadYouTubeApi();
    createPlayer();
    startGestures();
});

document.getElementById('search-form').addEventListener('submit', (e) => {
    e.preventDefault();
    playQuery(document.getElementById('search-input').value);
});

const micBtn = document.getElementById('mic-btn');
if (voiceSupported) {
    micBtn.addEventListener('click', startVoice);
} else {
    micBtn.disabled = true;
    micBtn.title = 'Voice not supported in this browser';
}