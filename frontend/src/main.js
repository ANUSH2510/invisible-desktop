import './style.css';

const API_BASE = 'http://localhost:8080';
let player;
let playerReady = false;

function setStatus(text) {
    document.getElementById('status').textContent = text;
}

// Load YouTube's player script and wait until it's ready
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
                setStatus('Ready: search something');
            },
            onError: (e) => setStatus(`Can't play this video (code ${e.data}). Try another search.`),
        },
    });
}

// The one function voice and gestures will reuse later
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

document.getElementById('start-btn').addEventListener('click', async () => {
    document.getElementById('start-screen').hidden = true;
    document.getElementById('app').hidden = false;
    setStatus('Loading player…');
    await loadYouTubeApi();
    createPlayer();
});

document.getElementById('search-form').addEventListener('submit', (e) => {
    e.preventDefault();
    playQuery(document.getElementById('search-input').value);
});
