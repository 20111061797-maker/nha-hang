namespace RestaurantManagement.Infrastructure.Common;

public static class UnitConversionHelper
{
    private static readonly HashSet<string> GramAliases = new(StringComparer.OrdinalIgnoreCase) { "g", "gr", "gram", "gam" };
    private static readonly HashSet<string> KilogramAliases = new(StringComparer.OrdinalIgnoreCase) { "kg", "kilo", "kilogram" };
    private static readonly HashSet<string> MilliliterAliases = new(StringComparer.OrdinalIgnoreCase) { "ml", "mililit", "milliliter", "cc" };
    private static readonly HashSet<string> LiterAliases = new(StringComparer.OrdinalIgnoreCase) { "l", "lit", "lít", "liter" };

    public static decimal ConvertQuantity(decimal quantity, string fromUnit, string toUnit, decimal? customFactor = null)
    {
        if (string.IsNullOrWhiteSpace(fromUnit) || string.IsNullOrWhiteSpace(toUnit)) return quantity;
        var from = fromUnit.Trim().ToLowerInvariant();
        var to = toUnit.Trim().ToLowerInvariant();

        if (string.Equals(from, to, StringComparison.OrdinalIgnoreCase))
            return quantity;

        // Mass: g <-> kg
        if (GramAliases.Contains(from) && KilogramAliases.Contains(to))
            return quantity / 1000m;
        if (KilogramAliases.Contains(from) && GramAliases.Contains(to))
            return quantity * 1000m;

        // Volume: ml <-> lít
        if (MilliliterAliases.Contains(from) && LiterAliases.Contains(to))
            return quantity / 1000m;
        if (LiterAliases.Contains(from) && MilliliterAliases.Contains(to))
            return quantity * 1000m;

        // Custom conversion factor (e.g. from container or package to base unit)
        if (customFactor.HasValue && customFactor.Value > 0)
            return quantity * customFactor.Value;

        return quantity;
    }
}
