# 🦕 A Day with Dinosaurs - Real-time Multiplayer Web Game

> Trò chơi thám hiểm săn khủng long thời tiền sử đa người chơi (1-4 người) thời gian thực, hỗ trợ cả **Local Co-op** và **Online Multiplayer (Render / LAN)** qua WebSocket!

---

## 🌟 Tính Năng Nổi Bật

- 🦖 **Khủng Long Đa Dạng & Tính Điểm Theo Tốc Độ:**
  - Khủng long chậm (Brachiosaurus, Stegosaurus, Ankylosaurus): **2 - 4 Điểm**
  - Khủng long tốc độ vừa (Triceratops, Parasaurolophus, Gallimimus): **5 - 8 Điểm**
  - Khủng long siêu tốc (Velociraptor, Carnotaurus, Pterodactyl): **10 - 15 Điểm**
  - Khủng long Apex & Boss (Spinosaurus, T-Rex): **18 - 25 Điểm** (Yêu cầu phối hợp bắt nhiều lần!)
- 🤝 **Chế Độ Chơi Đa Dạng:**
  - **Competitive (Cạnh Tranh):** 4 người chơi tranh tài gom nhiều điểm nhất.
  - **Co-op Squad (Hợp Tác):** Cùng chung thanh điểm mục tiêu, kích hoạt **Team Combo Multiplier (x2, x3, x4)** khi cùng quăng thòng lọng vào 1 khủng long!
- 🎮 **Hệ Thống Điều Khiển:**
  - **Player 1:** Phím `W A S D` di chuyển, `Space` quăng thòng lọng, `E` tăng tốc Turbo, `Q` thả mồi nhử Lure.
  - **Player 2:** Phím Mũi Tên `↑ ← ↓ →` di chuyển, `Enter` quăng thòng lọng, `Shift` tăng tốc, `L` thả mồi.
  - **Dual On-Screen Controllers:** 2 bộ điều khiển cảm ứng trực tiếp trên màn hình cho iPad / Điện thoại / Máy tính bảng.
- 🔊 **Web Audio Synthesizer:** Âm thanh gầm rú thực tế được tổng hợp bằng Web Audio API (không dùng file âm thanh ngoài).

---

## 🚀 Hướng Dẫn Deploy Lên Render.com (Multiplayer Online)

Dự án đã được cấu hình sẵn 100% để chạy mượt mà trên Render.com với WebSocket thời gian thực và tự động xử lý cổng động `process.env.PORT`.

### Cách 1: Tự Động Với Render Blueprint (`render.yaml`)

1. Đẩy mã nguồn dự án lên GitHub của bạn:
   ```bash
   git add .
   git commit -m "Deploy A Day with Dinosaurs"
   git push origin main
   ```
2. Truy cập [dashboard.render.com](https://dashboard.render.com) > Chọn **Blueprints** > **New Blueprint Instance**.
3. Chọn repository của bạn. Render sẽ tự động đọc file `render.yaml` và triển khai dịch vụ!

---

### Cách 2: Tạo Thủ Công (Manual Web Service) Trên Render

1. Vào [dashboard.render.com](https://dashboard.render.com) > Nhấn **New +** > **Web Service**.
2. Kết nối với repository GitHub của game.
3. Điền các thông số như sau:
   - **Name:** `a-day-with-dinosaurs`
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** `Free` (hoặc cao hơn tùy nhu cầu)
4. Nhấn **Create Web Service**.
5. Sau 1-2 phút, Render sẽ cấp cho bạn một đường link công khai, ví dụ:
   `https://a-day-with-dinosaurs.onrender.com`

---

## 👥 Cách Chơi Nhiều Người Qua Link Render

- **Tạo Phòng:** Vào trang chủ, chuyển sang tab **LAN / RENDER (4P)**.
- **Mời Bạn Bè:** Nhấn nút **Copy Link** (VD: `https://a-day-with-dinosaurs.onrender.com?room=DINO-1234`) và gửi cho bạn bè.
- Khi bạn bè mở liên kết, họ sẽ tự động được kết nối vào đúng phòng chơi cùng bạn!
- Tối đa 4 người chơi trong 1 phòng, có thể bổ sung AI Bot nếu chưa đủ người.

---

## 🛠️ Chạy Thử Ở Local (Local Development)

```bash
# Cài đặt dependencies
npm install

# Chạy server và client (hỗ trợ cả Express backend + Vite dev)
npm run dev

# Build production
npm run build

# Chạy production build
npm start
```
Game sẽ chạy tại: `http://localhost:3000`
