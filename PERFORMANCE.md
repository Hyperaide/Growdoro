# Performance Optimization Guide

This document outlines the performance optimizations implemented in the GardenSpace app and recommendations for further improvements.

## Implemented Optimizations

### 1. Global Image Cache (`lib/image-cache.ts`)

**What it does:**
- Loads images once and reuses them across component instances
- Caches images in memory for instant access
- Persists images in IndexedDB for cross-session caching (7-day TTL)
- Prevents duplicate image loads

**Benefits:**
- Faster subsequent loads (images loaded from cache)
- Reduced network requests
- Better memory management
- Works across page reloads

**Usage:**
The image cache is automatically used by `IsometricGarden` component. Images are loaded once and reused.

### 2. Viewport Culling

**What it does:**
- Only renders blocks that are visible in the current viewport
- Calculates visible bounds and filters blocks before rendering

**Benefits:**
- Significantly reduces draw calls for large gardens
- Improves frame rate, especially with many blocks
- Scales better as garden size grows

### 3. Optimized Image Loading

**What it does:**
- Parallel image loading using `Promise.all`
- Better error handling
- Uses global cache to prevent duplicate loads

**Benefits:**
- Faster initial load times
- More reliable image loading
- Better user experience

### 4. Next.js Image Optimization

**What it does:**
- Automatic WebP/AVIF format conversion
- Responsive image sizing
- Long-term caching (7 days)

**Benefits:**
- Smaller file sizes (WebP is ~30% smaller than PNG)
- Faster page loads
- Better mobile performance

## Recommended Image Optimization Steps

### Step 1: Compress Existing Images

Use tools like:
- **Squoosh** (https://squoosh.app) - Web-based, easy to use
- **ImageOptim** (Mac) - Drag and drop
- **TinyPNG** (https://tinypng.com) - Online service
- **sharp** (CLI) - For batch processing

**Recommended settings:**
- PNG: Use lossless compression, aim for 50-70% size reduction
- Consider converting to WebP format (better compression)

### Step 2: Convert to WebP Format

WebP provides better compression than PNG while maintaining quality:

```bash
# Using cwebp (install via: brew install webp)
cwebp -q 80 input.png -o output.webp

# Or use sharp (Node.js)
npm install sharp
```

**Update image paths in `blocks.ts`:**
```typescript
// Change from:
path: '/sprites/bases/dirt.png'

// To:
path: '/sprites/bases/dirt.webp'
```

### Step 3: Create Sprite Atlases (Optional but Recommended)

For even better performance, combine multiple sprites into sprite sheets:

**Benefits:**
- Single HTTP request instead of many
- Better browser caching
- Faster loading

**Tools:**
- **TexturePacker** (https://www.codeandweb.com/texturepacker)
- **Shoebox** (http://renderhjs.net/shoebox/)
- **Online sprite sheet generators**

**Example structure:**
```
/sprites/atlas.png (contains all sprites)
/sprites/atlas.json (contains sprite coordinates)
```

### Step 4: Lazy Load Images

For images not immediately visible (like slideover images), consider lazy loading:

```typescript
// Example: Load slideover images only when needed
const [slideoverImage, setSlideoverImage] = useState<HTMLImageElement | null>(null);

useEffect(() => {
  if (isOpen && blockType.slideoverImage) {
    imageCache.loadImage(blockType.slideoverImage).then(setSlideoverImage);
  }
}, [isOpen, blockType.slideoverImage]);
```

## Performance Monitoring

### Check Current Performance

1. **Chrome DevTools:**
   - Open DevTools → Network tab
   - Check image loading times and sizes
   - Look for duplicate requests

2. **Lighthouse:**
   - Run Lighthouse audit
   - Check "Performance" score
   - Review image optimization suggestions

3. **React DevTools Profiler:**
   - Profile component renders
   - Identify expensive re-renders

### Metrics to Track

- **Time to First Image:** How long until first image loads
- **Total Image Load Time:** Time to load all images
- **Frame Rate:** Should be 60fps during interactions
- **Memory Usage:** Check for memory leaks
- **Cache Hit Rate:** How often images are served from cache

## Additional Optimization Ideas

### 1. Service Worker for Offline Caching

Cache images in a service worker for offline access and faster subsequent loads.

### 2. CDN for Static Assets

Serve images from a CDN (like Cloudflare or Vercel's CDN) for faster global delivery.

### 3. Progressive Image Loading

Show low-quality placeholders first, then load high-quality versions.

### 4. Image Preloading

Preload critical images in `<head>`:
```html
<link rel="preload" as="image" href="/sprites/bases/dirt.webp">
```

### 5. Canvas Optimization

- Use `willReadFrequently: false` for canvas contexts that don't read pixels
- Consider using OffscreenCanvas for heavy rendering
- Batch canvas operations when possible

## Current Performance Characteristics

- **Image Loading:** Parallel, cached, persistent
- **Rendering:** Viewport culled, optimized draw calls
- **Memory:** Images cached efficiently, cleared after 7 days
- **Network:** Reduced duplicate requests, better caching

## Troubleshooting

### Images Not Loading from Cache

Check browser console for IndexedDB errors. Some browsers/incognito modes disable IndexedDB.

### High Memory Usage

The cache automatically expires after 7 days. You can manually clear it:
```typescript
import { imageCache } from '@/lib/image-cache';
await imageCache.clearCache();
```

### Slow Initial Load

1. Check image file sizes (should be < 100KB each ideally)
2. Verify images are being compressed
3. Consider implementing progressive loading
4. Check network tab for slow requests

## Future Improvements

1. **Sprite Atlasing:** Combine sprites into sheets
2. **WebP Migration:** Convert all PNGs to WebP
3. **Lazy Loading:** Load non-critical images on demand
4. **Service Worker:** Add offline caching
5. **Image CDN:** Use CDN for faster delivery

