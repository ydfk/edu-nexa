import { useEffect } from "react";

type ItemWithID = {
  id: string;
};

export function useAutoSelectSingleID<T extends ItemWithID>(
  items: T[],
  value: string,
  onSelect: (item: T) => void,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled || items.length !== 1) {
      return;
    }

    const [item] = items;
    if (!item || item.id === value) {
      return;
    }

    onSelect(item);
  }, [enabled, items, onSelect, value]);
}
