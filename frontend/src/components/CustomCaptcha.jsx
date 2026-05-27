import React, { useState, useImperativeHandle, forwardRef, useCallback } from 'react';

const OPERATORS = ['+', '-', '×'];

function generateQuestion() {
    const op = OPERATORS[Math.floor(Math.random() * OPERATORS.length)];
    let a, b, answer;
    if (op === '+') {
        a = Math.floor(Math.random() * 15) + 1;
        b = Math.floor(Math.random() * 15) + 1;
        answer = a + b;
    } else if (op === '-') {
        a = Math.floor(Math.random() * 15) + 5;
        b = Math.floor(Math.random() * (a - 1)) + 1;
        answer = a - b;
    } else {
        a = Math.floor(Math.random() * 9) + 2;
        b = Math.floor(Math.random() * 9) + 2;
        answer = a * b;
    }
    return { a, b, op, answer };
}

/**
 * CustomCaptcha — a self-contained math CAPTCHA.
 *
 * Usage:
 *   const ref = useRef();
 *   <CustomCaptcha ref={ref} />
 *   // before submit:
 *   if (!ref.current.verify()) { alert("Please solve the CAPTCHA"); return; }
 *   ref.current.reset();   // call after successful submit
 */
const CustomCaptcha = forwardRef(function CustomCaptcha(_, ref) {
    const [q, setQ] = useState(() => generateQuestion());
    const [userAnswer, setUserAnswer] = useState('');
    const [status, setStatus] = useState('idle'); // idle | ok | fail

    const refresh = useCallback(() => {
        setQ(generateQuestion());
        setUserAnswer('');
        setStatus('idle');
    }, []);

    useImperativeHandle(ref, () => ({
        verify() {
            const val = parseInt(userAnswer, 10);
            if (isNaN(val) || val !== q.answer) {
                setStatus('fail');
                return false;
            }
            setStatus('ok');
            return true;
        },
        reset() {
            refresh();
        }
    }), [userAnswer, q, refresh]);

    function handleChange(e) {
        setUserAnswer(e.target.value.replace(/[^0-9\-]/g, ''));
        setStatus('idle');
    }

    const borderColor = status === 'ok' ? '#22c55e' : status === 'fail' ? '#ef4444' : 'var(--border, #ddd)';

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            margin: '8px 0',
            padding: '8px 12px',
            border: `1.5px solid ${borderColor}`,
            borderRadius: 8,
            background: 'var(--input-bg, #f8f9fa)',
            transition: 'border-color 0.2s'
        }}>
            {/* Question badge */}
            <span style={{
                fontFamily: 'monospace',
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: 1,
                color: 'var(--text, #222)',
                background: 'var(--captcha-bg, #e8eaf0)',
                padding: '4px 10px',
                borderRadius: 6,
                userSelect: 'none',
                whiteSpace: 'nowrap'
            }}>
                {q.a} {q.op} {q.b} = ?
            </span>

            {/* Answer input */}
            <input
                type="text"
                inputMode="numeric"
                value={userAnswer}
                onChange={handleChange}
                placeholder="Answer"
                maxLength={4}
                style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: 14,
                    color: 'var(--text, #222)',
                    minWidth: 0
                }}
            />

            {/* Status icon */}
            {status === 'ok' && (
                <span style={{ color: '#22c55e', fontSize: 18, flexShrink: 0 }}>✓</span>
            )}
            {status === 'fail' && (
                <span style={{ color: '#ef4444', fontSize: 13, flexShrink: 0 }}>Wrong</span>
            )}

            {/* Refresh button */}
            <button
                type="button"
                onClick={refresh}
                title="New question"
                style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px 4px',
                    fontSize: 16,
                    color: 'var(--text-muted, #888)',
                    flexShrink: 0,
                    lineHeight: 1
                }}
            >
                ↻
            </button>
        </div>
    );
});

export default CustomCaptcha;
