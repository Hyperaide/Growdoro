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
}

export const BLOCK_TYPES: Record<string, BlockType> = {
  'dirt': {
    id: 'dirt',
    name: 'Dirt',
    imagePath: '/plants/dirt-p.png',
    category: 'terrain',
    rarity: 'common'
  },
  'tilled-grass': {
    id: 'tilled-grass',
    name: 'Tilled Grass',
    imagePath: '/blocks/tilled-grass.png',
    category: 'terrain',
    rarity: 'common'
  },
  'ghost-orchid': {
    id: 'ghost-orchid',
    name: 'Ghost Orchid',
    latinName: 'Dendrophylax lindenii',
    blurb: 'A leafless, rare orchid that floats in swamps and defies cultivation. Mysterious and prized.',
    growthTime: 14,
    decayTime: 2,
    imagePath: '/plants/ghost-orchid.png',
    slideoverImage: '/plants/ghost-orchid-slideover.png',
    rarity: 'legendary',
    category: 'plant'
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
  imageScale: 1.22,  // Scale factor for images
};

// Extract block IDs for type safety
export type BlockTypeId = keyof typeof BLOCK_TYPES; 