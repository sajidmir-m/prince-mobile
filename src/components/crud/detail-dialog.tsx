"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DetailView, type DetailField } from "@/components/crud/detail-view";

export function DetailDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  fields,
  sections,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  fields?: DetailField[];
  sections?: { title?: string; fields: DetailField[] }[];
  children?: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </DialogHeader>
        {children ?? <DetailView fields={fields} sections={sections} />}
      </DialogContent>
    </Dialog>
  );
}
