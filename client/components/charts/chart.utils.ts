export function sortGroupsByTotalValue(
  groups: string[],
  valueLookup: Map<string, Map<string, number>>
): void {
  groups.sort((a, b) => {
    const aTotal = Array.from(valueLookup.get(a)?.values() ?? []).reduce((sum, v) => sum + v, 0);
    const bTotal = Array.from(valueLookup.get(b)?.values() ?? []).reduce((sum, v) => sum + v, 0);
    return bTotal - aTotal;
  });
}

export function sortGroupsByLineValue(
  groups: string[],
  grouped: Map<string, any[]>
): void {
  groups.sort((a, b) => {
    const aTotal = (grouped.get(a) ?? []).reduce((sum, item) => sum + (Number(item?.value ?? 0)), 0);
    const bTotal = (grouped.get(b) ?? []).reduce((sum, item) => sum + (Number(item?.value ?? 0)), 0);
    return bTotal - aTotal;
  });
}

export function sortTooltipByValue(params: any[]): any[] {
  return [...params].sort((a, b) => {
    const aVal = a?.data?.rawValue ?? a?.value ?? 0;
    const bVal = b?.data?.rawValue ?? b?.value ?? 0;
    return bVal - aVal;
  });
}

export function filterZeroValues(params: any[]): any[] {
  return params.filter((param: any) => {
    const value = param?.data?.rawValue ?? param?.value ?? 0;
    return value !== 0;
  });
}

export function filterZeroValuesLine(params: any[]): any[] {
  return params.filter((param: any) => {
    const value = param?.value?.[1] ?? param?.value ?? 0;
    return value !== 0;
  });
}

export function truncateText(text: string, maxLength: number): string {
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
}
