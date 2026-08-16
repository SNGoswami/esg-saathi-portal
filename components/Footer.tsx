import Image from "next/image";

export default function Footer() {
  return (
    <footer className="public-footer">
      <div className="container public-footer__bar">
        <Image
          src="/logoC.png"
          alt="ESGSaathi"
          width={130}
          height={46}
          className="public-footer__logo h-auto w-[100px] object-contain"
        />
        <span className="marketing-caption">© 2026 ESGSaathi Portal. All rights reserved.</span>
      </div>
    </footer>
  );
}
