import React, { useState, useRef, useEffect } from 'react';
import { callApi, apibaseurl } from '../lib';

const STEPS = { EMAIL: 1, OTP: 2, RESET: 3 };

const ForgotPassword = ({ onBack }) => {
    const [step, setStep] = useState(STEPS.EMAIL);
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [retypePassword, setRetypePassword] = useState("");
    const [errorData, setErrorData] = useState({});
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState("");
    const finput = useRef();

    useEffect(() => {
        setTimeout(() => finput.current?.focus(), 0);
    }, [step]);

    function isValidEmail(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    }

    function sendOtp() {
        if (!email.trim()) { setErrorData({ email: true }); return; }
        if (!isValidEmail(email.trim())) { setErrorData({ email: true }); return; }
        setErrorData({});
        setBusy(true);
        setMsg("");
        callApi("POST", apibaseurl + "/authservice/forgot-password",
            { email: email.trim() }, null, (res) => {
                setBusy(false);
                if (res && res.code === 200) {
                    setMsg(res.emailSent
                        ? "OTP sent to your email. Check your inbox."
                        : "OTP sent! Check your email.");
                    setStep(STEPS.OTP);
                } else {
                    alert((res && res.message) || "Failed to send OTP.");
                }
            });
    }

    function verifyOtp() {
        if (!otp.trim()) { setErrorData({ otp: true }); return; }
        setErrorData({});
        setBusy(true);
        setMsg("");
        callApi("POST", apibaseurl + "/authservice/verify-reset-otp",
            { email: email.trim(), otp: otp.trim() }, null, (res) => {
                setBusy(false);
                if (res && res.code === 200) {
                    setStep(STEPS.RESET);
                } else {
                    alert((res && res.message) || "Invalid or expired OTP.");
                }
            });
    }

    function resetPassword() {
        let errors = {};
        if (!newPassword) errors.newPassword = true;
        if (!retypePassword || newPassword !== retypePassword) errors.retypePassword = true;
        if (newPassword.length < 4) errors.newPassword = true;
        if (newPassword.length > 128) errors.newPassword = true;
        setErrorData(errors);
        if (Object.keys(errors).length > 0) return;

        setBusy(true);
        setMsg("");
        callApi("POST", apibaseurl + "/authservice/reset-password",
            {
                email: email.trim(),
                otp: otp.trim(),
                newPassword: newPassword
            }, null, (res) => {
                setBusy(false);
                if (res && res.code === 200) {
                    alert("Password reset successfully! Please sign in with your new password.");
                    onBack();
                } else {
                    alert((res && res.message) || "Password reset failed.");
                }
            });
    }

    function handleKeyDown(e, cb) {
        if (e.key === "Enter") cb();
    }

    return (
        <div className="container forgot-container" key={"forgot-step-" + step}>
            <div className="container-header">
                <label>Reset Password</label>
                <img src="/logo.png" alt="" />
            </div>
            <div className="container-content">

                {step === STEPS.EMAIL && (
                    <>
                        <p style={{ textAlign: 'center', margin: '0 0 16px', fontSize: 13, color: 'var(--text-muted, #666)' }}>
                            Enter your registered email and we'll send you a reset code.
                        </p>
                        <label>Email Address*</label>
                        <div className="input-group">
                            <img src="/email.png" alt="" />
                            <input
                                type="text"
                                ref={finput}
                                className={errorData.email ? 'error' : ''}
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, sendOtp)}
                            />
                        </div>
                        {msg && <p className="forgot-msg">{msg}</p>}
                        <button onClick={sendOtp} disabled={busy}>
                            {busy ? "Sending…" : "Send OTP"}
                        </button>
                    </>
                )}

                {step === STEPS.OTP && (
                    <>
                        <p style={{ textAlign: 'center', margin: '0 0 8px', fontSize: 13, color: 'var(--text-muted, #666)' }}>
                            Enter the 6-digit code sent to <strong>{email}</strong>
                        </p>
                        {msg && <p className="forgot-msg">{msg}</p>}
                        <label>OTP Code*</label>
                        <div className="input-group">
                            <img src="/padlock.png" alt="" />
                            <input
                                type="text"
                                ref={finput}
                                className={errorData.otp ? 'error' : ''}
                                placeholder="Enter 6-digit OTP"
                                maxLength={6}
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                                onKeyDown={(e) => handleKeyDown(e, verifyOtp)}
                            />
                        </div>
                        <button onClick={verifyOtp} disabled={busy}>
                            {busy ? "Verifying…" : "Verify OTP"}
                        </button>
                    </>
                )}

                {step === STEPS.RESET && (
                    <>
                        <label>New Password*</label>
                        <div className="input-group">
                            <img src="/padlock.png" alt="" />
                            <input
                                type="password"
                                ref={finput}
                                className={errorData.newPassword ? 'error' : ''}
                                placeholder="At least 4 characters"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, resetPassword)}
                            />
                        </div>

                        <label>Re-type Password*</label>
                        <div className="input-group">
                            <img src="/padlock.png" alt="" />
                            <input
                                type="password"
                                className={errorData.retypePassword ? 'error' : ''}
                                placeholder="Re-type your new password"
                                value={retypePassword}
                                onChange={(e) => setRetypePassword(e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, resetPassword)}
                            />
                        </div>
                        <button onClick={resetPassword} disabled={busy}>
                            {busy ? "Resetting…" : "Reset Password"}
                        </button>
                    </>
                )}

                <label onClick={onBack} style={{ cursor: 'pointer', marginTop: 12 }}>
                    <span>← Back to sign in</span>
                </label>
            </div>
            <div className="container-footer">
                @2500032630 Sec_913
            </div>
        </div>
    );
};

export default ForgotPassword;
