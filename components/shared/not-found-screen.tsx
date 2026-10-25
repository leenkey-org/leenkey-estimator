import Link from "next/link";
import { Button } from "./button";
import { EmptyState } from "./empty-state";
import { FacadeRoot } from "./facade-root";

export type NotFoundScreenProps = {
  title: string;
  text: string;
  /** « Retour à l'accueil ». */
  action: { href: string; label: string };
};

/**
 * The 404 (docs/DESIGN.md 13.1, G8 variant): facade.svg in white at 55 % on
 * the blue flat, the title, one sentence, one inverse button, the whole
 * screen. A missing address and a listing no longer online.
 */
export function NotFoundScreen({ title, text, action }: NotFoundScreenProps) {
  return (
    <FacadeRoot className="flex min-h-screen items-center justify-center bg-lk-blue px-5 py-16 text-white">
      <main>
        <EmptyState
          tone="blue"
          titleAs="h1"
          title={title}
          description={text}
          action={
            <Button asChild variant="inverse" size="lg">
              <Link href={action.href}>{action.label}</Link>
            </Button>
          }
        />
      </main>
    </FacadeRoot>
  );
}
