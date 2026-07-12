/**
 * GALLERY / HISTORY strip. Shows variation thumbnails (from /api/variations or
 * client sampling) and prior session states; clicking a cell loads that genome.
 * Each cell's SVG carries a unique prefix so their animation ids never collide.
 */
import { SvgFrame } from "./SvgFrame";

export type GalleryItem = {
  key: string;
  svg: string;
  title: string;
};

type Props = {
  items: GalleryItem[];
  onPick: (index: number) => void;
};

export function Gallery({ items, onPick }: Props) {
  if (items.length === 0) {
    return <p class="hint">no variations yet — run `vary` or steer the genome.</p>;
  }
  return (
    <div class="gallery">
      {items.map((item, i) => (
        <button
          type="button"
          class="cell"
          key={item.key}
          title={item.title}
          onClick={() => onPick(i)}
          aria-label={item.title}
        >
          <SvgFrame svg={item.svg} />
        </button>
      ))}
    </div>
  );
}
