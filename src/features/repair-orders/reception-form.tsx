import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ReceptionForm({
  action,
  vehicleId,
}: {
  action: (formData: FormData) => Promise<void>;
  vehicleId?: string;
}) {
  return <form action={action} className="grid gap-4 sm:grid-cols-2">
    {vehicleId ? <input type="hidden" name="vehicleId" value={vehicleId} /> : null}
    <label className="text-sm font-medium">Số km<Input className="mt-1" name="mileageKm" type="number" min="0" required /></label>
    <label className="text-sm font-medium">Mức nhiên liệu (%)<Input className="mt-1" name="fuelLevel" type="number" min="0" max="100" /></label>
    <label className="text-sm font-medium sm:col-span-2">Ghi chú tiếp nhận<Input className="mt-1" name="initialNote" maxLength={2000} /></label>
    <label className="flex items-center gap-2 text-sm"><input name="exterior" type="checkbox" /> Đã kiểm tra ngoại thất</label>
    <label className="flex items-center gap-2 text-sm"><input name="documents" type="checkbox" /> Đã nhận giấy tờ xe</label>
    <label className="text-sm font-medium sm:col-span-2">Lý do override km<Input className="mt-1" name="overrideReason" maxLength={255} /></label>
    <div className="sm:col-span-2"><Button type="submit">Tạo lệnh sửa chữa</Button></div>
  </form>;
}
