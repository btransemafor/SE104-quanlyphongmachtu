export const formatNumber = (num, locale = 'en-US') => {
  if (num === null || num === undefined) return '0';
  return num.toLocaleString(locale);
};
export default formatNumber; 