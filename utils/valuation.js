// Valuation engine — assembles an item's value from its components using the
// rules in the global Settings document (SOW Section 6).
//
//   metalValue     = netWeight (g) * AED/gram for the item's purity
//   stoneValue     = stoneWeight (ct) * AED/carat for the stone type
//   estimatedValue = metalValue + stoneValue + makingCharges
//   resaleValue    = metalValue * metalFactor + stoneValue * stoneFactor
//
// `settings` is a Settings document (with Map fields goldRates / stoneRates).

function rate(map, key) {
  if (!map) return 0;
  // Mongoose Map exposes .get(); a plain object falls back to bracket access.
  const value = typeof map.get === "function" ? map.get(key) : map[key];
  return Number(value) || 0;
}

function valueItem(item, settings) {
  const netWeight = Number(item.netWeight) || 0;
  const stoneWeight = Number(item.stoneWeight) || 0;
  const makingCharges = Number(item.makingCharges) || 0;

  const metalValue = netWeight * rate(settings.goldRates, item.purity);
  const stoneValue = stoneWeight * rate(settings.stoneRates, item.stoneType);

  const estimatedValue = metalValue + stoneValue + makingCharges;
  const resaleValue =
    metalValue * (settings.resaleFactorMetal ?? 0.9) +
    stoneValue * (settings.resaleFactorStone ?? 0.6);

  return {
    metalValue: round(metalValue),
    stoneValue: round(stoneValue),
    estimatedValue: round(estimatedValue),
    resaleValue: round(resaleValue),
    valuedAt: new Date(),
  };
}

function round(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

module.exports = { valueItem };
