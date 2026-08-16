const READINESS_STATUS: Record<string, string> = {
  Leader: "pro-overview-hero__status--leader",
  Advanced: "pro-overview-hero__status--advanced",
  Developing: "pro-overview-hero__status--developing",
  Beginner: "pro-overview-hero__status--beginner",
  Laggard: "pro-overview-hero__status--laggard",
};

const PORTFOLIO_STATUS: Record<string, string> = {
  "Strong momentum": "pro-overview-hero__status--leader",
  "On track": "pro-overview-hero__status--advanced",
  "Needs focus": "pro-overview-hero__status--developing",
  "Early stage": "pro-overview-hero__status--beginner",
  "Getting started": "pro-overview-hero__status--neutral",
};

export function heroStatusClass(label: string): string {
  return (
    READINESS_STATUS[label] ??
    PORTFOLIO_STATUS[label] ??
    "pro-overview-hero__status--neutral"
  );
}
