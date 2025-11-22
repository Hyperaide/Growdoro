// Configuration for individual sprites within a block
export interface SpriteConfig {
  path: string;           // Path to the sprite image
  scale?: number;          // Scale factor for this sprite (defaults to block's imageScale or TILE_CONFIG.defaultImageScale)
  yOffset?: number;        // Vertical offset in pixels for this sprite (positive moves up)
  opacity?: number;         // Opacity for this sprite (0-1, defaults to block's opacity or 1)
  zIndex?: number;         // Optional z-index for sprite ordering (lower draws first, defaults to array order)
}

export interface BlockType {
  id: string;
  name: string;
  imagePath?: string; // Optional: for single-image blocks (backward compatibility, prefer sprites)
  basePath?: string;  // Deprecated: use sprites array instead
  layerPath?: string; // Deprecated: use sprites array instead
  sprites?: SpriteConfig[]; // Array of sprites to render when fully grown (drawn in order)
  growingSprites?: SpriteConfig[]; // Array of sprites to render while growing (drawn in order)
  latinName?: string;
  blurb?: string;
  growthTime?: number;
  decayTime?: number;
  slideoverImage?: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  category: 'terrain' | 'plant' | 'decoration';
  imageScale?: number;  // Default scale factor for sprites (can be overridden per sprite)
  yOffset?: number;     // Default vertical offset for sprites (can be overridden per sprite)
  opacity?: number;     // Default opacity for sprites (can be overridden per sprite)
  supporterOnly?: boolean; // Optional flag to indicate if the block is only available to supporters
}

