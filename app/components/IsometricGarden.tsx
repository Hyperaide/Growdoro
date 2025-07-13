'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BLOCK_TYPES, TILE_CONFIG, BlockTypeId } from '../constants/blocks';
import BlockSlideover from './BlockSlideover';
import MainSlideover from './MainSlideover';
import { HourglassIcon } from '@phosphor-icons/react';
import { db } from '../../lib/db';
import { id } from '@instantdb/react';
import { XIcon } from '@phosphor-icons/react';

interface Block {
  id: string;
  x: number;
  y: number;
  z: number;
  type: BlockTypeId;
  placedAt?: number; // Timestamp when block was placed for animation
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
  const [selectedBlockType, setSelectedBlockType] = useState<BlockTypeId>('dirt');
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [hoveredBlock, setHoveredBlock] = useState<string | null>(null);
  const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number } | null>(null);
  const [loadedImages, setLoadedImages] = useState<Record<string, HTMLImageElement>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [draggedBlock, setDraggedBlock] = useState<Block | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [isSlideoverOpen, setIsSlideoverOpen] = useState(false);
  const [isMainSlideoverOpen, setIsMainSlideoverOpen] = useState(false);
  const [selectedInventoryBlock, setSelectedInventoryBlock] = useState<string | null>(null);
  const [browserSessionId, setBrowserSessionId] = useState<string>('');

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

  // Preload block images
  useEffect(() => {
    const images: Record<string, HTMLImageElement> = {};
    let loadedCount = 0;
    const blockEntries = Object.entries(BLOCK_TYPES);
    const totalImages = blockEntries.length;

    if (totalImages === 0) {
      setLoadedImages({});
      return;
    }

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
    
    // All blocks must have images now
    const img = loadedImages[block.type];
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
        ctx.globalAlpha = 0.8;
      }
      
      // Calculate the target area for the isometric cell
      const targetWidth = size;
      const targetHeight = height + TILE_CONFIG.depth * camera.zoom;
      
      // Calculate scaled dimensions maintaining aspect ratio
      const imgAspectRatio = img.width / img.height;
      const targetAspectRatio = targetWidth / targetHeight;
      
      let drawWidth, drawHeight;
      
      if (imgAspectRatio > targetAspectRatio) {
        // Image is wider than target - fit to width
        drawWidth = targetWidth * TILE_CONFIG.imageScale;
        drawHeight = (targetWidth * TILE_CONFIG.imageScale) / imgAspectRatio;
      } else {
        // Image is taller than target - fit to height
        drawHeight = targetHeight * TILE_CONFIG.imageScale;
        drawWidth = (targetHeight * TILE_CONFIG.imageScale) * imgAspectRatio;
      }
      
      // Center the image in the isometric cell
      const drawX = screenX - drawWidth / 2;
      const drawY = screenY + (targetHeight - drawHeight) / 2;
      
      ctx.drawImage(
        img,
        drawX,
        drawY,
        drawWidth,
        drawHeight
      );
      
      // Draw outline if hovered
      if (isHovered) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        
        // Draw full block outline including depth
        // Top diamond
        ctx.beginPath();
        ctx.moveTo(screenX, screenY);
        ctx.lineTo(screenX + size / 2, screenY + height / 2);
        ctx.lineTo(screenX, screenY + height);
        ctx.lineTo(screenX - size / 2, screenY + height / 2);
        ctx.closePath();
        ctx.stroke();
        
        // Vertical edges
        ctx.beginPath();
        ctx.moveTo(screenX + size / 2, screenY + height / 2);
        ctx.lineTo(screenX + size / 2, screenY + height / 2 + TILE_CONFIG.depth * camera.zoom);
        ctx.moveTo(screenX, screenY + height);
        ctx.lineTo(screenX, screenY + height + TILE_CONFIG.depth * camera.zoom);
        ctx.moveTo(screenX - size / 2, screenY + height / 2);
        ctx.lineTo(screenX - size / 2, screenY + height / 2 + TILE_CONFIG.depth * camera.zoom);
        ctx.stroke();
      }
      
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
      } else if (!existingBlock && !isDragging) {
        // Place a block from inventory if selected
        if (selectedInventoryBlock) {
          handlePlaceBlockFromInventory(x, y);
        } else {
          // Regular click to place a new block
          const newBlock: Block = {
            id: Date.now().toString(),
            x,
            y,
            z: 0,
            type: selectedBlockType,
            placedAt: Date.now()
          };
          setBlocks([...blocks, newBlock]);
        }
      }
    }
  };

  const handlePlaceBlockFromInventory = async (x: number, y: number) => {
    if (!selectedInventoryBlock || !browserSessionId) return;

    // Query for an unplaced block of this type
    const { data } = await db.queryOnce({
      blocks: {
        $: {
          where: {
            sessionId: browserSessionId,
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

    // Update the block in the database with its position
    await db.transact(
      db.tx.blocks[unplacedBlock.id].update({
        x,
        y,
        z: 0
      })
    );

    // Add to local state
    const newBlock: Block = {
      id: unplacedBlock.id,
      x,
      y,
      z: 0,
      type: selectedInventoryBlock as BlockTypeId,
      placedAt: Date.now()
    };
    setBlocks([...blocks, newBlock]);
    
    // Clear selection if no more blocks of this type
    const { data: checkData } = await db.queryOnce({
      blocks: {
        $: {
          where: {
            sessionId: browserSessionId,
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
    // Right click to remove blocks
    const { x, y } = screenToWorld(e.clientX, e.clientY);
    setBlocks(blocks.filter(b => !(b.x === x && b.y === y && b.z === 0)));
  };

  const handleDeleteBlock = (blockId: string) => {
    setBlocks(blocks.filter(b => b.id !== blockId));
  };

  const handleUpdateBlock = (blockId: string, updates: Partial<Block>) => {
    setBlocks(blocks.map(b => b.id === blockId ? { ...b, ...updates } : b));
  };

  const handleDuplicateBlock = (block: Block) => {
    // Find an empty spot near the original block
    let offsetX = 1;
    let offsetY = 0;
    let newX = block.x + offsetX;
    let newY = block.y + offsetY;
    
    // Check for empty spot in a spiral pattern
    while (blocks.some(b => b.x === newX && b.y === newY && b.z === 0)) {
      if (offsetX === 1 && offsetY === 0) {
        offsetX = 0; offsetY = 1;
      } else if (offsetX === 0 && offsetY === 1) {
        offsetX = -1; offsetY = 0;
      } else if (offsetX === -1 && offsetY === 0) {
        offsetX = 0; offsetY = -1;
      } else if (offsetX === 0 && offsetY === -1) {
        offsetX = 2; offsetY = 0;
      } else {
        // Continue spiral pattern
        offsetX += 1;
      }
      newX = block.x + offsetX;
      newY = block.y + offsetY;
    }
    
    const duplicatedBlock: Block = {
      ...block,
      id: Date.now().toString(),
      x: newX,
      y: newY,
      placedAt: Date.now()
    };
    
    setBlocks([...blocks, duplicatedBlock]);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
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
      />
      
      {/* Menu Button */}
      <button
        onClick={() => setIsMainSlideoverOpen(true)}
        className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 hover:bg-gray-50 transition-colors"
        aria-label="Open menu"
      >
        <HourglassIcon size={20} weight="fill" className="text-gray-800" />
      </button>

      {/* Selected Block Indicator */}
      {selectedInventoryBlock && (
        <div className="absolute top-4 left-20 bg-white rounded-lg shadow-lg p-3 flex items-center gap-2">
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
            Left click: Place | Ctrl+click: Move | Right click: Remove | Shift+drag: Pan | Scroll: Zoom
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
        onDelete={handleDeleteBlock}
        onUpdateBlock={handleUpdateBlock}
        onDuplicateBlock={handleDuplicateBlock}
      />

      {/* Main Slideover */}
      <MainSlideover
        isOpen={isMainSlideoverOpen}
        onClose={() => setIsMainSlideoverOpen(false)}
        selectedBlockType={selectedInventoryBlock}
        onSelectBlockType={setSelectedInventoryBlock}
      />


    </div>
  );
};

export default IsometricGarden; 