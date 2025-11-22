import { PackageIcon } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect } from "react";
import { BLOCK_TYPES, BlockTypeId } from "../constants/blocks";
import BlockContent from "./BlockContent";
import confetti from "canvas-confetti";

interface Block {
  id: string;
  x: number;
  y: number;
  z: number;
  type: BlockTypeId;
  placedAt?: number;
}

interface PackOpeningModalProps {
  isOpen: boolean;
  rewards: string[];
  onClose: () => void;
}

export default function PackOpeningModal({
  isOpen,
  rewards,
  onClose,
}: PackOpeningModalProps) {
  const [revealedCards, setRevealedCards] = useState<number[]>([]);

  useEffect(() => {
    if (isOpen) {
      setRevealedCards([]);
      // Reveal cards one by one
      rewards.forEach((_, index) => {
        setTimeout(() => {
          setRevealedCards((prev) => [...prev, index]);
        }, index * 150); // Changed from 500 + index * 300 to match the animation delay
      });
    }
  }, [isOpen, rewards]);

  const handleCollectSeeds = () => {
    // Fire confetti from multiple angles
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
    });
    fire(0.2, {
      spread: 60,
    });
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 45,
    });

    // Close modal after a short delay
    setTimeout(() => {
      onClose();
    }, 500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-radial from-white dark:from-neutral-900 to-black/0 dark:to-neutral-900/0 z-[100] flex pt-20 justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", damping: 15 }}
            className="bg-transparent rounded-xl p-8 max-w-4xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* <h2 className="text-2xl font-bold text-center mb-2">Pack Opening!</h2>
            <p className="text-gray-600 text-center mb-8">You earned {rewards.length} new seed{rewards.length > 1 ? 's' : ''}!</p> */}

            <div
              className={`grid ${
                rewards.length <= 3
                  ? "grid-cols-3"
                  : rewards.length <= 5
                  ? "grid-cols-5"
                  : "grid-cols-5"
              } gap-4 mb-8 ${
                rewards.length > 5 ? "max-w-4xl mx-auto h-max" : ""
              }`}
            >
              {rewards.map((blockType, index) => {
                const block = BLOCK_TYPES[blockType as BlockTypeId];
                const isRevealed = revealedCards.includes(index);

                // Skip invalid block types
                if (!block) {
                  console.warn(`Invalid block type in rewards: ${blockType}`);
                  return null;
                }

                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 50 }}
                    animate={{
                      opacity: isRevealed ? 1 : 0,
                      y: isRevealed ? 0 : 50,
                    }}
                    transition={{
                      duration: 0.5,
                      delay: index * 0.15,
                      ease: "easeOut",
                    }}
                    className=""
                  >
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: isRevealed ? 1 : 0.8 }}
                      transition={{
                        duration: 0.3,
                        delay: index * 0.15 + 0.1,
                      }}
                      className="w-full h-full bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-2 flex flex-col items-center justify-center"
                    >
                      {block && (
                        <BlockContent
                          block={{
                            id: `reward-${index}`,
                            x: 0,
                            y: 0,
                            z: 0,
                            type: blockType as BlockTypeId,
                          }}
                          isCard={true}
                        />
                      )}
                    </motion.div>
                  </motion.div>
                );
              })}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{
                opacity: revealedCards.length === rewards.length ? 1 : 0,
              }}
              transition={{ delay: 0.5 }}
              onClick={handleCollectSeeds}
              className="w-max mx-auto text-xs font-medium font-mono uppercase bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
              // disabled={revealedCards.length !== rewards.length}
            >
              Collect Seeds
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
