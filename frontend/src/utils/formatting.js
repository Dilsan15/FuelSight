export const formatINR = (val) => {
  const strVal = (val ?? "").toString(); // safely convert to string
  const num = parseFloat(strVal.replace(/,/g, ""));
  if (isNaN(num)) return "0";
  return num.toLocaleString("en-IN");
};
