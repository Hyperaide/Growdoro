import { PackageIcon } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect } from "react";
import { BLOCK_TYPES, BlockTypeId } from "../constants/blocks";

interface PackOpeningModalProps {
  isOpen: boolean;
  rewards: string[];
  onClose: () => void;
}

export default function PackOpeningModal({ isOpen, rewards, onClose }: PackOpeningModalProps) {
  const [revealedCards, setRevealedCards] = useState<number[]>([]);
  
  useEffect(() => {
    if (isOpen) {
      setRevealedCards([]);
      // Reveal cards one by one
      rewards.forEach((_, index) => {
        setTimeout(() => {
          setRevealedCards(prev => [...prev, index]);
        }, 500 + index * 300);
      });
    }
  }, [isOpen, rewards]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", damping: 15 }}
            className="bg-white rounded-xl p-8 max-w-2xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-center mb-2">Pack Opening!</h2>
            <p className="text-gray-600 text-center mb-8">You earned 3 new seeds!</p>
            
            <div className="grid grid-cols-3 gap-6 mb-8">
              {rewards.map((blockType, index) => {
                const block = BLOCK_TYPES[blockType as BlockTypeId];
                const isRevealed = revealedCards.includes(index);
                
                return (
                  <motion.div
                    key={index}
                    initial={{ rotateY: 180 }}
                    animate={{ rotateY: isRevealed ? 0 : 180 }}
                    transition={{ duration: 0.6, delay: index * 0.3 }}
                    className="relative aspect-[3/4] preserve-3d"
                  >
                    {/* Card Back */}
                    <div className="absolute inset-0 backface-hidden rotate-y-180">
                      <div className="w-full h-full bg-gradient-to-br from-green-400 to-green-600 rounded-lg shadow-lg flex items-center justify-center">
                        <PackageIcon size={48} weight="fill" className="text-white/50" />
                      </div>
                    </div>
                    
                    {/* Card Front */}
                    <div className="absolute inset-0 backface-hidden">
                      <motion.div
                        initial={{ scale: 1 }}
                        animate={isRevealed ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className="w-full h-full bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-lg border-2 border-green-300 p-4 flex flex-col items-center justify-center"
                      >
                        {block && (
                          <>
                            <motion.img
                              initial={{ scale: 0 }}
                              animate={isRevealed ? { scale: 1 } : { scale: 0 }}
                              transition={{ delay: 0.3, type: "spring", damping: 10 }}
                              src={block.imagePath}
                              alt={block.name}
                              className="w-24 h-24 pixelated mb-4"
                            />
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={isRevealed ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                              transition={{ delay: 0.5 }}
                              className="text-center"
                            >
                              <h3 className="font-bold text-lg text-gray-800">{block.name}</h3>
                              <p className="text-sm text-gray-600 capitalize">{block.category}</p>
                            </motion.div>
                          </>
                        )}
                      </motion.div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: revealedCards.length === rewards.length ? 1 : 0 }}
              transition={{ delay: 0.5 }}
              onClick={onClose}
              className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
              disabled={revealedCards.length !== rewards.length}
            >
              Collect Seeds
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 