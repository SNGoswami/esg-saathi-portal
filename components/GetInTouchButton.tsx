"use client";

import { useState } from "react";
import ContactToastForm from "@/modules/contact/ContactToastForm";

export default function GetInTouchButton({
  className,
}: {
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        Get in Touch
      </button>
      <ContactToastForm open={open} onClose={() => setOpen(false)} />
    </>
  );
}
