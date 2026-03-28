import React, { useState } from 'react';
import './FeedbackButton.css';

interface Props {
  toEmail: string; // recipient email
}

const FeedbackButton: React.FC<Props> = ({ toEmail }) => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const ajaxUrl = `https://formsubmit.co/ajax/${encodeURIComponent(toEmail)}`;

  return (
    <>
      <button
        className="fab-feedback"
        title="إرسال ملاحظة"
        onClick={() => setOpen(true)}
      >
        ✉️ارسال ملاحظة
      </button>

      {open && (
        <div className="fb-overlay" onClick={() => !sending && setOpen(false)}>
          <div className="fb-modal" onClick={(e) => e.stopPropagation()}>
            <button className="fb-close" onClick={() => !sending && setOpen(false)}>&times;</button>
            <div className="fb-title">إرسال ملاحظة</div>
            {sent ? (
              <div style={{ textAlign: 'center', color: '#5a2428', fontWeight: 700 }}>
                شكرًا لك! تم إرسال ملاحظتك.
                للدعم الفني والاستفسار: التواصل مع هاتف :  0792022316
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (sending) return;
                  setSending(true);
                  setError('');
                  try {
                    const res = await fetch(ajaxUrl, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                      },
                      body: JSON.stringify({
                        _subject: 'Ketab Feedback',
                        message,
                        page: typeof window !== 'undefined' ? window.location.href : ''
                      })
                    });
                    if (!res.ok) throw new Error('Request failed');
                    setSent(true);
                    setMessage('');
                    setTimeout(() => setOpen(false), 1200);
                  } catch (err) {
                    setError('تعذر الإرسال. حاول مرة أخرى.');
                  } finally {
                    setSending(false);
                  }
                }}
              >
                <textarea
                  name="message"
                  placeholder="اكتب ملاحظتك هنا"
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="fb-textarea"
                />
                <div style={{ textAlign: 'center', color: '#5a2428', fontWeight: 700 }}>
                  للدعم الفني والاستفسار: التواصل مع هاتف :  0792022316
                </div>
                {error && <div style={{ color: '#b00020', fontWeight: 700 }}>{error}</div>}
                <button type="submit" className="fb-send" disabled={sending || message.trim().length === 0}>
                  {sending ? 'إرسال...' : 'إرسال'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default FeedbackButton;


