"use client";

type Props = {
  tone?: "stripe" | "amber";
  label?: string;
};

/** Shared indeterminate progress bar for API widget connection checks. */
export default function IntegrationLoadingBar({ tone = "stripe", label = "Loading..." }: Props) {
  return (
    <div className={`dimad-int-loading ${tone === "amber" ? "amber" : ""}`} role="status" aria-live="polite">
      <p className="label">{label}</p>
      <div className="bar" aria-hidden="true">
        <span />
      </div>
    </div>
  );
}
