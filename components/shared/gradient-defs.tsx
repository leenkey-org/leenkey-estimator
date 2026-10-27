/**
 * The gradient of the icons drawn in the charte (redesign D, SPECS.md 1):
 * once per page, read by `lk-icon-gradient` (stroke: url(#lk-icon-gradient)).
 * In the 24 px box of the icons (userSpaceOnUse): a straight stroke has no
 * area of its own, and a gradient set on its own box would not paint it.
 * Decorative, out of the layout.
 */
export function GradientDefs() {
  return (
    <svg aria-hidden="true" width="0" height="0" className="absolute">
      <defs>
        <linearGradient
          id="lk-icon-gradient"
          gradientUnits="userSpaceOnUse"
          x1="2"
          y1="2"
          x2="22"
          y2="22"
        >
          <stop offset="0" style={{ stopColor: "var(--color-lk-action-blue)" }} />
          <stop offset="1" style={{ stopColor: "var(--color-lk-action-violet)" }} />
        </linearGradient>
      </defs>
    </svg>
  );
}
