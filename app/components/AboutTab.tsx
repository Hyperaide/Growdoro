import DqnamoSignature from "./dqnamoSignature";

export default function AboutTab() {
  return (
    <div>
      <h1 className="font-barlow text-2xl font-black text-green-500">
        GROWDORO
      </h1>
      <p className="font-barlow text-sm text-neutral-500">
        Growdoro is an infinite garden productivity app where you complete focus
        sessions to grow your own world and unlock new plants, blocks and more.
      </p>

      <p className="font-barlow text-xs mt-4 text-neutral-500">Made by</p>
      <DqnamoSignature />
    </div>
  );
}
