import React, { useEffect, useState } from 'react';
import { apibaseurl, callApi } from '../lib';
import './AdminPages.css';
import PageHeader from './PageHeader';

/**
 * Personal task view — shows tasks assigned to me by user id OR by my role.
 * I can move my tasks between Pending / InProgress / Completed.
 */
const MyTask = ({ token }) => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => { load(); }, []);

    function load() {
        setLoading(true);
        callApi("GET", apibaseurl + "/tasks/my", null, null, (res) => {
            setLoading(false);
            if (res && Array.isArray(res.tasks)) setTasks(res.tasks);
            else setTasks([]);
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

    return (
        <>
        <PageHeader
            crumbs={["Home", "My Task"]}
            title="My Tasks"
            subtitle="Everything assigned to you, directly or through your role."
        />
        <div className="ap">
            <div className="ap-section">
                <h3 className="ap-title">My Tasks</h3>
                {loading && <div className="ap-empty">Loading…</div>}
                {!loading && tasks.length === 0 && (
                    <div className="ap-empty">Nothing assigned to you right now.</div>
                )}
                {!loading && tasks.length > 0 && (
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
                            {tasks.map(t => (
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
