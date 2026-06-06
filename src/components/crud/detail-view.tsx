"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";

export type DetailField = {
  label: string;
  value: string | number | null | undefined;
  mono?: boolean;
  href?: string;
  fullWidth?: boolean;
};

export function DetailView({ fields, sections }: { fields?: DetailField[]; sections?: { title?: string; fields: DetailField[] }[] }) {
  const renderField = (f: DetailField, i: number) => {
    const display = f.value === null || f.value === undefined || f.value === "" ? "—" : String(f.value);
    return (
      <div key={i} className={f.fullWidth ? "sm:col-span-2" : ""}>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{f.label}</p>
        {f.href ? (
          <Link
            href={f.href}
            className={`mt-0.5 inline-flex items-center gap-1 text-sm text-primary hover:underline ${f.mono ? "font-mono" : ""}`}
          >
            {display}
            <ExternalLink className="h-3 w-3" />
          </Link>
        ) : (
          <p className={`mt-0.5 text-sm font-medium break-words ${f.mono ? "font-mono text-xs" : ""}`}>
            {display}
          </p>
        )}
      </div>
    );
  };

  if (sections) {
    return (
      <div className="space-y-6">
        {sections.map((section, si) => (
          <div key={si}>
            {section.title && (
              <h3 className="mb-3 text-sm font-semibold border-b pb-2">{section.title}</h3>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              {section.fields.map(renderField)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields?.map(renderField)}
    </div>
  );
}
