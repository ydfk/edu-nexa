import { useEffect, useMemo, useState } from "react";
import { getFileItemKey } from "@/components/domain/file-upload";
import { resolveAttachmentAccessURL } from "@/lib/server-data";

type AttachmentAccessItem = {
  bucket?: string;
  name?: string;
  objectKey?: string;
  url?: string;
};

export function useAttachmentAccessURLMap(
  items: AttachmentAccessItem[],
  options?: {
    disposition?: "attachment" | "inline";
  },
) {
  const [urlMap, setURLMap] = useState<Record<string, string>>({});
  const normalizedItems = useMemo(() => {
    const seen = new Set<string>();
    const results: AttachmentAccessItem[] = [];

    items.forEach((item) => {
      const itemKey = getFileItemKey(item);
      if (!itemKey || seen.has(itemKey)) {
        return;
      }

      seen.add(itemKey);
      results.push({
        bucket: item.bucket,
        name: item.name,
        objectKey: item.objectKey,
        url: item.url?.trim() || undefined,
      });
    });

    return results;
  }, [JSON.stringify(items)]);
  const requestKey = useMemo(
    () =>
      JSON.stringify({
        disposition: options?.disposition || "",
        items: normalizedItems,
      }),
    [normalizedItems, options?.disposition],
  );

  useEffect(() => {
    if (normalizedItems.length === 0) {
      setURLMap((current) => (Object.keys(current).length === 0 ? current : {}));
      return;
    }

    let cancelled = false;

    Promise.all(
      normalizedItems.map(async (item) => {
        const itemKey = getFileItemKey(item);
        try {
          const accessURL = await resolveAttachmentAccessURL(item, {
            disposition: options?.disposition,
            fileName: options?.disposition === "attachment" ? item.name : undefined,
          });
          return [itemKey, accessURL] as const;
        } catch {
          return [itemKey, item.url || ""] as const;
        }
      }),
    ).then((entries) => {
      if (cancelled) {
        return;
      }

      const nextMap = Object.fromEntries(entries);
      setURLMap((current) => {
        if (JSON.stringify(current) === JSON.stringify(nextMap)) {
          return current;
        }
        return nextMap;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [normalizedItems, requestKey, options?.disposition]);

  return urlMap;
}
