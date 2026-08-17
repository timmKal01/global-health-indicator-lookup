# Global Health Indicator Lookup — WHO Data

Look up any WHO Global Health Observatory indicator — life
expectancy, immunization coverage, disease prevalence, health
spending, and thousands more — for one or more countries over recent
years, via the official [WHO GHO OData
API](https://www.who.int/data/gho/info/gho-odata-api).

Built for global health, NGO, and public-health research teams
comparing countries without downloading WHO's own data exports.

## Input

```json
{
  "countries": ["USA", "GBR", "JPN"],
  "indicatorCode": "WHOSIS_000001",
  "mostRecentYears": 5
}
```

| Field | Type | Description |
|---|---|---|
| `countries` | array of strings (required) | One or more ISO 3-letter country codes, e.g. `"USA"`, `"GBR"`, `"JPN"`, `"IND"`. |
| `indicatorCode` | string (required) | A WHO GHO indicator code. Common ones: `WHOSIS_000001` (life expectancy at birth), `WHOSIS_000002` (healthy life expectancy), `WHS4_100` (measles immunization coverage %), `SA_0000001688` (alcohol consumption per capita), `GHED_CHEGDP_SHA2011` (health spending % of GDP). Browse the full catalog at [ghoapi.azureedge.net/api/Indicator](https://ghoapi.azureedge.net/api/Indicator). |
| `mostRecentYears` | number | How many of the most recent distinct years (per country) to return. Indicators broken down by sex/age/etc return multiple rows per year. Default `5`, max `20`. |

## Output

One record per country/year/dimension-breakdown:

```json
{
  "countryCode": "USA",
  "indicatorCode": "WHOSIS_000001",
  "year": 2021,
  "value": 76.373681040,
  "displayValue": "76.4 [76.3-76.5]",
  "dimension1": "SEX_BTSX",
  "dimension1Type": "SEX",
  "dimension2": null,
  "dimension2Type": null
}
```

Many indicators are broken down by sex (`SEX_BTSX` = both sexes,
`SEX_MLE`, `SEX_FMLE`) or other dimensions — each breakdown for a
given year is returned as its own row rather than picking one
arbitrarily. `displayValue` includes WHO's own confidence interval
text where available; `value` is the plain number for calculations.

An unrecognized indicator code returns a clear error; an unrecognized
country code returns zero rows for that indicator (a real "no data"
outcome, since WHO's API doesn't distinguish the two cases itself).

## How it works

Direct calls to the official [WHO GHO OData
API](https://ghoapi.azureedge.net/api/) — no proxy, no key, no
scraping. WHO data is freely available for reuse per WHO's open data
terms.

## Pricing note

Billed per **lookup** (one run), not per value returned — one charge
whether you request 1 country/1 year or 20 countries/20 years.

## Related products

- [Economic Indicator Lookup](https://github.com/timmKal01/economic-indicator-lookup) — the World Bank economic counterpart to this WHO health data
