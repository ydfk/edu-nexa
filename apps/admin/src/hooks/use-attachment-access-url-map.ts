import { useEffect, useMemo, useState } from "react";
import { resolveAttachmentAccessURL } from "@/lib/server-data";

type AttachmentAccessItem = {
  name?: string;
  url: string;
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
      const trimmedURL = item.url.trim();
      if (!trimmedURL || seen.has(trimmedURL)) {
        return;
      }

      seen.add(trimmedURL);
      results.push({
        name: item.name,
        url: trimmedURL,
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
        try {
          const accessURL = await resolveAttachmentAccessURL(item.url, {
            disposition: options?.disposition,
            fileName: options?.disposition === "attachment" ? item.name : undefined,
          });
          return [item.url, accessURL] as const;
        } catch {
          return [item.url, item.url] as const;
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
