import { useMemo, useState } from "react";
import { Eye, FileText, ImageIcon } from "lucide-react";
import { AttachmentPreviewDialog } from "@/components/domain/attachment-preview-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getFileItemKey, type FileItem } from "@/components/domain/file-upload";

type AttachmentPreviewListProps = {
  className?: string;
  compact?: boolean;
  emptyText?: string;
  items: FileItem[];
  maxVisible?: number;
};

export function AttachmentPreviewList({ className, compact = false, emptyText = "-", items, maxVisible }: AttachmentPreviewListProps) {
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const visibleItems = useMemo(() => (typeof maxVisible === "number" ? items.slice(0, maxVisible) : items), [items, maxVisible]);

  if (items.length === 0) {
    return <span className="text-sm text-muted-foreground">{emptyText}</span>;
  }

  return (
    <>
      <div className={cn("flex flex-wrap gap-2", className)}>
        {visibleItems.map((item, index) => {
          const itemKey = getFileItemKey(item);

          return (
            <button
              key={`${itemKey}-${index}`}
              type="button"
              className={cn(
                "group flex items-center gap-2 rounded-md border bg-muted/20 text-left transition-colors hover:bg-muted/50",
                compact ? "px-2 py-1" : "px-3 py-2",
              )}
              onClick={() => setPreviewFile(item)}
            >
              {item.type === "image" ? (
                <div className={cn("flex items-center justify-center rounded border bg-emerald-50 text-emerald-700", compact ? "size-8" : "size-10")}>
                  <ImageIcon className={compact ? "size-4" : "size-5"} />
                </div>
              ) : (
                <div className={cn("flex items-center justify-center rounded border bg-red-50 text-red-600", compact ? "size-8" : "size-10")}>
                  <FileText className={compact ? "size-4" : "size-5"} />
                </div>
              )}
              <span className={cn("max-w-[140px] truncate", compact ? "text-xs" : "text-sm")}>{item.name}</span>
              <Eye className="size-3.5 text-muted-foreground transition-colors group-hover:text-foreground" />
            </button>
          );
        })}
        {typeof maxVisible === "number" && items.length > maxVisible ? (
          <Button type="button" size="sm" variant="outline" className="h-auto px-2 py-1 text-xs" onClick={() => setPreviewFile(items[maxVisible])}>
            另有 {items.length - maxVisible} 个附件
          </Button>
        ) : null}
      </div>
      <AttachmentPreviewDialog file={previewFile} items={items} open={!!previewFile} onClose={() => setPreviewFile(null)} />
    </>
  );
}
