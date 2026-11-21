const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export const voiceSupported = Boolean(SpeechRecognition);

export function listenOnce({ onResult, onError, onEnd }) {
    const rec = new SpeechRecognition();
    rec.lang = 'en-IN';          // better accuracy for Indian English
    rec.interimResults = false;  // only give the final sentence
    rec.maxAlternatives = 1;

    rec.onresult = (e) => onResult(e.results[0][0].transcript);
    rec.onerror = (e) => onError(e.error);
    rec.onend = onEnd;

    rec.start();
}