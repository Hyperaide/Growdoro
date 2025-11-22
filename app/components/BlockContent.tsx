import {
  BLOCK_TYPES,
  BlockTypeId,
  RARITY_COLORS,
  getBlockDisplayImage,
} from "../constants/blocks";
import { CrosshairSimpleIcon, DiamondIcon } from "@phosphor-icons/react";

interface Block {
  id: string;
  x: number;
  y: number;
  z: number;
  type: BlockTypeId;
  placedAt?: number;
}

export default function BlockContent({
  block,
  isCard,
}: {
  block: Block;
  isCard?: boolean;
}) {
  const blockType = BLOCK_TYPES[block.type];

  // Handle case where blockType is undefined
  if (!blockType) {
    console.error(`Block type "${block.type}" not found in BLOCK_TYPES`);
    return (
      <div className="h-full flex flex-col gap-4 items-center justify-center">
        <p className="text-gray-500">Unknown block type: {block.type}</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4">
      {/* <h2 className="font-gowun-batang text-xl font-bold text-gray-900">{blockType.name}</h2>
    {blockType.latinName && <p className="font-gowun-batang text-[13px] text-gray-500">{blockType.latinName}</p>} */}

      {/* <div className="flex flex-row gap-2 items-center mt-4">
      <p className="font-mono text-[11px] uppercase text-gray-500">Coordinates:</p>
      <p className="font-mono text-[11px] text-gray-500">{block.x}X {block.y}Y {block.z}Z</p>
    </div> */}

      <div
        className={`p-8 bg-gradient-to-b rounded-lg ${
          RARITY_COLORS[blockType.rarity].colorSubtle
        }`}
      >
        <img
          src={getBlockDisplayImage(blockType) || ""}
          alt={blockType.name}
          className="w-full rounded-lg"
        />
      </div>

      <div className="flex flex-col px-2">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-200">
          {blockType.name}
        </h2>
        {blockType.latinName && (
          <p className="text-sm text-neutral-500 dark:text-neutral-500">
            {blockType.latinName}
          </p>
        )}

        {blockType.blurb && (
          <p className="text-xs my-2 text-neutral-500 ">{blockType.blurb}</p>
        )}
      </div>

      <div className="flex flex-row px-2 gap-4">
        <div className="flex flex-row items-center gap-1">
          <DiamondIcon
            size={12}
            weight="fill"
            className={`${RARITY_COLORS[blockType.rarity].colorBold}`}
          />
          <p className=" text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
            {blockType.rarity}
          </p>
        </div>
        {!isCard && (
          <div className="flex flex-row items-center gap-1">
            <CrosshairSimpleIcon size={12} className="text-gray-800" />
            <p className="font-mono text-[11px] uppercase text-gray-500">
              {block.x},{block.y},{block.z}
            </p>
          </div>
        )}
      </div>

      {!isCard && (
        <>
          <div className="flex flex-row px-2">
            <div className="flex flex-col gap-2 w-full">
              <div className="flex flex-row gap-2 items-center justify-between">
                <p className="font-mono text-[11px] uppercase font-medium text-gray-500">
                  Growth Time
                </p>
                <p className="font-mono text-[11px] uppercase text-gray-500">
                  {blockType.growthTime} days
                </p>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-gray-100 rounded-full"
                  style={{ width: `${blockType.growthTime}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="flex flex-row px-2">
            <div className="flex flex-col gap-2 w-full">
              <div className="flex flex-row gap-2 items-center justify-between">
                <p className="font-mono text-[11px] uppercase font-medium text-gray-500">
                  Decay Time
                </p>
                <p className="font-mono text-[11px] uppercase text-gray-500">
                  {blockType.decayTime} days
                </p>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full">
                <div
                  className="h-full bg-gradient-to-r to-red-500 from-gray-100 rounded-full ml-auto"
                  style={{ width: `${blockType.growthTime}%` }}
                ></div>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="flex flex-row px-2"></div>
    </div>
  );
}
