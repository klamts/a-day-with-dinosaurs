/**
 * Web Speech API English Phonics & Pronunciation Engine for Kids
 * Pronounces dinosaur names, vocabulary words, and encouragement in natural English.
 */

class DinosaurSpeechEngine {
  private isEnabled: boolean = true;
  private voice: SpeechSynthesisVoice | null = null;
  private isSpeaking: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.initVoice();
      window.speechSynthesis.onvoiceschanged = () => {
        this.initVoice();
      };
    }
  }

  private initVoice() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    // Prefer friendly English voices (US, GB, or natural)
    const englishVoice = voices.find(v => (v.lang === 'en-US' || v.lang === 'en-GB') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Alex'))) 
      || voices.find(v => v.lang.startsWith('en'))
      || voices[0];
    this.voice = englishVoice || null;
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (!enabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  public speak(text: string, rate: number = 0.9, pitch: number = 1.1) {
    if (!this.isEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel(); // Stop prior speech to avoid queue buildup
      const utterance = new SpeechSynthesisUtterance(text);
      if (this.voice) {
        utterance.voice = this.voice;
      }
      utterance.rate = rate; // Slightly slower for kids to hear clearly
      utterance.pitch = pitch; // Slightly cheerful pitch
      utterance.volume = 0.95;
      utterance.lang = 'en-US';

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('SpeechSynthesis error:', e);
    }
  }

  public pronounceDinosaur(name: string, phonetic?: string) {
    const text = `${name}!`;
    this.speak(text, 0.85, 1.1);
  }

  public speakVocab(word: string, explanation?: string) {
    const text = explanation ? `${word}. ${explanation}` : word;
    this.speak(text, 0.85, 1.05);
  }

  public speakCatch(dinoName: string, points: number) {
    const phrases = [
      `You caught a ${dinoName}! Plus ${points} points!`,
      `Awesome! ${dinoName}!`,
      `Great job! ${dinoName} captured!`
    ];
    const phrase = phrases[Math.floor(Math.random() * phrases.length)];
    this.speak(phrase, 0.95, 1.1);
  }

  public speakDinoHome(dinoName: string, points: number) {
    this.speak(`Secured in home corral! Plus ${points} points!`, 1.0, 1.15);
  }

  public speakSkill(skillType: string) {
    const skillNames: Record<string, string> = {
      tidal_wave: 'Tidal Torrent Wave!',
      net_trap: 'Net Trap!',
      speed_boost: 'Super Speed!',
      titan_strength: 'Titan Strength!',
      secret_tunnel: 'Secret Tunnel!',
      dino_call: 'Dinosaur Call!',
      earth_fissure: 'Earth Fissure!',
      stun_shockwave: 'Stun Shockwave!',
      tornado_gust: 'Tornado Gust!'
    };
    const announcement = skillNames[skillType] || 'Special Skill Activated!';
    this.speak(announcement, 1.05, 1.2);
  }
}

export const speechEngine = new DinosaurSpeechEngine();
