import { AnimatePresence, motion } from 'motion/react';
import { Lock } from 'lucide-react';
import { POS_UNLOCK_PIN } from './utils';

interface AdminPOSUnlockModalProps {
  isLightTheme: boolean;
  showUnlockModal: boolean;
  unlockError: boolean;
  unlockPin: string;
  onClose: () => void;
  onUnlock: () => void;
  onUnlockPinChange: (value: string) => void;
  onUnlockErrorChange: (value: boolean) => void;
}

export function AdminPOSUnlockModal(props: AdminPOSUnlockModalProps) {
  const keypadValues: Array<number | 'C' | 'OK'> = [1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'OK'];

  const handleKeyPress = (value: number | 'C' | 'OK') => {
    props.onUnlockErrorChange(false);
    if (value === 'C') {
      props.onUnlockPinChange('');
      return;
    }
    if (value === 'OK') {
      if (props.unlockPin === POS_UNLOCK_PIN) {
        props.onUnlock();
      } else {
        props.onUnlockErrorChange(true);
        props.onUnlockPinChange('');
      }
      return;
    }
    if (props.unlockPin.length < 4) {
      props.onUnlockPinChange(`${props.unlockPin}${value}`);
    }
  };

  return (
    <AnimatePresence>
      {props.showUnlockModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className={`rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl p-8 text-center border transition-all ${props.isLightTheme ? 'bg-white border-emerald-100' : 'bg-zinc-900 border-zinc-800'}`}>
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border transition-all ${props.isLightTheme ? 'bg-red-50 border-red-100' : 'bg-red-600/10 border-red-600/20'}`}>
              <Lock className="w-8 h-8 text-red-500" />
            </div>
            <h2 className={`text-2xl font-black mb-2 uppercase tracking-tight transition-colors ${props.isLightTheme ? 'text-emerald-950' : 'text-white'}`}>Accès Prioritaire</h2>
            <p className={`text-sm mb-8 transition-colors ${props.isLightTheme ? 'text-emerald-600/60' : 'text-zinc-500'}`}>Entrez le code de déverrouillage pour réouvrir la session.</p>
            <div className="space-y-6">
              <div className="flex justify-center gap-3">
                {[0, 1, 2, 3].map((index) => (
                  <div key={index} className={`w-12 h-16 rounded-2xl border-2 flex items-center justify-center text-2xl font-black transition-all ${props.unlockError ? 'border-red-500 bg-red-500/10 text-red-500' : props.unlockPin.length > index ? 'border-green-500 bg-green-500/10 text-green-400' : props.isLightTheme ? 'border-emerald-100 bg-emerald-50 text-emerald-200' : 'border-zinc-800 bg-zinc-950 text-zinc-700'}`}>
                    {props.unlockPin.length > index ? '•' : ''}
                  </div>
                ))}
              </div>
              {props.unlockError && <p className="text-red-500 text-xs font-black uppercase tracking-widest animate-bounce">Code incorrect</p>}
              <div className="grid grid-cols-3 gap-3">
                {keypadValues.map((value) => (
                  <button key={value.toString()} onClick={() => handleKeyPress(value)} className={`h-14 rounded-xl font-black text-lg transition-all ${value === 'OK' ? (props.isLightTheme ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-green-500 text-black hover:bg-green-400') + ' shadow-lg' : value === 'C' ? (props.isLightTheme ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700') : (props.isLightTheme ? 'bg-emerald-50 text-emerald-950 hover:bg-emerald-100 border border-emerald-100' : 'bg-zinc-950 text-white hover:bg-zinc-800 border border-zinc-900')}`}>
                    {value}
                  </button>
                ))}
              </div>
              <button onClick={props.onClose} className={`text-xs font-black uppercase tracking-[0.2em] pt-4 transition-colors ${props.isLightTheme ? 'text-emerald-300 hover:text-emerald-600' : 'text-zinc-600 hover:text-white'}`}>
                Annuler
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
