---
"secapi-mcp": minor
---

- New `latest_financials` tool: a company's latest 10-K/10-Q with standardized income statement, balance sheet and cash flow in one call.
- `company_financials` now returns the standardized statement for the most recent periods by default (`period`: annual, quarterly or ytd; `limit` up to 40). `view: "as_reported"` returns the filing's own line items, which was the previous output.
- `insider_trades`: `endDate` was sent as a second start date and is now the end of the accepted-date range; `buying` / `selling` now mean open-market purchases and sales (codes P / S) instead of everything acquired or disposed, which included grants and option exercises; `ticker` is optional (market-wide feed) and may be a CIK; added `page`.
- `institution_holdings`: added `page`.
- New `list_api_endpoints` and `call_api_endpoint` tools, driven by the API's published OpenAPI document, so endpoints without a dedicated tool (and endpoints added later) can be used without a new release. `SECAPI_OPENAPI_URL` overrides where the document is read from.
