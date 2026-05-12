import React, { useEffect, useState } from 'react';
import { apibaseurl, callApi } from '../lib';
import PageHeader from './PageHeader';
import './MyProfile.css';

function roleMeta(role) {
    if (role === 3) return { name: "Administrator", emoji: "🛡️", tagline: "System Administrator",     gradient: ["#ef4444", "#b91c1c"] };
    if (role === 2) return { name: "Manager",       emoji: "💼", tagline: "Operations Manager",     gradient: ["#2563eb", "#1d4ed8"] };
    if (role === 1) return { name: "User",          emoji: "🚀", tagline: "Team Member",            gradient: ["#10b981", "#047857"] };
    return            { name: "Member",        emoji: "👤", tagline: "Member",                gradient: ["#64748b", "#334155"] };
}

const DESCRIPTION = `Welcome to your personal hub on Micro-Task Hub. Track everything assigned to you, update progress, and stay in sync with your team — all from one clean dashboard. Your role-based access keeps the right tools at your fingertips.`;

const PITCH = `Stay productive, stay organized. Your tasks, your way — with the right access for the right work.`;

const MyProfile = ({ token }) => {
    const [me, setMe] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        callApi("GET", apibaseurl + "/authservice/uinfo", null, null, (res) => {
            setLoading(false);
            if (res && res.code === 200) setMe(res);
        }, token);
    }, [token]);

    if (loading || !me) {
        return (
            <>
                <PageHeader crumbs={["Home", "My Profile"]} title="My Profile" />
                <div className="profile-page">
                    <div className="profile-loading">Loading profile…</div>
                </div>
            </>
        );
    }

    const meta = roleMeta(Number(me.role));
    const heroStyle = {
        background: `linear-gradient(135deg, ${meta.gradient[0]} 0%, ${meta.gradient[1]} 100%)`
    };

    return (
        <>
            <PageHeader
                crumbs={["Home", "My Profile"]}
                title="My Profile"
                subtitle="Your account at a glance."
            />

            <div className="profile-page">
                {/* Hero with avatar card + pitch on the right */}
                <div className="profile-hero" style={heroStyle}>
                    <div className="profile-hero-bg" aria-hidden="true">
                        <span className="bg-circle bg-circle-1" />
                        <span className="bg-circle bg-circle-2" />
                        <span className="bg-circle bg-circle-3" />
                    </div>

                    <aside className="profile-socials" aria-hidden="true">
                        <span className="profile-social">📷</span>
                        <span className="profile-social">🐦</span>
                        <span className="profile-social">💼</span>
                        <span className="profile-social">📧</span>
                    </aside>

                    <div className="profile-card">
                        <div className="profile-avatar" style={heroStyle}>
                            <span className="profile-avatar-emoji">{meta.emoji}</span>
                        </div>
                        <h2 className="profile-name" style={{ color: meta.gradient[1] }}>
                            {me.fullname || "—"}
                        </h2>
                        <div className="profile-role-tag">{meta.tagline}</div>
                        <p className="profile-card-desc">{DESCRIPTION}</p>
                        <button className="profile-btn-outline" style={{ borderColor: meta.gradient[1], color: meta.gradient[1] }}>
                            View Details
                        </button>
                    </div>

                    <div className="profile-pitch">
                        <h1 className="profile-pitch-title">YOUR <br/>PROFILE HUB</h1>
                        <div className="profile-pitch-sub">Hello, {(me.fullname || "").split(" ")[0] || "there"}!</div>
                        <p className="profile-pitch-body">{PITCH}</p>
                        <button className="profile-btn-solid">Get in Touch</button>
                    </div>
                </div>

                {/* Info row */}
                <div className="profile-info-grid">
                    <InfoCard icon="🆔" label="User ID"    value={"#" + (me.id ?? "—")} />
                    <InfoCard icon="📧" label="Email"      value={me.email || "—"} />
                    <InfoCard icon="📱" label="Phone"      value={me.phone || "—"} />
                    <InfoCard icon="🛡️" label="Role"       value={meta.name} highlight={meta.gradient[1]} />
                    <InfoCard icon="✅" label="Status"     value={me.status === 1 ? "Active" : "Inactive"} highlight={me.status === 1 ? "#10b981" : "#94a3b8"} />
                    <InfoCard icon="📋" label="Menus open" value={Array.isArray(me.menulist) ? me.menulist.length : 0} />
                </div>
            </div>
        </>
    );
};

const InfoCard = ({ icon, label, value, highlight }) => (
    <div className="profile-info-card">
        <div className="profile-info-icon">{icon}</div>
        <div className="profile-info-body">
            <div className="profile-info-label">{label}</div>
            <div className="profile-info-value" style={highlight ? { color: highlight } : null}>{value}</div>
        </div>
    </div>
);

export default MyProfile;
