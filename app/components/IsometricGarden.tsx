'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

interface Block {
  id: string;
  x: number;
  y: number;
  z: number;
  type: 'grass' | 'dirt' | 'stone';
  plant?: 'flower' | 'tree' | 'bush' | null;
}

interface Camera {
  x: number;
  y: number;
  zoom: number;
}

// Plant image configuration
const PLANT_IMAGES = {
  flower: '/plants/flower.png',
  tree: '/plants/tree.png',
  bush: '/plants/bush.png'
};

const IsometricGarden: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [blocks, setBlocks] = useState<Block[]>([
    { id: '1', x: 0, y: 0, z: 0, type: 'grass' },
    { id: '2', x: 1, y: 0, z: 0, type: 'grass' },
    { id: '3', x: 0, y: 1, z: 0, type: 'grass' },
    { id: '4', x: 1, y: 1, z: 0, type: 'grass' },
  ]);
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const [selectedTool, setSelectedTool] = useState<'block' | 'plant'>('block');
  const [selectedBlockType, setSelectedBlockType] = useState<'grass' | 'dirt' | 'stone'>('grass');
  const [selectedPlantType, setSelectedPlantType] = useState<'flower' | 'tree' | 'bush'>('flower');
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [hoveredBlock, setHoveredBlock] = useState<string | null>(null);
  const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number } | null>(null);
  const [loadedImages, setLoadedImages] = useState<Record<string, HTMLImageElement>>({});
  const [useImages, setUseImages] = useState(false);

  // Preload plant images
  useEffect(() => {
    const images: Record<string, HTMLImageElement> = {};
    let loadedCount = 0;
    const totalImages = Object.keys(PLANT_IMAGES).length;

    Object.entries(PLANT_IMAGES).forEach(([plantType, src]) => {
      const img = new Image();
      img.onload = () => {
        images[plantType] = img;
        loadedCount++;
        if (loadedCount === totalImages) {
          setLoadedImages(images);
        }
      };
      img.onerror = () => {
        console.warn(`Failed to load image for ${plantType}`);
        loadedCount++;
        if (loadedCount === totalImages) {
          setLoadedImages(images);
        }
      };
      img.src = src;
    });
  }, []);

  // Convert world coordinates to screen coordinates
  const worldToScreen = useCallback((x: number, y: number, z: number) => {
    const tileWidth = 64 * camera.zoom;
    const tileHeight = 32 * camera.zoom;
    
    const screenX = (x - y) * (tileWidth / 2) + camera.x + window.innerWidth / 2;
    const screenY = (x + y) * (tileHeight / 2) - z * (tileHeight) + camera.y + window.innerHeight / 2;
    
    return { x: screenX, y: screenY };
  }, [camera]);

  // Convert screen coordinates to world coordinates (fixed for better accuracy)
  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const tileWidth = 64 * camera.zoom;
    const tileHeight = 32 * camera.zoom;
    
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
    const size = 64 * camera.zoom;
    const height = 32 * camera.zoom;
    
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
    
    // Draw a semi-transparent preview if placing a block
    if (selectedTool === 'block') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fill();
    }
    
    ctx.restore();
  }, [hoveredTile, isPanning, camera, worldToScreen, selectedTool]);

  // Draw a single block
  const drawBlock = useCallback((ctx: CanvasRenderingContext2D, block: Block) => {
    const { x: screenX, y: screenY } = worldToScreen(block.x, block.y, block.z);
    const size = 64 * camera.zoom;
    const height = 32 * camera.zoom;
    
    // Block colors
    const colors = {
      grass: { top: '#7ec850', side1: '#5ea838', side2: '#4e8830' },
      dirt: { top: '#b8886f', side1: '#966e58', side2: '#7a5a48' },
      stone: { top: '#a0a0a0', side1: '#808080', side2: '#606060' }
    };
    
    const color = colors[block.type];
    const isHovered = hoveredBlock === block.id;
    
    // Draw block faces
    ctx.save();
    
    if (isHovered) {
      ctx.globalAlpha = 0.8;
    }
    
    // Top face
    ctx.fillStyle = color.top;
    ctx.beginPath();
    ctx.moveTo(screenX, screenY);
    ctx.lineTo(screenX + size / 2, screenY + height / 2);
    ctx.lineTo(screenX, screenY + height);
    ctx.lineTo(screenX - size / 2, screenY + height / 2);
    ctx.closePath();
    ctx.fill();
    
    // Right face
    ctx.fillStyle = color.side1;
    ctx.beginPath();
    ctx.moveTo(screenX, screenY + height);
    ctx.lineTo(screenX + size / 2, screenY + height / 2);
    ctx.lineTo(screenX + size / 2, screenY + height / 2 + height);
    ctx.lineTo(screenX, screenY + height + height);
    ctx.closePath();
    ctx.fill();
    
    // Left face
    ctx.fillStyle = color.side2;
    ctx.beginPath();
    ctx.moveTo(screenX, screenY + height);
    ctx.lineTo(screenX - size / 2, screenY + height / 2);
    ctx.lineTo(screenX - size / 2, screenY + height / 2 + height);
    ctx.lineTo(screenX, screenY + height + height);
    ctx.closePath();
    ctx.fill();
    
    // Draw outline if hovered
    if (isHovered) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(screenX, screenY);
      ctx.lineTo(screenX + size / 2, screenY + height / 2);
      ctx.lineTo(screenX, screenY + height);
      ctx.lineTo(screenX - size / 2, screenY + height / 2);
      ctx.closePath();
      ctx.stroke();
    }
    
    ctx.restore();
    
    // Draw plant if exists
    if (block.plant) {
      drawPlant(ctx, block);
    }
  }, [camera, worldToScreen, hoveredBlock]);

  // Draw plants on blocks
  const drawPlant = useCallback((ctx: CanvasRenderingContext2D, block: Block) => {
    if (!block.plant) return;
    
    const { x: screenX, y: screenY } = worldToScreen(block.x, block.y, block.z + 1);
    const size = 32 * camera.zoom;
    
    ctx.save();
    
    // Try to use image if available and enabled
    if (useImages && loadedImages[block.plant]) {
      const img = loadedImages[block.plant];
      const imgSize = size * 2;
      ctx.drawImage(
        img,
        screenX - imgSize / 2,
        screenY - imgSize,
        imgSize,
        imgSize
      );
    } else {
      // Fallback to canvas drawings
      switch (block.plant) {
        case 'flower':
          // Draw flower stem
          ctx.strokeStyle = '#2d5016';
          ctx.lineWidth = 3 * camera.zoom;
          ctx.beginPath();
          ctx.moveTo(screenX, screenY);
          ctx.lineTo(screenX, screenY - size);
          ctx.stroke();
          
          // Draw flower petals
          ctx.fillStyle = '#ff6b9d';
          for (let i = 0; i < 5; i++) {
            const angle = (i * 72 * Math.PI) / 180;
            const petalX = screenX + Math.cos(angle) * size * 0.3;
            const petalY = screenY - size + Math.sin(angle) * size * 0.3;
            ctx.beginPath();
            ctx.arc(petalX, petalY, size * 0.2, 0, Math.PI * 2);
            ctx.fill();
          }
          
          // Draw flower center
          ctx.fillStyle = '#ffd93d';
          ctx.beginPath();
          ctx.arc(screenX, screenY - size, size * 0.15, 0, Math.PI * 2);
          ctx.fill();
          break;
          
        case 'tree':
          // Draw tree trunk
          ctx.fillStyle = '#8b4513';
          ctx.fillRect(screenX - size * 0.15, screenY - size * 1.5, size * 0.3, size * 1.5);
          
          // Draw tree leaves
          ctx.fillStyle = '#228b22';
          ctx.beginPath();
          ctx.arc(screenX, screenY - size * 1.8, size * 0.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(screenX - size * 0.4, screenY - size * 1.5, size * 0.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(screenX + size * 0.4, screenY - size * 1.5, size * 0.6, 0, Math.PI * 2);
          ctx.fill();
          break;
          
        case 'bush':
          // Draw bush
          ctx.fillStyle = '#3cb371';
          ctx.beginPath();
          ctx.arc(screenX, screenY - size * 0.3, size * 0.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(screenX - size * 0.3, screenY - size * 0.2, size * 0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(screenX + size * 0.3, screenY - size * 0.2, size * 0.4, 0, Math.PI * 2);
          ctx.fill();
          break;
      }
    }
    
    ctx.restore();
  }, [camera, worldToScreen, loadedImages, useImages]);

  // Render the scene
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid lines for reference (subtle)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.lineWidth = 1;
    
    // Calculate visible grid range
    const visibleRange = Math.ceil((Math.max(window.innerWidth, window.innerHeight) / (64 * camera.zoom)) / 2) + 5;
    const centerX = -Math.floor(camera.x / (64 * camera.zoom));
    const centerY = -Math.floor(camera.y / (32 * camera.zoom));
    
    for (let x = centerX - visibleRange; x <= centerX + visibleRange; x++) {
      for (let y = centerY - visibleRange; y <= centerY + visibleRange; y++) {
        const { x: screenX, y: screenY } = worldToScreen(x, y, 0);
        const size = 64 * camera.zoom;
        const height = 32 * camera.zoom;
        
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
    
    // Draw coordinates in corner
    if (hoveredTile && !isPanning) {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(window.innerWidth - 120, 10, 110, 30);
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px monospace';
      ctx.fillText(`X: ${hoveredTile.x}, Y: ${hoveredTile.y}`, window.innerWidth - 110, 30);
      ctx.restore();
    }
  }, [blocks, camera, drawBlock, worldToScreen, drawHoveredTileIndicator, hoveredTile, isPanning]);

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      render();
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, [render]);

  // Render loop
  useEffect(() => {
    render();
  }, [render]);

  // Handle mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      // Middle mouse or shift+left click for panning
      setIsPanning(true);
      setPanStart({ x: e.clientX - camera.x, y: e.clientY - camera.y });
    } else if (e.button === 0) {
      // Left click for placing blocks/plants
      const { x, y } = screenToWorld(e.clientX, e.clientY);
      
      if (selectedTool === 'block') {
        // Check if block already exists at this position
        const existingBlock = blocks.find(b => b.x === x && b.y === y && b.z === 0);
        if (!existingBlock) {
          const newBlock: Block = {
            id: Date.now().toString(),
            x,
            y,
            z: 0,
            type: selectedBlockType
          };
          setBlocks([...blocks, newBlock]);
        }
      } else if (selectedTool === 'plant') {
        // Find block at this position to plant on
        const targetBlock = blocks.find(b => b.x === x && b.y === y && b.z === 0);
        if (targetBlock && targetBlock.type === 'grass') {
          setBlocks(blocks.map(b => 
            b.id === targetBlock.id 
              ? { ...b, plant: selectedPlantType }
              : b
          ));
        }
      }
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
    const newZoom = Math.max(0.5, Math.min(3, camera.zoom - e.deltaY * zoomSpeed));
    setCamera({ ...camera, zoom: newZoom });
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    // Right click to remove blocks
    const { x, y } = screenToWorld(e.clientX, e.clientY);
    setBlocks(blocks.filter(b => !(b.x === x && b.y === y && b.z === 0)));
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
      />
      
      {/* UI Controls */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 space-y-4">
        <div>
          <h3 className="font-bold text-lg mb-2">Garden Builder</h3>
          <p className="text-sm text-gray-600">
            Left click: Place | Right click: Remove | Middle/Shift+drag: Pan | Scroll: Zoom
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Tool:</label>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedTool('block')}
              className={`px-3 py-1 rounded ${
                selectedTool === 'block' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Block
            </button>
            <button
              onClick={() => setSelectedTool('plant')}
              className={`px-3 py-1 rounded ${
                selectedTool === 'plant' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Plant
            </button>
          </div>
        </div>
        
        {selectedTool === 'block' && (
          <div>
            <label className="block text-sm font-medium mb-2">Block Type:</label>
            <div className="flex gap-2">
              {(['grass', 'dirt', 'stone'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setSelectedBlockType(type)}
                  className={`px-3 py-1 rounded capitalize ${
                    selectedBlockType === type 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {selectedTool === 'plant' && (
          <div>
            <label className="block text-sm font-medium mb-2">Plant Type:</label>
            <div className="flex gap-2">
              {(['flower', 'tree', 'bush'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setSelectedPlantType(type)}
                  className={`px-3 py-1 rounded capitalize ${
                    selectedPlantType === type 
                      ? 'bg-green-500 text-white' 
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        )}
        
        <div className="text-sm text-gray-600">
          <p>Blocks: {blocks.length}</p>
          <p>Plants: {blocks.filter(b => b.plant).length}</p>
          <p className="text-xs mt-1">Canvas: Infinite ∞</p>
        </div>

        {/* Toggle for using images */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="useImages"
            checked={useImages}
            onChange={(e) => setUseImages(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="useImages" className="text-sm">
            Use image sprites
            {Object.keys(loadedImages).length > 0 && 
              <span className="text-green-600 ml-1">
                ({Object.keys(loadedImages).length} loaded)
              </span>
            }
          </label>
        </div>
      </div>

      {/* Instructions for adding custom images */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-md">
        <h4 className="font-semibold mb-2">Adding Custom Plant Images:</h4>
        <ol className="text-sm text-gray-600 space-y-1">
          <li>1. Create a <code className="bg-gray-100 px-1">public/plants/</code> folder</li>
          <li>2. Add your plant images: <code className="bg-gray-100 px-1">flower.png</code>, <code className="bg-gray-100 px-1">tree.png</code>, <code className="bg-gray-100 px-1">bush.png</code></li>
          <li>3. Toggle "Use image sprites" to see them</li>
          <li>4. Images should be square with transparent backgrounds</li>
        </ol>
      </div>
    </div>
  );
};

export default IsometricGarden; 