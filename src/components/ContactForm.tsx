import { useState } from 'react';
import { X, Mail, Send, Check } from './Icons';

interface ContactFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContactForm({ isOpen, onClose }: ContactFormProps) {
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !subject || !message) {
      setError('Please fill in all fields');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setSending(true);

    try {
      const response = await fetch('https://formsubmit.co/ajax/dominicoigo8@gmail.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          email,
          subject: `[FreeVid Editor Suggestion] ${subject}`,
          message,
          _template: 'table',
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      setSent(true);
      setTimeout(() => {
        onClose();
        setSent(false);
        setEmail('');
        setSubject('');
        setMessage('');
      }, 2500);
    } catch {
      setError('Failed to send. Try again or email directly.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="card max-w-md w-full animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-white">
                {sent ? 'Message Sent!' : 'Suggest an Improvement'}
              </h3>
              <p className="text-xs sm:text-sm text-surface-400">
                {sent
                  ? 'Thank you for helping make FreeVid Editor better'
                  : 'Ideas, bugs, or features — I read every message'
                }
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-surface-500 hover:text-white rounded-lg hover:bg-surface-800 transition-all flex-shrink-0 -mr-1 -mt-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {sent ? (
          /* Success state */
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-400" />
            </div>
            <p className="text-surface-300 text-sm">
              Your message has been sent! I'll review it and get back to you if needed.
            </p>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-1.5">
                Your Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input-field text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-1.5">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Feature idea / Bug report / Suggestion"
                className="input-field text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-1.5">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your suggestion in detail..."
                rows={4}
                className="input-field text-sm resize-none"
                required
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending}
                className="btn-primary flex-1"
              >
                {sending ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Send className="w-4 h-4" />
                    Send Message
                  </span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
