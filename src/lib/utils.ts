import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function playBeepSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const audioCtx = new AudioContextClass();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = "sine";
    // 900Hz is a clean, crisp, short pleasant notification beep
    oscillator.frequency.setValueAtTime(900, audioCtx.currentTime);

    // Fade curve to prevent pops
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.02); // 20ms attack
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15); // 130ms decay

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.16);
  } catch (e) {
    console.warn("AudioContext failed to play beep:", e);
  }
}
