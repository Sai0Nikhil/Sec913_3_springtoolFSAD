/**
 * CSV download helper — hits a backend endpoint that returns text/csv and saves it.
 * Sends the JWT in the Token header (same as callApi).
 */
import { apibaseurl } from './lib.js';

export function downloadCsv(path, suggestedFilename = "report.csv", token) {
    const headers = {};
    if (token) headers["Token"] = token;

    fetch(apibaseurl + path, { method: "GET", headers })
        .then(async (res) => {
            if (!res.ok) {
                const txt = await res.text();
                throw new Error("Download failed (" + res.status + "): " + txt.slice(0, 200));
            }
            // Use the Content-Disposition filename if the server provided one
            const cd = res.headers.get("Content-Disposition") || "";
            const m = cd.match(/filename\*?=([^;]+)/i);
            const fname = m ? decodeURIComponent(m[1].replace(/^UTF-8''/i, "").replace(/^"|"$/g, "")) : suggestedFilename;
            const blob = await res.blob();
            triggerBlobDownload(blob, fname);
        })
        .catch((err) => alert(err.message || "Failed to download CSV"));
}

function triggerBlobDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
}

/**
 * Branded PDF table — uses jsPDF + autoTable.
 * @param {object} opts
 *   title:    string — the heading printed at the top
 *   subtitle: string — small line below the title (e.g. filter info)
 *   columns:  [{ header: 'Title', dataKey: 'title' }, ...]
 *   rows:     array of objects keyed by dataKey
 *   filename: download filename (omit .pdf — added automatically)
 */
export async function downloadPdfTable({ title, subtitle, columns, rows, filename = "report" }) {
    const { default: jsPDF } = await import("jspdf");
    await import("jspdf-autotable");

    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const today = new Date().toLocaleString();

    // ----- Header band -----
    doc.setFillColor(15, 23, 42);                 // slate-900
    doc.rect(0, 0, pageW, 56, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Micro-Task Hub", 32, 24);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("@2500032630 Sec_913", 32, 42);
    doc.setFontSize(9);
    doc.text("Generated: " + today, pageW - 32, 24, { align: "right" });

    // ----- Title -----
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(title || "Report", 32, 88);
    if (subtitle) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);          // slate-500
        doc.text(subtitle, 32, 104);
    }

    // ----- Table -----
    doc.autoTable({
        startY: subtitle ? 116 : 100,
        head: [columns.map(c => c.header)],
        body: rows.map(r => columns.map(c => {
            const v = r[c.dataKey];
            return v == null ? "" : String(v);
        })),
        margin: { left: 32, right: 32 },
        styles: { fontSize: 9, cellPadding: 6, overflow: "linebreak" },
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        didDrawPage: (data) => {
            // Footer: page X of Y + branding
            const pageCount = doc.internal.getNumberOfPages();
            const pageH = doc.internal.pageSize.getHeight();
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text("@2500032630 Sec_913", 32, pageH - 18);
            doc.text(
                "Page " + doc.internal.getCurrentPageInfo().pageNumber + " of " + pageCount,
                pageW - 32, pageH - 18,
                { align: "right" }
            );
        }
    });

    doc.save((filename || "report") + ".pdf");
}

/**
 * Formats a value as a printable string.
 */
export function fmtDateTime(d) {
    if (!d) return "—";
    try { const x = new Date(d); if (isNaN(x.getTime())) return d; return x.toLocaleString(); }
    catch { return String(d); }
}
