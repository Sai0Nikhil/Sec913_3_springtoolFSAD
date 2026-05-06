import { useEffect, useRef, useState } from 'react';
import { imgurl, callApi, apibaseurl } from './lib';
import './App.css';
import ProgressBar from './components/ProgressBar.jsx';

const App = () => {
    const [isSignin, setIsSignIn] = useState(true);
    const finput = useRef();
    const [isProgress, setIsProgress] = useState(false);
    const [errorData, setErrorData] = useState({});

    const emptySignup = {
        fullname: "",
        phone: "",
        email: "",
        password: "",
        retypepassword: ""
    };

    const emptySignin = {
        username: "",
        password: ""
    };

    const [signupData, setSignupData] = useState(emptySignup);
    const [signinData, setSigninData] = useState(emptySignin);

    useEffect(() => {
        setTimeout(() => { finput.current?.focus(); }, 0);
    }, [isSignin]);

    function switchWindow() {
        setIsSignIn(prev => !prev);
        setErrorData({});
        setSigninData(emptySignin);
        setSignupData(emptySignup);
    }

    function handleSigninInput(e) {
        const { name, value } = e.target;
        setSigninData({ ...signinData, [name]: value });
    }

    function handleSignupInput(e) {
        const { name, value } = e.target;
        setSignupData({ ...signupData, [name]: value });
    }

    function isValidEmail(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    }

    function validateSignup() {
        let errors = {};
        if (signupData.fullname.trim() === "") errors.fullname = true;
        if (!/^\d{6,15}$/.test(signupData.phone.trim())) errors.phone = true;
        if (!isValidEmail(signupData.email.trim())) errors.email = true;
        if (signupData.password === "") errors.password = true;
        if (signupData.retypepassword === "" || signupData.password !== signupData.retypepassword) errors.retypepassword = true;
        setErrorData(errors);
        return Object.keys(errors).length > 0;
    }

    function validateSignin() {
        let errors = {};
        if (signinData.username.trim() === "") errors.username = true;
        if (signinData.password === "") errors.password = true;
        setErrorData(errors);
        return Object.keys(errors).length > 0;
    }

    function signin() {
        if (validateSignin()) return;
        setIsProgress(true);
        callApi("POST", apibaseurl + "/authservice/signin", signinData, null, signinResponseHandler);
    }

    function signup() {
        if (validateSignup()) return;
        setIsProgress(true);
        // Note: backend always assigns role=1 (User). Admin promotes users from the Roles page.
        callApi("POST", apibaseurl + "/authservice/signup", signupData, null, signupResponseHandler);
    }

    function signinResponseHandler(res) {
        setIsProgress(false);
        if (res && res.code === 200) {
            localStorage.setItem("token", res.jwt);
            window.location.replace("/home");
        } else {
            alert((res && res.message) || "Sign in failed");
        }
    }

    function signupResponseHandler(res) {
        setIsProgress(false);
        alert((res && res.message) || "Sign up failed");
        if (res && res.code === 200) {
            // Account created — bring the user back to the sign-in screen with their email pre-filled.
            const email = signupData.email;
            setSignupData(emptySignup);
            setSigninData({ username: email, password: "" });
            setErrorData({});
            setIsSignIn(true);
        } else {
            finput.current?.focus();
        }
    }

    return (
        <div className='app'>
            <div className='container' key={isSignin ? "signin" : "signup"}>
                <div className='container-header'>
                    <label>{isSignin ? "Login" : "Create Account"}</label>
                    <img src={imgurl + "logo.png"} alt='' />
                </div>

                <div className='container-content'>
                    {isSignin ?
                        <>
                            <label>Username*</label>
                            <div className='input-group'>
                                <img src={imgurl + "user.png"} />
                                <input
                                    type='text'
                                    ref={finput}
                                    className={errorData.username ? 'error' : ''}
                                    placeholder='Enter email id'
                                    name="username"
                                    value={signinData.username}
                                    onChange={handleSigninInput}
                                />
                            </div>

                            <label>Password*</label>
                            <div className='input-group'>
                                <img src={imgurl + "padlock.png"} />
                                <input
                                    type='password'
                                    className={errorData.password ? 'error' : ''}
                                    placeholder='Enter password'
                                    name='password'
                                    value={signinData.password}
                                    onChange={handleSigninInput}
                                />
                            </div>

                            <p>Forgot <span>Password?</span></p>
                            <button onClick={signin}>Let's Begin</button>
                            <label onClick={switchWindow}>
                                Don't have an account? <span>Sign up</span>
                            </label>
                        </>
                        :
                        <>
                            <label>Full Name*</label>
                            <div className='input-group'>
                                <img src={imgurl + "user.png"} />
                                <input
                                    type='text'
                                    ref={finput}
                                    className={errorData.fullname ? 'error' : ''}
                                    placeholder='Enter full name'
                                    name='fullname'
                                    value={signupData.fullname}
                                    onChange={handleSignupInput}
                                />
                            </div>

                            <label>Mobile Number*</label>
                            <div className='input-group'>
                                <img src={imgurl + "phone.png"} />
                                <input
                                    type='text'
                                    className={errorData.phone ? 'error' : ''}
                                    placeholder='Enter mobile number'
                                    name='phone'
                                    value={signupData.phone}
                                    onChange={handleSignupInput}
                                />
                            </div>

                            <label>Email Address*</label>
                            <div className='input-group'>
                                <img src={imgurl + "email.png"} />
                                <input
                                    type='text'
                                    className={errorData.email ? 'error' : ''}
                                    placeholder='Enter email id'
                                    name='email'
                                    value={signupData.email}
                                    onChange={handleSignupInput}
                                />
                            </div>

                            <label>Password*</label>
                            <div className='input-group'>
                                <img src={imgurl + "padlock.png"} />
                                <input
                                    type='password'
                                    className={errorData.password ? 'error' : ''}
                                    placeholder='Enter password'
                                    name='password'
                                    value={signupData.password}
                                    onChange={handleSignupInput}
                                />
                            </div>

                            <label>Re-type Password*</label>
                            <div className='input-group'>
                                <img src={imgurl + "padlock.png"} />
                                <input
                                    type='password'
                                    className={errorData.retypepassword ? 'error' : ''}
                                    placeholder='Re-type your password'
                                    name='retypepassword'
                                    value={signupData.retypepassword}
                                    onChange={handleSignupInput}
                                />
                            </div>

                            <button onClick={signup}>Register</button>
                            <label onClick={switchWindow}>
                                Already have an account? <span>Sign in</span>
                            </label>
                        </>
                    }
                </div>

                <div className='container-footer'>
                    @2500032630 Sec_913
                </div>
            </div>

            <ProgressBar isProgress={isProgress} />
        </div>
    );
}

export default App;
