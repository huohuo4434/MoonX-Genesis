import { Badge, Button, Card, Heading, Section } from "@/components/ui";

/**
 * Temporary foundation-check page.
 *
 * This is intentionally NOT the product homepage — it exists only to
 * verify that fonts, Tailwind tokens, and the `components/ui` primitives
 * are wired up correctly. Replace this file when the real homepage is built.
 */
export default function RootPage() {
  return (
    <main className="min-h-screen flex items-center bg-background">
      <Section spacing="lg">
        <div className="flex flex-col items-center text-center gap-6">
          <Badge>Foundation Initialized</Badge>

          <Heading as="h1" size="xl" gradient>
            MoonX
          </Heading>

          <p className="max-w-md text-body text-foreground-secondary">
            Next.js 15 · React · TypeScript · TailwindCSS project foundation is
            ready. Build features on top of the primitives in{" "}
            <code className="text-foreground-tertiary">components/ui</code>.
          </p>

          <div className="flex items-center gap-3">
            <Button variant="primary">Primary Action</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
          </div>

          <Card className="mt-8 w-full max-w-sm text-left" hover>
            <Heading as="h3" size="xs" className="mb-2">
              Card primitive
            </Heading>
            <p className="text-body-sm text-foreground-secondary">
              Glass surface, border, radius, and shadow tokens all resolve
              from <code className="text-foreground-tertiary">styles/globals.css</code>.
            </p>
          </Card>
        </div>
      </Section>
    </main>
  );
}
