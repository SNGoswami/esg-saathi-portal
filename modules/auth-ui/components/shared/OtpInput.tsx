import { otpInputClass } from "./constants";

interface Props {
  otp: string[];
  setOtp: (otp: string[]) => void;
  inputRefs: React.MutableRefObject<HTMLInputElement[]>;
}

export default function OtpInput({
  otp,
  setOtp,
  inputRefs,
}: Props) {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
      {otp.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            if (el) inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, "");
            const newOtp = [...otp];
            newOtp[index] = value;
            setOtp(newOtp);

            if (value && index < otp.length - 1) {
              inputRefs.current[index + 1]?.focus();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !otp[index] && index > 0) {
              inputRefs.current[index - 1]?.focus();
            }
          }}
          onPaste={(e) => {
            const paste = e.clipboardData
              .getData("text")
              .replace(/\D/g, "")
              .slice(0, otp.length);
            if (!paste) return;

            const next = [...otp];
            for (let i = 0; i < otp.length; i++) next[i] = paste[i] ?? "";
            setOtp(next);
            inputRefs.current[Math.min(paste.length, otp.length) - 1]?.focus();
            e.preventDefault();
          }}
          className={otpInputClass}
        />
      ))}
    </div>
  );
}
