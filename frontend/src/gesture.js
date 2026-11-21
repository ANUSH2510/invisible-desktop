import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm';
const MODEL_URL =
    'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const HOLD_MS = 1000;      // palm must be held this long
const COOLDOWN_MS = 1500;  // minimum gap between triggers

export async function startPalmDetection({ video, onPalm, onStatus }) {
    const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
    });
    video.srcObject = stream;
    await video.play();

    const vision = await FilesetResolver.forVisionTasks(WASM_URL);
    const landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numHands: 1,
    });

    let palmSince = null;   // when the current palm hold started
    let lastTrigger = 0;
    let armed = true;       // must drop the palm before triggering again
    let frame = 0;
    let lastState = '';

    function report(state) {
        if (state !== lastState) {
            lastState = state;
            onStatus(state);
        }
    }

    function loop() {
        frame++;
        // Process every 2nd frame to save battery
        if (frame % 2 === 0 && video.readyState >= 2) {
            const now = performance.now();
            const result = landmarker.detectForVideo(video, now);
            const hand = result.landmarks?.[0];

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
        requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
}

// Fingertip above its middle joint = finger extended
function isOpenPalm(lm) {
    return [[8, 6], [12, 10], [16, 14], [20, 18]].every(
        ([tip, pip]) => lm[tip].y < lm[pip].y
    );
}