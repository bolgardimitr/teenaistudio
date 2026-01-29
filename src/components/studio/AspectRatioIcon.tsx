import { cn } from '@/lib/utils';

interface AspectRatioIconProps {
  ratio: string;
  className?: string;
}

export function AspectRatioIcon({ ratio, className }: AspectRatioIconProps) {
  const getIconStyle = () => {
    switch (ratio) {
      case "1:1": return "w-4 h-4";
      case "16:9": return "w-6 h-3.5";
      case "9:16": return "w-3.5 h-6";
      case "4:3": return "w-5 h-4";
      case "3:4": return "w-4 h-5";
      case "3:2": return "w-6 h-4";
      case "2:3": return "w-4 h-6";
      case "5:4": return "w-5 h-4";
      case "4:5": return "w-4 h-5";
      case "21:9": return "w-7 h-3";
      default: return "w-4 h-4";
    }
  };

  return (
    <div 
      className={cn(
        "border-2 border-current rounded-sm flex-shrink-0",
        getIconStyle(),
        className
      )} 
    />
  );
}

export const aspectRatiosPhoto = [
  { value: "1:1", label: "1:1", description: "Квадрат" },
  { value: "16:9", label: "16:9", description: "Широкий экран" },
  { value: "9:16", label: "9:16", description: "Вертикаль / Stories" },
  { value: "4:3", label: "4:3", description: "Классический" },
  { value: "3:4", label: "3:4", description: "Портрет" },
  { value: "3:2", label: "3:2", description: "Фото 35мм" },
  { value: "2:3", label: "2:3", description: "Портрет 35мм" },
  { value: "5:4", label: "5:4", description: "Почти квадрат" },
  { value: "4:5", label: "4:5", description: "Instagram портрет" },
  { value: "21:9", label: "21:9", description: "Ультраширокий / Кино" },
];

export const aspectRatiosVideo = [
  { value: "9:16", label: "9:16", description: "TikTok / Reels" },
  { value: "16:9", label: "16:9", description: "YouTube / Горизонтальное" },
  { value: "1:1", label: "1:1", description: "Квадрат" },
  { value: "4:3", label: "4:3", description: "Классический" },
  { value: "3:4", label: "3:4", description: "Портрет" },
  { value: "21:9", label: "21:9", description: "Кино / Ультраширокий" },
];
