"use client";

import { useId, useState } from "react";

export function InfoTooltip({ text, label }: { text: string; label: string }) {
  const tooltipId = useId();
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        className="info-tooltip-trigger"
        aria-label={label}
        aria-describedby={open ? tooltipId : undefined}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        onBlur={() => setOpen(false)}
      >
        i
      </button>
      {open ? (
        <span id={tooltipId} role="tooltip" className="info-tooltip-panel">
          {text}
        </span>
      ) : null}
    </span>
  );
}
