'use client';

import React, { useState, useEffect } from 'react';
import { XIcon, ClockIcon, PlayIcon, PauseIcon, StopIcon, PackageIcon, HourglassIcon, HourglassHighIcon, HourglassLowIcon, HourglassMediumIcon, PlusIcon, MinusIcon, InfoIcon, FlowerLotusIcon, GithubLogoIcon, TwitterLogoIcon, RocketIcon } from '@phosphor-icons/react';
import { motion } from "motion/react";
import { useRef } from "react";
import { db } from "../../lib/db";
import { id } from "@instantdb/react";
import { BLOCK_TYPES, BlockTypeId } from "../constants/blocks";
import PackOpeningModal from "./PackOpeningModal";
import { useAuth } from '../contexts/auth-context';

interface DockProps {
  isOpen: boolean;
  onClose?: () => void;
  selectedBlockType?: string | null;
  onSelectBlockType?: (type: string | null) => void;
  browserSessionId?: string;
}

interface Session {
  id: string;
  sessionId?: string;
  createdAt: number;
  timeInSeconds: number;
  paused?: boolean;
  completedAt?: string | number;
  rewardsClaimedAt?: string | number;
}

interface Block {
  id: string;
  x?: number;
  y?: number;
  z?: number;
  type: string;
  sessionId?: string;
}

// Get or create a browser session ID
const getBrowserSessionId = () => {
  const STORAGE_KEY = 'growdoro_session_id';
  let sessionId = localStorage.getItem(STORAGE_KEY);
  
  if (!sessionId) {
    sessionId = id();
    localStorage.setItem(STORAGE_KEY, sessionId);
  }
  
  return sessionId;
};

// Get random block types for rewards (ensuring at least one plant)
const getRandomBlockTypes = (count: number): string[] => {
  const allBlockIds = Object.keys(BLOCK_TYPES);
  const plantIds = allBlockIds.filter(id => BLOCK_TYPES[id as BlockTypeId].category === 'plant');
  const selected: string[] = [];
  
  // Rarity weights (must sum to 100)
  const rarityWeights = {
    common: 60,
    uncommon: 30,
    rare: 8,
    legendary: 2
  };
  
  // Get a random block based on rarity weights
  const getWeightedRandomBlock = (): string => {
    const random = Math.random() * 100;
    let cumulativeWeight = 0;
    
    for (const [rarity, weight] of Object.entries(rarityWeights)) {
      cumulativeWeight += weight;
      if (random < cumulativeWeight) {
        // Get all blocks of this rarity
        const blocksOfRarity = allBlockIds.filter(
          id => BLOCK_TYPES[id as BlockTypeId].rarity === rarity
        );
        if (blocksOfRarity.length > 0) {
          return blocksOfRarity[Math.floor(Math.random() * blocksOfRarity.length)];
        }
      }
    }
    
    // Fallback to any random block
    return allBlockIds[Math.floor(Math.random() * allBlockIds.length)];
  };
  
  // Ensure at least one plant
  if (plantIds.length > 0 && count > 0) {
    const randomPlantIndex = Math.floor(Math.random() * plantIds.length);
    selected.push(plantIds[randomPlantIndex]);
  }
  
  // Fill the rest with weighted random blocks
  for (let i = selected.length; i < count; i++) {
    selected.push(getWeightedRandomBlock());
  }
  
  // Shuffle the array to randomize plant position
  for (let i = selected.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [selected[i], selected[j]] = [selected[j], selected[i]];
  }
  
  return selected;
};

