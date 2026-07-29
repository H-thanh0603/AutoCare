import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPortalAppointmentFormAction } from "@/features/appointments/actions";

export function AppointmentForm({ vehicles }: { vehicles: readonly { id: string; licensePlate: string }[] }) {
  return (
    <form action={createPortalAppointmentFormAction} className="space-y-4">
      <label className="block text-sm font-medium">Xe<select name="vehicleId" className="mt-1 h-8 w-full rounded-lg border border-input bg-background px-2.5" required>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.licensePlate}</option>)}</select></label>
      <label className="block text-sm font-medium">Thời gian hẹn<Input name="scheduledAt" type="datetime-local" required className="mt-1" /></label>
      <label className="block text-sm font-medium">Nhu cầu sửa chữa<Input name="serviceRequest" className="mt-1" maxLength={500} /></label>
      <label className="block text-sm font-medium">Ghi chú<Input name="note" className="mt-1" maxLength={1000} /></label>
      <Button type="submit">Đặt lịch</Button>
    </form>
  );
}
