"use client";

import { Heading, Text } from "@/components/ui";

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-2">
      {eyebrow && (
        <Text variant="label" color="secondary" className="tracking-wide">
          {eyebrow}
        </Text>
      )}
      <Heading as="h2" size="h2" className="max-w-3xl">
        {title}
      </Heading>
      {subtitle && (
        <Text variant="body" color="secondary" className="max-w-2xl">
          {subtitle}
        </Text>
      )}
    </div>
  );
}
