import { Camera, Images } from "lucide-react";
import { ChangeEvent } from "react";

type ImageSourcePickerProps = {
  onSelect: (event: ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  compact?: boolean;
};

export function ImageSourcePicker({ onSelect, disabled = false, compact = false }: ImageSourcePickerProps) {
  const base = compact
    ? "h-9 rounded-xl px-3 text-xs"
    : "h-10 rounded-xl px-4 text-sm";

  return (
    <div className="flex flex-wrap gap-2">
      <label className={`inline-flex ${base} cursor-pointer items-center justify-center gap-2 border bg-background font-bold text-foreground transition hover:border-primary hover:bg-secondary disabled:pointer-events-none disabled:opacity-50 ${disabled ? "pointer-events-none opacity-50" : ""}`}>
        <Images className="size-4 text-primary" />
        <span>من الاستوديو</span>
        <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/*" onChange={onSelect} disabled={disabled} />
      </label>
      <label className={`inline-flex ${base} cursor-pointer items-center justify-center gap-2 bg-primary font-bold text-primary-foreground transition hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50 ${disabled ? "pointer-events-none opacity-50" : ""}`}>
        <Camera className="size-4" />
        <span>التقاط بالكاميرا</span>
        <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/*" capture="environment" onChange={onSelect} disabled={disabled} />
      </label>
    </div>
  );
}
