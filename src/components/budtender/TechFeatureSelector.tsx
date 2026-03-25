import { motion } from "motion/react";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { TECH_CHIPS } from "../../lib/budtenderHelpers";

interface TechFeatureSelectorProps {
  selectedFeatures: string[];
  onToggleFeature: (label: string) => void;
  onConfirm: () => void;
}

export default function TechFeatureSelector({
  selectedFeatures,
  onToggleFeature,
  onConfirm,
}: TechFeatureSelectorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 pt-2"
    >
      <div className="grid grid-cols-2 xs:grid-cols-3 gap-2">
        {TECH_CHIPS.map((chip) => {
          const isSelected = selectedFeatures.includes(chip.label);
          return (
            <button
              key={chip.label}
              onClick={() => onToggleFeature(chip.label)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                isSelected
                  ? "bg-emerald-500 border-emerald-500 text-black"
                  : "bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-500"
              }`}
            >
              <span>{chip.emoji}</span>
              <span className="truncate">{chip.label}</span>
              {isSelected && <CheckCircle2 className="w-3 h-3 ml-auto" />}
            </button>
          );
        })}
      </div>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onConfirm}
        className="w-full bg-zinc-100 hover:bg-white text-black font-black py-3 rounded-2xl text-sm transition-all shadow-lg flex items-center justify-center gap-2"
      >
        {selectedFeatures.length > 0 ? (
          <>
            Confirmer la sélection ({selectedFeatures.length}){" "}
            <ChevronRight className="w-4 h-4" />
          </>
        ) : (
          <>
            Passer cette étape <ChevronRight className="w-4 h-4" />
          </>
        )}
      </motion.button>
    </motion.div>
  );
}
