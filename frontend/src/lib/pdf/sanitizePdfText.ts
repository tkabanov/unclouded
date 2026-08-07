/**
 * jsPDF Helvetica only reliably encodes WinAnsi / Latin-1.
 * Characters outside that set (e.g. →) force UTF-16 text objects that render as
 * garbled glyphs like `!'` and break layout/width calculations.
 */
export function sanitizePdfText(input: string): string {
  return input
    .replace(/\u2018|\u2019|\u201A|\u2032/g, "'")
    .replace(/\u201C|\u201D|\u201E|\u2033/g, '"')
    .replace(/\u2013|\u2014|\u2212/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ")
    .replace(/\u2022|\u00B7/g, "-")
    .replace(/\u2192/g, "->")
    .replace(/\u2190/g, "<-")
    .replace(/\u2194/g, "<->")
    .replace(/\u2265/g, ">=")
    .replace(/\u2264/g, "<=")
    .replace(/[^\t\n\r\x20-\x7E\xA0-\xFF]/g, "");
}
