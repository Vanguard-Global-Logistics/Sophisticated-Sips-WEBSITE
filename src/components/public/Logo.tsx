import Image from "next/image";

/**
 * Full Sophisticated Sips menu wordmark — crown, flourishes, and gold
 * calligraphy preserved from the approved menu artwork.
 * `size` is the rendered HEIGHT in px; width follows the artwork's
 * intrinsic ratio so the mark is never stretched or cropped.
 */
const RATIO = 232 / 73;

export default function Logo({
  size = 44,
  priority = false,
  title = "Sophisticated Sips",
}: {
  size?: number;
  priority?: boolean;
  title?: string;
}) {
  return (
    <Image
      src="/photos/sophisticated-sips-ornate-wordmark.svg"
      alt={title}
      height={size}
      width={Math.round(size * RATIO)}
      priority={priority}
      unoptimized
      className="brand-logo"
    />
  );
}

