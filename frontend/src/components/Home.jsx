import React, { useEffect, useState } from 'react';
import './Home.css';
import { apibaseurl, callApi, imgurl } from '../lib';
import ProgressBar from './ProgressBar';
import RolesAdmin from './RolesAdmin';
import FloatingBadge from './FloatingBadge';
import TaskManager from './TaskManager';
import MyTask from './MyTask';
import UserManager from './UserManager';
import Dashboard from './Dashboard';
import MyProfile from './MyProfile';

// Decode the role claim out of a JWT without verifying the signature.
function getRoleFromToken(t) {
    try {
        if (!t) return null;
        const parts = t.split('.');
        if (parts.length < 2) return null;
        const payloadJson = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
        const payload = JSON.parse(payloadJson);
        const r = payload.role;
        return r === undefined || r === null ? null : Number(r);
    } catch (e) {
        console.error("Failed to decode token role:", e);
        return null;
    }
}

function roleLabel(role) {
    if (role === 3) return "Admin";
    if (role === 2) return "Manager";
    if (role === 1) return "User";
    return role != null ? `Role ${role}` : "—";
}

function roleClass(role) {
    if (role === 3) return "is-admin";
    if (role === 2) return "is-manager";
    if (role === 1) return "is-user";
    return "";
}

function initialsOf(name) {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map(p => p[0]).join("").toUpperCase();
}

const Home = () => {
    const [fullname, setFullname] = useState("");
    const [isProgress, setIsProgress] = useState("");
    const [token, setToken] = useState("");
    const [menuList, setMenuList] = useState([]);
    const [activeMenu, setActiveMenu] = useState(null);
    const [role, setRole] = useState(null);
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const t = localStorage.getItem("token");
        if (!t) {
            logout();
        } else {
            setToken(t);
            setIsProgress(true);
            callApi("GET", apibaseurl + "/authservice/uinfo", null, null, loadUinfo, t);
        }
        const tick = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(tick);
    }, []);

    function loadUinfo(res) {
        setIsProgress(false);
        if (res.code != 200) return;
        setFullname(res.fullname);

        let menus = Array.isArray(res.menulist) ? [...res.menulist] : [];

        let r = (res.role !== undefined && res.role !== null) ? Number(res.role) : null;
        if (r === null) {
            r = getRoleFromToken(localStorage.getItem("token"));
        }
        setRole(r);

        if (r === 3) {
            const hasRoleManager = menus.some(m => (m.menu || "").toLowerCase() === "role manager");
            if (!hasRoleManager) {
                menus.push({ mid: 9999, menu: "Role Manager", icon: "usermanager.png" });
            }
        }

        setMenuList(menus);
        if (menus.length > 0) {
            setActiveMenu(menus[0]);
        }
    }

    function logout() {
        localStorage.clear();
        window.location.replace("/");
    }

    function renderContent() {
        if (!activeMenu) {
            return <div className='home-content-default'>Content</div>;
        }
        const name = (activeMenu.menu || "").toLowerCase();
        if (name === "dashboard") {
            return <Dashboard token={token} role={role} fullname={fullname} onJump={(menuName) => {
                const m = menuList.find(x => (x.menu || "").toLowerCase() === menuName.toLowerCase());
                if (m) setActiveMenu(m);
            }} />;
        }
        if (name === "role manager") {
            return <RolesAdmin token={token} />;
        }
        if (name === "task manager") {
            return <TaskManager token={token} />;
        }
        if (name === "my task" || name === "mytask" || name === "my tasks") {
            return <MyTask token={token} />;
        }
        if (name === "user manager" || name === "users") {
            return <UserManager token={token} />;
        }
        if (name === "my profile" || name === "profile") {
            return <MyProfile token={token} />;
        }
        return <div className='home-content-default'>{activeMenu.menu}</div>;
    }

    // Split menus into a primary section and an "admin" section based on name.
    const adminish = new Set(["role manager", "user manager", "task manager"]);
    const primaryMenus = menuList.filter(m => !adminish.has((m.menu || "").toLowerCase()));
    const manageMenus  = menuList.filter(m =>  adminish.has((m.menu || "").toLowerCase()));

    const dateStr = now.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
    const timeStr = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

    function renderMenuItem(m) {
        return (
            <li
                key={m.mid}
                className={activeMenu && activeMenu.mid === m.mid ? 'active' : ''}
                onClick={() => setActiveMenu(m)}
            >
                <img src={imgurl + m.icon} alt='' />
                <span className="menu-label">{m.menu}</span>
            </li>
        );
    }

    return (
        <div className='home'>
            {/* ===== Header ===== */}
            <div className='home-header'>
                <div className='home-header-left'>
                    <img className='brand-logo' src="/logo.png" alt='Micro-Task Hub' />
                </div>
                <div className='home-header-right'>
                    <div className='home-clock' title={now.toString()}>
                        <span className='home-clock-time'>{timeStr}</span>
                        <span className='home-clock-date'>{dateStr}</span>
                    </div>
                    <div className='home-user'>
                        <div className={'home-avatar ' + roleClass(role)}>{initialsOf(fullname)}</div>
                        <div className='home-user-info'>
                            <div className='home-user-name'>{fullname || "—"}</div>
                            <div className={'home-role-badge ' + roleClass(role)}>{roleLabel(role)}</div>
                        </div>
                    </div>
                    <button className='home-logout' onClick={logout} title="Sign out">
                        <img src="/shutdown.png" alt='' />
                    </button>
                </div>
            </div>

            {/* ===== Workspace ===== */}
            <div className='home-workspace'>
                <aside className='home-menus'>
                    <div className='home-brand'>
                        <div className='home-brand-mark'>MT</div>
                        <div className='home-brand-text'>
                            <div className='home-brand-title'>Micro-Task Hub</div>
                            <div className='home-brand-sub'>Admin Console</div>
                        </div>
                    </div>

                    <div className='home-section'>Menu</div>
                    <ul>
                        {primaryMenus.map(renderMenuItem)}
                    </ul>

                    {manageMenus.length > 0 && (
                        <>
                            <div className='home-section'>Manage</div>
                            <ul>
                                {manageMenus.map(renderMenuItem)}
                            </ul>
                        </>
                    )}

                    <div className='home-sidebar-footer'>v1.0 · Sec_913</div>
                </aside>
                <main className='home-content'>
                    {renderContent()}
                </main>
            </div>

            <div className='home-footer'>@2500032630 Sec_913</div>

            <ProgressBar isProgress={isProgress} />
            <FloatingBadge />
        </div>
    );
}

export default Home;
