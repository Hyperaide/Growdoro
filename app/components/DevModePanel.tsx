"use client";

import React, { useState } from "react";
import { XIcon, PackageIcon, SparkleIcon } from "@phosphor-icons/react";
import { BLOCK_TYPES, BlockTypeId, getBlockDisplayImage } from "../constants/blocks";
import { db } from "../../lib/db";
import { id } from "@instantdb/react";
import { useAuth } from "../contexts/auth-context";

interface DevModePanelProps {
  isOpen: boolean;
  onClose: () => void;
  instantGrowth: boolean;
  onInstantGrowthChange: (enabled: boolean) => void;
}

export default function DevModePanel({
  isOpen,
  onClose,
  instantGrowth,
  onInstantGrowthChange,
}: DevModePanelProps) {
  const { user, sessionId } = useAuth();
  const effectiveSessionId = user?.id || sessionId;
  const [addingBlock, setAddingBlock] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddBlock = async (blockTypeId: BlockTypeId) => {
    if (!effectiveSessionId || addingBlock) return;

    setAddingBlock(blockTypeId);
    try {
      const blockId = id();
      const transaction = user
        ? db.tx.blocks[blockId]
            .update({
              type: blockTypeId,
            })
            .link({
              user: user.id,
            })
        : db.tx.blocks[blockId].update({
            type: blockTypeId,
            sessionId: effectiveSessionId,
          });

      await db.transact(transaction);
    } catch (error) {
      console.error("Failed to add block:", error);
      alert("Failed to add block. Please try again.");
    } finally {
      setAddingBlock(null);
    }
  };

  const blockEntries = Object.entries(BLOCK_TYPES) as [BlockTypeId, typeof BLOCK_TYPES[BlockTypeId]][];

  return (
    <div className="fixed top-2 right-2 w-96 max-h-[80vh] bg-white rounded-xl shadow-2xl z-[100] overflow-hidden flex flex-col border-2 border-purple-500">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SparkleIcon size={20} weight="fill" />
          <h2 className="font-semibold text-lg">Dev Mode</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-purple-800 rounded transition-colors"
        >
          <XIcon size={20} weight="bold" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Instant Growth Toggle */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <div className="font-semibold text-sm text-gray-800">
                Instant Growth
              </div>
              <div className="text-xs text-gray-600 mt-1">
                All plants will be fully grown when placed
              </div>
            </div>
            <input
              type="checkbox"
              checked={instantGrowth}
              onChange={(e) => onInstantGrowthChange(e.target.checked)}
              className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
            />
          </label>
        </div>

        {/* Block Selector */}
        <div>
          <h3 className="font-semibold text-sm text-gray-800 mb-2">
            Add Blocks to Inventory
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {blockEntries.map(([blockId, blockType]) => (
              <button
                key={blockId}
                onClick={() => handleAddBlock(blockId)}
                disabled={addingBlock === blockId}
                className="bg-gray-50 hover:bg-gray-100 rounded-lg p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200"
              >
                <div className="flex flex-col items-center gap-1">
                  <img
                    src={getBlockDisplayImage(blockType) || ""}
                    alt={blockType.name}
                    className="w-12 h-12 pixelated"
                  />
                  <div className="text-xs font-medium text-gray-700 text-center">
                    {blockType.name}
                  </div>
                  {addingBlock === blockId && (
                    <div className="text-[10px] text-purple-600">Adding...</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 border-t border-gray-200 p-3">
        <p className="text-xs text-gray-500 text-center">
          Press Ctrl+D (or Cmd+D) to toggle dev mode
        </p>
      </div>
    </div>
  );
}

