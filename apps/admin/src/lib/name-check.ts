const chineseDigitMap: Record<string, string> = {
  零: "0",
  一: "1",
  二: "2",
  两: "2",
  三: "3",
  四: "4",
  五: "5",
  六: "6",
  七: "7",
  八: "8",
  九: "9",
};

export function normalizeName(value: string) {
  let normalized = value.trim().toLowerCase();

  normalized = normalized.replace(/[（）()【】\[\]\-_\s·.]/g, "");
  normalized = normalized.replace(/十/g, "10");

  Object.entries(chineseDigitMap).forEach(([key, replacement]) => {
    normalized = normalized.replaceAll(key, replacement);
  });

  normalized = normalized.replace(/第/g, "");
  normalized = normalized.replace(/小学校|小学/g, "小");
  normalized = normalized.replace(/中学校|中学/g, "中");
  normalized = normalized.replace(/年级/g, "年级");
  normalized = normalized.replace(/班级/g, "班");

  return normalized;
}

export function hasExactName(
  items: Array<{ id: string; name: string }>,
  value: string,
  currentID?: string
) {
  const target = value.trim().toLowerCase();
  return items.some((item) => {
    if (currentID && item.id === currentID) {
      return false;
    }

    return item.name.trim().toLowerCase() === target;
  });
}

export function findSimilarNames(
  items: Array<{ id: string; name: string }>,
  value: string,
  currentID?: string
) {
  const target = normalizeName(value);
  if (!target) {
    return [];
  }

  return items.filter((item) => {
    if (currentID && item.id === currentID) {
      return false;
    }

    return normalizeName(item.name) === target;
  });
}
