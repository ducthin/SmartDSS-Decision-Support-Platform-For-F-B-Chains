import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <h1 className="text-7xl font-bold text-gray-300">404</h1>
      <p className="text-xl text-gray-500 mt-4">Trang không tồn tại</p>
      <Link to="/" className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
        Về trang chủ
      </Link>
    </div>
  );
}
