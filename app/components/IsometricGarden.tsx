'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

interface Block {
  id: string;
  x: number;
  y: number;
  z: number;
  type: 'grass' | 'dirt' | 'stone' | 'flower' | 'tree' | 'bush' | 'morning-glory';
}

interface Camera {
  x: number;
  y: number;
  zoom: number;
}

// Block image configuration - add paths for any blocks you want to use images for
const BLOCK_IMAGES = {
  'morning-glory': '/plants/morning-glory.png',
  'dirt': '/blocks/dirt.png',
  // Add more block images here as needed:
  // 'grass': '/blocks/grass.png',
  // 'stone': '/blocks/stone.png',
  // 'flower': '/plants/flower.png',
  // 'tree': '/plants/tree.png',
  // 'bush': '/plants/bush.png',
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
  const [selectedBlockType, setSelectedBlockType] = useState<Block['type']>('grass');
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [hoveredBlock, setHoveredBlock] = useState<string | null>(null);
  const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number } | null>(null);
  const [loadedImages, setLoadedImages] = useState<Record<string, HTMLImageElement>>({});

  // Preload block images
  useEffect(() => {
    const images: Record<string, HTMLImageElement> = {};
    let loadedCount = 0;
    const totalImages = Object.keys(BLOCK_IMAGES).length;

    if (totalImages === 0) {
      setLoadedImages({});
      return;
    }

    Object.entries(BLOCK_IMAGES).forEach(([blockType, src]) => {
      const img = new Image();
      img.onload = () => {
        images[blockType] = img;
        loadedCount++;
        if (loadedCount === totalImages) {
          setLoadedImages(images);
        }
      };
      img.onerror = () => {
        console.warn(`Failed to load image for ${blockType} from ${src}`);
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
    
    // This gives us the TOP point of the isometric tile
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
    
    // Draw a semi-transparent preview
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fill();
    
    ctx.restore();
  }, [hoveredTile, isPanning, camera, worldToScreen]);

  // Draw a single block
  const drawBlock = useCallback((ctx: CanvasRenderingContext2D, block: Block) => {
    const { x: screenX, y: screenY } = worldToScreen(block.x, block.y, block.z);
    const size = 76 * camera.zoom;
    const height = 36 * camera.zoom;
    
    const isHovered = hoveredBlock === block.id;
    
    // Check if this block has an image
    if (loadedImages[block.type]) {
      // Draw the block image in isometric style
      ctx.save();
      
      if (isHovered) {
        ctx.globalAlpha = 0.8;
      }
      
      const img = loadedImages[block.type];
      const imgWidth = size;
      const imgHeight = size;
      
      // Image should sit on the tile - its bottom should be at screenY + height
      ctx.drawImage(
        img,
        screenX - imgWidth / 2,
        screenY + height - imgHeight,
        imgWidth,
        imgHeight
      );
      
      // Draw outline if hovered
      if (isHovered) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        
        // Draw isometric outline at the tile position
        ctx.beginPath();
        ctx.moveTo(screenX, screenY);
        ctx.lineTo(screenX + size / 2, screenY + height / 2);
        ctx.lineTo(screenX, screenY + height);
        ctx.lineTo(screenX - size / 2, screenY + height / 2);
        ctx.closePath();
        ctx.stroke();
      }
      
      ctx.restore();
    } else {
      // Draw regular blocks without images
      
      // Block colors
      const colors: Record<string, { top: string; side1: string; side2: string }> = {
        grass: { top: '#7ec850', side1: '#5ea838', side2: '#4e8830' },
        dirt: { top: '#b8886f', side1: '#966e58', side2: '#7a5a48' },
        stone: { top: '#a0a0a0', side1: '#808080', side2: '#606060' },
        flower: { top: '#ff6b9d', side1: '#e85a8c', side2: '#d1497b' },
        tree: { top: '#228b22', side1: '#1a6b1a', side2: '#125012' },
        bush: { top: '#3cb371', side1: '#2ca25f', side2: '#1c914e' },
        'morning-glory': { top: '#7b9ff2', side1: '#6a8ee1', side2: '#597dd0' }
      };
      
      const color = colors[block.type] || colors.grass;
      
      // Draw block faces
      ctx.save();
      
      if (isHovered) {
        ctx.globalAlpha = 0.8;
      }
      
      // Top face of the block
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
      
      // Draw simple plant decorations on top for plant blocks
      if (['flower', 'tree', 'bush'].includes(block.type)) {
        ctx.save();
        const plantSize = size * 0.4;
        
        switch (block.type) {
          case 'flower':
            // Draw simple flower
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(screenX, screenY + height / 2, plantSize * 0.3, 0, Math.PI * 2);
            ctx.fill();
            break;
            
          case 'tree':
            // Draw simple tree shape
            ctx.fillStyle = '#0f5f0f';
            ctx.beginPath();
            ctx.moveTo(screenX, screenY);
            ctx.lineTo(screenX + plantSize / 2, screenY + height / 2);
            ctx.lineTo(screenX - plantSize / 2, screenY + height / 2);
            ctx.closePath();
            ctx.fill();
            break;
            
          case 'bush':
            // Draw simple circles for bush
            ctx.fillStyle = '#2a8a4a';
            ctx.beginPath();
            ctx.arc(screenX - plantSize * 0.2, screenY + height / 2, plantSize * 0.2, 0, Math.PI * 2);
            ctx.arc(screenX + plantSize * 0.2, screenY + height / 2, plantSize * 0.2, 0, Math.PI * 2);
            ctx.fill();
            break;
        }
        
        ctx.restore();
      }
      
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
      // Left click for placing blocks
      const { x, y } = screenToWorld(e.clientX, e.clientY);
      
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
          <label className="block text-sm font-medium mb-2">Block Type:</label>
          <div className="grid grid-cols-2 gap-2">
            {/* Terrain blocks */}
            <div className="col-span-2">
              <p className="text-xs text-gray-500 mb-1">Terrain</p>
              <div className="flex gap-2">
                {(['grass', 'dirt', 'stone'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setSelectedBlockType(type)}
                    className={`px-3 py-1 rounded capitalize text-sm ${
                      selectedBlockType === type 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                  >
                    {type}
                    {loadedImages[type] && <span className="ml-1">🖼️</span>}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Plant blocks */}
            <div className="col-span-2">
              <p className="text-xs text-gray-500 mb-1">Plants</p>
              <div className="flex flex-wrap gap-2">
                {(['flower', 'tree', 'bush', 'morning-glory'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setSelectedBlockType(type)}
                    className={`px-3 py-1 rounded capitalize text-sm ${
                      selectedBlockType === type 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                  >
                    {type === 'morning-glory' ? 'Morning Glory' : type}
                    {loadedImages[type] && <span className="ml-1">🖼️</span>}
                  </button>
                ))}
              </div>
            </div>
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

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-md">
        <h4 className="font-semibold mb-2">Custom Block Images:</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <p>To add custom images for blocks:</p>
          <ul className="list-disc list-inside ml-2">
            <li>Morning Glory: <code className="bg-gray-100 px-1 text-xs">public/plants/morning-glory.png</code></li>
            <li>Dirt: <code className="bg-gray-100 px-1 text-xs">public/blocks/dirt.png</code></li>
            <li>Add more in <code className="bg-gray-100 px-1 text-xs">BLOCK_IMAGES</code> config</li>
          </ul>
          <p className="text-xs mt-2">Blocks with images show 🖼️ icon</p>
        </div>
      </div>
    </div>
  );
};

export default IsometricGarden; 