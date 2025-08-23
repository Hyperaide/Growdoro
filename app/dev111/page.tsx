'use client';

import React, { useState, useEffect } from 'react';
import { db } from '../../lib/db';
import { id } from '@instantdb/react';
import { BLOCK_TYPES, BlockTypeId } from '../constants/blocks';
import { FlaskIcon, PackageIcon, CubeIcon, TrashIcon, PlusIcon, SparkleIcon } from '@phosphor-icons/react';
import PackOpeningModal from '../components/PackOpeningModal';

export default function DevPage() {
  const [browserSessionId, setBrowserSessionId] = useState<string>('');
  const [blocks, setBlocks] = useState<any[]>([]);
  const [selectedBlockType, setSelectedBlockType] = useState<BlockTypeId>('dirt');
  const [blockQuantity, setBlockQuantity] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [showPackOpening, setShowPackOpening] = useState(false);
  const [packOpeningRewards, setPackOpeningRewards] = useState<string[]>([]);

  // Get browser session ID on mount
  useEffect(() => {
    const STORAGE_KEY = 'gardenspace_session_id';
    let sessionId = localStorage.getItem(STORAGE_KEY);
    
    if (!sessionId) {
      sessionId = id();
      localStorage.setItem(STORAGE_KEY, sessionId);
    }
    
    setBrowserSessionId(sessionId);
  }, []);

  // Load existing blocks
  useEffect(() => {
    if (!browserSessionId) return;

    const loadBlocks = async () => {
      const { data } = await db.queryOnce({
        blocks: {
          $: {
            where: {
              sessionId: browserSessionId
            }
          }
        }
      });

      if (data?.blocks) {
        setBlocks(data.blocks);
      }
    };

    loadBlocks();
  }, [browserSessionId]);

  // Create blocks
  const handleCreateBlocks = async () => {
    if (!browserSessionId || isCreating) return;
    
    setIsCreating(true);
    
    try {
      const transactions = [];
      
      for (let i = 0; i < blockQuantity; i++) {
        const blockId = id();
        transactions.push(
          db.tx.blocks[blockId].update({
            type: selectedBlockType,
            sessionId: browserSessionId,
            // Don't set x, y, z - these blocks will be in inventory
          })
        );
      }
      
      await db.transact(transactions);
      
      // Reload blocks
      const { data } = await db.queryOnce({
        blocks: {
          $: {
            where: {
              sessionId: browserSessionId
            }
          }
        }
      });
      
      if (data?.blocks) {
        setBlocks(data.blocks);
      }
      
      alert(`Created ${blockQuantity} ${selectedBlockType} block(s)!`);
    } catch (error) {
      console.error('Failed to create blocks:', error);
      alert('Failed to create blocks');
    } finally {
      setIsCreating(false);
    }
  };

  // Delete a block
  const handleDeleteBlock = async (blockId: string) => {
    try {
      await db.transact(db.tx.blocks[blockId].delete());
      setBlocks(blocks.filter(b => b.id !== blockId));
    } catch (error) {
      console.error('Failed to delete block:', error);
    }
  };

  // Clear all blocks for session
  const handleClearAllBlocks = async () => {
    if (!confirm('Are you sure you want to delete ALL blocks for this session?')) return;
    
    try {
      const transactions = blocks.map(block => 
        db.tx.blocks[block.id].delete()
      );
      
      await db.transact(transactions);
      setBlocks([]);
      alert('All blocks cleared!');
    } catch (error) {
      console.error('Failed to clear blocks:', error);
      alert('Failed to clear blocks');
    }
  };

  // Group blocks by type and placement status
  const groupedBlocks = blocks.reduce((acc, block) => {
    const key = `${block.type}-${block.x !== null ? 'placed' : 'inventory'}`;
    if (!acc[key]) {
      acc[key] = {
        type: block.type,
        isPlaced: block.x !== null,
        blocks: []
      };
    }
    acc[key].blocks.push(block);
    return acc;
  }, {} as Record<string, { type: string; isPlaced: boolean; blocks: any[] }>);

  const groupedBlocksArray = Object.values(groupedBlocks) as Array<{ type: string; isPlaced: boolean; blocks: any[] }>;

  // Get random block types for packs (ensuring at least one plant)
  const getRandomBlockTypes = (count: number): string[] => {
    const allBlockIds = Object.keys(BLOCK_TYPES);
    const plantIds = allBlockIds.filter(id => BLOCK_TYPES[id as BlockTypeId].category === 'plant');
    const rewards: string[] = [];
    
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
      rewards.push(plantIds[randomPlantIndex]);
    }
    
    // Fill the rest with weighted random blocks
    for (let i = rewards.length; i < count; i++) {
      rewards.push(getWeightedRandomBlock());
    }
    
    // Shuffle the array to randomize plant position
    for (let i = rewards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rewards[i], rewards[j]] = [rewards[j], rewards[i]];
    }
    
    return rewards;
  };

  // Open a pack
  const handleOpenPack = async (packSize: number = 3) => {
    if (!browserSessionId) return;
    
    try {
      // Get random block types
      const rewardBlocks = getRandomBlockTypes(packSize);
      
      // Show pack opening animation
      setPackOpeningRewards(rewardBlocks);
      setShowPackOpening(true);
      
      // Create the blocks
      const blockTransactions = rewardBlocks.map((blockType) => 
        db.tx.blocks[id()].update({
          type: blockType,
          sessionId: browserSessionId
        })
      );
      
      await db.transact(blockTransactions);
      
      // Reload blocks
      const { data } = await db.queryOnce({
        blocks: {
          $: {
            where: {
              sessionId: browserSessionId
            }
          }
        }
      });
      
      if (data?.blocks) {
        setBlocks(data.blocks);
      }
    } catch (error) {
      console.error('Failed to open pack:', error);
      alert('Failed to open pack');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FlaskIcon size={32} weight="fill" className="text-purple-600" />
            Dev Mode
          </h1>
          <p className="text-gray-600 mt-2">Create and manage blocks for testing</p>
          <p className="text-sm text-gray-500 mt-1">Session ID: {browserSessionId}</p>
        </div>

        {/* Create Blocks Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <PlusIcon size={20} weight="bold" />
            Create Blocks
          </h2>
          
          <div className="space-y-4">
            {/* Block Type Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Block Type
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {Object.entries(BLOCK_TYPES).map(([id, block]) => (
                  <button
                    key={id}
                    onClick={() => setSelectedBlockType(id as BlockTypeId)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      selectedBlockType === id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <img
                      src={block.imagePath}
                      alt={block.name}
                      className="w-12 h-12 mx-auto mb-1 pixelated"
                    />
                    <p className="text-xs font-medium">{block.name}</p>
                    <p className="text-xs text-gray-500">{block.category}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={blockQuantity}
                onChange={(e) => setBlockQuantity(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Create Button */}
            <button
              onClick={handleCreateBlocks}
              disabled={isCreating}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {isCreating ? 'Creating...' : `Create ${blockQuantity} Block(s)`}
            </button>
          </div>
        </div>

        {/* Existing Blocks Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <CubeIcon size={20} weight="fill" />
              Existing Blocks ({blocks.length})
            </h2>
            <button
              onClick={handleClearAllBlocks}
              className="text-red-600 hover:text-red-700 text-sm flex items-center gap-1"
            >
              <TrashIcon size={16} />
              Clear All
            </button>
          </div>

          <div className="space-y-4">
            {groupedBlocksArray.map((group) => {
              const { type, isPlaced, blocks } = group;
              const blockType = BLOCK_TYPES[type as BlockTypeId];
              if (!blockType) return null;

              return (
                <div key={`${type}-${isPlaced}`} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <img
                        src={blockType.imagePath}
                        alt={blockType.name}
                        className="w-10 h-10 pixelated"
                      />
                      <div>
                        <h3 className="font-medium">{blockType.name}</h3>
                        <p className="text-sm text-gray-500">
                          {blocks.length} {isPlaced ? 'placed' : 'in inventory'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isPlaced ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          Placed
                        </span>
                      ) : (
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          Inventory
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Individual blocks */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                    {blocks.map((block: any) => (
                      <div
                        key={block.id}
                        className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm"
                      >
                        <span className="font-mono text-xs text-gray-600">
                          {block.id.slice(0, 8)}...
                        </span>
                        {block.x !== null && (
                          <span className="text-xs text-gray-500">
                            ({block.x}, {block.y}, {block.z || 0})
                          </span>
                        )}
                        <button
                          onClick={() => handleDeleteBlock(block.id)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <TrashIcon size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {blocks.length === 0 && (
              <p className="text-center text-gray-500 py-8">
                No blocks yet. Create some above!
              </p>
            )}
          </div>
        </div>

        {/* Pack Opening Section */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <SparkleIcon size={20} weight="fill" />
            Open Packs
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => handleOpenPack(3)}
              className="bg-gradient-to-br from-green-500 to-green-600 text-white py-4 px-4 rounded-lg hover:from-green-600 hover:to-green-700 transition-all transform hover:scale-105 shadow-lg"
            >
              <PackageIcon size={24} weight="fill" className="mx-auto mb-2" />
              <div className="font-semibold">Small Pack (&lt; 30 min)</div>
              <div className="text-sm opacity-90">3 seeds</div>
            </button>

            <button
              onClick={() => handleOpenPack(6)}
              className="bg-gradient-to-br from-purple-500 to-purple-600 text-white py-4 px-4 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg"
            >
              <PackageIcon size={24} weight="fill" className="mx-auto mb-2" />
              <div className="font-semibold">Large Pack (60+ min)</div>
              <div className="text-sm opacity-90">6 seeds</div>
            </button>
          </div>
          
          <div className="mt-4 p-4 bg-gray-100 rounded-lg">
            <h3 className="font-semibold text-sm mb-2">Rarity Distribution:</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Common:</span>
                <span className="font-mono">60%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-600">Uncommon:</span>
                <span className="font-mono">30%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-600">Rare:</span>
                <span className="font-mono">8%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-600">Legendary:</span>
                <span className="font-mono">2%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <PackageIcon size={20} weight="fill" />
            Quick Actions
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={async () => {
                // Create a starter pack
                const transactions = [];
                const starterBlocks = [
                  { type: 'dirt', count: 8 },
                  { type: 'morning-glory', count: 2 },
                  { type: 'ghost-orchid', count: 1 }
                ];
                
                for (const { type, count } of starterBlocks) {
                  for (let i = 0; i < count; i++) {
                    const blockId = id();
                    transactions.push(
                      db.tx.blocks[blockId].update({
                        type,
                        sessionId: browserSessionId,
                      })
                    );
                  }
                }
                
                await db.transact(transactions);
                window.location.reload();
              }}
              className="bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors"
            >
              Create Starter Pack (11 blocks)
            </button>

            <button
              onClick={() => window.location.href = '/'}
              className="bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Back to Garden
            </button>
          </div>
        </div>
      </div>

      <PackOpeningModal
        isOpen={showPackOpening}
        onClose={() => setShowPackOpening(false)}
        rewards={packOpeningRewards}
      />
    </div>
  );
} 