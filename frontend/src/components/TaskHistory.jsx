import React, { useEffect, useState } from 'react';
import { apibaseurl, callApi } from '../lib';
import { downloadPdfTable } from '../exports.js';
import './TaskHistory.css';

const ACTION_META = {
    CREATED:  { label: "Created",  emoji: "✨", tone: "neutral" },
    HANDOVER: { label: "Handover", emoji: "→",  tone: "info"    },
    ASSIGN:   { label: "Assign",   emoji: "🎯", tone: "info"    },
    STATUS:   { label: "Status",   emoji: "⚡", tone: "warn"    },
    DELETED:  { label: "Deleted",  emoji: "🗑", tone: "danger"  }
};

const TaskHistory = ({ token, taskId, taskTitle }) => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        setLoading(true);
        callApi("GET", apibaseurl + "/tasks/" + taskId + "/events", null, null, (res) => {
            if (!active) return;
            setLoading(false);
            if (res && Array.isArray(res.events)) setEvents(res.events);
            else setEvents([]);
        }, token);
        return () => { active = false; };
    }, [taskId, token]);

    function fmt(d) {
        if (!d) return "—";
        try { const x = new Date(d); if (isNaN(x.getTime())) return d; return x.toLocaleString(); }
        catch { return d; }
    }

    function downloadActivityPdf() {
        if (events.length === 0) { alert("No activity to export yet."); return; }
        const title = taskTitle ? `Activity Log — ${taskTitle}` : `Activity Log — Task #${taskId}`;
        downloadPdfTable({
            title,
            subtitle: `${events.length} event(s) · Task #${taskId}`,
            columns: [
                { header: "#",        dataKey: "_idx"   },
                { header: "Action",   dataKey: "_label" },
                { header: "Detail",   dataKey: "detail" },
                { header: "By",       dataKey: "actorName" },
                { header: "When",     dataKey: "_when"  }
            ],
            rows: events.map((e, i) => {
                const meta = ACTION_META[e.action] || { label: e.action };
                return {
                    ...e,
                    _idx:   i + 1,
                    _label: meta.label.toUpperCase(),
                    _when:  fmt(e.createdAt)
                };
            }),
            filename: `task-${taskId}-activity`
        });
    }

    if (loading) return <div className="th-empty">Loading activity…</div>;
    if (events.length === 0) {
        return (
            <div className="th-wrap">
                <div className="th-empty">No activity recorded yet.</div>
            </div>
        );
    }

    return (
        <div className="th-wrap">
            <div className="th-header">
                <span className="th-header-title">Activity ({events.length})</span>
                <button className="th-pdf-btn" onClick={downloadActivityPdf}>
                    ⤓ Download PDF
                </button>
            </div>
            <ol className="th-timeline">
                {events.map(e => {
                    const meta = ACTION_META[e.action] || { label: e.action, emoji: "•", tone: "neutral" };
                    return (
                        <li key={e.id} className={"th-row th-tone-" + meta.tone}>
                            <span className="th-bullet">{meta.emoji}</span>
                            <div className="th-body">
                                <div className="th-line">
                                    <span className="th-action">{meta.label}</span>
                                    {e.detail && <span className="th-detail">{e.detail}</span>}
                                </div>
                                <div className="th-meta">
                                    by <strong>{e.actorName || "system"}</strong> · {fmt(e.createdAt)}
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ol>
        </div>
    );
};

export default TaskHistory;
