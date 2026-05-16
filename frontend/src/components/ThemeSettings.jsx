import React, { useEffect, useState } from 'react';
import './ThemeSettings.css';

/**
 * Theme picker — slide-in panel that lets the user pick an accent color.
 * Persists in localStorage so the choice survives reloads and sessions.
 */
const THEMES = [
    { id: "blue",     name: "Ocean Blue",   primary: "#2563eb", hover: "#1d4ed8", accent: "#6366f1", sidebar: "#0f172a" },
    { id: "coral",    name: "Sunset Coral", primary: "#f97316", hover: "#c2410c", accent: "#fb923c", sidebar: "#27272a" },
    { id: "green",    name: "Forest Green", primary: "#10b981", hover: "#047857", accent: "#34d399", sidebar: "#022c22" },
    { id: "lavender", name: "Lavender",     primary: "#a78bfa", hover: "#7c3aed", accent: "#c4b5fd", sidebar: "#1e1b4b" },
    { id: "midnight", name: "Midnight",     primary: "#1e293b", hover: "#0f172a", accent: "#475569", sidebar: "#0f172a" },
    { id: "magenta",  name: "Magenta",      primary: "#c026d3", hover: "#a21caf", accent: "#e879f9", sidebar: "#3b0764" },
    { id: "slate",    name: "Slate Dark",   primary: "#475569", hover: "#334155", accent: "#64748b", sidebar: "#1e293b" },
    { id: "royal",    name: "Royal Purple", primary: "#7c3aed", hover: "#6d28d9", accent: "#a78bfa", sidebar: "#1e1b4b" }
];

const STORAGE_KEY = "mth-theme";

/** Apply a theme by writing CSS variables onto :root. */
export function applyTheme(themeId) {
    const t = THEMES.find(x => x.id === themeId) || THEMES[0];
    const r = document.documentElement;
    r.style.setProperty("--primary-color",  t.primary);
    r.style.setProperty("--primary-hover",  t.hover);
    r.style.setProperty("--secondary-color", t.accent);
    r.style.setProperty("--primary-blue",   t.sidebar);
    r.style.setProperty("--primary-blue-soft", t.sidebar);
}

/** Restore the saved theme on app start. Safe to call before anything renders. */
export function restoreSavedTheme() {
    try {
        const id = localStorage.getItem(STORAGE_KEY);
        if (id) applyTheme(id);
    } catch { /* ignore */ }
}

const ThemeSettings = () => {
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(() => {
        try { return localStorage.getItem(STORAGE_KEY) || "blue"; }
        catch { return "blue"; }
    });

    useEffect(() => { applyTheme(active); }, [active]);

    function pick(id) {
        setActive(id);
        try { localStorage.setItem(STORAGE_KEY, id); } catch { /* ignore */ }
    }

    return (
        <>
            <button
                className="ts-trigger"
                onClick={() => setOpen(true)}
                title="Theme settings"
                aria-label="Open theme settings"
            >
                🎨
            </button>

            {open && (
                <>
                    <div className="ts-overlay" onClick={() => setOpen(false)} />
                    <aside className="ts-panel" role="dialog" aria-label="Theme settings">
                        <header className="ts-head">
                            <h3>Theme Settings</h3>
                            <button className="ts-close" onClick={() => setOpen(false)} aria-label="Close">✕</button>
                        </header>

                        <div className="ts-body">
                            <div className="ts-section-label">Choose Theme Color</div>
                            <div className="ts-grid">
                                {THEMES.map(t => (
                                    <button
                                        key={t.id}
                                        className={"ts-swatch " + (active === t.id ? "is-active" : "")}
                                        onClick={() => pick(t.id)}
                                        title={t.name}
                                        style={{ background: t.primary }}
                                        aria-label={"Apply " + t.name + " theme"}
                                    >
                                        {active === t.id && <span className="ts-check">✓</span>}
                                    </button>
                                ))}
                            </div>
                            <div className="ts-active-name">{THEMES.find(x => x.id === active)?.name}</div>
                        </div>
                    </aside>
                </>
            )}
        </>
    );
};

export default ThemeSettings;
