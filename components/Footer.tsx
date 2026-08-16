import Image from "next/image";
import { Mail } from "lucide-react";
import { CookiePreferencesButton } from "@/components/ThemeToggle";
import GetInTouchButton from "@/components/GetInTouchButton";

export default function Footer() {
  return (
    <footer className="public-footer">
      <div className="container public-footer__main">
        <div className="public-footer__grid public-footer__grid--login">
          <div>
            <Image
              src="/logoC.png"
              alt="ESGSaathi"
              width={130}
              height={46}
              className="public-footer__logo h-auto w-[120px] object-contain"
            />
            <p className="public-footer__brand-text">
              ESG assessment, BRSR reporting, and sustainability workflows for Indian businesses.
            </p>
          </div>

          <div>
            <h4 className="public-footer__heading">Legal</h4>
            <div className="public-footer__links">
              <CookiePreferencesButton />
            </div>
          </div>

          <div>
            <h4 className="public-footer__heading">Connect</h4>
            <a href="mailto:contact@esgsaathi.in" className="public-footer__link">
              <Mail size={14} className="opacity-70" />
              contact@esgsaathi.in
            </a>
            <p className="public-footer__brand-text mt-3">
              Need help with login or your account? We&apos;d love to hear from you.
            </p>
            <GetInTouchButton className="btn-primary public-footer__cta inline-flex" />
          </div>
        </div>
      </div>

      <div className="container public-footer__bar">
        <span className="marketing-caption">© 2026 ESGSaathi Portal. All rights reserved.</span>
        <span className="marketing-caption hidden sm:inline">
          Built for Indian businesses · Environment · Social · Governance
        </span>
      </div>
    </footer>
  );
}
