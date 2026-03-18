const HU_REGIONS = {
  Africa: 'Afrika',
  America: 'Amerika',
  Antarctica: 'Antarktisz',
  Arctic: 'Arktisz',
  Asia: 'Ázsia',
  Atlantic: 'Atlanti-óceán',
  Australia: 'Ausztrália',
  Europe: 'Európa',
  Indian: 'Indiai-óceán',
  Pacific: 'Csendes-óceán',
};

export function localizeTimezone(tz, lang) {
  if (lang !== 'hu') return tz;
  const slash = tz.indexOf('/');
  if (slash === -1) return tz;
  const region = tz.slice(0, slash);
  const rest = tz.slice(slash + 1);
  return `${HU_REGIONS[region] ?? region}/${rest}`;
}
