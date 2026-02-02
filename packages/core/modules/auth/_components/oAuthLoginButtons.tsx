import { Button } from "@heiso/core/components/ui/button";
import { Icon, type IconifyIcon } from "@iconify/react";
import Image, { type StaticImageData } from "next/image";

interface OAuthLoginButtonsProps {
  href?: string;
  src?: StaticImageData;
  icon?: string | IconifyIcon;
  alt: string;
}

const OAuthLoginButtons = ({
  href,
  src,
  icon,
  alt,
  ...props
}: React.ComponentProps<"button"> & OAuthLoginButtonsProps) => {
  return (
    <Button asChild variant="outline" className="w-full rounded-xl py-6 bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20 transition-all duration-300" {...props}>
      <a href={href} className="flex items-center justify-center gap-3 w-full">
        {src && (
          <Image
            src={src}
            alt={alt}
            width={24}
            height={24}
            className="shrink-0"
            loading="lazy"
            decoding="async"
          />
        )}
        {icon && <Icon icon={icon} className="size-6 shrink-0" />}
        <span className="font-semibold text-foreground/80">{`Sign in with ${alt}`}</span>
      </a>
    </Button>
  );
};

export default OAuthLoginButtons;
