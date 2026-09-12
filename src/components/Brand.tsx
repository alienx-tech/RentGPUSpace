import Link from "next/link";
import Image from "next/image";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center">
      <Image
        src="/logo.png"
        alt="RentGPU.space"
        width={132}
        height={28}
        className={
          compact
            ? "h-6 w-auto transition-[opacity,transform] duration-200 hover:opacity-80"
            : "h-7 w-auto transition-[opacity,transform] duration-200 hover:opacity-80"
        }
      />
    </Link>
  );
}
