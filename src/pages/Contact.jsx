import { useState } from 'react';
import { Mail, Clock, MapPin, Loader2, CheckCircle2 } from 'lucide-react';
import PageShell, { LegalSection } from '../components/legal/PageShell';

const channels = [
  {
    icon: Mail,
    title: 'Email support',
    value: 'support@pdfnexus.app',
    note: 'For account, billing and document issues',
  },
  {
    icon: Clock,
    title: 'Response time',
    value: 'Within 24 hours',
    note: 'Mon–Fri, on business days',
  },
  {
    icon: MapPin,
    title: 'Head office',
    value: '12 Harbor Road',
    note: 'San Francisco, CA 94105',
  },
];

export default function Contact() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState('idle');

  const handleSubmit = (e) => {
    e.preventDefault();
    setStatus('sending');
    setTimeout(() => setStatus('sent'), 800);
  };

  return (
    <PageShell title="Contact Us" subtitle="We usually reply within one business day.">
      <div className="grid gap-4 sm:grid-cols-3">
        {channels.map((channel) => (
          <div key={channel.title} className="bg-slate-950/60 border border-slate-800 rounded-xl p-5">
            <div className="w-10 h-10 bg-purple-500/15 text-purple-400 rounded-lg flex items-center justify-center mb-3">
              <channel.icon className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">{channel.title}</h3>
            <p className="text-sm text-slate-300 mt-1">{channel.value}</p>
            <p className="text-xs text-slate-500 mt-1">{channel.note}</p>
          </div>
        ))}
      </div>

      <LegalSection title="Send us a message">
        <p>
          Questions about an order, a bug report, or feedback on the product — we read
          everything. This form is a placeholder and does not send data yet.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Your name"
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm"
            />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Email address"
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm"
            />
          </div>
          <textarea
            name="message"
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            placeholder="How can we help?"
            rows={5}
            required
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm resize-y"
          />
          {status === 'sent' ? (
            <div className="flex items-center gap-2 text-sm font-medium text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg p-3 w-full justify-center">
              <CheckCircle2 className="w-5 h-5" /> Thanks — we'll get back to you shortly.
            </div>
          ) : (
            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-600/20"
            >
              {status === 'sending' ? <><Loader2 className="w-5 h-5 animate-spin" /> Sending...</> : 'Send Message'}
            </button>
          )}
        </form>
      </LegalSection>
    </PageShell>
  );
}