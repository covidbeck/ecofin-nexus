"use client";

type ChoiceOption<T extends string> = {
  value: T;
  label: string;
};

export function ChoiceGroup<T extends string>({
  name,
  value,
  options,
  onChange,
  disabled = false,
}: {
  name: string;
  value: T;
  options: ChoiceOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={name} className="choice-group">
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`choice-chip ${selected ? "choice-chip-active" : ""}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
