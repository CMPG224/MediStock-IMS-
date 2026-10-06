/** The round letter tile used as a row avatar in tables ("A" for Amoxicillin,
 * "B" for BioLogix...). */
export default function Avatar({ letter, size = 34 }: { letter: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-full bg-[#DDE7F7] text-[13.5px] font-bold text-brand"
    >
      {letter}
    </span>
  );
}
