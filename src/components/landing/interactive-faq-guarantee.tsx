"use client";

import { useState } from "react";
import { ChevronDown, ShieldCheck, Sparkles, HelpCircle, CheckCircle } from "lucide-react";

const FAQS = [
  {
    q: "Nếu trong quá trình sửa chữa phát hiện thêm hư hỏng, gara có tự ý thay không?",
    a: "Tuyệt đối KHÔNG. AutoCare áp dụng Quy tắc Minh Bạch #1: Mọi phát sinh đều phải được chụp ảnh gửi kèm Báo giá bổ sung qua ứng dụng. Kỹ thuật viên chỉ được phép thi công sau khi bạn bấm DUYỆT trên điện thoại.",
  },
  {
    q: "Phụ tùng thay thế tại AutoCare có nguồn gốc như thế nào?",
    a: "100% phụ tùng, dầu nhớt và phụ gia đều được nhập khẩu chính ngạch từ các thương hiệu hàng đầu thế giới (Castrol, Motul, Bosch, Brembo, Denso, Mobis). Mỗi sản phẩm đều có mã vạch QR để bạn tra cứu số serial và xuất xứ.",
  },
  {
    q: "Chính sách bảo hành sau sửa chữa tại AutoCare như thế nào?",
    a: "Tất cả các dịch vụ bảo dưỡng và phụ tùng thay thế đều được bảo hành từ 6 tháng đến 12 tháng (hoặc 10.000km - 20.000km). Thông tin bảo hành được lưu trực tiếp trên Sổ Sức Khỏe Xe Điện Tử trong tài khoản của bạn.",
  },
  {
    q: "Tôi có thể đặt lịch trước và chọn kỹ thuật viên không?",
    a: "Hoàn toàn ĐƯỢC. Khi đặt lịch trên website hoặc ứng dụng AutoCare, bạn có thể chọn khung giờ rảnh, chọn chi nhánh gara gần nhất và chọn kỹ thuật viên trưởng phụ trách chiếc xe của mình.",
  },
  {
    q: "Gara có hỗ trợ xe cứu hộ khẩn cấp khi xe gặp sự cố trên đường không?",
    a: "Có. Tổng đài cứu hộ 24/7 của AutoCare (0243.872.5160) luôn sẵn sàng xe cứu hộ sàn trượt chuyên dụng, hỗ trợ câu bình ắc quy, vá lốp lưu động hoặc kéo xe về gara gần nhất trong vòng 15-30 phút.",
  },
];

export function InteractiveFaqGuarantee() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl text-white">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <span className="px-3.5 py-1 rounded-full bg-blue-500/20 text-cyan-300 border border-blue-400/30 text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5">
            <HelpCircle className="size-3.5" />
            Giải Đáp Thắc Mắc
          </span>
          <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Câu Hỏi Thường Gặp Của Chủ Xe
          </h3>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            Những điều bạn cần biết trước khi mang xe đến chăm sóc tại hệ thống AutoCare.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm transition-all duration-200"
              >
                <button
                  onClick={() => toggle(idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-white hover:text-cyan-400 text-base transition-colors"
                >
                  <span className="flex items-center gap-3.5">
                    <span className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 text-cyan-400 flex items-center justify-center text-xs shrink-0 font-mono font-black">
                      {idx + 1}
                    </span>
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`size-5 text-slate-500 shrink-0 transition-transform duration-300 ${
                      isOpen ? "rotate-180 text-cyan-400" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-2 text-slate-300 text-sm leading-relaxed border-t border-slate-800/80 pl-16">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 3 Guarantees Box */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          <div className="p-4 rounded-2xl bg-slate-950/90 border border-blue-500/30 flex items-start gap-3">
            <ShieldCheck className="size-6 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-white text-xs uppercase">Bảo Hành Dài Hạn</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Cam kết bảo hành phụ tùng 12 tháng 1 đổi 1.</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/90 border border-emerald-500/30 flex items-start gap-3">
            <CheckCircle className="size-6 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-white text-xs uppercase">Không Phát Sinh Chi Phí</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Giá chuẩn niêm yết, không phụ thu ngoài báo giá.</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/90 border border-amber-500/30 flex items-start gap-3">
            <Sparkles className="size-6 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-white text-xs uppercase">Rửa Xe & Khử Khuẩn</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Miễn phí rửa xe hút bụi cho mọi hóa đơn bảo dưỡng.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
