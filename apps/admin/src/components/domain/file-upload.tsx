import { useCallback, useRef, useState } from "react";
import { FileUp, FileText, X, Eye } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AttachmentPreviewDialog } from "@/components/domain/attachment-preview-dialog";
import { useAttachmentAccessURLMap } from "@/hooks/use-attachment-access-url-map";
import { uploadFile, type UploadResult } from "@/lib/server-data";

export type FileItem = {
  bucket?: string;
  extension?: string;
  name: string;
  objectKey?: string;
  size?: number;
  type: "image" | "pdf";
  url: string;
};

type AttachmentValue =
  | string
  | {
      bucket?: string;
      extension?: string;
      name?: string;
      objectKey?: string;
      size?: number;
      url?: string;
    };

export function detectFileType(url: string): "image" | "pdf" {
  const lower = stripURLSearch(url).toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  return "image";
}

export function extractFileName(url: string): string {
  const parts = stripURLSearch(url).split("/");
  return parts[parts.length - 1] || url;
}

function stripURLSearch(url: string) {
  return url.split("#")[0].split("?")[0];
}

export function createFileItemFromUrl(url: string, fallbackName?: string): FileItem {
  return {
    name: fallbackName || extractFileName(url),
    type: detectFileType(fallbackName || url),
    url,
  };
}

export function createFileItemFromUploadResult(result: UploadResult, fallbackName?: string): FileItem {
  const resolvedName = (fallbackName || result.name || extractFileName(result.objectKey || result.url)).trim();
  const source = result.objectKey || result.url || resolvedName;
  return {
    bucket: result.bucket,
    extension: result.extension,
    name: resolvedName,
    objectKey: result.objectKey,
    size: result.size,
    type: detectFileType(result.extension || resolvedName || source),
    url: result.url || "",
  };
}

export function createFileItemsFromUrls(values: AttachmentValue[]) {
  return values.map((value) => normalizeAttachmentValue(value)).filter((item): item is FileItem => !!item);
}

export function parseAttachments(value: AttachmentValue[] | string | null | undefined): FileItem[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return createFileItemsFromUrls(value);
  }

  try {
    const values = JSON.parse(value) as AttachmentValue[];
    return Array.isArray(values) ? createFileItemsFromUrls(values) : [];
  } catch {
    return [];
  }
}

export function serializeAttachments(items: FileItem[]) {
  return items
    .filter((item) => item.bucket && item.objectKey)
    .map((item) => ({
      bucket: item.bucket || "",
      extension: item.extension || "",
      name: item.name,
      objectKey: item.objectKey || "",
      size: item.size || 0,
    }));
}

export function getFileItemKey(item: Pick<FileItem, "bucket" | "objectKey"> & { url?: string }) {
  if (item.bucket && item.objectKey) {
    return `oss:${item.bucket}:${item.objectKey}`;
  }
  if (item.objectKey) {
    return `object:${item.objectKey}`;
  }
  return `url:${String(item.url || "").trim()}`;
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
  const accessURLMap = useAttachmentAccessURLMap(
    value
      .filter((item) => item.type === "image")
      .map((item) => ({ name: item.name, bucket: item.bucket, objectKey: item.objectKey, url: item.url })),
  );

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
          newItems.push(createFileItemFromUploadResult(result, file.name));
        } catch (error) {
          toast.error(`上传 ${file.name} 失败: ${error instanceof Error ? error.message : "未知错误"}`);
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
        {value.map((item, index) => {
          const itemKey = getFileItemKey(item);
          const previewImageURL = resolveAttachmentDisplayURL(item.url || "", accessURLMap[itemKey]);

          return (
            <div key={`${itemKey}-${index}`} className="group relative flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
              {item.type === "image" ? (
                previewImageURL ? (
                  <img src={previewImageURL} alt={item.name} className="size-10 rounded object-cover" />
                ) : (
                  <div className="size-10 rounded bg-muted" />
                )
              ) : (
                <FileText className="size-10 text-red-500" />
              )}
              <span className="max-w-[120px] truncate text-sm">{item.name}</span>
              <div className="flex gap-1">
                <Button type="button" size="icon" variant="ghost" className="size-6" onClick={() => setPreviewFile(item)}>
                  <Eye className="size-3.5" />
                </Button>
                <Button type="button" size="icon" variant="ghost" className="size-6 text-destructive" onClick={() => handleRemove(index)}>
                  <X className="size-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {value.length < maxFiles && (
        <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
          <FileUp className="mr-2 size-4" />
          {uploading ? "上传中..." : "上传附件"}
        </Button>
      )}

      <input ref={inputRef} type="file" accept={accept} multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />

      <AttachmentPreviewDialog file={previewFile} items={value} open={!!previewFile} onClose={() => setPreviewFile(null)} />
    </div>
  );
}

export function resolveAttachmentDisplayURL(rawURL: string, accessURL?: string) {
  if (accessURL) {
    return accessURL;
  }

  return rawURL || "";
}

function normalizeAttachmentValue(value: AttachmentValue) {
  if (typeof value === "string") {
    const trimmedURL = value.trim();
    if (!trimmedURL) {
      return null;
    }
    return createFileItemFromUrl(trimmedURL);
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const trimmedBucket = String(value.bucket || "").trim();
  const trimmedObjectKey = String(value.objectKey || "").trim();
  if (trimmedObjectKey) {
    return {
      bucket: trimmedBucket || undefined,
      extension: normalizeAttachmentExtension(String(value.extension || "").trim(), String(value.name || "").trim(), trimmedObjectKey),
      name: String(value.name || "").trim() || extractFileName(trimmedObjectKey),
      objectKey: trimmedObjectKey,
      size: normalizeAttachmentSize(value.size),
      type: detectFileType(String(value.extension || "").trim() || String(value.name || "").trim() || trimmedObjectKey),
      url: String(value.url || "").trim(),
    };
  }

  const trimmedURL = String(value.url || "").trim();
  if (!trimmedURL) {
    return null;
  }

  const trimmedName = String(value.name || "").trim();
  const item = createFileItemFromUrl(trimmedURL, trimmedName || undefined);
  return {
    ...item,
    extension: normalizeAttachmentExtension(String(value.extension || "").trim(), trimmedName, trimmedURL),
    size: normalizeAttachmentSize(value.size),
  };
}

function normalizeAttachmentExtension(rawExtension: string, rawName: string, rawSource: string) {
  const trimmedExtension = rawExtension.trim().toLowerCase();
  if (trimmedExtension) {
    return trimmedExtension.startsWith(".") ? trimmedExtension : `.${trimmedExtension}`;
  }

  const sourceName = rawName.trim() || extractFileName(rawSource);
  const extensionIndex = sourceName.lastIndexOf(".");
  if (extensionIndex <= 0 || extensionIndex === sourceName.length - 1) {
    return "";
  }

  return sourceName.slice(extensionIndex).toLowerCase();
}

function normalizeAttachmentSize(rawSize: unknown) {
  if (typeof rawSize !== "number" || !Number.isFinite(rawSize) || rawSize < 0) {
    return undefined;
  }

  return rawSize;
}
