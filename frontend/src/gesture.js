import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm';
const MODEL_URL =
    'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const HOLD_MS = 1000;
const COOLDOWN_MS = 1500;

let landmarker = null;

// Load the model once, reuse it every time the camera turns on
async function getLandmarker() {
    if (!landmarker) {
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        landmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
            runningMode: 'VIDEO',
            numHands: 1,
        });
    }
    return landmarker;
}

export function createPalmDetector({ video, onPalm, onStatus }) {
    let stream = null;
    let rafId = null;
    let palmSince = null;
    let lastTrigger = 0;
    let armed = true;
    let frame = 0;
    let lastState = '';

    function report(state) {
        if (state !== lastState) {
            lastState = state;
            onStatus(state);
        }
    }

    async function start() {
        if (stream) return; // already running
        onStatus('Starting camera…');

        const lm = await getLandmarker();
        stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 },
            audio: false,
        });
        video.srcObject = stream;
        await video.play();

        palmSince = null;
        armed = true;
        lastState = '';

        const loop = () => {
            if (!stream) return; // stopped
            frame++;
            if (frame % 2 === 0 && video.readyState >= 2) {
                const now = performance.now();
                const hand = lm.detectForVideo(video, now).landmarks?.[0];

                if (hand && isOpenPalm(hand)) {
                    if (palmSince === null) palmSince = now;
                    const heldLongEnough = now - palmSince >= HOLD_MS;
                    const cooledDown = now - lastTrigger >= COOLDOWN_MS;

                    if (armed && heldLongEnough && cooledDown) {
                        lastTrigger = now;
                        armed = false;
                        onPalm();
                        report('✋ Triggered');
                    } else if (armed) {
                        report('✋ Hold…');
                    }
                } else {
                    palmSince = null;
                    armed = true;
                    report(hand ? '🖐 Hand seen' : 'No hand');
                }
            }
            rafId = requestAnimationFrame(loop);
        };
        rafId = requestAnimationFrame(loop);
    }

    function stop() {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
        if (stream) stream.getTracks().forEach((t) => t.stop()); // turns the camera hardware off
        stream = null;
        video.srcObject = null;
        lastState = '';
        onStatus('Camera off');
    }

    return { start, stop, isRunning: () => stream !== null };
}

function isOpenPalm(lm) {
    return [[8, 6], [12, 10], [16, 14], [20, 18]].every(
        ([tip, pip]) => lm[tip].y < lm[pip].y
    );
}