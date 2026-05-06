import React, { useEffect, useState } from 'react';
import './Home.css';
import { apibaseurl, callApi, imgurl } from '../lib';
import ProgressBar from './ProgressBar';
import RolesAdmin from './RolesAdmin';

// Decode the role claim out of a JWT without verifying the signature.
// The backend signs JWTs with HS256 and stores `role` directly in the payload.
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

const Home = () => {
    const [fullname, setFullname] = useState("");
    const [isProgress, setIsProgress] = useState("");
    const [token, setToken] = useState("");
    const [menuList, setMenuList] = useState([]);
    const [activeMenu, setActiveMenu] = useState(null);

    useEffect(() => {
        const t = localStorage.getItem("token");
        if (!t) {
            logout();
        } else {
            setToken(t);
            setIsProgress(true);
            callApi("GET", apibaseurl + "/authservice/uinfo", null, null, loadUinfo, t);
        }
    }, []);

    function loadUinfo(res) {
        setIsProgress(false);
        if (res.code != 200) return;
        setFullname(res.fullname);

        let menus = Array.isArray(res.menulist) ? [...res.menulist] : [];

        // Determine role: prefer the value from /uinfo (when backend is updated),
        // else fall back to decoding the JWT we already have in localStorage.
        let role = (res.role !== undefined && res.role !== null) ? Number(res.role) : null;
        if (role === null) {
            role = getRoleFromToken(localStorage.getItem("token"));
        }

        // Admins (role 3) always get the Roles admin entry — even if the DB
        // mapping or backend update is missing. The mid 9999 is synthetic;
        // renderContent routes by menu name, not id.
        if (role === 3) {
            const hasRoles = menus.some(m => (m.menu || "").toLowerCase() === "roles");
            if (!hasRoles) {
                // usermanager.png exists in /public; menu.png does not — avoid 404
                menus.push({ mid: 9999, menu: "Roles", icon: "usermanager.png" });
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
        if (name === "roles" || name === "role manager") {
            return <RolesAdmin token={token} />;
        }
        return <div className='home-content-default'>{activeMenu.menu}</div>;
    }

    return (
        <div className='home'>
            <div className='home-header'>
                <img src="/logo.png" alt='' />
                <div className='info'>
                    {fullname}
                    <img src="/shutdown.png" alt='' onClick={() => logout()} />
                </div>
            </div>
            <div className='home-workspace'>
                <div className='home-menus'>
                    <ul>
                        {menuList.map((m) => (
                            <li
                                key={m.mid}
                                className={activeMenu && activeMenu.mid === m.mid ? 'active' : ''}
                                onClick={() => setActiveMenu(m)}
                            >
                                <img src={imgurl + m.icon} alt='' />{m.menu}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className='home-content'>
                    {renderContent()}
                </div>
            </div>
            <div className='home-footer'>@2500032630 Sec_913</div>

            <ProgressBar isProgress={isProgress} />
        </div>
    );
}

export default Home;
