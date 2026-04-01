export function getDefaultLoginPassword(phone: string) {
  const normalized = phone.replace(/\D/g, "");
  const base = (normalized || phone.trim()).slice(-4) || "1234";

  return `${base}1234`;
}

export function getDefaultLoginPasswordHint(phone: string) {
  const normalized = phone.replace(/\D/g, "");
  const example = getDefaultLoginPassword(phone);

  if (!normalized) {
    return "默认密码为手机号后四位 + 1234，输入手机号后会自动生成。";
  }

  if (normalized.length < 4) {
    return `默认密码为手机号 + 1234，例如 ${example}。`;
  }

  return `默认密码为手机号后四位 + 1234，例如 ${example}。`;
}
