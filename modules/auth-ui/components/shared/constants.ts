export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8080";

const focusRing =
  "focus:border-[var(--brand-500)] focus:ring-[3px] focus:ring-[var(--brand-focus-ring)]";

export const inputClass =
  "w-full rounded-[12px] px-[14px] py-[13px] text-[14px] outline-none " +
  "bg-[var(--color-surface)] border border-[var(--color-border)] " +
  "text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] " +
  "transition-all duration-200 " +
  focusRing;

export const otpInputClass =
  "h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 rounded-[10px] sm:rounded-[12px] border border-[var(--color-border)] " +
  "bg-[var(--color-surface)] text-center text-lg sm:text-xl md:text-2xl font-semibold " +
  "text-[var(--color-text)] outline-none transition-all duration-200 " +
  focusRing;
