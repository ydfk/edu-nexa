import { useCallback, useRef, useState } from "react";
import { FileUp, FileText, X, Eye } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { uploadFile, type UploadResult } from "@/lib/server-data";

export type FileItem = {
  name: string;
  type: "image" | "pdf";
  url: string;
};

function detectFileType(url: string): "image" | "pdf" {
  const lower = url.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  return "image";
}

function extractFileName(url: string): string {
  const parts = url.split("/");
  return parts[parts.length - 1] || url;
}

export function parseAttachments(json: string): FileItem[] {
  if (!json) return [];
  try {
    const urls = JSON.parse(json) as string[];
    if (!Array.isArray(urls)) return [];
    return urls
      .filter((u) => typeof u === "string" && u.trim())
      .map((url) => ({
        name: extractFileName(url),
        type: detectFileType(url),
        url,
      }));
  } catch {
    return [];
  }
}

export function serializeAttachments(items: FileItem[]): string {
  if (items.length === 0) return "";
  return JSON.stringify(items.map((i) => i.url));
}

// ---------------------------------------------------------------------------
// 预览 Dialog
// ---------------------------------------------------------------------------

function PreviewDialog({
  file,
  open,
  onClose,
}: {
  file: FileItem | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!file) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-auto">
        <DialogHeader>
          <DialogTitle>{file.name}</DialogTitle>
        </DialogHeader>
        {file.type === "image" ? (
          <img
            src={file.url}
            alt={file.name}
            className="mx-auto max-h-[70vh] rounded object-contain"
          />
        ) : (
          <iframe
            src={file.url}
            title={file.name}
            className="h-[70vh] w-full rounded border"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// 文件上传组件
// ---------------------------------------------------------------------------

export function FileUpload({
  value,
  onChange,
  accept = "image/*,.pdf",
  maxFiles = 5,
}: {
  value: FileItem[];
  onChange: (items: FileItem[]) => void;
  accept?: string;
  maxFiles?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      if (value.length + files.length > maxFiles) {
        toast.error(`最多上传 ${maxFiles} 个文件`);
        return;
      }

      setUploading(true);
      const newItems: FileItem[] = [];

      for (const file of Array.from(files)) {
        try {
          const result: UploadResult = await uploadFile(file);
          newItems.push({
            name: file.name,
            type: file.type === "application/pdf" ? "pdf" : "image",
            url: result.url,
          });
        } catch (error) {
          toast.error(
            `上传 ${file.name} 失败: ${error instanceof Error ? error.message : "未知错误"}`,
          );
        }
      }

      if (newItems.length > 0) {
        onChange([...value, ...newItems]);
      }
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    },
    [value, onChange, maxFiles],
  );

  const handleRemove = useCallback(
    (index: number) => {
      onChange(value.filter((_, i) => i !== index));
    },
    [value, onChange],
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.map((item, index) => (
          <div
            key={`${item.url}-${index}`}
            className="group relative flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2"
          >
            {item.type === "image" ? (
              <img
                src={item.url}
                alt={item.name}
                className="size-10 rounded object-cover"
              />
            ) : (
              <FileText className="size-10 text-red-500" />
            )}
            <span className="max-w-[120px] truncate text-sm">{item.name}</span>
            <div className="flex gap-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-6"
                onClick={() => setPreviewFile(item)}
              >
                <Eye className="size-3.5" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-6 text-destructive"
                onClick={() => handleRemove(index)}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {value.length < maxFiles && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          <FileUp className="mr-2 size-4" />
          {uploading ? "上传中..." : "上传附件"}
        </Button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <PreviewDialog
        file={previewFile}
        open={!!previewFile}
        onClose={() => setPreviewFile(null)}
      />
    </div>
  );
}
