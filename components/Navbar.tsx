import dynamic from "next/dynamic";

/** Reserved height for pages using `pt-[60px]` under the fixed navbar */
export function NavbarSkeleton() {
  return (
    <header
      className="public-header fixed top-0 left-0 right-0 z-[100] h-[60px] border-b border-transparent"
      aria-hidden
    />
  );
}

const NavbarClient = dynamic(() => import("./NavbarClient"), {
  ssr: true,
  loading: () => <NavbarSkeleton />,
});

export default function Navbar() {
  return <NavbarClient />;
}
