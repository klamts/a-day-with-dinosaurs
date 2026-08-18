import React, { useState } from 'react';
import {
  Server,
  Cloud,
  Check,
  Copy,
  ExternalLink,
  X,
  Play,
  Zap,
  Globe,
  Radio,
  HelpCircle,
  Code
} from 'lucide-react';

interface RenderDeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRoomId: string;
}

export const RenderDeployModal: React.FC<RenderDeployModalProps> = ({
  isOpen,
  onClose,
  currentRoomId
}) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<string | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  if (!isOpen) return null;

  const currentDomain = typeof window !== 'undefined' ? window.location.origin : 'https://your-dino-app.onrender.com';
  const shareLink = `${currentDomain}?room=${currentRoomId}`;

  const handleCopy = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleCheckHealth = async () => {
    setIsCheckingHealth(true);
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setHealthStatus(`✅ Online! Active Rooms: ${data.activeRooms || 0}, Uptime: ${Math.floor(data.uptime || 0)}s`);
      } else {
        setHealthStatus(`⚠️ Server responded with status: ${res.status}`);
      }
    } catch (err: any) {
      setHealthStatus(`❌ Cannot reach /api/health: ${err.message}`);
    } finally {
      setIsCheckingHealth(false);
    }
  };

  return (
    <div id="render-deploy-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-green-950/85 p-4 backdrop-blur-md select-none text-white font-sans">
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border-8 border-white bg-green-700 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b-4 border-green-800 bg-green-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-yellow-400 text-green-950 border-2 border-yellow-300 shadow-md">
              <Cloud className="h-6 w-6 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase italic tracking-tight text-white flex items-center gap-2">
                Deploy to Render & Online Multiplayer Guide
              </h2>
              <p className="text-xs font-bold text-yellow-300">
                Hướng dẫn triển khai game lên Render.com để bạn bè cùng chơi qua mạng Internet / LAN
              </p>
            </div>
          </div>
          <button
            id="close-render-modal-btn"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-green-950 hover:bg-yellow-300 font-black shadow-lg border-2 border-white"
          >
            <X className="h-6 w-6 stroke-[3]" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-green-600/60">
          {/* Quick Summary Card */}
          <div className="rounded-2xl border-4 border-white/40 bg-green-800/90 p-5 shadow-xl">
            <div className="flex items-center gap-2 text-yellow-300 font-black text-sm uppercase">
              <Zap className="h-4 w-4" />
              Sẵn sàng 100% cho Render.com (Fullstack Node.js + WebSocket Real-time)
            </div>
            <p className="mt-1 text-xs text-green-100 font-semibold leading-relaxed">
              Dự án đã được tích hợp sẵn <strong>server.ts</strong> kết hợp <strong>Express</strong>, <strong>WebSocketServer (ws)</strong>, cơ chế <strong>Ping/Pong Heartbeat 25s</strong> (chống ngắt kết nối proxy Render), và cấu hình <strong>render.yaml</strong> tự động nhận cổng động (<code className="text-yellow-300 bg-green-950/60 px-1 py-0.5 rounded">process.env.PORT</code>).
            </p>
          </div>

          {/* 3 Simple Steps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Step 1 */}
            <div className="rounded-2xl border-4 border-white/20 bg-green-800/70 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="bg-yellow-400 text-green-950 font-black text-xs px-2.5 py-1 rounded-xl">
                    BƯỚC 1
                  </span>
                  <Code className="h-4 w-4 text-yellow-300" />
                </div>
                <h4 className="font-black text-sm uppercase text-white mb-1">
                  Đẩy code lên GitHub
                </h4>
                <p className="text-xs text-green-200 font-medium leading-relaxed">
                  Tải mã nguồn (Export ZIP / Git repo) và đẩy toàn bộ project lên kho chứa GitHub cá nhân của bạn.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="rounded-2xl border-4 border-white/20 bg-green-800/70 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="bg-orange-500 text-white font-black text-xs px-2.5 py-1 rounded-xl">
                    BƯỚC 2
                  </span>
                  <Cloud className="h-4 w-4 text-orange-200" />
                </div>
                <h4 className="font-black text-sm uppercase text-white mb-1">
                  Tạo Web Service trên Render
                </h4>
                <p className="text-xs text-green-200 font-medium leading-relaxed">
                  Truy cập <strong>dashboard.render.com</strong> &gt; <strong>New +</strong> &gt; <strong>Web Service</strong> &gt; Chọn repository GitHub của bạn.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="rounded-2xl border-4 border-white/20 bg-green-800/70 p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="bg-blue-500 text-white font-black text-xs px-2.5 py-1 rounded-xl">
                    BƯỚC 3
                  </span>
                  <Globe className="h-4 w-4 text-blue-200" />
                </div>
                <h4 className="font-black text-sm uppercase text-white mb-1">
                  Điền Cấu Hình & Deploy
                </h4>
                <p className="text-xs text-green-200 font-medium leading-relaxed">
                  Render sẽ tự động đọc file <strong>render.yaml</strong> hoặc bạn có thể điền thông số chuẩn bên dưới.
                </p>
              </div>
            </div>
          </div>

          {/* Exact Settings Copy Box */}
          <div className="rounded-2xl border-4 border-yellow-400/80 bg-green-900/90 p-5 shadow-2xl space-y-3">
            <h3 className="text-sm font-black uppercase text-yellow-300 flex items-center justify-between">
              <span>Thông Số Cấu Hình Render (Web Service Settings)</span>
              <span className="text-[11px] bg-yellow-400 text-green-950 px-2 py-0.5 rounded font-black">
                FREE TIER HOẠT ĐỘNG TỐT
              </span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-bold">
              {/* Build Command */}
              <div className="bg-black/30 p-3 rounded-xl border border-white/20 flex flex-col justify-between">
                <div>
                  <span className="text-green-300 font-black uppercase text-[10px]">Build Command:</span>
                  <div className="font-mono text-yellow-200 mt-1 select-all">npm install &amp;&amp; npm run build</div>
                </div>
                <button
                  onClick={() => handleCopy('npm install && npm run build', 'build-cmd')}
                  className="mt-2 self-end flex items-center gap-1 bg-green-700 hover:bg-green-600 px-2.5 py-1 rounded-lg text-white text-[11px]"
                >
                  {copiedSection === 'build-cmd' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  Copy
                </button>
              </div>

              {/* Start Command */}
              <div className="bg-black/30 p-3 rounded-xl border border-white/20 flex flex-col justify-between">
                <div>
                  <span className="text-green-300 font-black uppercase text-[10px]">Start Command:</span>
                  <div className="font-mono text-yellow-200 mt-1 select-all">npm start</div>
                </div>
                <button
                  onClick={() => handleCopy('npm start', 'start-cmd')}
                  className="mt-2 self-end flex items-center gap-1 bg-green-700 hover:bg-green-600 px-2.5 py-1 rounded-lg text-white text-[11px]"
                >
                  {copiedSection === 'start-cmd' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  Copy
                </button>
              </div>

              {/* Environment */}
              <div className="bg-black/30 p-3 rounded-xl border border-white/20 flex flex-col justify-between">
                <div>
                  <span className="text-green-300 font-black uppercase text-[10px]">Runtime / Environment:</span>
                  <div className="font-mono text-yellow-200 mt-1">Node (Version 18+)</div>
                </div>
              </div>

              {/* Health Check Path */}
              <div className="bg-black/30 p-3 rounded-xl border border-white/20 flex flex-col justify-between">
                <div>
                  <span className="text-green-300 font-black uppercase text-[10px]">Health Check Path:</span>
                  <div className="font-mono text-yellow-200 mt-1">/api/health</div>
                </div>
              </div>
            </div>
          </div>

          {/* Test Live Server Health & Share Link */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-green-800/80 p-4 rounded-2xl border-2 border-white/30">
            <div className="flex items-center gap-3">
              <button
                onClick={handleCheckHealth}
                disabled={isCheckingHealth}
                className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-green-950 font-black text-xs uppercase px-4 py-2 rounded-xl shadow-lg active:scale-95"
              >
                <Server className="h-4 w-4" />
                {isCheckingHealth ? 'Kiểm tra...' : 'Test Server Health (/api/health)'}
              </button>
              {healthStatus && (
                <span className="text-xs font-bold text-yellow-200 bg-green-950/70 px-3 py-1.5 rounded-xl">
                  {healthStatus}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-green-200">Link mời phòng:</span>
              <button
                onClick={() => handleCopy(shareLink, 'room-link')}
                className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-400 text-white font-black text-xs uppercase px-3.5 py-2 rounded-xl shadow"
              >
                {copiedSection === 'room-link' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                Copy Link (?room={currentRoomId})
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t-4 border-green-800 bg-green-800 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <a
            href="https://dashboard.render.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-xs font-black uppercase text-yellow-300 hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            Mở Render Dashboard (render.com)
          </a>

          <button
            onClick={onClose}
            className="bg-white hover:bg-yellow-300 text-green-950 font-black text-sm uppercase px-6 py-2.5 rounded-xl shadow-lg border-2 border-white"
          >
            Đóng Hướng Dẫn
          </button>
        </div>
      </div>
    </div>
  );
};
