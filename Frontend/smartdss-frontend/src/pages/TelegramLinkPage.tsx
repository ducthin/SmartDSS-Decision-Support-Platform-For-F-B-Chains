import { useState } from 'react';
import { Gift, MessageCircle, ShieldCheck, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import { qrService } from '@/services/qrService';
import logoImg from '@/assets/img/logo.png';
import Button from '@/components/coffee/Button';
import '@/styles/coffee-theme.css';

export default function TelegramLinkPage() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const CUSTOMER_PHONE_REGEX = /^[+0-9][0-9]{8,19}$/;

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\s+/g, '').trim();
    if (!CUSTOMER_PHONE_REGEX.test(cleanPhone)) {
      toast.error('Vui lòng nhập số điện thoại hợp lệ');
      return;
    }

    setLoading(true);
    try {
      const res = await qrService.getTelegramOptInLink(cleanPhone);
      const url = res.data.data;
      if (!url) {
        toast.error('Hệ thống chưa cấu hình Telegram bot');
        return;
      }
      
      toast.success('Đang chuyển hướng sang Telegram...');
      window.location.href = url;
    } catch (error) {
      toast.error('Không thể tạo liên kết, vui lòng thử lại sau');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="coffee-theme min-h-screen bg-[var(--coffee-surface-muted)] flex flex-col items-center justify-center p-4 sm:p-6 text-[var(--coffee-dark)] relative overflow-hidden">
      {/* Decorative Background */}
      <div className="pointer-events-none fixed -left-32 top-1/4 h-96 w-96 rounded-full bg-[rgba(201,162,122,0.08)] blur-3xl" />
      <div className="pointer-events-none fixed -right-32 top-2/3 h-96 w-96 rounded-full bg-[rgba(107,80,64,0.07)] blur-3xl" />
      <div className="absolute inset-0 coffee-grid-pattern opacity-60"></div>

      <div className="w-full max-w-md bg-white rounded-3xl coffee-soft-shadow-lg overflow-hidden transform transition-all relative z-10 animate-slide-in-up">
        {/* Header Section */}
        <div className="bg-[var(--coffee-primary)] px-6 py-10 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,white_0%,transparent_100%)]"></div>
          <div className="relative z-10 flex flex-col items-center">
            {/* Logo */}
            <div className="bg-white/95 rounded-2xl p-3 mb-6 shadow-md border border-white/20">
              <img src={logoImg} alt="SmartDSS Logo" className="h-12 w-auto object-contain" />
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight flex items-center justify-center gap-2">
              <Gift className="w-7 h-7 text-[var(--coffee-accent)]" />
              Nhận Ưu Đãi Độc Quyền
            </h1>
            <p className="text-[var(--coffee-secondary)] text-sm sm:text-base opacity-90 max-w-[280px] mx-auto mt-2">
              Liên kết số điện thoại qua Telegram để nhận ngay voucher và khuyến mãi mới nhất từ SmartDSS.
            </p>
          </div>
        </div>

        {/* Form Section */}
        <div className="p-6 sm:p-8">
          <form onSubmit={handleLink} className="space-y-6">
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-[var(--coffee-dark)] mb-2">
                Số điện thoại của bạn
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Smartphone className="h-5 w-5 text-[rgba(107,80,64,0.5)]" />
                </div>
                <input
                  type="tel"
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ví dụ: 0912345678"
                  className="block w-full pl-11 pr-4 py-3.5 border-2 border-[rgba(107,80,64,0.1)] rounded-xl bg-[rgba(253,247,240,0.5)] focus:ring-0 focus:border-[var(--coffee-accent)] focus:bg-white transition-colors text-lg font-medium text-[var(--coffee-dark)] placeholder:text-[rgba(26,14,7,0.4)]"
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={loading || !phone.trim()} 
              fullWidth 
              size="lg"
              className="!rounded-xl !bg-[#229ED9] hover:!bg-[#1C88BA] !text-white shadow-lg shadow-[#229ED9]/20"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Mở App Telegram Ngay
                </>
              )}
            </Button>
          </form>

          {/* Benefits List */}
          <div className="mt-8 space-y-4 border-t border-[rgba(107,80,64,0.1)] pt-6">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[var(--coffee-accent)] shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-[var(--coffee-dark)]">Bảo mật thông tin</h3>
                <p className="text-xs text-[rgba(26,14,7,0.6)] mt-0.5">Chúng tôi cam kết không chia sẻ số điện thoại của bạn cho bên thứ ba.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <p className="mt-8 text-sm text-[rgba(26,14,7,0.5)] font-medium relative z-10">
        © {new Date().getFullYear()} SmartDSS
      </p>
    </div>
  );
}
