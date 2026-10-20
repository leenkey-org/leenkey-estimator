import Link from "next/link";
import { BrandPanel } from "@/components/shared/brand-panel";
import { Button } from "@/components/shared/button";

/**
 * Last call to action of a public page: the blue flat with the drawing, one
 * inverse button and a short note (« Réponse sous 24 h par un conseiller »).
 */
export function CtaPanel({
  title,
  accent,
  text,
  action,
  href,
  note,
}: {
  title: string;
  /** The highlighted words of the V1 title, under the dimension line. */
  accent?: string;
  text: string;
  action: string;
  href: string;
  note?: string;
}) {
  return (
    <BrandPanel
      title={title}
      titleAccent={accent}
      titleAs="h2"
      titleSize="page"
      description={text}
      illustration
    >
      <div className="flex flex-col items-start gap-3">
        <Button asChild variant="inverse" size="lg">
          <Link href={href}>{action}</Link>
        </Button>
        {note ? <p className="text-lk-caption text-lk-on-blue-2">{note}</p> : null}
      </div>
    </BrandPanel>
  );
}