export const BLOCK_TYPES: Record<string, BlockType> = {
  'dirt': {
    id: 'dirt',
    name: 'Grass',
    latinName: 'Poaceae',
    blurb: 'The ground of the garden. It\'s where everything grows.',
    sprites: [
      {
        path: '/sprites/bases/dirt-bright.png',
        scale: 1.15,
        yOffset: -12,
        zIndex: 0, // Base layer draws first
      },
      {
        path: '/sprites/layers/grass.png',
        scale: 1.18,
        yOffset: 0,
        zIndex: 1, // Grass layer draws on top
      },
    ],
    category: 'terrain',
    growthTime: 0,
    decayTime: 0,
    rarity: 'common',
    yOffset: 10,
  },
  'water': {
    id: 'water',
    name: 'Water',
    sprites: [
      {
        path: '/sprites/bases/water.png',
        scale: 1.15,
        yOffset: -12,
        zIndex: 0, // Base layer draws first
      },
      // {
      //   path: '/sprites/layers/grass.png',
      //   scale: 1.18,
      //   yOffset: 0,
      //   zIndex: 1, // Grass layer draws on top
      // },
    ],
    category: 'terrain',
    growthTime: 0,
    decayTime: 0,
    rarity: 'rare',
    yOffset: -4,
    imageScale: 1.4,
    slideoverImage: '/plants/water-slideover.png',
    opacity: 0.95,
    supporterOnly: true
  },
  'daisy': {
    id: 'daisy',
    name: 'Daisy',
    latinName: 'Bellis perennis',
    blurb: 'These cheerful white petals with sunny yellow centers are perfect for beginners. Beloved by bees and butterflies, daisies bloom reliably and spread naturally to create delightful carpets of joy.',
    growingSprites: [
      {
        path: '/sprites/bases/tilled-dirt.png',
        scale: 1.15,
        yOffset: -12,
        zIndex: 0, // Base layer draws first
      },
    ],
    // Fully grown sprites
    sprites: [
      {
        path: '/sprites/bases/dirt-bright.png',
        scale: 1.15,
        yOffset: -12,
        zIndex: 0, // Base layer draws first
      },
      {
        path: '/sprites/layers/grass.png',
        scale: 1.18,
        yOffset: 0,
        zIndex: 1, // Grass layer draws on top
      },
      {
        path: '/sprites/plants/daisy.png', // The actual plant
        scale: 1.1,
        yOffset: 28,
        zIndex: 2, // Plant draws on top
      },
    ],
    category: 'plant',
    growthTime: 0.5,
    decayTime: 0,
    rarity: 'common',
    yOffset: 0,
    imageScale: 1.21,
    slideoverImage: '/plants/daisy-slideover.png',
  },
  'carnation': {
    id: 'carnation',
    name: 'Carnation',
    latinName: 'Dianthus caryophyllus',
    blurb: 'A classic flower that is easy to grow and attracts bees and butterflies. A classic in any garden',
    growingSprites: [
      {
        path: '/sprites/bases/tilled-dirt.png',
        scale: 1.15,
        yOffset: -12,
        zIndex: 0, // Base layer draws first
      },
    ],
    // Fully grown sprites
    sprites: [
      {
        path: '/sprites/bases/dirt-bright.png',
        scale: 1.15,
        yOffset: -12,
        zIndex: 0, // Base layer draws first
      },
      {
        path: '/sprites/layers/grass.png',
        scale: 1.18,
        yOffset: 0,
        zIndex: 1, // Grass layer draws on top
      },
      {
        path: '/sprites/plants/carnation.png', // The actual plant
        scale: 1.2,
        yOffset: 24,
        zIndex: 2, // Plant draws on top
      },
    ],
    category: 'plant',  
    growthTime: 1,
    decayTime: 0,
    rarity: 'uncommon',
    yOffset: 3,
    imageScale: 1.24,
    slideoverImage: '/plants/carnation-slideover.png',
  },
  'marigold': {
    id: 'marigold',
    name: 'French Marigold',
    latinName: 'Tagetes patula',
    blurb: 'Bright, cheerful blooms that are beginner-friendly and pest-repellent. A classic in any garden',
    growthTime: 1,
    decayTime: 2,
    // Growing stage sprites (shown while plant is growing)
    growingSprites: [
      {
        path: '/sprites/bases/tilled-dirt.png',
        scale: 1.15,
        yOffset: -12,
        zIndex: 0, // Base layer draws first
      },
    ],
    // Fully grown sprites
    sprites: [
      {
        path: '/sprites/bases/dirt-bright.png',
        scale: 1.15,
        yOffset: -12,
        zIndex: 0, // Base layer draws first
      },
      {
        path: '/sprites/layers/grass.png',
        scale: 1.18,
        yOffset: 0,
        zIndex: 1, // Grass layer draws on top
      },
      {
        path: '/sprites/plants/french-marigold.png', // The actual plant
        scale: 1.2,
        yOffset: 24,
        zIndex: 2, // Plant draws on top
      },
    ],
    slideoverImage: '/plants/marigold-slideover.png',
    rarity: 'uncommon',
    category: 'plant',
    imageScale: 1.34,  // Small flowers might need moderate scaling
    yOffset: 5  // Lift flowers up a bit
  },
  'lavender': {
    id: 'lavender',
    name: 'Lavender',
    latinName: 'Lavandula',
    blurb: 'Fragrant and soothing, lavender brings calm and attracts bees. Loves sun and dry soil.',
    growthTime: 1,
    decayTime: 2,
    growingSprites: [
      {
        path: '/sprites/bases/tilled-dirt.png',
        scale: 1.15,
        yOffset: -12,
        zIndex: 0, // Base layer draws first
      },
    ],
    sprites: [
      {
        path: '/sprites/bases/dirt-bright.png',
        scale: 1.15,
        yOffset: -12,
        zIndex: 0, // Base layer draws first
      },
      {
        path: '/sprites/layers/grass.png',
        scale: 1.18,
        yOffset: 0,
        zIndex: 1, // Grass layer draws on top
      },
      {
        path: '/sprites/plants/lavender.png', // The actual plant
        scale: 1.3,
        yOffset: 28,
        zIndex: 2, // Plant draws on top
      },
    ],
    slideoverImage: '/plants/lavender-slideover.png',
    rarity: 'uncommon',
    category: 'plant',
    imageScale: 1.7,  // Similar to marigold
    yOffset: 14// Slightly less lift than marigold
  },
  'bird-of-paradise': {
    id: 'bird-of-paradise',
    name: 'Bird of Paradise',
    latinName: 'Strelitzia',
    blurb: 'Exotic and striking, this plant rewards patience with bird-like flowers. Needs warmth and space.',
    growthTime: 2,
    decayTime: 2,
    growingSprites: [
      {
        path: '/sprites/bases/tilled-dirt.png',
        scale: 1.15,
        yOffset: -12,
        zIndex: 0, // Base layer draws first
      },
    ],
    // Fully grown sprites
    sprites: [
      {
        path: '/sprites/bases/dirt-bright.png',
        scale: 1.15,
        yOffset: -12,
        zIndex: 0, // Base layer draws first
      },
      {
        path: '/sprites/layers/grass.png',
        scale: 1.18,
        yOffset: 0,
        zIndex: 1, // Grass layer draws on top
      },
      {
        path: '/sprites/plants/birds-of-paradise.png', // The actual plant
        scale: 1.2,
        yOffset: 26,
        zIndex: 2, // Plant draws on top
      },
    ],
    slideoverImage: '/sprites/plants/birds-of-paradise.png',
    rarity: 'rare',
    category: 'plant',
    imageScale: 1.6,  // Taller plants might need more scaling
    yOffset: 13  // Taller plants need more lift
  },
  'ghost-orchid': {
    id: 'ghost-orchid',
    name: 'Ghost Orchid',
    latinName: 'Dendrophylax lindenii',
    blurb: 'A leafless, rare orchid that floats in swamps and defies cultivation. Mysterious and prized.',
    growthTime: 3,
    decayTime: 2,
    growingSprites: [
      {
        path: '/sprites/bases/tilled-dirt.png',
        scale: 1.15,
        yOffset: -12,
        zIndex: 0, // Base layer draws first
      },
    ],
    // Fully grown sprites
    sprites: [
      {
        path: '/sprites/bases/dirt-bright.png',
        scale: 1.15,
        yOffset: -12,
        zIndex: 0, // Base layer draws first
      },
      {
        path: '/sprites/layers/grass.png',
        scale: 1.18,
        yOffset: 0,
        zIndex: 1, // Grass layer draws on top
      },
      {
        path: '/sprites/plants/ghost-orchid.png', // The actual plant
        scale: 1.2,
        yOffset: 26,
        zIndex: 2, // Plant draws on top
      },
    ],
    slideoverImage: '/sprites/plants/ghost-orchid.png',
    rarity: 'legendary',
    category: 'plant',
    imageScale: 1.3,  // Delicate orchid might need specific scaling
    yOffset: 0  // Medium lift for the floating orchid
  }
};

