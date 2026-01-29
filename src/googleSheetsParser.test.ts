// ABOUTME: Tests for Google Sheets URL parsing and data fetching utilities.
// ABOUTME: Verifies URL extraction, CSV export URL construction, and sheet listing.

import { describe, it, expect } from "vitest";
import {
  extractSheetId,
  buildCsvExportUrl,
  parseGoogleSheetsUrl,
} from "./googleSheetsParser";

describe("extractSheetId", () => {
  it("extracts ID from a standard Google Sheets URL", () => {
    const url =
      "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/edit";
    expect(extractSheetId(url)).toBe(
      "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms",
    );
  });

  it("extracts ID from a URL with gid parameter", () => {
    const url =
      "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/edit#gid=0";
    expect(extractSheetId(url)).toBe(
      "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms",
    );
  });

  it("returns null for non-Google Sheets URLs", () => {
    expect(extractSheetId("https://example.com/spreadsheet")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(extractSheetId("")).toBeNull();
  });

  it("extracts ID from a sharing link", () => {
    const url =
      "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/view";
    expect(extractSheetId(url)).toBe(
      "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms",
    );
  });
});

describe("buildCsvExportUrl", () => {
  it("builds CSV export URL with default sheet", () => {
    const url = buildCsvExportUrl("abc123");
    expect(url).toBe(
      "https://docs.google.com/spreadsheets/d/abc123/gviz/tq?tqx=out:csv",
    );
  });

  it("builds CSV export URL with named sheet", () => {
    const url = buildCsvExportUrl("abc123", "Scores");
    expect(url).toBe(
      "https://docs.google.com/spreadsheets/d/abc123/gviz/tq?tqx=out:csv&sheet=Scores",
    );
  });
});

describe("parseGoogleSheetsUrl", () => {
  it("parses valid Google Sheets URL", () => {
    const result = parseGoogleSheetsUrl(
      "https://docs.google.com/spreadsheets/d/abc123/edit",
    );
    expect(result.sheetId).toBe("abc123");
    expect(result.error).toBeUndefined();
  });

  it("returns error for invalid URL", () => {
    const result = parseGoogleSheetsUrl("https://example.com");
    expect(result.sheetId).toBeNull();
    expect(result.error).toBeDefined();
  });

  it("returns error for empty input", () => {
    const result = parseGoogleSheetsUrl("");
    expect(result.sheetId).toBeNull();
    expect(result.error).toBeDefined();
  });
});
