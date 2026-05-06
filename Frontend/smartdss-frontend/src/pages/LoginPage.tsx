import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import '@/styles/coffee-theme.css';
import logoImg from '@/assets/img/logo.png';
export default function LoginPage() {
  const { login, token, loading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;
  if (token) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login({ username, password });
      toast.success('Đăng nhập thành công!');
    } catch {
      toast.error('Sai tài khoản hoặc mật khẩu');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="coffee-theme min-h-screen flex items-center justify-center bg-[#fffdf9] text-[var(--coffee-dark)] px-4 overflow-hidden relative">
      <div className="pointer-events-none fixed -left-32 top-1/4 h-96 w-96 rounded-full bg-[rgba(201,162,122,0.08)] blur-3xl" />
      <div className="pointer-events-none fixed -right-32 top-2/3 h-96 w-96 rounded-full bg-[rgba(107,80,64,0.07)] blur-3xl" />

      <div className="relative z-10 bg-white rounded-[22px] border border-[rgba(111,78,55,0.1)] shadow-[0_26px_55px_-30px_rgba(62,42,31,0.2)] p-8 w-full max-w-md">
        <div className="text-center">
          <div className="inline-flex items-center justify-center">
            <img src={logoImg} alt="SmartDSS Logo" className="w-80 h-48 object-contain" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[var(--coffee-dark)] mb-1">Tên đăng nhập</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 border border-[rgba(111,78,55,0.2)] rounded-lg focus:ring-2 focus:ring-[var(--coffee-primary)] focus:border-[var(--coffee-primary)] outline-none transition bg-white text-[var(--coffee-dark)]"
              placeholder="Nhập tên đăng nhập"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--coffee-dark)] mb-1">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-[rgba(111,78,55,0.2)] rounded-lg focus:ring-2 focus:ring-[var(--coffee-primary)] focus:border-[var(--coffee-primary)] outline-none transition bg-white text-[var(--coffee-dark)]"
              placeholder="Nhập mật khẩu"
              required
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[var(--coffee-primary)] text-white py-2.5 rounded-lg font-medium hover:bg-[var(--coffee-dark)] disabled:opacity-50 transition"
          >
            {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div >
  );
}
