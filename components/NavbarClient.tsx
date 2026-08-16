"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

export default function NavbarClient() {
  const router = useRouter();

  return (
    <header className="public-header public-header--scrolled opacity-100 translate-y-0">
      <div className="public-header__inner public-header__inner--compact">
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="flex items-center shrink-0 bg-transparent border-none p-0 cursor-pointer"
          aria-label="ESGSaathi portal"
        >
          <Image
            src="/logoC.png"
            alt="ESGSaathi"
            width={157}
            height={56}
            priority
            className="public-header__logo h-auto w-[118px] md:w-[128px] object-contain block"
          />
        </button>

        <div className="public-header__actions">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
