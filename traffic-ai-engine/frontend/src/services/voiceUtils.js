export const speakAlert = (text) => {
  if (!window.speechSynthesis) return;

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  utterance.pitch = 0.9; // Slightly deeper for a professional "AI" feel
  utterance.volume = 1.0;

  // Select a professional voice if available
  const voices = window.speechSynthesis.getVoices();
  const femaleVoice = voices.find(v => v.name.includes('Google UK English Female') || v.name.includes('Female'));
  if (femaleVoice) utterance.voice = femaleVoice;

  window.speechSynthesis.speak(utterance);
};

export const voiceManager = {
  active: true,
  mute: () => { voiceManager.active = false; },
  unmute: () => { voiceManager.active = true; },
  notify: (text) => {
    if (voiceManager.active) speakAlert(text);
  }
};
