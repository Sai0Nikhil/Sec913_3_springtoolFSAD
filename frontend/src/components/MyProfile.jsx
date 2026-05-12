import React, { useEffect, useState } from 'react';
import { apibaseurl, callApi } from '../lib';
import PageHeader from './PageHeader';
import './MyProfile.css';

function roleMeta(role) {
    if (role === 3) return { name: "Administrator", emoji: "🛡️", gradient: ["#0f172a", "#1e293b"], accent: "#ef4444" };
    if (role === 2) return { name: "Manager",       emoji: "💼", gradient: ["#1e3a8a", "#1d4ed8"], accent: "#2563eb" };
    if (role === 1) return { name: "User",          emoji: "🚀", gradient: ["#064e3b", "#047857"], accent: "#10b981" };
    return            { name: "Member",        emoji: "👤", gradient: ["#334155", "#475569"], accent: "#64748b" };
}

function initials(name) {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map(p => p[0]).join("").toUpperCase();
}

const MyProfile = ({ token }) => {
    const [me, setMe] = useState(null);
    const [myTasks, setMyTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    // "none" | "profile" | "password"
    const [mode, setMode] = useState("none");

    const [editForm, setEditForm] = useState({ fullname: "", phone: "" });
    const [pwdForm,  setPwdForm]  = useState({ oldPassword: "", newPassword: "", retypePassword: "" });
    const [busy, setBusy] = useState(false);

    useEffect(() => { loadMe(); }, []);

    function loadMe() {
        callApi("GET", apibaseurl + "/authservice/uinfo", null, null, (res) => {
            if (res && res.code === 200) {
                setMe(res);
                setEditForm({ fullname: res.fullname || "", phone: res.phone || "" });
            }
            setLoading(false);
        }, token);
        callApi("GET", apibaseurl + "/tasks/my", null, null, (res) => {
            if (res && Array.isArray(res.tasks)) setMyTasks(res.tasks);
        }, token);
    }

    function openEdit() {
        if (!me) return;
        setEditForm({ fullname: me.fullname || "", phone: me.phone || "" });
        setMode("profile");
    }

    function openPwd() {
        setPwdForm({ oldPassword: "", newPassword: "", retypePassword: "" });
        setMode("password");
    }

    function closeForms() {
        setMode("none");
    }

    function submitEdit() {
        if (!editForm.fullname.trim()) { alert("Full name is required."); return; }
        if (!/^\d{6,15}$/.test(editForm.phone.trim())) { alert("Phone must be 6-15 digits."); return; }
        setBusy(true);
        callApi("PATCH", apibaseurl + "/authservice/me", {
            fullname: editForm.fullname.trim(),
            phone: editForm.phone.trim()
        }, null, (res) => {
            setBusy(false);
            if (res && res.code === 200) {
                alert("Profile updated.");
                setMode("none");
                loadMe();
            } else {
                alert((res && res.message) || "Failed to update profile.");
            }
        }, token);
    }

    function submitPwd() {
        if (!pwdForm.oldPassword) { alert("Enter your current password."); return; }
        if (!pwdForm.newPassword) { alert("Enter a new password."); return; }
        if (pwdForm.newPassword.length < 4) { alert("New password must be at least 4 characters."); return; }
        if (pwdForm.newPassword !== pwdForm.retypePassword) { alert("New passwords don't match."); return; }
        if (pwdForm.newPassword === pwdForm.oldPassword) { alert("New password must differ from current."); return; }
        setBusy(true);
        callApi("POST", apibaseurl + "/authservice/password", {
            oldPassword: pwdForm.oldPassword,
            newPassword: pwdForm.newPassword
        }, null, (res) => {
            setBusy(false);
            if (res && res.code === 200) {
                alert("Password changed. You'll stay signed in for this session.");
                setMode("none");
                setPwdForm({ oldPassword: "", newPassword: "", retypePassword: "" });
            } else {
                alert((res && res.message) || "Failed to change password.");
            }
        }, token);
    }

    if (loading || !me) {
        return (
            <>
                <PageHeader crumbs={["Home", "My Profile"]} title="My Profile" />
                <div className="mp-page">
                    <div className="mp-loading">Loading profile…</div>
                </div>
            </>
        );
    }

    const meta = roleMeta(Number(me.role));
    const heroBg = { background: `linear-gradient(135deg, ${meta.gradient[0]} 0%, ${meta.gradient[1]} 100%)` };

    const total      = myTasks.length;
    const pending    = myTasks.filter(t => t.status === "Pending").length;
    const inProgress = myTasks.filter(t => t.status === "InProgress").length;
    const completed  = myTasks.filter(t => t.status === "Completed").length;

    function fmt(d) {
        if (!d) return "—";
        try { const dt = new Date(d); if (isNaN(dt)) return d; return dt.toLocaleString(); }
        catch { return d; }
    }

    return (
        <>
            <PageHeader crumbs={["Home", "My Profile"]} title="My Profile" subtitle="Account, activity, and quick actions." />

            <div className="mp-page">
                {/* ===== Hero strip ===== */}
                <section className="mp-hero" style={heroBg}>
                    <div className="mp-hero-content">
                        <div className="mp-avatar-wrap">
                            <div className="mp-avatar" style={{ background: meta.accent }}>
                                <span>{meta.emoji}</span>
                            </div>
                            <div className="mp-avatar-initials">{initials(me.fullname)}</div>
                        </div>
                        <div className="mp-hero-text">
                            <div className="mp-hero-line">
                                <h2 className="mp-name">{me.fullname || "—"}</h2>
                                <span className="mp-role-pill" style={{ background: meta.accent }}>{meta.name}</span>
                                <span className={"mp-status-dot " + (me.status === 1 ? "is-active" : "")}>
                                    {me.status === 1 ? "Active" : "Inactive"}
                                </span>
                            </div>
                            <div className="mp-hero-meta">
                                <span>📧 {me.email}</span>
                                <span>📱 {me.phone}</span>
                                <span>🆔 #{me.id}</span>
                            </div>
                        </div>
                    </div>
                    <div className="mp-hero-actions">
                        <button className={"mp-btn-ghost " + (mode === "profile"  ? "is-active" : "")} onClick={openEdit}>Edit profile</button>
                        <button className={"mp-btn-ghost " + (mode === "password" ? "is-active" : "")} onClick={openPwd}>Change password</button>
                    </div>
                </section>

                {/* ===== Inline forms ===== */}
                {mode === "profile" && (
                    <section className="mp-card mp-form-card">
                        <div className="mp-card-head">
                            <h3>Edit profile</h3>
                            <button className="mp-card-link" onClick={closeForms}>Cancel</button>
                        </div>
                        <div className="mp-form">
                            <label>
                                <span>Full name</span>
                                <input
                                    type="text"
                                    value={editForm.fullname}
                                    onChange={(e) => setEditForm({ ...editForm, fullname: e.target.value })}
                                    placeholder="Your name"
                                />
                            </label>
                            <label>
                                <span>Phone</span>
                                <input
                                    type="text"
                                    value={editForm.phone}
                                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                    placeholder="Digits only, 6–15"
                                />
                            </label>
                            <label className="mp-form-readonly">
                                <span>Email</span>
                                <input type="text" value={me.email} disabled />
                                <small>Email is your sign-in username and can't be changed here.</small>
                            </label>
                        </div>
                        <div className="mp-form-actions">
                            <button className="mp-btn-ghost-dark" onClick={closeForms} disabled={busy}>Cancel</button>
                            <button className="mp-btn-solid" onClick={submitEdit} disabled={busy}>
                                {busy ? "Saving…" : "Save changes"}
                            </button>
                        </div>
                    </section>
                )}

                {mode === "password" && (
                    <section className="mp-card mp-form-card">
                        <div className="mp-card-head">
                            <h3>Change password</h3>
                            <button className="mp-card-link" onClick={closeForms}>Cancel</button>
                        </div>
                        <div className="mp-form">
                            <label>
                                <span>Current password</span>
                                <input
                                    type="password"
                                    value={pwdForm.oldPassword}
                                    onChange={(e) => setPwdForm({ ...pwdForm, oldPassword: e.target.value })}
                                />
                            </label>
                            <label>
                                <span>New password</span>
                                <input
                                    type="password"
                                    value={pwdForm.newPassword}
                                    onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
                                    placeholder="At least 4 characters"
                                />
                            </label>
                            <label>
                                <span>Re-type new password</span>
                                <input
                                    type="password"
                                    value={pwdForm.retypePassword}
                                    onChange={(e) => setPwdForm({ ...pwdForm, retypePassword: e.target.value })}
                                />
                            </label>
                        </div>
                        <div className="mp-form-actions">
                            <button className="mp-btn-ghost-dark" onClick={closeForms} disabled={busy}>Cancel</button>
                            <button className="mp-btn-solid" onClick={submitPwd} disabled={busy}>
                                {busy ? "Updating…" : "Update password"}
                            </button>
                        </div>
                    </section>
                )}

                {/* ===== Stats ===== */}
                <section className="mp-stats">
                    <StatCard label="Total"        value={total}      tone="neutral" icon="📋" />
                    <StatCard label="Pending"      value={pending}    tone="warn"    icon="⏳" />
                    <StatCard label="In progress"  value={inProgress} tone="info"    icon="⚡" />
                    <StatCard label="Completed"    value={completed}  tone="success" icon="✓" />
                </section>

                {/* ===== Two-column: details + activity ===== */}
                <section className="mp-cols">
                    <div className="mp-card">
                        <div className="mp-card-head">
                            <h3>Account details</h3>
                            <button className="mp-card-link" onClick={openEdit}>Edit →</button>
                        </div>
                        <DetailRow label="Full name" value={me.fullname} />
                        <DetailRow label="Email"     value={me.email} />
                        <DetailRow label="Phone"     value={me.phone} />
                        <DetailRow label="User ID"   value={"#" + me.id} />
                        <DetailRow label="Role"      value={meta.name} />
                        <DetailRow label="Status"    value={me.status === 1 ? "Active" : "Inactive"} />
                        <DetailRow label="Menus open" value={Array.isArray(me.menulist) ? me.menulist.length : 0} last />
                    </div>

                    <div className="mp-card">
                        <div className="mp-card-head">
                            <h3>Recent activity</h3>
                            <span className="mp-card-sub">Last {Math.min(5, myTasks.length)} of {myTasks.length}</span>
                        </div>
                        {myTasks.length === 0 ? (
                            <div className="mp-empty">No tasks yet.</div>
                        ) : (
                            <ul className="mp-activity">
                                {myTasks.slice(0, 5).map(t => (
                                    <li key={t.id} className="mp-activity-row">
                                        <div className="mp-activity-main">
                                            <div className="mp-activity-title">{t.title}</div>
                                            <div className="mp-activity-meta">
                                                {t.assigneeType} · {t.assigneeName || "—"} · {fmt(t.workDate || t.dueDate)}
                                            </div>
                                        </div>
                                        <span className={"mp-pill mp-pill-" + t.status}>{t.status}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </section>
            </div>
        </>
    );
};

const StatCard = ({ label, value, tone, icon }) => (
    <div className={"mp-stat mp-stat-" + tone}>
        <div className="mp-stat-icon">{icon}</div>
        <div className="mp-stat-body">
            <div className="mp-stat-value">{value}</div>
            <div className="mp-stat-label">{label}</div>
        </div>
    </div>
);

const DetailRow = ({ label, value, last }) => (
    <div className={"mp-detail " + (last ? "is-last" : "")}>
        <span className="mp-detail-label">{label}</span>
        <span className="mp-detail-value">{value ?? "—"}</span>
    </div>
);

export default MyProfile;
