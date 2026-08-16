"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Mail } from "lucide-react";
import { CookiePreferencesButton } from "@/components/ThemeToggle";
import GetInTouchButton from "@/components/GetInTouchButton";

export default function Footer() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <footer className={`public-footer public-footer--reveal${visible ? " is-visible" : ""}`}>
      <div className="public-footer__bar public-footer__bar--login">
        <div className="public-footer__cluster">
          <Image
            src="/logoC.png"
            alt="ESGSaathi"
            width={130}
            height={46}
            className="public-footer__logo h-auto w-[100px] object-contain"
          />
          <span className="marketing-caption">© 2026 ESGSaathi Portal. All rights reserved.</span>
        </div>
        <div className="public-footer__cluster public-footer__cluster--end">
          <a href="mailto:contact@esgsaathi.in" className="public-footer__link">
            <Mail size={14} className="opacity-70" />
            contact@esgsaathi.in
          </a>
          <CookiePreferencesButton />
          <GetInTouchButton className="btn-primary btn-sm inline-flex shrink-0" />
        </div>
      </div>
    </footer>
  );
}
