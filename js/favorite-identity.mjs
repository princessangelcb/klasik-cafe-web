const CUSTOM_FAVORITE_PREFIX = "__KLASIK_CUSTOMIZED_V1__:";

export function buildCustomizedFavoriteKey(baseName, customizations) {
  return `${CUSTOM_FAVORITE_PREFIX}${encodeURIComponent(JSON.stringify({
    baseName: String(baseName ?? "").trim(),
    customizations: customizations ?? {}
  }))}`;
}

export function parseFavoriteKey(key) {
  const value = String(key ?? "");
  if (!value.startsWith(CUSTOM_FAVORITE_PREFIX)) {
    return { isCustomized: false, baseName: value, customizations: null };
  }
  try {
    const parsed = JSON.parse(decodeURIComponent(value.slice(CUSTOM_FAVORITE_PREFIX.length)));
    if (!parsed.baseName || typeof parsed.baseName !== "string") throw new Error("Missing base product name");
    return { isCustomized: true, baseName: parsed.baseName, customizations: parsed.customizations || {} };
  } catch {
    return { isCustomized: true, baseName: "Saved customized drink", customizations: {} };
  }
}
