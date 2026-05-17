import { useRef } from 'react';
import { Gift, QrCode, Printer, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function TelegramQrAdminPage() {
  const qrRef = useRef<HTMLDivElement>(null);
  // Sử dụng window.location.origin để lấy base URL (VD: https://smartdss.store)
  const telegramLinkUrl = `${window.location.origin}/telegram`;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      import('react-hot-toast').then(({ default: toast }) => {
        toast.error('Trình duyệt đang chặn cửa sổ bật lên (popup). Vui lòng cho phép popup để in.');
      });
      return;
    }

    const qrSvg = qrRef.current?.querySelector('svg');
    if (!qrSvg) return;

    const svgString = new XMLSerializer().serializeToString(qrSvg);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>In mã QR Liên kết Telegram</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap');
            body { 
              font-family: 'DM Sans', sans-serif; 
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              justify-content: center; 
              height: 100vh; 
              margin: 0; 
              text-align: center;
              background-color: #fff;
            }
            .qr-container { margin: 2rem 0; padding: 1.5rem; border: 2px dashed #c9a27a; border-radius: 1.5rem; }
            h1 { font-size: 26px; color: #1a0e07; margin-bottom: 8px; letter-spacing: -0.02em; }
            p { font-size: 16px; color: #6b5040; max-width: 400px; margin: 0 auto; line-height: 1.5; }
            .branding { margin-top: 1.5rem; font-weight: 700; color: #c9a27a; font-size: 18px; letter-spacing: 0.05em; text-transform: uppercase; }
          </style>
        </head>
        <body>
          <h1>Quét mã nhận Voucher</h1>
          <p>Dùng Camera quét mã để đăng ký nhận ưu đãi độc quyền qua Telegram của chúng tôi.</p>
          <div class="qr-container">
            ${svgString}
          </div>
          <div class="branding">SmartDSS Coffee</div>
          <script>
            // Thay vì onload (không chạy trên popup động), dùng setTimeout
            setTimeout(() => { 
              window.print(); 
              window.close(); 
            }, 300);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownload = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Setup canvas with padding and background
      const padding = 40;
      canvas.width = img.width + padding * 2;
      canvas.height = img.height + padding * 2;
      
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, padding, padding);
        
        // Add some text
        ctx.fillStyle = '#1a0e07';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Quét để nhận Voucher', canvas.width / 2, padding / 1.5);
      }

      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = 'SmartDSS-Telegram-QR.png';
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1a0e07] flex items-center gap-2">
          <QrCode className="text-[#c9a27a]" size={28} /> 
          Mã QR Bàn Chăm Sóc Khách Hàng
        </h1>
        <p className="text-sm text-[rgba(26,14,7,0.45)] mt-1">
          In mã QR này và đặt tại quầy hoặc trên bàn. Khách hàng dùng điện thoại quét mã sẽ được mở trang liên kết Telegram.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-[rgba(107,80,64,0.12)] shadow-[0_2px_12px_-4px_rgba(26,14,7,0.06)] overflow-hidden flex flex-col items-center p-8 sm:p-12">
        <div className="text-center mb-8 max-w-md">
          <h2 className="text-xl font-bold text-[#1a0e07] flex items-center justify-center gap-2 mb-2">
            <Gift className="w-6 h-6 text-[#c9a27a]" />
            Nhận Ưu Đãi Độc Quyền
          </h2>
          <p className="text-sm text-[rgba(26,14,7,0.7)]">
            Quét mã QR dưới đây bằng điện thoại để đăng ký nhận mã giảm giá và thông báo thành viên.
          </p>
        </div>

        <div 
          ref={qrRef}
          className="bg-white p-6 rounded-3xl shadow-lg border border-[rgba(107,80,64,0.1)] mb-8 transform transition-transform hover:scale-105"
        >
          <QRCodeSVG 
            value={telegramLinkUrl} 
            size={300} 
            level="H" 
            includeMargin={false}
            fgColor="#1a0e07"
          />
        </div>

        <div className="bg-[rgba(253,247,240,0.5)] rounded-xl p-4 w-full max-w-md text-center border border-[rgba(107,80,64,0.1)] mb-8">
          <p className="text-xs text-[rgba(26,14,7,0.45)] font-medium uppercase tracking-wider mb-1">Đường dẫn trang web</p>
          <a href={telegramLinkUrl} target="_blank" rel="noreferrer" className="text-sm text-[#6b5040] hover:text-[#c9a27a] font-medium transition-colors break-all">
            {telegramLinkUrl}
          </a>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-[#c9a27a] bg-[rgba(201,162,122,0.15)] text-[#7a5c3e] hover:bg-[rgba(201,162,122,0.25)] font-medium transition-all"
          >
            <Download size={18} />
            Tải ảnh QR (PNG)
          </button>
          
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#6b5040] text-white font-medium hover:brightness-110 transition-all"
          >
            <Printer size={18} />
            In mã QR ngay
          </button>
        </div>
      </div>
    </div>
  );
}
