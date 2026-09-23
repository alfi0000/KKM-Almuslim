import Image from "next/image";
import { ExternalLink } from "lucide-react";

function isImageFileUrl(url: string): boolean {
  const cleanUrl = decodeURIComponent(url.split(/[?#]/)[0]).toLowerCase();
  return /\.(jpe?g|png|webp|gif)$/.test(cleanUrl);
}

interface AdminBerkasPreviewProps {
  label: string;
  url: string;
}

export default function AdminBerkasPreview({ label, url }: AdminBerkasPreviewProps) {
  return (
    <div className="space-y-2">
      <div className="relative h-52 w-full overflow-hidden rounded-md border border-[#CBD5E1] bg-white">
        {isImageFileUrl(url) ? (
          <Image
            src={url}
            alt={`Pratinjau ${label}`}
            fill
            unoptimized
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-contain"
          />
        ) : (
          <iframe
            src={`${url}#view=FitH`}
            title={`Pratinjau ${label}`}
            loading="lazy"
            className="h-full w-full bg-white"
          />
        )}
      </div>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0F5132] hover:underline"
      >
        <ExternalLink className="h-3 w-3 shrink-0" /> Buka ukuran penuh
      </a>
    </div>
  );
}
