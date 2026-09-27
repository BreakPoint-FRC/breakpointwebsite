import Image from "next/image";
import type { MediaAsset } from "@/content/types";

interface MediaSlotProps {
  media: MediaAsset;
  sizes: string;
  /** Yer tutucu metnin sınıfları. */
  placeholderClassName?: string;
  imageClassName?: string;
}

/** Görsel varsa next/image (lazy), yoksa yer tutucu metin. Kapsayıcı `relative` olmalı. */
export function MediaSlot({
  media,
  sizes,
  placeholderClassName = "",
  imageClassName = "object-cover",
}: MediaSlotProps) {
  if (media.src) {
    return <Image src={media.src} alt={media.alt} fill sizes={sizes} className={imageClassName} />;
  }
  return (
    <span className={`px-8 text-center font-label uppercase text-bp-muted ${placeholderClassName}`}>
      {media.placeholder}
    </span>
  );
}
