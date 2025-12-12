
import { useState } from 'react';
import { Send, MessageSquare, Lightbulb, Bug, Mail } from 'lucide-react';

export default function FeedbackPage() {
    const [type, setType] = useState<'feedback' | 'feature' | 'bug'>('feedback');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const emailTo = "uday.kiran.tentu@citi.com";
        const emailSubject = `[DevKit ${type.toUpperCase()}] ${subject}`;
        const emailBody = `${message}\n\n--\nSent from DevKit Feedback Form`;

        window.location.href = `mailto:${emailTo}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    };

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 overflow-auto">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                {/* Header */}
                <div className="bg-slate-900 p-8 text-white">
                    <div className="flex items-center gap-3 mb-2">
                        <MessageSquare className="text-blue-400" size={28} />
                        <h1 className="text-3xl font-bold">Feedback & Requests</h1>
                    </div>
                    <p className="text-slate-400">
                        Found a bug? Have a brilliant idea? Let me know directly via email.
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-8 space-y-6">

                    {/* Type Selection */}
                    <div className="grid grid-cols-3 gap-4">
                        <button
                            type="button"
                            onClick={() => setType('feedback')}
                            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${type === 'feedback'
                                    ? 'border-blue-500 bg-blue-50 text-blue-600'
                                    : 'border-slate-200 hover:border-blue-200 text-slate-500'
                                }`}
                        >
                            <MessageSquare size={24} />
                            <span className="font-medium">General</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('feature')}
                            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${type === 'feature'
                                    ? 'border-green-500 bg-green-50 text-green-600'
                                    : 'border-slate-200 hover:border-green-200 text-slate-500'
                                }`}
                        >
                            <Lightbulb size={24} />
                            <span className="font-medium">New Feature</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('bug')}
                            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${type === 'bug'
                                    ? 'border-red-500 bg-red-50 text-red-600'
                                    : 'border-slate-200 hover:border-red-200 text-slate-500'
                                }`}
                        >
                            <Bug size={24} />
                            <span className="font-medium">Bug Report</span>
                        </button>
                    </div>

                    {/* Subject */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Short Summary</label>
                        <input
                            type="text"
                            required
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder={type === 'feature' ? "e.g., Add Dark Mode support" : "e.g., Loving the JSON diff tool!"}
                            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>

                    {/* Message */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Detailed Message</label>
                        <textarea
                            required
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={6}
                            placeholder="Tell me more about your thoughts..."
                            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                        />
                    </div>

                    {/* Tip */}
                    <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg text-sm text-slate-600">
                        <Mail className="flex-shrink-0 mt-0.5 text-slate-400" size={16} />
                        <p>
                            Submitting this form will open your default email client with the message pre-filled.
                            Just hit send!
                        </p>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={!subject || !message}
                        className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 disabled:shadow-none bg-gradient-to-r from-blue-600 to-indigo-600"
                    >
                        <Send size={20} />
                        Launch Email
                    </button>
                </form>
            </div>
        </div>
    );
}
