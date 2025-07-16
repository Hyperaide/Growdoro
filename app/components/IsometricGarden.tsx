'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BLOCK_TYPES, TILE_CONFIG, BlockTypeId, TILLED_GRASS_CONFIG } from '../constants/blocks';
import BlockSlideover from './BlockSlideover';
import MainSlideover from './MainSlideover';
import { HourglassIcon } from '@phosphor-icons/react';
import { db } from '../../lib/db';
import { id } from '@instantdb/react';
import { XIcon } from '@phosphor-icons/react';
import { DateTime } from 'luxon';
import Dock from './Dock';
import posthog from 'posthog-js';
import { useAuth } from '../contexts/auth-context';
import AuthButton from './AuthButton';

interface Block {
  id: string;
  x: number;
  y: number;
  z: number;
  type: BlockTypeId;
  placedAt?: number; // Timestamp when block was placed for animation
  plantedAt?: number; // Timestamp when plant was planted (for growth tracking)
}

interface Camera {
  x: number;
  y: number;
  zoom: number;
}

const IsometricGarden: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [hoveredBlock, setHoveredBlock] = useState<string | null>(null);
  const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number } | null>(null);
  const [loadedImages, setLoadedImages] = useState<Record<string, HTMLImageElement>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [draggedBlock, setDraggedBlock] = useState<Block | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [isSlideoverOpen, setIsSlideoverOpen] = useState(false);
  const [isMainSlideoverOpen, setIsMainSlideoverOpen] = useState(true);
  const [selectedInventoryBlock, setSelectedInventoryBlock] = useState<string | null>(null);
  
  // Use auth context for session management
  const { user, sessionId } = useAuth();
  const effectiveSessionId = user?.id || sessionId;

  // Touch handling state
  const [touchStartDistance, setTouchStartDistance] = useState<number | null>(null);
  const [touchStartTime, setTouchStartTime] = useState<number>(0);
  const [lastTouchPosition, setLastTouchPosition] = useState<{ x: number; y: number } | null>(null);
  const [isTouchDragging, setIsTouchDragging] = useState(false);

  // Mobile instructions state
  const [showMobileInstructions, setShowMobileInstructions] = useState(false);
  const [hasSeenInstructions, setHasSeenInstructions] = useState(false);
  const [hasCreatedDefaultBlocks, setHasCreatedDefaultBlocks] = useState(false);

  // Real-time query for blocks
  const { data } = db.useQuery({
    blocks: effectiveSessionId ? {
      $: {
        where: user ? {
          'user.id': user.id
        } : {
          sessionId: effectiveSessionId
        }
      }
    } : {}
  });

  // Check if user has seen mobile instructions
  useEffect(() => {
    const instructionsSeen = localStorage.getItem('growdoro_mobile_instructions_seen');
    if (!instructionsSeen && 'ontouchstart' in window) {
      setShowMobileInstructions(true);
    }
    setHasSeenInstructions(!!instructionsSeen);
  }, []);

  // Update blocks from real-time data
  useEffect(() => {
    if (!effectiveSessionId || !data?.blocks) return;

    if (data.blocks.length > 0) {
      // Filter for blocks that have been placed (have x, y coordinates)
      // and convert database blocks to our local Block format
      const loadedBlocks: Block[] = data.blocks
        .filter(dbBlock => dbBlock.x !== null && dbBlock.x !== undefined && 
                           dbBlock.y !== null && dbBlock.y !== undefined)
        .map(dbBlock => ({
          id: dbBlock.id,
          x: dbBlock.x!,
          y: dbBlock.y!,
          z: dbBlock.z || 0,
          type: dbBlock.type as BlockTypeId,
          // Don't set placedAt for loaded blocks to avoid animation
          placedAt: undefined,
          // Include plantedAt if it exists (parse ISO string to timestamp)
          plantedAt: dbBlock.plantedAt ? new Date(dbBlock.plantedAt).getTime() : undefined
        }));

      setBlocks(loadedBlocks);
    } else if (!hasCreatedDefaultBlocks) {
      // New user - create default 2x2 grass blocks (only once)
      setHasCreatedDefaultBlocks(true);
      
      const positions = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 }
      ];

      // Create blocks in database
      const transactions = positions.map(pos => {
        const blockId = id();

        if (user) {
          return db.tx.blocks[blockId].update({
            x: pos.x,
            y: pos.y,
            z: 0,
            type: 'dirt'
          }).link({
            user: user.id
          });
        } else {
          return db.tx.blocks[blockId].update({
            x: pos.x,
            y: pos.y,
            z: 0,
            type: 'dirt',
            sessionId: effectiveSessionId
          });
        }
      });

      db.transact(transactions).catch(error => {
        console.error('Failed to create default blocks:', error);
        setHasCreatedDefaultBlocks(false); // Allow retry on error
      });
    }
  }, [data?.blocks, effectiveSessionId, user, hasCreatedDefaultBlocks]);

  // Preload block images
  useEffect(() => {
    const images: Record<string, HTMLImageElement> = {};
    let loadedCount = 0;
    const blockEntries = Object.entries(BLOCK_TYPES);
    // Add 1 for the tilled-grass image
    const totalImages = blockEntries.length + 1;

    if (blockEntries.length === 0) {
      setLoadedImages({});
      return;
    }

    // Preload all block images
    blockEntries.forEach(([blockId, blockType]) => {
      const img = new Image();
      img.onload = () => {
        images[blockId] = img;
        loadedCount++;
        if (loadedCount === totalImages) {
          setLoadedImages(images);
        }
      };
      img.onerror = () => {
        console.warn(`Failed to load image for ${blockType.name} from ${blockType.imagePath}`);
        loadedCount++;
        if (loadedCount === totalImages) {
          setLoadedImages(images);
        }
      };
      img.src = blockType.imagePath;
    });

    // Also preload the tilled-grass image for growing plants
    const tilledGrassImg = new Image();
    tilledGrassImg.onload = () => {
      images['tilled-grass'] = tilledGrassImg;
      loadedCount++;
      if (loadedCount === totalImages) {
        setLoadedImages(images);
      }
    };
    tilledGrassImg.onerror = () => {
      console.warn('Failed to load tilled-grass image');
      loadedCount++;
      if (loadedCount === totalImages) {
        setLoadedImages(images);
      }
    };
    tilledGrassImg.src = '/blocks/tilled-grass.png';
  }, []);

  // Convert world coordinates to screen coordinates
  const worldToScreen = useCallback((x: number, y: number, z: number) => {
    const tileWidth = TILE_CONFIG.width * camera.zoom;
    const tileHeight = TILE_CONFIG.height * camera.zoom;
    
    // This gives us the TOP point of the isometric tile
    const screenX = (x - y) * (tileWidth / 2) + camera.x + window.innerWidth / 2;
    const screenY = (x + y) * (tileHeight / 2) - z * (TILE_CONFIG.depth * camera.zoom) + camera.y + window.innerHeight / 2;
    
    return { x: screenX, y: screenY };
  }, [camera]);

  // Convert screen coordinates to world coordinates (fixed for better accuracy)
  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const tileWidth = TILE_CONFIG.width * camera.zoom;
    const tileHeight = TILE_CONFIG.height * camera.zoom;
    
    // Adjust for camera and center
    const adjustedX = screenX - camera.x - window.innerWidth / 2;
    const adjustedY = screenY - camera.y - window.innerHeight / 2;
    
    // Convert to world coordinates
    const x = (adjustedX / (tileWidth / 2) + adjustedY / (tileHeight / 2)) / 2;
    const y = (adjustedY / (tileHeight / 2) - adjustedX / (tileWidth / 2)) / 2;
    
    // Round to nearest integer for grid snapping
    return { x: Math.floor(x + 0.5), y: Math.floor(y + 0.5) };
  }, [camera]);

  // Draw grid indicator for hovered tile
  const drawHoveredTileIndicator = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!hoveredTile || isPanning) return;
    
    const { x: screenX, y: screenY } = worldToScreen(hoveredTile.x, hoveredTile.y, 0);
    const size = TILE_CONFIG.width * camera.zoom;
    const height = TILE_CONFIG.height * camera.zoom;
    
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    
    // Draw diamond outline
    ctx.beginPath();
    ctx.moveTo(screenX, screenY);
    ctx.lineTo(screenX + size / 2, screenY + height / 2);
    ctx.lineTo(screenX, screenY + height);
    ctx.lineTo(screenX - size / 2, screenY + height / 2);
    ctx.closePath();
    ctx.stroke();
    
    // Draw a semi-transparent preview
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fill();
    
    ctx.restore();
  }, [hoveredTile, isPanning, camera, worldToScreen]);

  // Draw a single block
  const drawBlock = useCallback((ctx: CanvasRenderingContext2D, block: Block) => {
    const { x: screenX, y: screenY } = worldToScreen(block.x, block.y, block.z);
    const size = TILE_CONFIG.width * camera.zoom;
    const height = TILE_CONFIG.height * camera.zoom;
    
    const isHovered = hoveredBlock === block.id;
    
    // Calculate animation progress if block was recently placed
    let animationScale = 1;
    let animationOffset = 0;
    if (block.placedAt) {
      const animationDuration = 300; // milliseconds
      const elapsed = Date.now() - block.placedAt;
      const progress = Math.min(elapsed / animationDuration, 1);
      
      // Smooth easing function for a subtle bounce
      const easeOutBack = (t: number) => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
      };
      
      animationScale = 0.85 + 0.15 * easeOutBack(progress);
      animationOffset = (1 - easeOutBack(progress)) * 15; // Start 15 pixels higher
    }
    

    
    // Determine which image to show based on growth status
    let imageToShow = block.type;
    const blockType = BLOCK_TYPES[block.type];
    
    // Check if this is a plant that needs to grow
    let img: HTMLImageElement | undefined;
    if (blockType && blockType.category === 'plant' && blockType.growthTime && block.plantedAt) {
      const daysSincePlanted = (Date.now() - block.plantedAt) / (1000 * 60 * 60 * 24);
      if (daysSincePlanted < blockType.growthTime) {
        // Show tilled grass image directly while growing
        img = loadedImages['tilled-grass'];
      }
    }
    
    // Use the block's image if not a growing plant
    if (!img) {
      img = loadedImages[imageToShow];
    }
    if (img) {
      // Draw the block image in isometric style
      ctx.save();
      
      // Apply animation transform
      ctx.translate(screenX, screenY - animationOffset);
      ctx.scale(animationScale, animationScale);
      ctx.translate(-screenX, -screenY + animationOffset);
      
      // Enable image smoothing for better quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      if (isHovered) {
        ctx.globalAlpha = 0.7; // 50% opacity when hovered
      }
      
      // Calculate the target area for the isometric cell
      const targetWidth = size;
      const targetHeight = height + TILE_CONFIG.depth * camera.zoom;
      
      // Determine if we're showing tilled grass
      const isShowingTilledGrass = img === loadedImages['tilled-grass'];
      
      // Use appropriate configuration based on what we're showing
      const imageScale = isShowingTilledGrass 
        ? TILLED_GRASS_CONFIG.imageScale 
        : (blockType?.imageScale ?? TILE_CONFIG.defaultImageScale);
      const yOffset = isShowingTilledGrass 
        ? TILLED_GRASS_CONFIG.yOffset 
        : (blockType?.yOffset ?? 0);
      
      // Calculate scaled dimensions maintaining aspect ratio
      const imgAspectRatio = img.width / img.height;
      const targetAspectRatio = targetWidth / targetHeight;
      
      let drawWidth, drawHeight;
      
      if (imgAspectRatio > targetAspectRatio) {
        // Image is wider than target - fit to width
        drawWidth = targetWidth * imageScale;
        drawHeight = (targetWidth * imageScale) / imgAspectRatio;
      } else {
        // Image is taller than target - fit to height
        drawHeight = targetHeight * imageScale;
        drawWidth = (targetHeight * imageScale) * imgAspectRatio;
      }
      
      // Center the image in the isometric cell with y-offset applied
      const drawX = screenX - drawWidth / 2;
      const drawY = screenY - drawHeight / 2 - yOffset * camera.zoom; // Apply y-offset scaled by zoom
      
      ctx.drawImage(
        img,
        drawX,
        drawY,
        drawWidth,
        drawHeight
      );
      
      // Remove the outline drawing - we'll just keep the hover effect on the image
      
      ctx.restore();
    }
  }, [camera, worldToScreen, hoveredBlock, loadedImages]);

  // Render the scene
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid lines for reference (subtle)
    ctx.strokeStyle = 'rgba(147, 196, 188, 0.2)'; // Change this! Format: rgba(red, green, blue, opacity)
    ctx.lineWidth = 1;
    
    // Calculate visible grid range
    const visibleRange = Math.ceil((Math.max(window.innerWidth, window.innerHeight) / (TILE_CONFIG.width * camera.zoom)) / 2) + 5;
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
    
    // Sort blocks by depth for proper rendering order
    const sortedBlocks = [...blocks].sort((a, b) => {
      const depthA = a.x + a.y + a.z * 100;
      const depthB = b.x + b.y + b.z * 100;
      return depthA - depthB;
    });
    
    // Draw all blocks
    sortedBlocks.forEach(block => drawBlock(ctx, block));
    
    // Draw hover indicator
    drawHoveredTileIndicator(ctx);
    
    // Draw dragged block preview
    if (isDragging && draggedBlock && hoveredTile) {
      ctx.save();
      ctx.globalAlpha = 0.6;
      
      // Draw the dragged block at the hovered position
      const previewBlock = {
        ...draggedBlock,
        x: hoveredTile.x,
        y: hoveredTile.y,
        placedAt: undefined // No animation for preview
      };
      drawBlock(ctx, previewBlock);
      
      ctx.restore();
    }
    
    // Coordinates display removed
  }, [blocks, camera, drawBlock, worldToScreen, drawHoveredTileIndicator, hoveredTile, isPanning]);

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      // Get device pixel ratio for sharp rendering on high-DPI displays
      const dpr = window.devicePixelRatio || 1;
      
      // Set canvas size accounting for device pixel ratio
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      
      // Scale canvas back down using CSS
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      
      // Scale the drawing context to match device pixel ratio
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
      
      render();
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, [render]);

  // Continuous render loop for smooth animations
  useEffect(() => {
    let animationId: number;
    
    const animate = () => {
      render();
      animationId = requestAnimationFrame(animate);
    };
    
    // Start the animation loop
    animationId = requestAnimationFrame(animate);
    
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [render]);

  // Handle mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      // Middle mouse or shift+left click for panning
      setIsPanning(true);
      setPanStart({ x: e.clientX - camera.x, y: e.clientY - camera.y });
    } else if (e.button === 0) {
      const { x, y } = screenToWorld(e.clientX, e.clientY);
      
      // Check if clicking on an existing block
      const existingBlock = blocks.find(b => b.x === x && b.y === y && b.z === 0);
      
      if (existingBlock && e.ctrlKey) {
        // Ctrl+click to start dragging a block
        setIsDragging(true);
        setDraggedBlock(existingBlock);
        // Remove the block from its current position
        setBlocks(blocks.filter(b => b.id !== existingBlock.id));
      } else if (existingBlock && !e.ctrlKey) {
        // Regular click on a block opens the slideover
        setSelectedBlock(existingBlock);
        setIsSlideoverOpen(true);
        // Prevent the click from propagating to avoid immediate closure
        e.stopPropagation();
      } else if (!existingBlock && !isDragging) {
        // Place a block from inventory if selected
        if (selectedInventoryBlock) {
          handlePlaceBlockFromInventory(x, y);
        }
        // Remove the else clause - no default placement without inventory selection
      }
    }
  };

  const handlePlaceBlockFromInventory = async (x: number, y: number) => {
    if (!selectedInventoryBlock || !effectiveSessionId) return;

    // Query for an unplaced block of this type
    const { data } = await db.queryOnce({
      blocks: {
        $: {
          where: user ? {
            'user.id': user.id,
            type: selectedInventoryBlock,
            x: { $isNull: true }
          } : {
            sessionId: effectiveSessionId,
            type: selectedInventoryBlock,
            x: { $isNull: true }
          },
          limit: 1
        }
      }
    });

    const unplacedBlock = data?.blocks?.[0];
    if (!unplacedBlock) {
      // No more blocks of this type
      setSelectedInventoryBlock(null);
      return;
    }

    // Get block type and current time
    const blockType = BLOCK_TYPES[selectedInventoryBlock as BlockTypeId];
    const now = Date.now();
    
    // Update the block in the database with its position
    const updateData: any = {
      x,
      y,
      z: 0
    };
    
    // If it's a plant being placed for the first time, set plantedAt
    if (blockType && blockType.category === 'plant' && !unplacedBlock.plantedAt) {
      updateData.plantedAt = new Date(now).toISOString();
    }
    
    await db.transact(
      db.tx.blocks[unplacedBlock.id].update(updateData)
    );

    posthog.capture('block_placed', {
      block_id: unplacedBlock.id,
      session_id: effectiveSessionId,
      block_type: selectedInventoryBlock
    })

    // Add to local state
    const newBlock: Block = {
      id: unplacedBlock.id,
      x,
      y,
      z: 0,
      type: selectedInventoryBlock as BlockTypeId,
      placedAt: now,
      // If it's a plant being placed for the first time, set plantedAt to now
      plantedAt: blockType && blockType.category === 'plant' && !unplacedBlock.plantedAt 
        ? now 
        : unplacedBlock.plantedAt ? new Date(unplacedBlock.plantedAt).getTime() : undefined
    };
    setBlocks([...blocks, newBlock]);
    
    // Clear selection if no more blocks of this type
    const { data: checkData } = await db.queryOnce({
      blocks: {
        $: {
          where: {
            sessionId: effectiveSessionId,
            type: selectedInventoryBlock,
            x: { $isNull: true }
          },
          limit: 1
        }
      }
    });
    
    if (!checkData?.blocks?.length) {
      setSelectedInventoryBlock(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setCamera({
        ...camera,
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    } else {
      // Update hovered tile
      const { x, y } = screenToWorld(e.clientX, e.clientY);
      setHoveredTile({ x, y });
      
      // Update hovered block
      const block = blocks.find(b => b.x === x && b.y === y && b.z === 0);
      setHoveredBlock(block?.id || null);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    setIsPanning(false);
    
    // If dragging a block, place it at the current position
    if (isDragging && draggedBlock) {
      const { x, y } = screenToWorld(e.clientX, e.clientY);
      
      // Check if position is already occupied
      const existingBlock = blocks.find(b => b.x === x && b.y === y && b.z === 0);
      
      if (!existingBlock) {
        // Place the dragged block at the new position
        const movedBlock: Block = {
          ...draggedBlock,
          x,
          y,
          placedAt: Date.now() // Trigger animation for moved block
        };
        setBlocks([...blocks, movedBlock]);
        
        // Update position in database
        db.transact(
          db.tx.blocks[movedBlock.id].update({
            x,
            y,
            z: 0
          })
        ).catch(error => {
          console.error('Failed to update block position in database:', error);
        });
      } else {
        // Position occupied, return block to original position
        setBlocks([...blocks, draggedBlock]);
      }
      
      setIsDragging(false);
      setDraggedBlock(null);
    }
  };

  const handleMouseLeave = () => {
    setIsPanning(false);
    setHoveredTile(null);
    setHoveredBlock(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomSpeed = 0.001;
    const newZoom = Math.max(0.5, Math.min(3, camera.zoom - e.deltaY * zoomSpeed));
    setCamera({ ...camera, zoom: newZoom });
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    // Right click disabled - blocks cannot be deleted, only moved
  };

  // Touch event handlers for mobile support
  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return null;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touches = e.touches;
    
    if (touches.length === 2) {
      // Two finger touch - prepare for pinch zoom
      const distance = getTouchDistance(touches);
      setTouchStartDistance(distance);
      e.preventDefault();
    } else if (touches.length === 1) {
      // Single touch
      const touch = touches[0];
      setTouchStartTime(Date.now());
      setLastTouchPosition({ x: touch.clientX, y: touch.clientY });
      
      // Check if touching a block
      const { x, y } = screenToWorld(touch.clientX, touch.clientY);
      const existingBlock = blocks.find(b => b.x === x && b.y === y && b.z === 0);
      
      if (existingBlock) {
        // Long press will allow dragging
        setTimeout(() => {
          if (Date.now() - touchStartTime > 500 && lastTouchPosition) {
            setIsTouchDragging(true);
            setDraggedBlock(existingBlock);
            setBlocks(blocks.filter(b => b.id !== existingBlock.id));
          }
        }, 500);
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touches = e.touches;
    
    if (touches.length === 2 && touchStartDistance !== null) {
      // Pinch zoom
      const currentDistance = getTouchDistance(touches);
      if (currentDistance !== null) {
        const scale = currentDistance / touchStartDistance;
        const newZoom = Math.max(0.5, Math.min(3, camera.zoom * scale));
        setCamera({ ...camera, zoom: newZoom });
        setTouchStartDistance(currentDistance);
      }
      e.preventDefault();
    } else if (touches.length === 1) {
      const touch = touches[0];
      
      if (isTouchDragging && draggedBlock) {
        // Update hover position for dragging
        const { x, y } = screenToWorld(touch.clientX, touch.clientY);
        setHoveredTile({ x, y });
      } else if (lastTouchPosition && !isTouchDragging) {
        // Pan the camera
        const deltaX = touch.clientX - lastTouchPosition.x;
        const deltaY = touch.clientY - lastTouchPosition.y;
        
        // Only start panning if moved more than 10 pixels
        if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
          setIsPanning(true);
          setCamera({
            ...camera,
            x: camera.x + deltaX,
            y: camera.y + deltaY
          });
          setLastTouchPosition({ x: touch.clientX, y: touch.clientY });
        }
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchDuration = Date.now() - touchStartTime;
    
    if (isTouchDragging && draggedBlock && hoveredTile) {
      // Complete the drag
      const existingBlock = blocks.find(b => b.x === hoveredTile.x && b.y === hoveredTile.y && b.z === 0);
      
      if (!existingBlock) {
        const movedBlock: Block = {
          ...draggedBlock,
          x: hoveredTile.x,
          y: hoveredTile.y,
          placedAt: Date.now()
        };
        setBlocks([...blocks, movedBlock]);
        
        db.transact(
          db.tx.blocks[movedBlock.id].update({
            x: hoveredTile.x,
            y: hoveredTile.y,
            z: 0
          })
        ).catch(error => {
          console.error('Failed to update block position in database:', error);
        });
      } else {
        setBlocks([...blocks, draggedBlock]);
      }
    } else if (!isPanning && touchDuration < 300 && lastTouchPosition) {
      // Short tap - treat as click
      const { x, y } = screenToWorld(lastTouchPosition.x, lastTouchPosition.y);
      const existingBlock = blocks.find(b => b.x === x && b.y === y && b.z === 0);
      
      if (existingBlock) {
        setSelectedBlock(existingBlock);
        setIsSlideoverOpen(true);
      } else if (selectedInventoryBlock) {
        handlePlaceBlockFromInventory(x, y);
      }
    }
    
    // Reset all touch states
    setTouchStartDistance(null);
    setTouchStartTime(0);
    setLastTouchPosition(null);
    setIsPanning(false);
    setIsTouchDragging(false);
    setDraggedBlock(null);
    setHoveredTile(null);
  };

  const handleUpdateBlock = (blockId: string, updates: Partial<Block>) => {
    setBlocks(blocks.map(b => b.id === blockId ? { ...b, ...updates } : b));
  };

  return (
    <div className="relative w-full h-screen overflow-hidden touch-none">
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 ${
          isDragging ? 'cursor-grabbing' : 
          hoveredBlock ? 'cursor-grab' : 
          'cursor-crosshair'
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
      

      {/* Selected Block Indicator */}
      {selectedInventoryBlock && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-3 flex items-center gap-2">
          <img
            src={BLOCK_TYPES[selectedInventoryBlock as BlockTypeId]?.imagePath}
            alt="Selected block"
            className="w-8 h-8 pixelated"
          />
          <div className="text-sm">
            <div className="font-medium">Placing:</div>
            <div className="text-xs text-gray-600">{BLOCK_TYPES[selectedInventoryBlock as BlockTypeId]?.name}</div>
          </div>
          <button
            onClick={() => setSelectedInventoryBlock(null)}
            className="ml-2 text-gray-400 hover:text-gray-600"
          >
            <XIcon size={16} weight="bold" />
          </button>
        </div>
      )}

      {/* UI Controls */}
      {/*
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 space-y-4">
        <div>
          <h3 className="font-bold text-lg mb-2">Garden Builder</h3>
          <p className="text-sm text-gray-600">
            Left click: Place | Ctrl+click: Move | Shift+drag: Pan | Scroll: Zoom
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Block Type:</label>
          <div className="space-y-2">
            {Object.entries(
              Object.entries(BLOCK_TYPES).reduce((acc, [id, block]) => {
                if (!acc[block.category]) acc[block.category] = [];
                acc[block.category].push({ ...block, id });
                return acc;
              }, {} as Record<string, Array<typeof BLOCK_TYPES[keyof typeof BLOCK_TYPES] & { id: string }>>)
            ).map(([category, blocks]) => (
              <div key={category}>
                <p className="text-xs text-gray-500 mb-1 capitalize">{category}</p>
                <div className="flex flex-wrap gap-2">
                  {blocks.map((block) => (
                    <button
                      key={block.id}
                      onClick={() => setSelectedBlockType(block.id as BlockTypeId)}
                      className={`px-3 py-1 rounded text-sm ${
                        selectedBlockType === block.id
                          ? category === 'terrain' ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'
                          : 'bg-gray-200 hover:bg-gray-300'
                      }`}
                    >
                      {block.name}
                      {loadedImages[block.id] && <span className="ml-1">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        
        <div className="text-sm text-gray-600">
          <p>Blocks: {blocks.length}</p>
          <p className="text-xs mt-1">Canvas: Infinite ∞</p>
          {Object.keys(loadedImages).length > 0 && (
            <p className="text-xs text-green-600 mt-1">
              ✓ {Object.keys(loadedImages).length} images loaded
            </p>
          )}
        </div>
      </div> 
      */}


      {/* Block Slideover */}
      <BlockSlideover
        block={selectedBlock}
        isOpen={isSlideoverOpen}
        onClose={() => {
          setIsSlideoverOpen(false);
          setSelectedBlock(null);
        }}
        onUpdateBlock={handleUpdateBlock}
      />

      {/* Main Slideover */}
      <MainSlideover
        isOpen={isMainSlideoverOpen}
        onClose={() => setIsMainSlideoverOpen(false)}
        selectedBlockType={selectedInventoryBlock}
        onSelectBlockType={setSelectedInventoryBlock}
      />

      {/* Mobile Instructions Overlay */}
      {showMobileInstructions && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h2 className="text-lg font-bold mb-4">Welcome to Growdoro! 🌱</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-lg">👆</span>
                <div>
                  <p className="font-medium">Tap</p>
                  <p className="text-gray-600">Select blocks or place from inventory</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-lg">👆➡️</span>
                <div>
                  <p className="font-medium">Drag</p>
                  <p className="text-gray-600">Pan around the garden</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-lg">🤏</span>
                <div>
                  <p className="font-medium">Pinch</p>
                  <p className="text-gray-600">Zoom in and out</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-lg">👆💤</span>
                <div>
                  <p className="font-medium">Long Press</p>
                  <p className="text-gray-600">Hold on a block to move it</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setShowMobileInstructions(false);
                localStorage.setItem('growdoro_mobile_instructions_seen', 'true');
              }}
              className="mt-6 w-full bg-green-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-600 transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default IsometricGarden; 