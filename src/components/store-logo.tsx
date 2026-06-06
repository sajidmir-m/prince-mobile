import { STORE } from "@/lib/store-config";
import { cn } from "@/lib/utils";

export function StoreLogo({
  src = STORE.logo,
  alt = STORE.name,
  className,
  size = 48,
}: {
  src?: string;
  alt?: string;
  className?: string;
  size?: number;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn("object-contain", className)}
    />
  );
}
