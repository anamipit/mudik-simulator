import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QUESTIONS } from '../constants';

interface MudikQuestionProps {
  questionIndex: number;
  onAnswer: (correct: boolean) => void;
}

export const MudikQuestion: React.FC<MudikQuestionProps> = ({ questionIndex, onAnswer }) => {
  const q = QUESTIONS[questionIndex];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border-4 border-emerald-500"
        >
          <div className="text-center mb-6">
            <span className="inline-block px-4 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-bold mb-2 uppercase tracking-wider">
              Pertanyaan Keluarga
            </span>
            <h2 className="text-2xl font-black text-slate-800 leading-tight">
              "{q.question}"
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {q.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => onAnswer(idx === q.correct)}
                className="w-full py-4 px-6 text-left rounded-2xl border-2 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all font-semibold text-slate-700 active:scale-95"
              >
                {option}
              </button>
            ))}
          </div>

          <p className="mt-6 text-center text-slate-400 text-xs italic">
            Jawab dengan bijak agar perjalanan lancar!
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
