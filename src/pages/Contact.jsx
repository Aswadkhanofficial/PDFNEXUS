import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Send, MessageSquare, Zap, Info, FileStack, ArrowLeft } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useToast } from '../components/Toast';

const topics = [
  {
    icon: MessageSquare,
    title: 'Feature Requests',
    text: 'Tell us what you want next',
  },
  {
    icon: Zap,
    title: 'Technical Support',
    text: 'Report bugs or tool issues',
  },
  {
    icon: Info,
    title: 'General Feedback',
    text: 'Share your thoughts on PDFNexus',
  },
];

export default function Contact() {
  const { error: toastError, success: toastSuccess } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('contact_messages').insert([{ name, email, message }]);
      if (error) throw error;
      setName('');
      setEmail('');
      setMessage('');
      toastSuccess('Message sent successfully!');
    } catch (error) {
      toastError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-200 flex flex-col">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-200 px-6 py-4 dark:bg-slate-900/90 dark:border-slate-800">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-slate-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
            <FileStack className="w-6 h-6 text-purple-500" />
            <span className="text-lg font-black tracking-tight">PDFNexus</span>
          </Link>
          <Link to="/" className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>
      </header>
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-start">
          <div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Get in touch
            </h1>
            <p className="text-lg text-slate-600 mt-4 max-w-md dark:text-slate-400">
              Have a question, feedback, or need help with a tool? Drop us a message and
              we'll get back to you.
            </p>

            <ul className="mt-10 space-y-6">
              {topics.map((topic) => (
                <li key={topic.title} className="flex items-start gap-4">
                  <div className="w-11 h-11 shrink-0 bg-purple-500/15 text-purple-600 rounded-xl flex items-center justify-center dark:text-purple-400">
                    <topic.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{topic.title}</h3>
                    <p className="text-sm text-slate-500 mt-0.5 dark:text-slate-400">{topic.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 backdrop-blur-sm shadow-xl">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="contact-name" className="text-sm font-medium text-slate-300">
                    Name
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    required
                    className="mt-1.5 w-full bg-slate-950/60 border border-slate-800 text-white placeholder:text-slate-600 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className="text-sm font-medium text-slate-300">
                    Email
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@example.com"
                    required
                    className="mt-1.5 w-full bg-slate-950/60 border border-slate-800 text-white placeholder:text-slate-600 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="contact-message" className="text-sm font-medium text-slate-300">
                  Message
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="How can we help?"
                  rows={5}
                  required
                  className="mt-1.5 w-full bg-slate-950/60 border border-slate-800 text-white placeholder:text-slate-600 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm resize-y"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:hover:bg-purple-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-600/30"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Sending...</>
                ) : (
                  <><Send className="w-5 h-5" /> Send Message</>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}