export default function Dock({ isOpen, onClose, selectedBlockType, onSelectBlockType, browserSessionId: propSessionId }: DockProps) {
    const mainSlideoverRef = useRef<HTMLDivElement>(null);
    const { user, profile, sessionId } = useAuth();
    const effectiveSessionId = user?.id || sessionId || propSessionId;
  const [timerMinutes, setTimerMinutes] = useState(25);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [browserSessionId, setBrowserSessionId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'timer' | 'blocks'>('timer');
  const [claimingReward, setClaimingReward] = useState(false);
  const [packOpeningRewards, setPackOpeningRewards] = useState<string[]>([]);
  const [showPackOpening, setShowPackOpening] = useState(false);
  
  // Get browser session ID on mount
  useEffect(() => {
    setBrowserSessionId(getBrowserSessionId());
  }, []);
  
  // Query sessions and blocks for this browser session
  const { data, isLoading } = db.useQuery(effectiveSessionId ? {
    sessions: {
      $: {
        where: { sessionId: effectiveSessionId }
      }
    },
    blocks: {
      $: {
        where: user ? {
          'user.id': user.id,
          x: { $isNull: true } // Only unplaced blocks
        } : {
          sessionId: effectiveSessionId,
          x: { $isNull: true } // Only unplaced blocks
        }
      }
    }
  } : null);

  const sessions = data?.sessions || [];
  const unplacedBlocks = data?.blocks || [];

  // Group blocks by type
  const blockInventory = unplacedBlocks.reduce((acc, block) => {
    if (!acc[block.type]) {
      acc[block.type] = 0;
    }
    acc[block.type]++;
    return acc;
  }, {} as Record<string, number>);

  // Load the latest active timer on mount or when sessions change
  useEffect(() => {
    if (!sessions.length || activeSession) return;

    // Find the latest session that's not completed and not paused
    const latestActive = sessions
      .filter(s => !s.completedAt && !s.paused)
      .sort((a, b) => b.createdAt - a.createdAt)[0];

    if (latestActive) {
      // Calculate remaining time based on when it was created
      const elapsed = Math.floor((Date.now() - latestActive.createdAt) / 1000);
      const remaining = Math.max(0, latestActive.timeInSeconds - elapsed);
      
      if (remaining > 0) {
        setActiveSession(latestActive);
        setRemainingTime(remaining);
        setIsPaused(false);
      } else {
        // Timer has expired while the page was closed, mark it as completed
        db.transact(
          db.tx.sessions[latestActive.id].update({
            completedAt: Date.now()
          })
        );
      }
    }
  }, [sessions, activeSession]);

  // Timer effect
  useEffect(() => {
    if (!activeSession || isPaused || activeSession.completedAt) return;

    const interval = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          // Complete the session
          db.transact(
            db.tx.sessions[activeSession.id].update({
              completedAt: Date.now()
            })
          );
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession, isPaused]);

  const startTimer = async () => {
    // Check if authenticated user has a profile
    if (user && !profile) {
      alert('Please complete your profile setup first!');
      return;
    }
    
    const newSessionId = id();
    const newSession = {
      sessionId: effectiveSessionId,
      createdAt: Date.now(),
      timeInSeconds: timerMinutes * 60,
      paused: false
    };

    await db.transact(
      user 
        ? db.tx.sessions[newSessionId].update(newSession).link({ user: user.id })
        : db.tx.sessions[newSessionId].update(newSession)
    );

    const createdSession = {
      ...newSession,
      id: newSessionId
    } as Session;

    setActiveSession(createdSession);
    setRemainingTime(timerMinutes * 60);
    setIsPaused(false);
  };

  const pauseTimer = () => {
    if (!activeSession) return;
    
    setIsPaused(!isPaused);
    db.transact(
      db.tx.sessions[activeSession.id].update({
        paused: !isPaused
      })
    );
  };

  const cancelTimer = () => {
    setActiveSession(null);
    setRemainingTime(0);
    setIsPaused(false);
  };

  const claimReward = async (session: Session) => {
    if (session.rewardsClaimedAt || !session.completedAt) return;
    
    setClaimingReward(true);
    
    try {
      // Determine pack size based on session duration
      let packSize = 3; // Default for < 30 mins
      const minutes = Math.floor(session.timeInSeconds / 60);
      
      if (minutes >= 60) {
        packSize = 6; // 1 hour or more
      } else if (minutes >= 30) {
        packSize = 3; // Still 3 for 30-59 minutes
      }
      
      // Get random block types
      const rewardBlocks = getRandomBlockTypes(packSize);
      
      // Show pack opening animation
      setPackOpeningRewards(rewardBlocks);
      setShowPackOpening(true);
      
      // Create the blocks with user association if authenticated
      const blockTransactions = rewardBlocks.map((blockType) => {
        const blockId = id();
        const blockData = {
          type: blockType,
          sessionId: effectiveSessionId
        };
        
        return user
          ? db.tx.blocks[blockId].update(blockData).link({ user: user.id })
          : db.tx.blocks[blockId].update(blockData);
      });
      
      // Mark rewards as claimed
      await db.transact([
        db.tx.sessions[session.id].update({
          rewardsClaimedAt: Date.now()
        }),
        ...blockTransactions
      ]);
      
      // If this was the active session, clear it
      if (activeSession?.id === session.id) {
        setActiveSession(null);
      }
    } finally {
      setClaimingReward(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatSessionTime = (session: Session) => {
    const mins = Math.floor(session.timeInSeconds / 60);
    return `${mins} min`;
  };

  return (
    <>
      <motion.div
          initial={{ y: '100%' }}
          animate={{ y: isOpen ? 0 : '100%' }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          ref={mainSlideoverRef}
          className={`fixed bottom-2 left-0 right-0 h-[600px] bg-white rounded-t-2xl strong-shadow z-50 max-w-xl mx-auto`}
          onClick={(e) => e.stopPropagation()}
          tabIndex={-1}
      >
        <div className="h-full flex flex-col">
          {/* Drag Handle */}
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-12 h-1 bg-gray-300 rounded-full" />
          </div>
          
          <div className="px-6 pb-6 flex-1 overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-md font-semibold flex items-center gap-2">
                <ClockIcon size={20} weight="fill" />
                Garden Timer
              </h1>
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Close dock"
                >
                  <XIcon size={16} weight="bold" className="text-gray-800" />
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200 mb-4">
              <button
                onClick={() => setActiveTab('timer')}
                className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'timer' 
                    ? 'border-green-600 text-green-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Timer
              </button>
              <button
                onClick={() => setActiveTab('blocks')}
                className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-1 ${
                  activeTab === 'blocks' 
                    ? 'border-green-600 text-green-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Blocks
                {Object.keys(blockInventory).length > 0 && (
                  <span className="bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded-full">
                    {Object.values(blockInventory).reduce((a, b) => a + b, 0)}
                  </span>
                )}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {activeTab === 'timer' ? (
                <>
                  {/* Timer Section */}
                  <div className="bg-gray-50 rounded-lg p-4 space-y-4 mb-4">
                    {!activeSession ? (
                      <>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            max="60"
                            value={timerMinutes}
                            onChange={(e) => setTimerMinutes(parseInt(e.target.value) || 25)}
                            className="w-20 px-3 py-2 border border-gray-300 rounded-md text-center"
                          />
                          <span className="text-sm text-gray-600">minutes</span>
                        </div>
                        <button
                          onClick={startTimer}
                          className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                          disabled={!effectiveSessionId}
                        >
                          <PlayIcon size={16} weight="fill" />
                          Start Timer
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="text-center">
                          <div className="text-3xl font-mono font-bold text-gray-800">
                            {formatTime(remainingTime)}
                          </div>
                          {activeSession.completedAt && !activeSession.rewardsClaimedAt && (
                            <button
                              onClick={() => claimReward(activeSession)}
                              disabled={claimingReward}
                              className="mt-4 bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors flex items-center justify-center gap-2 mx-auto"
                            >
                              <PackageIcon size={16} weight="fill" />
                              {claimingReward ? 'Claiming...' : 'Claim Reward (3 Seeds)'}
                            </button>
                          )}
                          {activeSession.rewardsClaimedAt && (
                            <div className="text-sm text-green-600 mt-2 flex items-center justify-center gap-1">
                              <InfoIcon size={16} weight="bold" />
                              Rewards Claimed!
                            </div>
                          )}
                        </div>
                        {!activeSession.completedAt && (
                          <div className="flex gap-2">
                            <button
                              onClick={pauseTimer}
                              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                              disabled={!!activeSession.completedAt}
                            >
                              {isPaused ? (
                                <>
                                  <PlayIcon size={16} weight="fill" />
                                  Resume
                                </>
                              ) : (
                                <>
                                  <PauseIcon size={16} weight="fill" />
                                  Pause
                                </>
                              )}
                            </button>
                            <button
                              onClick={cancelTimer}
                              className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Sessions List */}
                  <div>
                    <h2 className="text-sm font-semibold text-gray-700 mb-2">Your Sessions</h2>
                    {isLoading ? (
                      <div className="text-sm text-gray-500">Loading sessions...</div>
                    ) : sessions.length === 0 ? (
                      <div className="text-sm text-gray-500">No sessions yet. Start your first timer!</div>
                    ) : (
                      <div className="space-y-2">
                        {sessions
                          .sort((a, b) => b.createdAt - a.createdAt)
                          .slice(0, 10)
                          .map((session) => (
                          <div
                            key={session.id}
                            className="bg-gray-50 rounded-lg p-3 text-sm"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium text-gray-800">
                                  {formatSessionTime(session)}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {new Date(session.createdAt).toLocaleString()}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                {session.completedAt && !session.rewardsClaimedAt && (
                                  <button
                                    onClick={() => claimReward(session)}
                                    disabled={claimingReward}
                                    className="bg-yellow-500 text-white px-2 py-1 rounded text-xs hover:bg-yellow-600 transition-colors"
                                  >
                                    Claim
                                  </button>
                                )}
                                {session.rewardsClaimedAt && (
                                  <PackageIcon size={14} weight="fill" className="text-yellow-600" />
                                )}
                                {session.completedAt && (
                                  <InfoIcon size={14} weight="bold" className="text-green-600" />
                                )}
                                {session.paused && !session.completedAt && (
                                  <PauseIcon size={14} weight="fill" className="text-orange-600" />
                                )}
                                {activeSession?.id === session.id && !session.completedAt && (
                                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Blocks Inventory Tab */
                <div>
                  <h2 className="text-sm font-semibold text-gray-700 mb-2">Your Seeds</h2>
                  {Object.keys(blockInventory).length === 0 ? (
                    <div className="text-sm text-gray-500 text-center py-8">
                      <FlowerLotusIcon size={24} className="mx-auto mb-2 text-gray-400" />
                      <p>No seeds yet!</p>
                      <p className="text-xs mt-1">Complete timers to earn seed packs</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {Object.entries(blockInventory).map(([type, count]) => {
                        const blockType = BLOCK_TYPES[type as BlockTypeId];
                        if (!blockType) return null;
                        
                        return (
                          <div
                            key={type}
                            className="bg-gray-50 rounded-lg p-3 text-center hover:bg-gray-100 transition-colors cursor-pointer"
                            onClick={() => {
                              if (onSelectBlockType) {
                                onSelectBlockType(type);
                                onClose?.();
                              }
                            }}
                          >
                            <div className="relative">
                              <img
                                src={blockType.imagePath}
                                alt={blockType.name}
                                className="w-12 h-12 mx-auto mb-2 pixelated"
                              />
                              <span className="absolute -top-1 -right-1 bg-green-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                                {count}
                              </span>
                            </div>
                            <div className="text-xs font-medium text-gray-700">
                              {blockType.name}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* Pack Opening Modal */}
      <PackOpeningModal
        isOpen={showPackOpening}
        rewards={packOpeningRewards}
        onClose={() => setShowPackOpening(false)}
      />
    </>
  );
}