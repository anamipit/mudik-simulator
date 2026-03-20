export const LANES = 4;
export const LANE_WIDTH = 80;
export const CAR_WIDTH = 50;
export const CAR_HEIGHT = 90;
export const GAME_SPEED_INITIAL = 3; // Slower start
export const MAX_SPEED = 20;
export const SPAWN_INTERVAL = 1200; // More frequent cars
export const BOOSTER_SPAWN_INTERVAL = 8000; // ms
export const QUESTION_SPAWN_INTERVAL = 15000; // ms

export const QUESTIONS = [
  {
    question: "Kapan nikah?",
    options: ["Tahun depan", "Nunggu hilal", "Doain aja", "Otw"],
    correct: 2
  },
  {
    question: "Kerja di mana sekarang?",
    options: ["Startup", "BUMN", "Freelance", "Wirausaha"],
    correct: 0
  },
  {
    question: "Gajinya berapa?",
    options: ["Cukup buat makan", "Ada deh", "Rahasia", "Diatas UMR"],
    correct: 1
  },
  {
    question: "Kok kurusan/gemukan?",
    options: ["Efek puasa", "Bahagia", "Lagi diet", "Bawaan orok"],
    correct: 1
  },
  {
    question: "Bawa oleh-oleh apa?",
    options: ["Bawa badan", "Ada di mobil", "Lupa beli", "Kasih sayang"],
    correct: 1
  }
];
