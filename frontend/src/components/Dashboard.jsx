import React, { useEffect, useState } from 'react';
import { apibaseurl, callApi } from '../lib';
import PageHeader from './PageHeader';
import './Dashboard.css';

/**
 * Dashboard — at-a-glance stats and quick actions.
 * For Admins it pulls /tasks/all + /authservice/list + /roles + /menus.
 * For everyone else it only pulls /tasks/my.
 */
const Dashboard = ({ token, role, fullname, onJump }) => {
    const isAdmin = role === 3;

    const [tasksAll, setTasksAll] = useState([]);
    const [tasksMine, setTasksMine] = useState([]);
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [menus, setMenus] = useState([]);

    useEffect(() => {
        callApi("GET", apibaseurl + "/tasks/my", null, null, (r) => {
            if (r && Array.isArray(r.tasks)) setTasksMine(r.tasks);
        }, token);

        if (isAdmin) {
            callApi("GET", apibaseurl + "/tasks/all", null, null, (r) => {
                if (r && Array.isArray(r.tasks)) setTasksAll(r.tasks);
            }, token);
            callApi("GET", apibaseurl + "/authservice/list", null, null, (r) => {
                if (r && Array.isArray(r.users)) setUsers(r.users);
            }, token);
            callApi("GET", apibaseurl + "/roles", null, null, (r) => {
                if (Array.isArray(r)) setRoles(r);
            }, token);
            callApi("GET", apibaseurl + "/menus", null, null, (r) => {
                if (Array.isArray(r)) setMenus(r);
            }, token);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAdmin]);

    const myPending     = tasksMine.filter(t => t.status === "Pending").length;
    const myInProgress  = tasksMine.filter(t => t.status === "InProgress").length;
    const myCompleted   = tasksMine.filter(t => t.status === "Completed").length;

    const totalOpen     = tasksAll.filter(t => t.status !== "Completed").length;
    const totalDone     = tasksAll.filter(t => t.status === "Completed").length;

    const recent = (isAdmin ? tasksAll : tasksMine).slice(0, 5);

    function fmt(d) {
        if (!d) return "—";
        try { const dt = new Date(d); if (isNaN(dt)) return d; return dt.toLocaleString(); }
        catch { return d; }
    }

    return (
        <>
            <PageHeader
                crumbs={["Home", "Dashboard"]}
                title={`Welcome back, ${fullname || "there"}`}
                subtitle={isAdmin
                    ? "Here's a quick view of the system. Admin tools are in the sidebar."
                    : "Here's a quick view of your work."}
            />

            <div className="dashboard">
                <div className="dash-stats">
                    <div className="dash-stat">
                        <div className="dash-stat-icon" style={{ background: '#dbeafe', color: '#1d4ed8' }}>📋</div>
                        <div className="dash-stat-body">
                            <div className="dash-stat-label">My Pending</div>
                            <div className="dash-stat-value">{myPending}</div>
                        </div>
                    </div>
                    <div className="dash-stat">
                        <div className="dash-stat-icon" style={{ background: '#fef3c7', color: '#b45309' }}>⚡</div>
                        <div className="dash-stat-body">
                            <div className="dash-stat-label">My In Progress</div>
                            <div className="dash-stat-value">{myInProgress}</div>
                        </div>
                    </div>
                    <div className="dash-stat">
                        <div className="dash-stat-icon" style={{ background: '#dcfce7', color: '#166534' }}>✓</div>
                        <div className="dash-stat-body">
                            <div className="dash-stat-label">My Completed</div>
                            <div className="dash-stat-value">{myCompleted}</div>
                        </div>
                    </div>
                    {isAdmin && (
                        <>
                            <div className="dash-stat">
                                <div className="dash-stat-icon" style={{ background: '#ede9fe', color: '#6d28d9' }}>∑</div>
                                <div className="dash-stat-body">
                                    <div className="dash-stat-label">Open Tasks (all)</div>
                                    <div className="dash-stat-value">{totalOpen}</div>
                                </div>
                            </div>
                            <div className="dash-stat">
                                <div className="dash-stat-icon" style={{ background: '#fee2e2', color: '#b91c1c' }}>👥</div>
                                <div className="dash-stat-body">
                                    <div className="dash-stat-label">Users</div>
                                    <div className="dash-stat-value">{users.length}</div>
                                </div>
                            </div>
                            <div className="dash-stat">
                                <div className="dash-stat-icon" style={{ background: '#e0f2fe', color: '#0369a1' }}>🛡</div>
                                <div className="dash-stat-body">
                                    <div className="dash-stat-label">Roles · Menus</div>
                                    <div className="dash-stat-value">{roles.length} · {menus.length}</div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="dash-grid">
                    <div className="dash-card">
                        <div className="dash-card-head">
                            <h3>Recent tasks</h3>
                            <button className="dash-link" onClick={() => onJump && onJump(isAdmin ? "Task Manager" : "My Task")}>View all →</button>
                        </div>
                        {recent.length === 0 ? (
                            <div className="dash-empty">No tasks yet.</div>
                        ) : (
                            <ul className="dash-list">
                                {recent.map(t => (
                                    <li key={t.id} className="dash-list-item">
                                        <div className="dash-list-main">
                                            <div className="dash-list-title">{t.title}</div>
                                            <div className="dash-list-meta">
                                                {t.assigneeType} · {t.assigneeName || "—"} · due {fmt(t.dueDate)}
                                            </div>
                                        </div>
                                        <span className={"dash-pill dash-pill-" + t.status}>{t.status}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="dash-card">
                        <div className="dash-card-head">
                            <h3>Quick actions</h3>
                        </div>
                        <div className="dash-actions">
                            <button className="dash-action" onClick={() => onJump && onJump("My Task")}>
                                <span className="dash-action-emoji">📌</span>
                                <span>View my tasks</span>
                            </button>
                            {isAdmin && (
                                <>
                                    <button className="dash-action" onClick={() => onJump && onJump("Task Manager")}>
                                        <span className="dash-action-emoji">➕</span>
                                        <span>Create a task</span>
                                    </button>
                                    <button className="dash-action" onClick={() => onJump && onJump("User Manager")}>
                                        <span className="dash-action-emoji">👥</span>
                                        <span>Manage users</span>
                                    </button>
                                    <button className="dash-action" onClick={() => onJump && onJump("Role Manager")}>
                                        <span className="dash-action-emoji">🛡</span>
                                        <span>Roles & menus</span>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Dashboard;
