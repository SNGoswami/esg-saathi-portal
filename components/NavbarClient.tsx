"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

export default function NavbarClient() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 10);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`public-header ${scrolled ? "public-header--scrolled" : ""} ${
        entered ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full"
      } transition-all duration-300`}
    >
      <div
        className={`public-header__inner ${
          scrolled ? "public-header__inner--compact" : "public-header__inner--tall"
        }`}
      >
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
            className={`public-header__logo h-auto object-contain block transition-all duration-300 ${
              scrolled ? "w-[118px] md:w-[128px]" : "w-[132px] md:w-[148px]"
            }`}
          />
        </button>

        <div className="public-header__actions">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
