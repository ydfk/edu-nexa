import { useCallback, useState } from "react";

export default function useDialogState<T extends string>(
  initialState: T | null = null
) {
  const [open, _setOpen] = useState<T | null>(initialState);

  const setOpen = useCallback(
    (value: T | null) => {
      _setOpen((prev) => (prev === value ? null : value));
    },
    []
  );

  return [open, setOpen] as const;
}
