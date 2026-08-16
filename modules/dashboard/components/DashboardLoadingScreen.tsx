"use client";

import Image from "next/image";

type DashboardLoadingScreenProps = {
  message?: string;
};

export default function DashboardLoadingScreen({
  message = "Loading workspace…",
}: DashboardLoadingScreenProps) {
  return (
    <div className="dash-loading" role="status" aria-live="polite" aria-busy="true">
      <div className="dash-loading__stack">
        <Image
          src="/logoC.png"
          alt="ESG Saathi"
          width={358}
          height={118}
          priority
          className="dash-loading__watermark-img"
        />
        <p className="dash-loading__message">{message}</p>
      </div>
    </div>
  );
}
