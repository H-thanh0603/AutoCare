"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Loader2, QrCode, Sparkles, Zap } from "lucide-react";

import { generateVehicleQrCodeData } from "@/lib/qr-generator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { instantQrCheckinAction } from "./actions";

interface VehicleSummary {
  id: string;
  licensePlate: string;
  brand: string;
  model: string;
  owner: { name: string; phone: string | null } | null;
}

export function QrCheckinForm({ vehicles }: { vehicles: VehicleSummary[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [qrCodeInput, setQrCodeInput] = useState("");
  const [mileageKm, setMileageKm] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSelectVehicle = (vId: string) => {
    const qrData = generateVehicleQrCodeData(vId);
    setQrCodeInput(qrData);
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrCodeInput.trim()) {
      setError("Vui lòng quét hoặc nhập mã QR Code.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await instantQrCheckinAction({
        qrData: qrCodeInput,
        mileageKm: mileageKm ? Number(mileageKm) : undefined,
        customerNotes: notes,
      });

      if (result.ok) {
        router.push(`/lenh-sua-chua/${result.data.order.id}`);
      } else {
        setError(result.message);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800 text-xs rounded-xl">
          <AlertCircle className="size-4 text-red-600" />
          <AlertDescription className="font-semibold">{error}</AlertDescription>
        </Alert>
      )}

      {/* Quick Pick Vehicle for Demonstration */}
      <div className="space-y-2.5 bg-blue-50/60 border border-blue-200 rounded-2xl p-4">
        <span className="text-xs font-extrabold text-blue-900 flex items-center gap-1.5">
          <Sparkles className="size-4 text-amber-500 fill-amber-400" />
          <span>Thử nghiệm nhanh: Chọn xe để tự động điền Mã QR Code</span>
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
          {vehicles.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => handleSelectVehicle(v.id)}
              className="text-left text-xs font-bold px-3 py-2 bg-white hover:bg-blue-600 hover:text-white border border-blue-200 text-slate-800 rounded-xl transition-all shadow-sm truncate"
            >
              🏎️ {v.licensePlate} ({v.brand})
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="qrCode" className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <QrCode className="size-4 text-blue-600" />
          <span>Mã QR Code nhận diện xe (Quét bằng máy đọc hoặc dán mã)</span>
        </Label>
        <Input
          id="qrCode"
          placeholder="Dán mã QR (ví dụ: AUTOCARE:VEHICLE:clx...)"
          value={qrCodeInput}
          onChange={(e) => setQrCodeInput(e.target.value)}
          className="bg-slate-50 border-slate-200 font-mono text-xs rounded-xl h-11 focus:bg-white focus:border-blue-600"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="mileageKm" className="text-xs font-bold text-slate-800">
            Số km thực tế khi vào xưởng (km)
          </Label>
          <Input
            id="mileageKm"
            type="number"
            placeholder="Ví dụ: 45000"
            value={mileageKm}
            onChange={(e) => setMileageKm(e.target.value)}
            className="bg-slate-50 border-slate-200 font-mono text-sm rounded-xl h-11 focus:bg-white focus:border-blue-600"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes" className="text-xs font-bold text-slate-800">
            Ghi chú nhu cầu khách hàng
          </Label>
          <Input
            id="notes"
            placeholder="Thay dầu, bảo dưỡng phanh..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="bg-slate-50 border-slate-200 text-xs rounded-xl h-11 focus:bg-white focus:border-blue-600"
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="w-full h-13 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-blue-600/30 transition-transform hover:scale-[1.02]"
      >
        {isPending ? (
          <>
            <Loader2 className="size-5 animate-spin mr-2" />
            Đang xử lý tiếp nhận 1-Touch…
          </>
        ) : (
          <>
            <Zap className="size-5 mr-2 text-amber-300 fill-amber-300" />
            TIẾP NHẬN XE TẮC THÌ 1-TOUCH
          </>
        )}
      </Button>
    </form>
  );
}
