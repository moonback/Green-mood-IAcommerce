import { motion } from "motion/react";
import { ChevronRight } from "lucide-react";

interface QuizOptionsProps {
  options: any[];
  stepId: string;
  selectedAnswer?: string;
  hasAnsweredNext: boolean;
  isDisabled: boolean;
  onAnswer: (opt: any, stepId: string) => void;
}

export default function QuizOptions({
  options,
  stepId,
  selectedAnswer,
  hasAnsweredNext,
  isDisabled,
  onAnswer,
}: QuizOptionsProps) {
  return (
    <div className="grid grid-cols-1 gap-2.5 mt-3">
      {options.map((opt) => {
        const isSelected = selectedAnswer === opt.value;

        return (
          <motion.button
            key={opt.value}
            whileHover={isDisabled ? {} : { x: 6, backgroundColor: "rgba(57,255,20,0.03)" }}
            disabled={isDisabled}
            onClick={() => onAnswer(opt, stepId)}
            className={`flex items-center gap-5 px-6 py-5 rounded-2xl border text-left transition-all relative overflow-hidden ${
              isSelected || hasAnsweredNext
                ? "bg-emerald-500/5 border-emerald-500/40 text-emerald-400 shadow-[0_0_30px_rgba(57,255,20,0.05)]"
                : "bg-zinc-900/40 border-white/5 hover:border-emerald-500/30 text-zinc-400 group"
            }`}
          >
            {/* Selection Glow */}
            {(isSelected || hasAnsweredNext) && (
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
            )}

            <span className="text-3xl filter drop-shadow-md group-hover:scale-110 transition-transform duration-300">
              {opt.emoji}
            </span>
            <div className="flex flex-col">
              <span className="text-sm sm:text-base font-bold tracking-tight">
                {opt.label}
              </span>
              <span className="text-[9px] font-mono text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest">
                Select_Parameter_{opt.value.toUpperCase()}
              </span>
            </div>
            <ChevronRight
              className={`w-5 h-5 ml-auto transition-transform ${
                isSelected || hasAnsweredNext
                  ? "text-emerald-400 rotate-90"
                  : "text-zinc-600 group-hover:text-emerald-400/50"
              }`}
            />
          </motion.button>
        );
      })}
    </div>
  );
}
