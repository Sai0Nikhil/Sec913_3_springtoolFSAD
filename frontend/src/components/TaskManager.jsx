import React, { useEffect, useState } from 'react';
import { apibaseurl, callApi } from '../lib';
import './AdminPages.css';
import './TaskManager.css';
import PageHeader from './PageHeader';
import { downloadCsv, downloadPdfTable, fmtDateTime } from '../exports.js';

const TaskManager = ({ token }) => {
    const [roles, setRoles] = useState([]);
    const [users, setUsers] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);

    const empty = {
        title: "",
        description: "",
        assigneeType: "ROLE",   // ROLE | USER
        assigneeId: "",
        dueDate: "",
        hours: "",
        minutes: ""
    };
    const [form, setForm] = useState(empty);
    const [filter, setFilter] = useState("all");

    useEffect(() => {
        loadRoles();
        loadUsers();
        loadTasks();
    }, []);

    function loadRoles() {
        callApi("GET", apibaseurl + "/roles", null, null, (res) => {
            if (Array.isArray(res)) setRoles(res);
        }, token);
    }
    function loadUsers() {
        callApi("GET", apibaseurl + "/authservice/list", null, null, (res) => {
            if (res && Array.isArray(res.users)) setUsers(res.users);
        }, token);
    }
    function loadTasks() {
        setLoading(true);
        callApi("GET", apibaseurl + "/tasks/all", null, null, (res) => {
            setLoading(false);
            if (res && Array.isArray(res.tasks)) setTasks(res.tasks);
            else setTasks([]);
        }, token);
    }

    function onChange(e) {
        const { name, value } = e.target;
        if (name === "assigneeType") {
            setForm({ ...form, assigneeType: value, assigneeId: "" });
        } else {
            setForm({ ...form, [name]: value });
        }
    }

    /** Picking an existing task from the dropdown copies its title into the manual input. */
    function onPickExisting(e) {
        const taskId = e.target.value;
        if (!taskId) return;
        const t = tasks.find(x => String(x.id) === String(taskId));
        if (!t) return;
        setForm(prev => ({
            ...prev,
            title: t.title || "",
            description: t.description || prev.description
        }));
    }

    function submit() {
        if (!form.title.trim()) { alert("Title is required"); return; }
        if (!form.assigneeId)    { alert("Pick an assignee"); return; }

        const payload = {
            title: form.title.trim(),
            description: form.description.trim(),
            assigneeType: form.assigneeType,
            assigneeId: Number(form.assigneeId),
            dueDate: form.dueDate ? form.dueDate + "T23:59:00" : "",
            workDate: form.dueDate ? form.dueDate + "T00:00:00" : "",
            hours:   form.hours   === "" ? null : Number(form.hours),
            minutes: form.minutes === "" ? null : Number(form.minutes)
        };
        callApi("POST", apibaseurl + "/tasks", payload, null, (res) => {
            if (res && res.code === 200) {
                setForm(empty);
                loadTasks();
            } else {
                alert((res && res.message) || "Failed to create task");
            }
        }, token);
    }

    function setStatus(t, newStatus) {
        callApi("PATCH", apibaseurl + "/tasks/" + t.id + "/status",
            { status: newStatus }, null, (res) => {
                if (res && res.code === 200) loadTasks();
                else alert((res && res.message) || "Failed to update");
            }, token);
    }

    function remove(t) {
        if (!confirm(`Delete task "${t.title}"?`)) return;
        callApi("DELETE", apibaseurl + "/tasks/" + t.id, null, null, (res) => {
            if (res && res.code === 200) loadTasks();
            else alert((res && res.message) || "Failed to delete");
        }, token);
    }

    function fmt(d) {
        if (!d) return "—";
        try { const dt = new Date(d); if (isNaN(dt)) return d; return dt.toLocaleString(); }
        catch { return d; }
    }

    function exportTasksPdf(rows, currentFilter) {
        const list = currentFilter === "all" ? rows : rows.filter(t => t.status === currentFilter);
        downloadPdfTable({
            title: "Task Manager — All Tasks",
            subtitle:
                "Filter: " + (currentFilter === "all" ? "All" : currentFilter)
                + "  •  " + list.length + " row(s)",
            columns: [
                { header: "ID",       dataKey: "id" },
                { header: "Title",    dataKey: "title" },
                { header: "Status",   dataKey: "status" },
                { header: "Assignee", dataKey: "assigneeName" },
                { header: "Type",     dataKey: "assigneeType" },
                { header: "Hours",    dataKey: "hours" },
                { header: "Minutes",  dataKey: "minutes" },
                { header: "Due",      dataKey: "_due" },
                { header: "Created",  dataKey: "_created" }
            ],
            rows: list.map(t => ({
                ...t,
                _due:     fmtDateTime(t.workDate || t.dueDate),
                _created: fmtDateTime(t.createdAt)
            })),
            filename: "tasks-" + (currentFilter === "all" ? "all" : currentFilter.toLowerCase())
        });
    }

    return (
        <>
            <PageHeader
                crumbs={["Admin", "Task Manager"]}
                title="Task Manager"
                subtitle="Create tasks and assign them to a role or a specific user."
            />

            <div className="ap">
                <div className="ap-section">
                    <h3 className="ap-title">Create New Task</h3>
                    <div className="ap-form">

                        {/* Task name with dropdown of existing + manual typing */}
                        <div className="ap-field ap-full">
                            <label>Task Name*</label>
                            <div className="tm-title-row">
                                <select
                                    className="tm-title-select"
                                    onChange={onPickExisting}
                                    value=""
                                    title="Pick an existing task to copy its name"
                                >
                                    <option value="">Pick existing…</option>
                                    {tasks.map(t => (
                                        <option key={t.id} value={t.id}>{t.title}</option>
                                    ))}
                                </select>
                                <input
                                    className="tm-title-input"
                                    name="title"
                                    placeholder="…or type a new task name"
                                    value={form.title}
                                    onChange={onChange}
                                />
                            </div>
                            <div className="tm-hint">Pick from the dropdown to copy an existing name, or just type a new one.</div>
                        </div>

                        <div className="ap-field ap-full">
                            <label>Description</label>
                            <textarea name="description" value={form.description} onChange={onChange} placeholder="Optional details" />
                        </div>

                        <div className="ap-field">
                            <label>Assign To</label>
                            <select name="assigneeType" value={form.assigneeType} onChange={onChange}>
                                <option value="ROLE">A role</option>
                                <option value="USER">A specific user</option>
                            </select>
                        </div>
                        <div className="ap-field">
                            <label>{form.assigneeType === "ROLE" ? "Role*" : "User*"}</label>
                            <select name="assigneeId" value={form.assigneeId} onChange={onChange}>
                                <option value="">Select…</option>
                                {form.assigneeType === "ROLE"
                                    ? roles
                                        .filter(r => (r.rolename || "").toLowerCase() !== "admin" && Number(r.role) !== 3)
                                        .map(r => <option key={r.role} value={r.role}>{r.rolename}</option>)
                                    : users
                                        .filter(u => Number(u.role) !== 3)
                                        .map(u => <option key={u.id} value={u.id}>{u.fullname} ({u.email})</option>)
                                }
                            </select>
                        </div>

                        <div className="ap-field">
                            <label>Due / Work Date</label>
                            <input type="date" name="dueDate" value={form.dueDate} onChange={onChange} />
                        </div>
                        <div className="ap-field">
                            <label>Time allocated</label>
                            <div className="tm-time-row">
                                <input type="number" name="hours"   min="0" max="999" placeholder="Hours"   value={form.hours}   onChange={onChange} />
                                <input type="number" name="minutes" min="0" max="59"  placeholder="Minutes" value={form.minutes} onChange={onChange} />
                            </div>
                        </div>

                        <div className="ap-form-actions">
                            <button type="button" className="ap-ghost" onClick={() => setForm(empty)}>Reset</button>
                            <button type="button" className="ap-primary" onClick={submit}>Create Task</button>
                        </div>
                    </div>
                </div>

                <div className="ap-section">
                    <div className="ap-section-head">
                        <h3 className="ap-title">All Tasks</h3>
                        <div className="ap-export-actions">
                            <button className="ap-export-btn ap-export-csv"
                                onClick={() => downloadCsv("/reports/tasks/all.csv", "tasks-all.csv", token)}
                                title="Download CSV (opens in Excel)"
                            >⤓ CSV</button>
                            <button className="ap-export-btn ap-export-pdf"
                                onClick={() => exportTasksPdf(tasks, filter)}
                                title="Download PDF report"
                            >⤓ PDF</button>
                        </div>
                    </div>

                    {(() => {
                        const counts = {
                            all:        tasks.length,
                            Pending:    tasks.filter(t => t.status === "Pending").length,
                            InProgress: tasks.filter(t => t.status === "InProgress").length,
                            Completed:  tasks.filter(t => t.status === "Completed").length
                        };
                        return (
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
                        );
                    })()}

                    {loading && <div className="ap-empty">Loading…</div>}
                    {(() => {
                        const filtered = filter === "all" ? tasks : tasks.filter(t => t.status === filter);
                        if (!loading && filtered.length === 0) {
                            return <div className="ap-empty">{filter === "all" ? "No tasks yet — create one above." : "Nothing matches this filter."}</div>;
                        }
                        return null;
                    })()}
                    {!loading && (filter === "all" ? tasks : tasks.filter(t => t.status === filter)).length > 0 && (
                        <table className="ap-table">
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Assignee</th>
                                    <th>Status</th>
                                    <th>Time</th>
                                    <th>Date</th>
                                    <th>Created</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {(filter === "all" ? tasks : tasks.filter(t => t.status === filter)).map(t => (
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
                                        <td>
                                            {(t.hours != null || t.minutes != null)
                                                ? `${t.hours || 0}h ${t.minutes || 0}m`
                                                : "—"}
                                        </td>
                                        <td>{fmt(t.workDate || t.dueDate)}</td>
                                        <td>{fmt(t.createdAt)}</td>
                                        <td>
                                            <div className="ap-row-actions">
                                                {t.status !== "Completed" && (
                                                    <button className="ap-ghost" onClick={() => setStatus(t, "Completed")}>Mark Done</button>
                                                )}
                                                <button className="ap-danger" onClick={() => remove(t)}>Delete</button>
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

export default TaskManager;
