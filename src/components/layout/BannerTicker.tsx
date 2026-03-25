import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

interface BannerTickerProps {
  messages: string[];
}

export default function BannerTicker({ messages }: BannerTickerProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (messages.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % messages.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [messages.length]);

  if (!messages?.length) return null;

  const fullText = messages.join(" • ") + " • ";

  return (
    <>
      {/* MOBILE: Scrolling Marquee */}
      <div className="md:hidden relative w-full overflow-hidden whitespace-nowrap py-0.5">
        <motion.div
          animate={{ x: [0, "-50%"] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="flex w-max"
        >
          <span className="inline-block pr-12">{fullText}</span>
          <span className="inline-block pr-12">{fullText}</span>
        </motion.div>
        <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-green-neon to-transparent z-10" />
        <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-green-neon to-transparent z-10" />
      </div>

      {/* DESKTOP: Vertical Ticker (More elegant for a fixed bar) */}
      <div className="hidden md:flex relative h-5 items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.span
            key={index}
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -15, opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute inset-0 flex items-center justify-center whitespace-nowrap"
          >
            {messages[index]}
          </motion.span>
        </AnimatePresence>
      </div>
    </>
  );
}


