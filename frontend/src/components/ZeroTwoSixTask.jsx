import { useState } from 'react';
import { apibaseurl, callApi } from '../lib';
import './ZeroTwoSixTask.css';

const INIT_FORM = { username: '', password: '', location: '' };

export default function ZeroTwoSixTask() {
    // ── Section 1: Generate ──────────────────────────────────────────
    const [form, setForm]         = useState(INIT_FORM);
    const [token, setToken]       = useState('');
    const [genMsg, setGenMsg]     = useState(null);   // { ok, text }
    const [genLoading, setGenLoading] = useState(false);

    // ── Section 2: Decode ────────────────────────────────────────────
    const [inputToken, setInputToken] = useState('');
    const [decoded, setDecoded]       = useState(null);  // null | { ok, data }
    const [decLoading, setDecLoading] = useState(false);

    function handleInput(e) {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    function generate() {
        const { username, password, location } = form;
        if (!username.trim() || !password.trim() || !location.trim()) {
            setGenMsg({ ok: false, text: 'All three fields are required.' });
            return;
        }
        setGenLoading(true);
        setToken('');
        setGenMsg(null);
        callApi('POST', apibaseurl + '/0206task/generate', { username, password, location }, null, (res) => {
            setGenLoading(false);
            if (res?.code === 200) {
                setToken(res.token);
                setGenMsg({ ok: true, text: 'Token generated successfully!' });
            } else {
                setGenMsg({ ok: false, text: res?.message || 'Failed to generate token.' });
            }
        });
    }

    function decode() {
        if (!inputToken.trim()) {
            setDecoded({ ok: false, data: { message: 'Paste a token first.' } });
            return;
        }
        setDecLoading(true);
        setDecoded(null);
        callApi('POST', apibaseurl + '/0206task/decode', { token: inputToken.trim() }, null, (res) => {
            setDecLoading(false);
            if (res?.code === 200) {
                setDecoded({ ok: true, data: res });
            } else {
                setDecoded({ ok: false, data: res });
            }
        });
    }

    function copyToken() {
        if (token) navigator.clipboard.writeText(token);
    }

    return (
        <div className="zt-page">

            {/* ── Back button ──────────────────────────────────────── */}
            <button className="zt-back-btn" onClick={() => window.location.href = '/'}>
                ← Back
            </button>

            {/* ── Header ───────────────────────────────────────────── */}
            <div className="zt-header">
                <div className="zt-header-tag">Class Task · 06 Feb</div>
                <h1 className="zt-header-title">JWT Token Lab</h1>
                <p className="zt-header-sub">
                    Generate a signed JWT from three values, then decode it — or try a wrong token to see how the server responds.
                </p>
            </div>

            <div className="zt-body">

                {/* ── Panel 1: Generate ────────────────────────────── */}
                <div className="zt-panel">
                    <div className="zt-panel-head">
                        <span className="zt-step">01</span>
                        <div>
                            <div className="zt-panel-title">Generate JWT Token</div>
                            <div className="zt-panel-sub">Enter three values → server signs them into a JWT</div>
                        </div>
                    </div>

                    <div className="zt-fields">
                        <div className="zt-field">
                            <label className="zt-label">Username</label>
                            <input className="zt-input" name="username" placeholder="e.g. sai_nikhil"
                                value={form.username} onChange={handleInput}
                                onKeyDown={e => e.key === 'Enter' && generate()} />
                        </div>
                        <div className="zt-field">
                            <label className="zt-label">Password</label>
                            <input className="zt-input" name="password" placeholder="e.g. secret123"
                                value={form.password} onChange={handleInput}
                                onKeyDown={e => e.key === 'Enter' && generate()} />
                        </div>
                        <div className="zt-field">
                            <label className="zt-label">Location</label>
                            <input className="zt-input" name="location" placeholder="e.g. Hyderabad"
                                value={form.location} onChange={handleInput}
                                onKeyDown={e => e.key === 'Enter' && generate()} />
                        </div>
                    </div>

                    <button className="zt-btn" onClick={generate} disabled={genLoading}>
                        {genLoading ? 'Generating…' : '⚡ Generate JWT'}
                    </button>

                    {genMsg && (
                        <div className={'zt-msg ' + (genMsg.ok ? 'zt-msg-ok' : 'zt-msg-err')}>
                            {genMsg.text}
                        </div>
                    )}

                    {token && (
                        <div className="zt-token-box">
                            <div className="zt-token-label">
                                <span>JWT Token</span>
                                <button className="zt-copy-btn" onClick={copyToken} title="Copy to clipboard">
                                    📋 Copy
                                </button>
                            </div>
                            <textarea className="zt-token-area" readOnly value={token} rows={5} />
                            <div className="zt-token-hint">
                                This token has 3 parts separated by dots — header · payload · signature
                            </div>
                        </div>
                    )}
                </div>

                {/* Divider arrow */}
                <div className="zt-divider">→</div>

                {/* ── Panel 2: Decode ──────────────────────────────── */}
                <div className="zt-panel">
                    <div className="zt-panel-head">
                        <span className="zt-step">02</span>
                        <div>
                            <div className="zt-panel-title">Decode / Verify Token</div>
                            <div className="zt-panel-sub">Paste a token → server verifies signature and returns the values</div>
                        </div>
                    </div>

                    <div className="zt-field">
                        <label className="zt-label">Paste JWT Token</label>
                        <textarea className="zt-input zt-textarea" placeholder="Paste your JWT token here…"
                            value={inputToken} onChange={e => setInputToken(e.target.value)} rows={5} />
                    </div>

                    <button className="zt-btn zt-btn-indigo" onClick={decode} disabled={decLoading}>
                        {decLoading ? 'Verifying…' : '🔍 Send to Server & Decode'}
                    </button>

                    {decoded && (
                        <div className={'zt-result ' + (decoded.ok ? 'zt-result-ok' : 'zt-result-err')}>
                            <div className="zt-result-status">
                                {decoded.ok ? '✅ Valid Token' : '❌ ' + (decoded.data?.message || 'Invalid Token')}
                            </div>
                            {decoded.ok && (
                                <table className="zt-table">
                                    <tbody>
                                        {[
                                            ['username',   decoded.data.username],
                                            ['password',   decoded.data.password],
                                            ['location',   decoded.data.location],
                                            ['issued at',  decoded.data.issuedAt],
                                            ['expires',    decoded.data.expiration],
                                        ].map(([k, v]) => (
                                            <tr key={k}>
                                                <td className="zt-td-key">{k}</td>
                                                <td className="zt-td-val">{v ?? '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                            {!decoded.ok && (
                                <div className="zt-result-hint">
                                    Try modifying one character in the token above — the server will reject it because the signature no longer matches.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="zt-footer">
                @2500032630 · Sec_913 · JWT Lab — 06 Feb 2025
            </div>
        </div>
    );
}
