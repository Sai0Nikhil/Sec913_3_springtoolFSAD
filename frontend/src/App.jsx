import { useEffect, useRef, useState } from 'react';
import { imgurl, callApi, apibaseurl } from './lib';
import './App.css';
import ProgressBar from './components/ProgressBar.jsx';
import FloatingBadge from './components/FloatingBadge.jsx';
import ForgotPassword from './components/ForgotPassword.jsx';
import CustomCaptcha from './components/CustomCaptcha.jsx';
import { restoreSavedTheme } from './components/ThemeSettings.jsx';

const MODE = { SIGNIN: "signin", SIGNUP: "signup", FORGOT: "forgot" };

const FEATURE_CARDS = [
    {
        icon: "📊",
        title: "Live Dashboard",
        desc: "Real-time task analytics, role summaries, and progress tracking all in one view."
    },
    {
        icon: "📋",
        title: "Task Management",
        desc: "Create, assign and track tasks across your team with full lifecycle control."
    },
    {
        icon: "🔐",
        title: "Role-based Access",
        desc: "Admin, Manager and User roles with granular menu and permission control."
    },
];

const App = () => {
    const [mode, setMode] = useState(MODE.SIGNIN);
    const finput = useRef();
    const formRef = useRef();
    const [isProgress, setIsProgress] = useState(false);
    const [errorData, setErrorData] = useState({});

    const emptySignup = { fullname: "", phone: "", email: "", password: "", retypepassword: "", role: 1 };
    const emptySignin = { username: "", password: "" };

    const [signupData, setSignupData] = useState(emptySignup);
    const [signinData, setSigninData] = useState(emptySignin);
    const [signupRoles, setSignupRoles] = useState([]);

    const signinCaptchaRef = useRef();
    const signupCaptchaRef = useRef();

    useEffect(() => {
        restoreSavedTheme();
        setTimeout(() => finput.current?.focus(), 0);
    }, [mode]);

    useEffect(() => {
        if (mode === MODE.SIGNUP && signupRoles.length === 0) {
            callApi("GET", apibaseurl + "/roles", null, null, (res) => {
                if (Array.isArray(res)) {
                    const filtered = res.filter(r =>
                        (r.rolename || "").toLowerCase() !== "admin" && Number(r.role) !== 3
                    );
                    setSignupRoles(filtered);
                    if (filtered.length > 0 && !filtered.some(r => Number(r.role) === Number(signupData.role))) {
                        setSignupData(prev => ({ ...prev, role: Number(filtered[0].role) }));
                    }
                }
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode]);

    function switchMode(newMode) {
        setMode(newMode);
        setErrorData({});
        setSigninData(emptySignin);
        setSignupData(emptySignup);
        signinCaptchaRef.current?.reset();
        signupCaptchaRef.current?.reset();
        setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
    }

    function handleSigninInput(e) {
        const { name, value } = e.target;
        setSigninData({ ...signinData, [name]: value });
    }

    function handleSignupInput(e) {
        const { name, value } = e.target;
        setSignupData({ ...signupData, [name]: name === "role" ? Number(value) : value });
    }

    function isValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

    function validateSignup() {
        let e = {};
        if (!signupData.fullname.trim()) e.fullname = true;
        if (!/^\d{6,15}$/.test(signupData.phone.trim())) e.phone = true;
        if (!isValidEmail(signupData.email.trim())) e.email = true;
        if (!signupData.password) e.password = true;
        if (!signupData.retypepassword || signupData.password !== signupData.retypepassword) e.retypepassword = true;
        if (Number(signupData.role) === 3) e.role = true;
        setErrorData(e);
        return Object.keys(e).length > 0;
    }

    function validateSignin() {
        let e = {};
        if (!signinData.username.trim()) e.username = true;
        if (!signinData.password) e.password = true;
        setErrorData(e);
        return Object.keys(e).length > 0;
    }

    function signin() {
        if (validateSignin()) return;
        if (!signinCaptchaRef.current?.verify()) { setErrorData(p => ({ ...p, captcha: true })); return; }
        setIsProgress(true);
        callApi("POST", apibaseurl + "/authservice/signin",
            { ...signinData, captchaToken: "self-verified" }, null, signinResponseHandler);
    }

    function signup() {
        if (validateSignup()) return;
        if (!signupCaptchaRef.current?.verify()) { setErrorData(p => ({ ...p, captcha: true })); return; }
        setIsProgress(true);
        callApi("POST", apibaseurl + "/authservice/signup",
            { ...signupData, captchaToken: "self-verified" }, null, signupResponseHandler);
    }

    function signinResponseHandler(res) {
        setIsProgress(false);
        signinCaptchaRef.current?.reset();
        if (res?.code === 200) {
            localStorage.setItem("token", res.jwt);
            window.location.replace("/home");
        } else {
            alert(res?.message || "Sign in failed");
        }
    }

    function signupResponseHandler(res) {
        setIsProgress(false);
        signupCaptchaRef.current?.reset();
        alert(res?.message || "Sign up failed");
        if (res?.code === 200) {
            const email = signupData.email;
            setSignupData(emptySignup);
            setSigninData({ username: email, password: "" });
            setErrorData({});
            setMode(MODE.SIGNIN);
        } else {
            finput.current?.focus();
        }
    }

    return (
        <div className="app">

            {/* ===== NAVBAR ===== */}
            <nav className="app-nav">
                <div className="app-nav-brand">
                    <img src="/logo.png" alt="" className="app-nav-logo" />
                    <span className="app-nav-name">Micro-Task Hub</span>
                </div>
                <button className="app-nav-cta" onClick={() => switchMode(MODE.SIGNIN)}>
                    Login / Sign up
                </button>
            </nav>

            {/* ===== HERO ===== */}
            <section className="app-hero">
                {/* Left — branding & tagline */}
                <div className="app-hero-left">
                    <p className="app-hero-tags">
                        TASKS &nbsp;·&nbsp; ROLES &nbsp;·&nbsp; ANALYTICS &nbsp;·&nbsp; TEAMS &nbsp;·&nbsp; SECURITY
                    </p>
                    <h1 className="app-hero-title">
                        Your <em>Micro-Task</em><br />Hub
                    </h1>
                    <p className="app-hero-desc">
                        A role-based task management platform built for teams —
                        assign work, track progress, and manage access from one clean dashboard.
                    </p>
                    <button className="app-hero-btn" onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
                        Get started now
                    </button>
                </div>

                {/* Right — form card */}
                <div className="app-hero-right" ref={formRef}>
                    <div className="app-form-shell">

                        {mode === MODE.FORGOT ? (
                            <ForgotPassword onBack={() => switchMode(MODE.SIGNIN)} />
                        ) : (
                            <>
                                <div className="app-form-top">
                                    <h2 className="app-form-title">
                                        {mode === MODE.SIGNIN ? "Welcome back" : "Create account"}
                                    </h2>
                                    <p className="app-form-sub">
                                        {mode === MODE.SIGNIN ? "Sign in to continue" : "Join Micro-Task Hub"}
                                    </p>
                                </div>

                                <div className="app-form-body">
                                    {mode === MODE.SIGNIN ? (
                                        <>
                                            <label className="app-flabel">EMAIL ADDRESS</label>
                                            <input ref={finput} type="text" name="username"
                                                className={"app-finput" + (errorData.username ? " err" : "")}
                                                placeholder="Enter your email"
                                                value={signinData.username} onChange={handleSigninInput}
                                                onKeyDown={e => e.key === 'Enter' && signin()} />

                                            <label className="app-flabel">PASSWORD</label>
                                            <input type="password" name="password"
                                                className={"app-finput" + (errorData.password ? " err" : "")}
                                                placeholder="Enter your password"
                                                value={signinData.password} onChange={handleSigninInput}
                                                onKeyDown={e => e.key === 'Enter' && signin()} />

                                            <label className="app-flabel">VERIFY YOU'RE HUMAN</label>
                                            <CustomCaptcha ref={signinCaptchaRef} />
                                            {errorData.captcha && <p className="app-ferr">Please solve the CAPTCHA correctly.</p>}

                                            <p className="app-forgot" onClick={() => switchMode(MODE.FORGOT)}>
                                                Forgot Password?
                                            </p>

                                            <button className="app-fsubmit" onClick={signin}>Log In</button>
                                            <p className="app-fswitch">
                                                Don't have an account?&nbsp;
                                                <span onClick={() => switchMode(MODE.SIGNUP)}>Sign Up</span>
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <label className="app-flabel">FULL NAME</label>
                                            <input ref={finput} type="text" name="fullname"
                                                className={"app-finput" + (errorData.fullname ? " err" : "")}
                                                placeholder="Enter full name"
                                                value={signupData.fullname} onChange={handleSignupInput} />

                                            <label className="app-flabel">MOBILE NUMBER</label>
                                            <input type="text" name="phone"
                                                className={"app-finput" + (errorData.phone ? " err" : "")}
                                                placeholder="Enter mobile number"
                                                value={signupData.phone} onChange={handleSignupInput} />

                                            <label className="app-flabel">EMAIL ADDRESS</label>
                                            <input type="text" name="email"
                                                className={"app-finput" + (errorData.email ? " err" : "")}
                                                placeholder="Enter email"
                                                value={signupData.email} onChange={handleSignupInput} />

                                            <label className="app-flabel">PASSWORD</label>
                                            <input type="password" name="password"
                                                className={"app-finput" + (errorData.password ? " err" : "")}
                                                placeholder="Create a password"
                                                value={signupData.password} onChange={handleSignupInput} />

                                            <label className="app-flabel">RE-TYPE PASSWORD</label>
                                            <input type="password" name="retypepassword"
                                                className={"app-finput" + (errorData.retypepassword ? " err" : "")}
                                                placeholder="Confirm password"
                                                value={signupData.retypepassword} onChange={handleSignupInput} />

                                            <label className="app-flabel">ROLE</label>
                                            <select name="role" className={"app-finput app-fselect" + (errorData.role ? " err" : "")}
                                                value={signupData.role} onChange={handleSignupInput}>
                                                {signupRoles.length === 0 && <option value={1}>User</option>}
                                                {signupRoles.map(r => (
                                                    <option key={r.role} value={Number(r.role)}>{r.rolename}</option>
                                                ))}
                                            </select>

                                            <label className="app-flabel">VERIFY YOU'RE HUMAN</label>
                                            <CustomCaptcha ref={signupCaptchaRef} />
                                            {errorData.captcha && <p className="app-ferr">Please solve the CAPTCHA correctly.</p>}

                                            <button className="app-fsubmit" onClick={signup}>Register</button>
                                            <p className="app-fswitch">
                                                Already have an account?&nbsp;
                                                <span onClick={() => switchMode(MODE.SIGNIN)}>Sign in</span>
                                            </p>
                                        </>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </section>

            {/* ===== FEATURE CARDS ===== */}
            <section className="app-cards">
                {FEATURE_CARDS.map((c, i) => (
                    <div className="app-card" key={i}>
                        <div className="app-card-icon">{c.icon}</div>
                        <h3 className="app-card-title">{c.title}</h3>
                        <p className="app-card-desc">{c.desc}</p>
                    </div>
                ))}
            </section>

            {/* ===== FOOTER ===== */}
            <footer className="app-footer">
                © 2025 Micro-Task Hub &nbsp;·&nbsp;
                Developed with the guidance of <strong>Elengovan Sir</strong>
                &nbsp;·&nbsp; @2500032630 Sec_913
            </footer>

            <ProgressBar isProgress={isProgress} />
            <FloatingBadge />
        </div>
    );
};

export default App;
