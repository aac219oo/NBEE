import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@heiso/core/components/ui/dropdown-menu";
import { Languages } from "lucide-react";
import type React from "react";
import { cn } from "@heiso/core/lib/utils";

interface ListItem {
  label: string;
  value: string;
}

const tempList: ListItem[] = [
  {
    label: "English",
    value: "en",
  },
  {
    label: "中文",
    value: "zh",
  },
];

interface PostTranslateProps {
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onChange?: (value: string) => void;
  onSelect?: (value: string) => void;
  onFinish?: (value: string) => void;
  disabled?: boolean;
  children?: React.ReactNode;
  selectedValue?: string;
  noneSelectTitle?: boolean;
}

const PostTranslate = ({
  className,
  onClick,
  onChange,
  onSelect,
  onFinish,
  disabled = false,
  children,
  selectedValue,
  noneSelectTitle = false,
  ...props
}: PostTranslateProps) => {
  const handleSelect = (value: string) => {
    onChange?.(value);
    onSelect?.(value);

    setTimeout(() => {
      onFinish?.(value);
    }, 3000);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 bg-background p-4 rounded-sm",
            className,
          )}
          onClick={onClick}
          disabled={disabled}
          {...props}
        >
          <Languages className="size-5" />
          {!noneSelectTitle && !selectedValue && "選擇語言"}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto">
        {tempList.map((item) => (
          <DropdownMenuItem
            key={item.value}
            onClick={() => handleSelect(item.value)}
            className={cn(
              "cursor-pointer",
              selectedValue === item.value && "bg-accent",
            )}
          >
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default PostTranslate;
