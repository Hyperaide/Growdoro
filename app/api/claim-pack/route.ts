import { init } from '@instantdb/admin';
import { NextResponse } from 'next/server';
import { id } from '@instantdb/core';
import { BLOCK_TYPES, BlockTypeId } from '../../constants/blocks';

// Get random block types for rewards (ensuring at least one plant)
const getRandomBlockTypes = (count: number, isSupporter: boolean = false): string[] => {
  const allBlockIds = Object.keys(BLOCK_TYPES);
  
  // Filter out supporter-only blocks if user is not a supporter
  const availableBlockIds = allBlockIds.filter(id => {
    const blockType = BLOCK_TYPES[id as BlockTypeId];
    if (blockType.supporterOnly && !isSupporter) {
      return false;
    }
    return true;
  });
  
  // Safety check - ensure we have available blocks
  if (availableBlockIds.length === 0) {
    console.warn('No available blocks after filtering for supporter status');
    return []; // Return empty array if no blocks available
  }
  
  const plantIds = availableBlockIds.filter(id => BLOCK_TYPES[id as BlockTypeId].category === 'plant');
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
        // Get all blocks of this rarity from available blocks
        const blocksOfRarity = availableBlockIds.filter(
          id => BLOCK_TYPES[id as BlockTypeId].rarity === rarity
        );
        if (blocksOfRarity.length > 0) {
          return blocksOfRarity[Math.floor(Math.random() * blocksOfRarity.length)];
        }
      }
    }
    
    // Fallback to any random available block
    return availableBlockIds[Math.floor(Math.random() * availableBlockIds.length)];
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

export async function POST(request: Request) {
  try {
    // Initialize InstantDB admin client
    const appId = process.env.NEXT_PUBLIC_INSTANT_APP_ID || 'YOUR_APP_ID_HERE';
    const adminToken = process.env.INSTANT_APP_ADMIN_TOKEN;

    if (!adminToken) {
      console.error('❌ INSTANT_APP_ADMIN_TOKEN is not set');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const db = init({
      appId,
      adminToken: adminToken
    });

    const { sessionId, userId, sessionDuration, sessionIdFallback } = await request.json();

    // Validate input
    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    if (!sessionDuration || typeof sessionDuration !== 'number') {
      return NextResponse.json(
        { error: 'Session duration is required' },
        { status: 400 }
      );
    }

    // Verify session exists and is completed
    const sessionQuery = await db.query({
      sessions: {
        $: {
          where: {
            id: sessionId
          }
        }
      }
    });

    const session = sessionQuery.sessions?.[0];
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    if (session.rewardsClaimedAt) {
      return NextResponse.json(
        { error: 'Rewards already claimed for this session' },
        { status: 400 }
      );
    }

    // Check if user is a supporter (if authenticated)
    let isSupporter = false;
    if (userId) {
      const profileQuery = await db.query({
        profiles: {
          $: {
            where: {
              'user.id': userId
            }
          }
        }
      });
      
      const userProfile = profileQuery.profiles?.[0];
      isSupporter = userProfile?.supporter || false;
      console.log(`User ${userId} supporter status: ${isSupporter}`);
    }

    // Determine pack size based on session duration
    let packSize = 3; // Default for < 60 mins
    const minutes = Math.floor(sessionDuration / 60);
    
    if (minutes >= 45) {
      packSize = 5; // 1 hour or more
    } else if (minutes >= 30) {
      packSize = 3; // Still 3 for 30-59 minutes
    }

    // Get random block types with supporter filter
    const rewardBlocks = getRandomBlockTypes(packSize, isSupporter);

    // Create the block transactions
    const blockTransactions = rewardBlocks.map((blockType) => {
      const blockId = id();
      if (userId) {
        return db.tx.blocks[blockId].update({
          type: blockType
        }).link({
          user: userId
        });
      } else {
        return db.tx.blocks[blockId].update({
          type: blockType,
          sessionId: sessionIdFallback
        });
      }
    });

    // Execute all transactions
    await db.transact([
      db.tx.sessions[sessionId].update({
        rewardsClaimedAt: Date.now()
      }),
      ...blockTransactions
    ]);

    return NextResponse.json({
      success: true,
      packSize,
      rewardBlocks,
      sessionId,
      isSupporter
    });

  } catch (error) {
    console.error('Error claiming pack:', error);
    return NextResponse.json(
      { error: 'Failed to claim pack' },
      { status: 500 }
    );
  }
} 