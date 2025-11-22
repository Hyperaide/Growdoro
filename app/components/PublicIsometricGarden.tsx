"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  BLOCK_TYPES,
  TILE_CONFIG,
  BlockTypeId,
  TILLED_GRASS_CONFIG,
} from "../constants/blocks";
import { db } from "../../lib/db";
import { imageCache } from "../../lib/image-cache";
import { Cube, SealCheckIcon } from "@phosphor-icons/react";

interface Block {
  id: string;
  x: number;
  y: number;
  z: number;
  type: BlockTypeId;
  plantedAt?: number;
}

interface Camera {
  x: number;
  y: number;
  zoom: number;
}

interface PublicIsometricGardenProps {
  username: string;
}

const PublicIsometricGarden: React.FC<PublicIsometricGardenProps> = ({
  username,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [hoveredBlock, setHoveredBlock] = useState<string | null>(null);
  const [hoveredTile, setHoveredTile] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [loadedImages, setLoadedImages] = useState<
    Record<string, HTMLImageElement | HTMLImageElement[]>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userDisplayName, setUserDisplayName] = useState<string>("");
  const [isSupporter, setIsSupporter] = useState(false);

  // Touch handling state
  const [touchStartDistance, setTouchStartDistance] = useState<number | null>(
    null
  );
  const [lastTouchPosition, setLastTouchPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Load user's blocks from database
  useEffect(() => {
    const loadUserBlocks = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // First, query for the user's profile using username
        const { data: profileData } = await db.queryOnce({
          profiles: {
            $: {
              where: {
                username: username,
              },
            },
            user: {
              blocks: {},
            },
          },
        });

        if (!profileData?.profiles?.[0]) {
          setError("User not found");
          setIsLoading(false);
          return;
        }

        const profile = profileData.profiles[0];
        setUserDisplayName(profile.username);
        setIsSupporter(profile.supporter || false);

        // Get blocks through the user relationship
        const userBlocks = profile.user?.blocks || [];

        if (userBlocks.length > 0) {
          // Filter for placed blocks and convert to local Block format
          const loadedBlocks: Block[] = userBlocks
            .filter(
              (dbBlock) =>
                dbBlock.x !== null &&
                dbBlock.x !== undefined &&
                dbBlock.y !== null &&
                dbBlock.y !== undefined
            )
            .map((dbBlock) => ({
              id: dbBlock.id,
              x: dbBlock.x!,
              y: dbBlock.y!,
              z: dbBlock.z || 0,
              type: dbBlock.type as BlockTypeId,
              plantedAt: dbBlock.plantedAt
                ? new Date(dbBlock.plantedAt).getTime()
                : undefined,
            }));

          setBlocks(loadedBlocks);
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Failed to load user blocks:", error);
        setError("Failed to load garden");
        setIsLoading(false);
      }
    };

    if (username) {
      loadUserBlocks();
    }
  }, [username]);

  // Preload block images
  useEffect(() => {
    const images: Record<string, HTMLImageElement | HTMLImageElement[]> = {};
    const blockEntries = Object.entries(BLOCK_TYPES);

    if (blockEntries.length === 0) {
      setLoadedImages({});
      return;
    }

    // Collect all image URLs to preload
    const imageUrls: string[] = [];
    const imageMap: Map<
      string,
      Array<{ blockId: string; index?: number; isGrowing?: boolean }>
    > = new Map();

    const addMapping = (
      path: string,
      mapping: { blockId: string; index?: number; isGrowing?: boolean }
    ) => {
      if (!imageMap.has(path)) {
        imageMap.set(path, []);
      }
      imageMap.get(path)!.push(mapping);
      imageUrls.push(path);
    };

    blockEntries.forEach(([blockId, blockType]) => {
      // Load fully grown sprites
      if (blockType.sprites && blockType.sprites.length > 0) {
        blockType.sprites.forEach((sprite, index) => {
          addMapping(sprite.path, { blockId, index });
        });
      }

      // Load growing sprites
      if (blockType.growingSprites && blockType.growingSprites.length > 0) {
        blockType.growingSprites.forEach((sprite, index) => {
          addMapping(sprite.path, { blockId, index, isGrowing: true });
        });
      }

      // Legacy layered block support
      if (
        blockType.basePath &&
        blockType.layerPath &&
        !blockType.sprites &&
        !blockType.growingSprites
      ) {
        addMapping(blockType.basePath, { blockId, index: 0 });
        addMapping(blockType.layerPath, { blockId, index: 1 });
      }

      // Single image block
      if (
        blockType.imagePath &&
        !blockType.sprites &&
        !blockType.growingSprites &&
        !blockType.basePath
      ) {
        addMapping(blockType.imagePath, { blockId });
      }
    });

    // Add tilled-grass image
    addMapping("/blocks/tilled-grass.png", { blockId: "tilled-grass" });

    // Preload all images in parallel using image cache
    imageCache
      .preloadImages(imageUrls)
      .then((loadedImagesMap) => {
        // Organize loaded images back into the expected structure
        imageMap.forEach((mappings, url) => {
          const img = loadedImagesMap.get(url);
          if (!img) return;

          mappings.forEach(({ blockId, index, isGrowing }) => {
            const key = isGrowing ? `${blockId}-growing` : blockId;

            if (index !== undefined) {
              // This is part of a sprite array
              if (!images[key]) {
                images[key] = [];
              }
              const arr = images[key] as HTMLImageElement[];
              arr[index] = img;
            } else {
              // Single image
              images[key] = img;
            }
          });
        });

        setLoadedImages(images);
      })
      .catch((error) => {
        console.error("Failed to preload images:", error);
        setLoadedImages({});
      });
  }, []);

  // Convert world coordinates to screen coordinates
  const worldToScreen = useCallback(
    (x: number, y: number, z: number) => {
      const tileWidth = TILE_CONFIG.width * camera.zoom;
      const tileHeight = TILE_CONFIG.height * camera.zoom;

      const screenX =
        (x - y) * (tileWidth / 2) + camera.x + window.innerWidth / 2;
      const screenY =
        (x + y) * (tileHeight / 2) -
        z * (TILE_CONFIG.depth * camera.zoom) +
        camera.y +
        window.innerHeight / 2;

      return { x: screenX, y: screenY };
    },
    [camera]
  );

  // Convert screen coordinates to world coordinates
  const screenToWorld = useCallback(
    (screenX: number, screenY: number) => {
      const tileWidth = TILE_CONFIG.width * camera.zoom;
      const tileHeight = TILE_CONFIG.height * camera.zoom;

      const adjustedX = screenX - camera.x - window.innerWidth / 2;
      const adjustedY = screenY - camera.y - window.innerHeight / 2;

      const x =
        (adjustedX / (tileWidth / 2) + adjustedY / (tileHeight / 2)) / 2;
      const y =
        (adjustedY / (tileHeight / 2) - adjustedX / (tileWidth / 2)) / 2;

      return { x: Math.floor(x + 0.5), y: Math.floor(y + 0.5) };
    },
    [camera]
  );

  // Helper function to draw a single image
  const drawImage = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      img: HTMLImageElement,
      screenX: number,
      screenY: number,
      size: number,
      height: number,
      imageScale: number,
      yOffset: number,
      opacity: number = 1
    ) => {
      // Calculate scaled dimensions maintaining aspect ratio
      const imgAspectRatio = img.width / img.height;
      const targetWidth = size;
      const targetHeight = height + TILE_CONFIG.depth * camera.zoom;
      const targetAspectRatio = targetWidth / targetHeight;

      let drawWidth, drawHeight;

      if (imgAspectRatio > targetAspectRatio) {
        // Image is wider than target - fit to width
        drawWidth = targetWidth * imageScale;
        drawHeight = (targetWidth * imageScale) / imgAspectRatio;
      } else {
        // Image is taller than target - fit to height
        drawHeight = targetHeight * imageScale;
        drawWidth = targetHeight * imageScale * imgAspectRatio;
      }

      // Center the image in the isometric cell with y-offset applied
      const drawX = screenX - drawWidth / 2;
      const drawY = screenY - drawHeight / 2 - yOffset * camera.zoom;

      // Apply opacity
      const originalAlpha = ctx.globalAlpha;
      ctx.globalAlpha = originalAlpha * opacity;

      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

      // Restore opacity
      ctx.globalAlpha = originalAlpha;
    },
    [camera]
  );

  // Draw a single block
  const drawBlock = useCallback(
    (ctx: CanvasRenderingContext2D, block: Block) => {
      const { x: screenX, y: screenY } = worldToScreen(
        block.x,
        block.y,
        block.z
      );
      const size = TILE_CONFIG.width * camera.zoom;
      const height = TILE_CONFIG.height * camera.zoom;

      const isHovered = hoveredBlock === block.id;

      const blockType = BLOCK_TYPES[block.type];
      if (!blockType) return;

      let isGrowing = false;
      if (
        blockType.category === "plant" &&
        blockType.growthTime &&
        block.plantedAt
      ) {
        const daysSincePlanted =
          (Date.now() - block.plantedAt) / (1000 * 60 * 60 * 24);
        isGrowing = daysSincePlanted < blockType.growthTime;
      }

      // Draw the block image in isometric style
      ctx.save();

      // Enable image smoothing for better quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Apply block-specific opacity if defined
      let baseOpacity = blockType.opacity ?? 1;
      if (isHovered) {
        baseOpacity = baseOpacity * 0.8; // Reduce opacity further when hovered
      }

      // Determine what to draw based on growth state
      if (isGrowing) {
        // Check if block has growing sprites defined
        if (blockType.growingSprites && blockType.growingSprites.length > 0) {
          // Use growing sprites
          const growingImages = loadedImages[`${block.type}-growing`];
          if (Array.isArray(growingImages)) {
            // Sort sprites by zIndex if provided, otherwise use array order
            const sortedSprites = blockType.growingSprites
              .map((sprite, index) => ({
                sprite,
                index,
                image: growingImages[index],
              }))
              .filter((item) => item.image) // Only include loaded images
              .sort(
                (a, b) =>
                  (a.sprite.zIndex ?? a.index) - (b.sprite.zIndex ?? b.index)
              );

            // Draw each growing sprite with its individual configuration
            sortedSprites.forEach(({ sprite, image }) => {
              const imageScale =
                sprite.scale ??
                blockType.imageScale ??
                TILE_CONFIG.defaultImageScale;
              const yOffset = sprite.yOffset ?? blockType.yOffset ?? 0;
              // Sprite opacity: use sprite's opacity if defined, otherwise use block's opacity, then apply hover effect
              const spriteBaseOpacity =
                sprite.opacity ?? blockType.opacity ?? 1;
              const spriteOpacity = isHovered
                ? spriteBaseOpacity * 0.8
                : spriteBaseOpacity;

              drawImage(
                ctx,
                image,
                screenX,
                screenY,
                size,
                height,
                imageScale,
                yOffset,
                spriteOpacity
              );
            });
          }
        } else if (
          loadedImages["tilled-grass"] &&
          typeof loadedImages["tilled-grass"] === "object" &&
          "width" in loadedImages["tilled-grass"]
        ) {
          // Fallback to tilled grass if no growing sprites defined
          const tilledGrassImg = loadedImages[
            "tilled-grass"
          ] as HTMLImageElement;
          const imageScale = TILLED_GRASS_CONFIG.imageScale;
          const yOffset = TILLED_GRASS_CONFIG.yOffset;
          drawImage(
            ctx,
            tilledGrassImg,
            screenX,
            screenY,
            size,
            height,
            imageScale,
            yOffset,
            baseOpacity
          );
        }
      } else if (blockType.sprites && blockType.sprites.length > 0) {
        // Sprite-based block: draw all sprites in order
        const blockImages = loadedImages[block.type];

        if (Array.isArray(blockImages)) {
          // Sort sprites by zIndex if provided, otherwise use array order
          const sortedSprites = blockType.sprites
            .map((sprite, index) => ({
              sprite,
              index,
              image: blockImages[index],
            }))
            .filter((item) => item.image) // Only include loaded images
            .sort(
              (a, b) =>
                (a.sprite.zIndex ?? a.index) - (b.sprite.zIndex ?? b.index)
            );

          // Draw each sprite with its individual configuration
          sortedSprites.forEach(({ sprite, image }) => {
            const imageScale =
              sprite.scale ??
              blockType.imageScale ??
              TILE_CONFIG.defaultImageScale;
            const yOffset = sprite.yOffset ?? blockType.yOffset ?? 0;
            // Sprite opacity: use sprite's opacity if defined, otherwise use block's opacity, then apply hover effect
            const spriteBaseOpacity = sprite.opacity ?? blockType.opacity ?? 1;
            const spriteOpacity = isHovered
              ? spriteBaseOpacity * 0.8
              : spriteBaseOpacity;

            drawImage(
              ctx,
              image,
              screenX,
              screenY,
              size,
              height,
              imageScale,
              yOffset,
              spriteOpacity
            );
          });
        }
      } else if (blockType.basePath && blockType.layerPath) {
        // Legacy layered block: draw base first, then layer on top
        const blockImages = loadedImages[block.type];

        if (Array.isArray(blockImages)) {
          // Draw base layer (index 0)
          if (blockImages[0]) {
            const imageScale =
              blockType.imageScale ?? TILE_CONFIG.defaultImageScale;
            const yOffset = blockType.yOffset ?? 0;
            drawImage(
              ctx,
              blockImages[0],
              screenX,
              screenY,
              size,
              height,
              imageScale,
              yOffset,
              baseOpacity
            );
          }

          // Draw layer on top (index 1)
          if (blockImages[1]) {
            const imageScale =
              blockType.imageScale ?? TILE_CONFIG.defaultImageScale;
            const yOffset = blockType.yOffset ?? 0;
            drawImage(
              ctx,
              blockImages[1],
              screenX,
              screenY,
              size,
              height,
              imageScale,
              yOffset,
              baseOpacity
            );
          }
        }
      } else if (blockType.imagePath) {
        // Single image block (backward compatibility)
        const blockImage = loadedImages[block.type];
        if (
          blockImage &&
          typeof blockImage === "object" &&
          "width" in blockImage &&
          !Array.isArray(blockImage)
        ) {
          const img = blockImage as HTMLImageElement;
          const isShowingTilledGrass = img === loadedImages["tilled-grass"];
          const imageScale = isShowingTilledGrass
            ? TILLED_GRASS_CONFIG.imageScale
            : blockType.imageScale ?? TILE_CONFIG.defaultImageScale;
          const yOffset = isShowingTilledGrass
            ? TILLED_GRASS_CONFIG.yOffset
            : blockType.yOffset ?? 0;
          drawImage(
            ctx,
            img,
            screenX,
            screenY,
            size,
            height,
            imageScale,
            yOffset,
            baseOpacity
          );
        }
      }

      ctx.restore();
    },
    [camera, worldToScreen, hoveredBlock, loadedImages, drawImage]
  );

  // Render the scene
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid lines
    ctx.strokeStyle = "rgba(147, 196, 188, 0.2)";
    ctx.lineWidth = 1;

    const visibleRange =
      Math.ceil(
        Math.max(window.innerWidth, window.innerHeight) /
          (TILE_CONFIG.width * camera.zoom) /
          2
      ) + 5;
    const centerX = -Math.floor(camera.x / (TILE_CONFIG.width * camera.zoom));
    const centerY = -Math.floor(camera.y / (TILE_CONFIG.height * camera.zoom));

    for (let x = centerX - visibleRange; x <= centerX + visibleRange; x++) {
      for (let y = centerY - visibleRange; y <= centerY + visibleRange; y++) {
        const { x: screenX, y: screenY } = worldToScreen(x, y, 0);
        const size = TILE_CONFIG.width * camera.zoom;
        const height = TILE_CONFIG.height * camera.zoom;

        ctx.beginPath();
        ctx.moveTo(screenX, screenY);
        ctx.lineTo(screenX + size / 2, screenY + height / 2);
        ctx.moveTo(screenX, screenY);
        ctx.lineTo(screenX - size / 2, screenY + height / 2);
        ctx.stroke();
      }
    }

    // Sort and draw blocks
    const sortedBlocks = [...blocks].sort((a, b) => {
      const depthA = a.x + a.y + a.z * 100;
      const depthB = b.x + b.y + b.z * 100;
      return depthA - depthB;
    });

    sortedBlocks.forEach((block) => drawBlock(ctx, block));
  }, [blocks, camera, drawBlock, worldToScreen]);

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const dpr = window.devicePixelRatio || 1;

      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;

      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
      }

      render();
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, [render]);

  // Animation loop
  useEffect(() => {
    let animationId: number;

    const animate = () => {
      render();
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [render]);

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - camera.x, y: e.clientY - camera.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setCamera({
        ...camera,
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    } else {
      const { x, y } = screenToWorld(e.clientX, e.clientY);
      setHoveredTile({ x, y });

      const block = blocks.find((b) => b.x === x && b.y === y && b.z === 0);
      setHoveredBlock(block?.id || null);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleMouseLeave = () => {
    setIsPanning(false);
    setHoveredTile(null);
    setHoveredBlock(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomSpeed = 0.001;
    const newZoom = Math.max(
      0.5,
      Math.min(3, camera.zoom - e.deltaY * zoomSpeed)
    );
    setCamera({ ...camera, zoom: newZoom });
  };

  // Touch event handlers
  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return null;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touches = e.touches;

    if (touches.length === 2) {
      const distance = getTouchDistance(touches);
      setTouchStartDistance(distance);
      e.preventDefault();
    } else if (touches.length === 1) {
      const touch = touches[0];
      setLastTouchPosition({ x: touch.clientX, y: touch.clientY });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touches = e.touches;

    if (touches.length === 2 && touchStartDistance !== null) {
      const currentDistance = getTouchDistance(touches);
      if (currentDistance !== null) {
        const scale = currentDistance / touchStartDistance;
        const newZoom = Math.max(0.5, Math.min(3, camera.zoom * scale));
        setCamera({ ...camera, zoom: newZoom });
        setTouchStartDistance(currentDistance);
      }
      e.preventDefault();
    } else if (touches.length === 1 && lastTouchPosition) {
      const touch = touches[0];
      const deltaX = touch.clientX - lastTouchPosition.x;
      const deltaY = touch.clientY - lastTouchPosition.y;

      setCamera({
        ...camera,
        x: camera.x + deltaX,
        y: camera.y + deltaY,
      });
      setLastTouchPosition({ x: touch.clientX, y: touch.clientY });
    }
  };

  const handleTouchEnd = () => {
    setTouchStartDistance(null);
    setLastTouchPosition(null);
  };

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gradient-to-tr from-green-100 to-sky-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading garden...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gradient-to-tr from-green-100 to-sky-100">
        <div className="text-center">
          <p className="text-red-600 mb-2">{error}</p>
          <p className="text-gray-600">
            The garden you're looking for doesn't exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden touch-none bg-gradient-to-tr from-green-100 to-sky-100">
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 ${
          isPanning ? "cursor-grabbing" : "cursor-grab"
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {/* Header with username */}
      <div className="font-barlow absolute bottom-4 left-4 right-4 w-max mx-auto bg-white rounded-lg shadow-lg p-2 px-4 gap-2 flex flex-row items-center justify-between">
        <h1 className="text-sm font-bold text-gray-800 capitalize">
          {userDisplayName}
        </h1>
        {isSupporter && (
          <div className="flex flex-row items-center gap-1 bg-sky-100 text-sky-800 rounded-lg px-2 py-1">
            <span className="text-xs text-sky-800">Supporter</span>
            <SealCheckIcon size={16} weight="fill" className="text-sky-500" />
          </div>
        )}
        <p className="text-xs text-gray-600 flex flex-row items-center font-medium gap-1">
          <Cube size={12} weight="bold" />
          {blocks.length}
        </p>
      </div>

      {/* Controls hint */}
      {/* <div className="absolute bottom-4 left-4 bg-white/80 rounded-lg shadow-lg p-3 text-xs text-gray-600">
        <p>Drag to pan • Scroll to zoom • Touch to interact</p>
      </div> */}
    </div>
  );
};

export default PublicIsometricGarden;
