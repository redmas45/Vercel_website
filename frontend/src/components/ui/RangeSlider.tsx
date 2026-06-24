export function RangeSlider({
  min,
  max,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
}: {
  min: number;
  max: number;
  minValue: number;
  maxValue: number;
  onMinChange: (value: number) => void;
  onMaxChange: (value: number) => void;
}) {
  return (
    <div className="grid gap-2">
      <input
        type="range"
        min={min}
        max={max}
        value={minValue}
        onChange={(event) => onMinChange(Number(event.target.value))}
      />
      <input
        type="range"
        min={min}
        max={max}
        value={maxValue}
        onChange={(event) => onMaxChange(Number(event.target.value))}
      />
    </div>
  );
}
