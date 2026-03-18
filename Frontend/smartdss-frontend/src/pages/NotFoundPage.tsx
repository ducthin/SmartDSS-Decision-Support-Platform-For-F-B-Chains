import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDF6EC]">
      <h1 className="text-7xl font-bold text-[#C6A888]">404</h1>
      <p className="text-xl text-[#6D4C41] mt-4">Trang không tồn tại</p>
      <Link to="/" className="mt-6 px-6 py-2 bg-[#F4A825] text-white rounded-lg hover:bg-[#D48806] transition">
        Về trang chủ
      </Link>
    </div>
  );
}


