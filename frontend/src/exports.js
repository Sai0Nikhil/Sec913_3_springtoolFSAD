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
 * Decode JWT payload (no signature check) — used to pull the downloader's email.
 */
function decodeTokenPayload(t) {
    try {
        if (!t) return null;
        const parts = t.split('.');
        if (parts.length < 2) return null;
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        return payload || null;
    } catch { return null; }
}

const PROJECT_NAME = "Micro-Task Hub";
const PROJECT_TAGLINE = "Admin · Task & Role Management Console";
const FOOTER_ATTRIBUTION = "2500032630  @  Sai Nikhil   ·   Sec_913   ·   Elangovam Sir";

/**
 * Branded PDF table — uses jsPDF + autoTable.
 * @param {object} opts
 *   title:    string — the heading printed at the top
 *   subtitle: string — small line below the title (e.g. filter info)
 *   columns:  [{ header: 'Title', dataKey: 'title' }, ...]
 *   rows:     array of objects keyed by dataKey
 *   filename: download filename (omit .pdf — added automatically)
 *   downloadedBy: optional override; if absent we read it from the JWT in localStorage
 */
export async function downloadPdfTable({ title, subtitle, columns, rows, filename = "report", downloadedBy }) {
    const { default: jsPDF } = await import("jspdf");
    await import("jspdf-autotable");

    const doc   = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const today = new Date().toLocaleString();

    // Decode downloader from JWT if caller didn't pass one
    if (!downloadedBy) {
        const tok = (typeof localStorage !== "undefined") ? localStorage.getItem("token") : null;
        const claims = decodeTokenPayload(tok);
        downloadedBy = (claims && claims.username) ? claims.username : "—";
    }

    /* ------------------------------------------------------------------ */
    /* Header band — indigo→blue gradient (stacked rectangles)             */
    /* ------------------------------------------------------------------ */
    const headerH = 76;
    // Use two horizontal slices to fake a gradient
    doc.setFillColor(30, 64, 175);   // indigo-800
    doc.rect(0, 0, pageW, headerH * 0.6, "F");
    doc.setFillColor(37, 99, 235);   // blue-600
    doc.rect(0, headerH * 0.45, pageW, headerH * 0.55, "F");

    // Decorative circles on the right
    doc.setFillColor(255, 255, 255);
    doc.setGState && doc.setGState(new doc.GState({ opacity: 0.07 }));
    try {
        doc.circle(pageW - 70,  20, 40, "F");
        doc.circle(pageW - 130, 70, 24, "F");
    } catch (e) { /* circle/gstate not critical */ }
    if (doc.setGState) doc.setGState(new doc.GState({ opacity: 1 }));

    // Left side: project mark + name
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(28, 18, 40, 40, 8, 8, "F");
    doc.setTextColor(37, 99, 235);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("MT", 48, 44, { align: "center" });

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(PROJECT_NAME, 80, 38);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(219, 234, 254);     // blue-100
    doc.text(PROJECT_TAGLINE, 80, 56);

    // Right side: report title + downloader + date
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(title || "Report", pageW - 28, 32, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(219, 234, 254);
    doc.text("Downloaded by: " + downloadedBy, pageW - 28, 50, { align: "right" });
    doc.text("Generated: " + today,            pageW - 28, 64, { align: "right" });

    /* ------------------------------------------------------------------ */
    /* Body title + subtitle                                              */
    /* ------------------------------------------------------------------ */
    let cursorY = headerH + 22;
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(title || "Report", 32, cursorY);
    cursorY += 4;

    if (subtitle) {
        cursorY += 12;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);     // slate-500
        doc.text(subtitle, 32, cursorY);
    }

    // Thin blue accent line
    cursorY += 6;
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(1.5);
    doc.line(32, cursorY, 32 + 40, cursorY);
    cursorY += 12;

    /* ------------------------------------------------------------------ */
    /* Table                                                              */
    /* ------------------------------------------------------------------ */
    doc.autoTable({
        startY: cursorY,
        head: [columns.map(c => c.header)],
        body: rows.map(r => columns.map(c => {
            const v = r[c.dataKey];
            return v == null ? "" : String(v);
        })),
        margin: { left: 32, right: 32, bottom: 48 },
        styles: { fontSize: 9, cellPadding: 6, overflow: "linebreak", textColor: [30, 41, 59] },
        headStyles: {
            fillColor: [37, 99, 235],
            textColor: 255,
            fontStyle: "bold",
            halign: "left"
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        didDrawPage: () => {
            const pageCount = doc.internal.getNumberOfPages();
            const pageNo   = doc.internal.getCurrentPageInfo().pageNumber;

            // Footer separator line
            doc.setDrawColor(226, 232, 240);  // slate-200
            doc.setLineWidth(0.5);
            doc.line(32, pageH - 30, pageW - 32, pageH - 30);

            doc.setFontSize(8);
            doc.setTextColor(71, 85, 105);    // slate-600
            doc.setFont("helvetica", "bold");
            doc.text(FOOTER_ATTRIBUTION, 32, pageH - 16);

            doc.setFont("helvetica", "normal");
            doc.setTextColor(148, 163, 184);  // slate-400
            doc.text(
                "Page " + pageNo + " of " + pageCount + "  ·  " + PROJECT_NAME,
                pageW - 32, pageH - 16,
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
