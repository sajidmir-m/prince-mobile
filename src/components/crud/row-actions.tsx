"use client";

import { Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RowActions({
  onView,
  onEdit,
  onDelete,
  disableDelete,
  hideEdit,
}: {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  disableDelete?: boolean;
  hideEdit?: boolean;
}) {
  return (
    <div className="flex justify-end gap-1">
      {onView && (
        <Button variant="ghost" size="icon" onClick={onView} title="View details">
          <Eye className="h-4 w-4" />
        </Button>
      )}
      {onEdit && !hideEdit && (
        <Button variant="ghost" size="icon" onClick={onEdit} title="Edit">
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      {onDelete && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          disabled={disableDelete}
          title="Delete"
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
