/**
 * Payment Sound and Voice Announcement Utility
 * Plays an audio chime and speaks Vietnamese confirmation:
 * "Thanh toán thành công [X] đồng"
 */

export function playPaymentChime() {
  if (typeof window === "undefined") return;

  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // First bell tone (C5 -> G5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.1); // G5
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Second bell tone (C6)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(1046.5, now + 0.12); // C6
    gain2.gain.setValueAtTime(0.35, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.65);

    // Third sparkle tone (E6)
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = "sine";
    osc3.frequency.setValueAtTime(1318.51, now + 0.22); // E6
    gain3.gain.setValueAtTime(0.25, now + 0.22);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.22);
    osc3.stop(now + 0.85);
  } catch (err) {
    console.error("Audio chime error:", err);
  }
}

/**
 * Announces payment success with cash chime + Vietnamese voice speech
 * Example: "Thanh toán thành công 100.000 đồng"
 */
export function announcePaymentSuccess(amount: number) {
  if (typeof window === "undefined") return;

  // 1. Play chime immediately
  playPaymentChime();

  // 2. Speak Vietnamese voice announcement
  if ("speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();

      const rounded = Math.round(amount);
      const formattedAmount = rounded.toLocaleString("vi-VN");
      const speechText = `Thanh toán thành công ${formattedAmount} đồng`;

      const utterance = new SpeechSynthesisUtterance(speechText);
      utterance.lang = "vi-VN";
      utterance.rate = 1.0;
      utterance.pitch = 1.05;

      const voices = window.speechSynthesis.getVoices();
      const viVoice = voices.find(
        (v) => v.lang.toLowerCase().includes("vi") || v.lang.toLowerCase().includes("vn")
      );
      if (viVoice) {
        utterance.voice = viVoice;
      }

      // Small delay to let the initial chime sound crisp
      setTimeout(() => {
        try {
          window.speechSynthesis.speak(utterance);
        } catch (e) {
          console.warn("TTS speak failed:", e);
        }
      }, 250);
    } catch (e) {
      console.warn("TTS initialization failed:", e);
    }
  }
}
