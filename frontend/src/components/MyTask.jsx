import React, { useEffect, useState } from 'react';
import { apibaseurl, callApi } from '../lib';
import './AdminPages.css';
import PageHeader from './PageHeader';
import { downloadCsv, downloadPdfTable, fmtDateTime } from '../exports.js';

/**
 * Personal task view — shows tasks assigned to me by user id OR by my role.
 * I can move my tasks between Pending / InProgress / Completed.
 */
function readRoleFromToken(t) {
    try {
        if (!t) return null;
        const parts = t.split('.');
        if (parts.length < 2) return null;
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        return payload.role == null ? null : Number(payload.role);
    } catch { return null; }
}

const MyTask = ({ token }) => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState("all");
    const myRole = readRoleFromToken(token);

    useEffect(() => { load(); }, []);

    function load() {
        setLoading(true);
        callApi("GET", apibaseurl + "/tasks/my", null, null, (res) => {
            setLoading(false);
            if (res && Array.isArray(res.tasks)) {
                // For Managers/Admins, tasks where THEY are the USER-assignee are
                // "delegated to manage" — those live in Task Manager, not here.
                const personal = res.tasks.filter(t => {
                    if (myRole === 1) return true;                  // plain users see everything
                    if (t.assigneeType === "USER") return false;     // managers don't "do" handed-over tasks
                    return true;                                     // ROLE-assigned ones still appear
                });
                setTasks(personal);
            } else {
                setTasks([]);
            }
        }, token);
    }

    function setStatus(t, newStatus) {
        callApi("PATCH", apibaseurl + "/tasks/" + t.id + "/status",
            { status: newStatus }, null, (res) => {
                if (res && res.code === 200) load();
                else alert((res && res.message) || "Failed to update");
            }, token);
    }

    function fmt(d) {
        if (!d) return "—";
        try { const dt = new Date(d); if (isNaN(dt)) return d; return dt.toLocaleString(); }
        catch { return d; }
    }

    function exportMyPdf() {
        const list = filter === "all" ? tasks : tasks.filter(t => t.status === filter);
        downloadPdfTable({
            title: "My Tasks",
            subtitle:
                "Filter: " + (filter === "all" ? "All" : filter)
                + "  •  " + list.length + " row(s)",
            columns: [
                { header: "Title",      dataKey: "title" },
                { header: "Status",     dataKey: "status" },
                { header: "Assigned",   dataKey: "assigneeName" },
                { header: "Type",       dataKey: "assigneeType" },
                { header: "From",       dataKey: "creatorName" },
                { header: "Due / Work", dataKey: "_due" }
            ],
            rows: list.map(t => ({
                ...t,
                _due: fmtDateTime(t.workDate || t.dueDate)
            })),
            filename: "my-tasks-" + (filter === "all" ? "all" : filter.toLowerCase())
        });
    }

    const counts = {
        all:        tasks.length,
        Pending:    tasks.filter(t => t.status === "Pending").length,
        InProgress: tasks.filter(t => t.status === "InProgress").length,
        Completed:  tasks.filter(t => t.status === "Completed").length
    };
    const filtered = filter === "all" ? tasks : tasks.filter(t => t.status === filter);

    return (
        <>
        <PageHeader
            crumbs={["Home", "My Task"]}
            title="My Tasks"
            subtitle="Everything assigned to you, directly or through your role."
        />
        <div className="ap">
            <div className="ap-section">
                <div className="ap-section-head">
                    <h3 className="ap-title">My Tasks</h3>
                    <div className="ap-export-actions">
                        <button className="ap-export-btn ap-export-csv"
                            onClick={() => downloadCsv("/reports/tasks/my.csv", "my-tasks.csv", token)}
                            title="Download CSV"
                        >⤓ CSV</button>
                        <button className="ap-export-btn ap-export-pdf"
                            onClick={() => exportMyPdf()}
                            title="Download PDF"
                        >⤓ PDF</button>
                    </div>
                </div>

                <div className="ap-tabs">
                    {["all", "Pending", "InProgress", "Completed"].map(k => (
                        <button
                            key={k}
                            className={"ap-tab " + (filter === k ? "is-active" : "")}
                            onClick={() => setFilter(k)}
                        >
                            {k === "all" ? "All" : (k === "InProgress" ? "In Progress" : k)}
                            <span className="ap-tab-count">{counts[k]}</span>
                        </button>
                    ))}
                </div>

                {loading && <div className="ap-empty">Loading…</div>}
                {!loading && filtered.length === 0 && (
                    <div className="ap-empty">{filter === "all" ? "Nothing assigned to you right now." : "Nothing matches this filter."}</div>
                )}
                {!loading && filtered.length > 0 && (
                    <table className="ap-table">
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Assigned via</th>
                                <th>Status</th>
                                <th>Due</th>
                                <th>From</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(t => (
                                <tr key={t.id}>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{t.title}</div>
                                        {t.description && <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>{t.description}</div>}
                                    </td>
                                    <td>
                                        <span className="ap-assignee">
                                            <span className="ap-assignee-type">{t.assigneeType}</span>
                                            {t.assigneeName || "—"}
                                        </span>
                                    </td>
                                    <td><span className={"ap-status ap-status-" + t.status}>{t.status}</span></td>
                                    <td>{fmt(t.dueDate)}</td>
                                    <td>{t.creatorName || "—"}</td>
                                    <td>
                                        <div className="ap-row-actions">
                                            {t.status === "Pending" && (
                                                <button className="ap-ghost" onClick={() => setStatus(t, "InProgress")}>Start</button>
                                            )}
                                            {t.status !== "Completed" && (
                                                <button className="ap-primary" onClick={() => setStatus(t, "Completed")}>Mark Done</button>
                                            )}
                                            {t.status === "Completed" && (
                                                <button className="ap-ghost" onClick={() => setStatus(t, "Pending")}>Reopen</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
        </>
    );
};

export default MyTask;
