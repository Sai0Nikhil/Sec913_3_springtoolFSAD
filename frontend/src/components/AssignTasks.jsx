import React, { useEffect, useState } from 'react';
import { apibaseurl, callApi } from '../lib';
import PageHeader from './PageHeader';
import './AdminPages.css';
import './AssignTasks.css';

// Read the role claim from the JWT so we can filter the handover list.
function getRoleFromToken(t) {
    try {
        if (!t) return null;
        const parts = t.split('.');
        if (parts.length < 2) return null;
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        return payload.role == null ? null : Number(payload.role);
    } catch { return null; }
}

/**
 * Assign Tasks — clean handover flow.
 * - "Add Task" inline at the top (title only)
 * - List of tasks, each with a single "Handover →" button
 * - Click opens a picker, pick a user, confirm — fires PATCH /tasks/{id}/assign
 * - Whoever currently holds the task can also handover (server allows it).
 */
const AssignTasks = ({ token }) => {
    const [tasks, setTasks]   = useState([]);
    const [users, setUsers]   = useState([]);
    const [loading, setLoading] = useState(false);

    // handover popover
    const [popoverFor, setPopoverFor] = useState(null);  // taskId being handed over
    const [pickedUser, setPickedUser] = useState("");

    useEffect(() => {
        loadTasks();
        loadUsers();
    }, []);

    function loadTasks() {
        setLoading(true);
        callApi("GET", apibaseurl + "/tasks/all", null, null, (res) => {
            setLoading(false);
            if (res && Array.isArray(res.tasks)) setTasks(res.tasks);
            else setTasks([]);
        }, token);
    }

    function loadUsers() {
        callApi("GET", apibaseurl + "/authservice/list", null, null, (res) => {
            if (res && Array.isArray(res.users)) {
                const actorRole = getRoleFromToken(token);
                // Admin (3): can hand off to Managers + Users (anyone except other admins).
                // Anyone else (Manager, etc.): can only hand off to plain Users (role 1).
                const filtered = res.users.filter(u => {
                    const r = Number(u.role);
                    if (r === 3) return false;                       // never to admins
                    if (actorRole === 3) return true;                // admin sees everyone non-admin
                    return r === 1;                                  // manager only to users
                });
                setUsers(filtered);
            }
        }, token);
    }

    function openPopover(t) {
        setPopoverFor(t.id);
        setPickedUser("");
    }

    function cancelPopover() {
        setPopoverFor(null);
        setPickedUser("");
    }

    function confirmHandover(t) {
        if (!pickedUser) { alert("Pick a user."); return; }
        const user = users.find(u => String(u.id) === String(pickedUser));
        if (!user) { alert("User not found."); return; }
        if (!confirm(`Handover "${t.title}" to ${user.fullname}?`)) return;

        callApi("PATCH", apibaseurl + "/tasks/" + t.id + "/assign",
            { userId: Number(pickedUser) }, null, (res) => {
                if (res && res.code === 200) {
                    setPopoverFor(null);
                    setPickedUser("");
                    loadTasks();
                } else {
                    alert((res && res.message) || "Failed to handover");
                }
            }, token);
    }

    function fmt(d) {
        if (!d) return "—";
        try { const dt = new Date(d); if (isNaN(dt)) return d; return dt.toLocaleDateString(); }
        catch { return d; }
    }

    const openTasks      = tasks.filter(t => t.status !== "Completed");
    const completedTasks = tasks.filter(t => t.status === "Completed");

    return (
        <>
            <PageHeader
                crumbs={["Home", "Assign Tasks"]}
                title="Assign Tasks"
                subtitle="Hand off a task to the next person in the chain. Admin → Manager → User."
            />

            <div className="ap">
                {/* ----- Handover list ----- */}
                <div className="ap-section">
                    <h3 className="ap-title">Open Tasks ({openTasks.length})</h3>
                    <div className="at-hint">
                        {getRoleFromToken(token) === 3
                            ? "You're the Admin — hand a task to a Manager or directly to a User."
                            : "You can hand off any task you currently hold to a User."}
                    </div>
                    {loading && <div className="ap-empty">Loading…</div>}
                    {!loading && openTasks.length === 0 && (
                        <div className="ap-empty">No tasks to handover.</div>
                    )}

                    <div className="at-list">
                        {openTasks.map(t => (
                            <div className="at-task" key={t.id}>
                                <div className="at-task-main">
                                    <div className="at-task-title">{t.title}</div>
                                    <div className="at-task-meta">
                                        <span className={"at-pill at-pill-" + t.status}>{t.status}</span>
                                        <span className="at-meta-sep">·</span>
                                        <span>Current: <strong>{t.assigneeName || "—"}</strong> ({t.assigneeType})</span>
                                        {t.workDate && (
                                            <>
                                                <span className="at-meta-sep">·</span>
                                                <span>{fmt(t.workDate)}</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {popoverFor === t.id ? (
                                    <div className="at-popover">
                                        <select
                                            className="at-input"
                                            value={pickedUser}
                                            onChange={(e) => setPickedUser(e.target.value)}
                                        >
                                            <option value="">Pick a user…</option>
                                            {users.map(u => (
                                                <option key={u.id} value={u.id}>
                                                    {u.fullname} ({u.rolename || ("Role " + u.role)})
                                                </option>
                                            ))}
                                        </select>
                                        <button className="at-btn-primary" onClick={() => confirmHandover(t)}>Confirm</button>
                                        <button className="at-btn-ghost"  onClick={cancelPopover}>Cancel</button>
                                    </div>
                                ) : (
                                    <button className="at-btn-handover" onClick={() => openPopover(t)}>
                                        Handover →
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {completedTasks.length > 0 && (
                    <div className="ap-section">
                        <h3 className="ap-title">Recently Completed ({completedTasks.length})</h3>
                        <div className="at-list">
                            {completedTasks.slice(0, 10).map(t => (
                                <div className="at-task is-done" key={t.id}>
                                    <div className="at-task-main">
                                        <div className="at-task-title">{t.title}</div>
                                        <div className="at-task-meta">
                                            <span className="at-pill at-pill-Completed">Completed</span>
                                            <span className="at-meta-sep">·</span>
                                            <span>By <strong>{t.assigneeName || "—"}</strong></span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default AssignTasks;
