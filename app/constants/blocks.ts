export interface BlockType {
  id: string;
  name: string;
  imagePath: string;
  latinName?: string;
  blurb?: string;
  growthTime?: number;
  decayTime?: number;
  slideoverImage?: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  category: 'terrain' | 'plant' | 'decoration';
  imageScale?: number;  // Optional scale factor for this block's image
  yOffset?: number;     // Optional vertical offset in pixels (positive moves up)
  opacity?: number;     // Optional opacity for the block (0-1)
  supporterOnly?: boolean; // Optional flag to indicate if the block is only available to supporters
}

export const BLOCK_TYPES: Record<string, BlockType> = {
  'dirt': {
    id: 'dirt',
    name: 'Grass',
    latinName: 'Poaceae',
    blurb: 'The ground of the garden. It\'s where everything grows.',
    imagePath: '/plants/dirt-p.png',
    category: 'terrain',
    growthTime: 0,
    decayTime: 0,
    rarity: 'common',
    yOffset: 0  // Ground level, no offset needed
  },
  'water': {
    id: 'water',
    name: 'Water',
    imagePath: '/blocks/water.png',
    category: 'terrain',
    growthTime: 0,
    decayTime: 0,
    rarity: 'rare',
    yOffset: -4,
    imageScale: 1.4,
    slideoverImage: '/plants/water-slideover.png',
    opacity: 0.9,
    supporterOnly: true
  },
  'daisy': {
    id: 'daisy',
    name: 'Daisy',
    latinName: 'Bellis perennis',
    blurb: 'These cheerful white petals with sunny yellow centers are perfect for beginners. Beloved by bees and butterflies, daisies bloom reliably and spread naturally to create delightful carpets of joy.',
    imagePath: '/plants/daisy.png',
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
    imagePath: '/plants/carnation.png',
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
    imagePath: '/plants/marigold.png',
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
    imagePath: '/plants/lavender.png',
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
    imagePath: '/plants/bird-of-paradise.png',
    slideoverImage: '/plants/bird-of-paradise-slideover.png',
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
    imagePath: '/plants/ghost-orchid.png',
    slideoverImage: '/plants/ghost-orchid-slideover.png',
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

// Extract block IDs for type safety
export type BlockTypeId = keyof typeof BLOCK_TYPES; 