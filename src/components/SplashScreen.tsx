import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSettingsStore } from '../store/settingsStore';

export default function SplashScreen() {
    const { settings } = useSettingsStore();

    const [isVisible, setIsVisible] = useState(() => {
        if (typeof window !== 'undefined') {
            return !localStorage.getItem('hasSeenSplash');
        }
        return true;
    });

    const handleHide = () => {
        setIsVisible(false);
        localStorage.setItem('hasSeenSplash', 'true');
    };

    useEffect(() => {
        if (!isVisible) return;
        const timer = setTimeout(handleHide, 5000);
        return () => clearTimeout(timer);
    }, [isVisible]);

    if (!settings.splash_enabled || !settings.splash_media_url) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1, ease: 'easeInOut' }}
                    className="fixed inset-0 z-[9999] bg-black flex items-center justify-center overflow-hidden"
                    onClick={handleHide}
                >
                    {settings.splash_media_type === 'image' ? (
                        <img
                            src={settings.splash_media_url}
                            alt="Splash"
                            className="max-w-[80%] max-h-[80%] w-auto h-auto object-contain"
                        />
                    ) : (
                        <video
                            autoPlay
                            muted
                            playsInline
                            onEnded={handleHide}
                            className="max-w-[80%] max-h-[80%] w-auto h-auto object-contain"
                        >
                            <source src={settings.splash_media_url} type="video/mp4" />
                            Votre navigateur ne supporte pas la vidéo.
                        </video>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
