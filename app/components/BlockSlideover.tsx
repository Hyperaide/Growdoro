'use client';

import React, { useEffect, useRef } from 'react';
import { useFloating, autoUpdate, offset, flip, shift, useClick, useDismiss, useInteractions, FloatingOverlay, FloatingFocusManager } from '@floating-ui/react';
import { BlockTypeId, BLOCK_TYPES, RARITY_COLORS } from '../constants/blocks';
import { motion } from 'motion/react';
import { CrosshairSimpleIcon, DiamondIcon } from '@phosphor-icons/react';

interface Block {
  id: string;
  x: number;
  y: number;
  z: number;
  type: BlockTypeId;
  placedAt?: number;
  plantedAt?: number;
}

interface BlockSlideoverProps {
  block: Block | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateBlock: (blockId: string, updates: Partial<Block>) => void;
}

export default function BlockSlideover({ block, isOpen, onClose, onUpdateBlock }: BlockSlideoverProps) {
  const slideoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Focus the slideover when it opens
      slideoverRef.current?.focus();
    }
  }, [isOpen]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (slideoverRef.current && !slideoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      // Add a small delay to prevent immediate closure from the opening click
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);

      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen || !block) return null;

  const blockType = BLOCK_TYPES[block.type];

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: isOpen ? 0 : '100%' }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      ref={slideoverRef}
      className={`fixed right-2 bottom-2 top-2 w-80 h-max max-h-dvh overflow-y-auto bg-white rounded-xl strong-shadow z-50 p-2 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
      onClick={(e) => e.stopPropagation()}
      tabIndex={-1}
    >
      <div className="h-full flex flex-col gap-4">
          {/* <h2 className="font-gowun-batang text-xl font-bold text-gray-900">{blockType.name}</h2>
          {blockType.latinName && <p className="font-gowun-batang text-[13px] text-gray-500">{blockType.latinName}</p>} */}

          {/* <div className="flex flex-row gap-2 items-center mt-4">
            <p className="font-mono text-[11px] uppercase text-gray-500">Coordinates:</p>
            <p className="font-mono text-[11px] text-gray-500">{block.x}X {block.y}Y {block.z}Z</p>
          </div> */}

          <div className={`p-8 bg-gradient-to-b rounded-lg ${RARITY_COLORS[blockType.rarity].colorSubtle}`}><img src={blockType.imagePath} alt={blockType.name} className="w-full rounded-lg" /></div>

          <div className="flex flex-col px-2">
            <h2 className="font-gowun-batang text-2xl font-bold text-gray-900">{blockType.name}</h2>
            {blockType.latinName && <p className="font-gowun-batang text-[13px] text-gray-500">{blockType.latinName}</p>}
            {blockType.blurb && <p className="text-xs my-2 text-gray-400">{blockType.blurb}</p>}
          </div>

          <div className="flex flex-row px-2 gap-4">
            <div className="flex flex-row items-center gap-1">
              <DiamondIcon size={12} weight="fill" className={`${RARITY_COLORS[blockType.rarity].colorBold}`} />
              <p className="font-mono text-[11px] uppercase text-gray-500">{blockType.rarity}</p>
            </div>
            <div className="flex flex-row items-center gap-1">
              <CrosshairSimpleIcon size={12} className="text-gray-800" />
              <p className="font-mono text-[11px] uppercase text-gray-500">{block.x},{block.y},{block.z}</p>
            </div>
          </div>

          <div className="flex flex-row px-2">
            <div className="flex flex-col gap-2 w-full">
              <div className="flex flex-row gap-2 items-center justify-between">
                <p className="font-mono text-[11px] uppercase font-medium text-gray-500">Growth Time</p>
                <p className="font-mono text-[11px] uppercase text-gray-500">{blockType.growthTime} days</p>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full">
                {(() => {
                  // Calculate growth progress
                  let growthPercentage = 0;
                  if (blockType.category === 'plant' && blockType.growthTime && block.plantedAt) {
                    const daysSincePlanted = (Date.now() - block.plantedAt) / (1000 * 60 * 60 * 24);
                    growthPercentage = Math.min((daysSincePlanted / blockType.growthTime) * 100, 100);
                  }
                  return (
                    <div 
                      className="h-full bg-gradient-to-l from-green-500 to-gray-100 rounded-full" 
                      style={{ width: `${growthPercentage}%` }}
                    ></div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* <div className="flex flex-row px-2">
            <div className="flex flex-col gap-2 w-full">
              <div className="flex flex-row gap-2 items-center justify-between">
                <p className="font-mono text-[11px] uppercase font-medium text-gray-500">Decay Time</p>
                <p className="font-mono text-[11px] uppercase text-gray-500">{blockType.decayTime} days</p>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full">
                <div className="h-full bg-gradient-to-r to-red-500 from-gray-100 rounded-full ml-auto" style={{ width: `${blockType.growthTime}%` }}></div>
              </div>
            </div>
          </div> */}

          <div className="flex flex-row px-2">

          </div>
        </div>



      
      </motion.div>
  );
} 