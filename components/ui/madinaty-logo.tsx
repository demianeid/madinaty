import Image from "next/image";

interface MadinatyLogoProps {
  variant?: "light" | "dark" | "icon" | "icon-light" | "icon-dark" | "tagline-light" | "tagline-dark";
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
}

export function MadinatyLogo({
  variant = "light",
  className = "h-9 sm:h-10 w-auto object-contain",
  width,
  height,
  priority = false,
}: MadinatyLogoProps) {
  let src = "/images/logo/madinaty-wordmark-light.svg";
  let defaultWidth = 140;
  let defaultHeight = 60;

  switch (variant) {
    case "dark":
      src = "/images/logo/madinaty-wordmark.svg";
      defaultWidth = 140;
      defaultHeight = 60;
      break;
    case "icon":
    case "icon-dark":
      src = "/images/logo/madinaty-app-icon.svg";
      defaultWidth = 36;
      defaultHeight = 36;
      break;
    case "icon-light":
      src = "/images/logo/madinaty-app-icon-light.svg";
      defaultWidth = 36;
      defaultHeight = 36;
      break;
    case "tagline-light":
      src = "/images/logo/madinaty-wordmark-tagline-light.svg";
      defaultWidth = 180;
      defaultHeight = 80;
      break;
    case "tagline-dark":
      src = "/images/logo/madinaty-wordmark-tagline.svg";
      defaultWidth = 180;
      defaultHeight = 80;
      break;
    case "light":
    default:
      src = "/images/logo/madinaty-wordmark-light.svg";
      defaultWidth = 140;
      defaultHeight = 60;
      break;
  }

  return (
    <Image
      src={src}
      alt="مدينتي"
      width={width ?? defaultWidth}
      height={height ?? defaultHeight}
      className={className}
      priority={priority}
    />
  );
}