export const RARITY_COLORS = {
  common: {
    colorSubtle: 'from-gray-100 to-white',
    colorBold: 'text-gray-500',
  },
  uncommon: {
    colorSubtle: 'from-green-100 to-white',
    colorBold: 'text-green-500',
  },
  rare: {
    colorSubtle: 'from-blue-100 to-white',
    colorBold: 'text-blue-500',
  },
  legendary: {
    colorSubtle: 'from-purple-200 to-white',
    colorBold: 'text-purple-500',
  }
};

// Tile dimension configuration
export const TILE_CONFIG = {
  width: 64,    // Width of the diamond shape
  height: 38,   // Height of the diamond shape
  depth: 30,    // Height of block sides (for 3D effect)
  defaultImageScale: 1.22,  // Default scale factor for images (can be overridden per block)
};

// Configuration for tilled grass (shown for growing plants)
export const TILLED_GRASS_CONFIG = {
  imageScale: 1.16,  // Scale for tilled grass image
  yOffset: 0        // Y-offset for tilled grass (stays at ground level)
};

// Helper function to get the display image path for a block (for UI purposes)
export function getBlockDisplayImage(blockType: BlockType): string | undefined {
  // For blocks with sprites, use the last sprite (top layer) for UI display
  if (blockType.sprites && blockType.sprites.length > 0) {
    // Sort by zIndex if provided, otherwise use last in array
    const sortedSprites = [...blockType.sprites].sort((a, b) => (a.zIndex ?? 999) - (b.zIndex ?? 999));
    return sortedSprites[sortedSprites.length - 1].path;
  }
  // Backward compatibility: check deprecated layerPath
  if (blockType.layerPath) {
    return blockType.layerPath;
  }
  // Fall back to single image path
  return blockType.imagePath;
}

// Extract block IDs for type safety
export type BlockTypeId = keyof typeof BLOCK_TYPES; 