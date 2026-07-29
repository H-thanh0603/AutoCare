import type { AppointmentSettings } from "@/lib/appointment-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AppointmentSettingsForm({ settings, action }: { settings: AppointmentSettings; action: (formData: FormData) => Promise<void> }) {
  return <form action={action} className="space-y-4"><label className="block text-sm font-medium">Thời lượng slot (phút)<Input name="appointmentSlotMinutes" type="number" min="15" max="240" defaultValue={settings.appointmentSlotMinutes} className="mt-1" required /></label><div className="grid gap-3 sm:grid-cols-2">{([1, 2, 3, 4, 5, 6] as const).map((day) => <div className="grid grid-cols-2 gap-2" key={day}><label className="text-sm">Thứ {day + 1}<Input name={`open-${day}`} type="time" defaultValue={settings.workingHours[day]?.open ?? ""} /></label><label className="text-sm">Đóng cửa<Input name={`close-${day}`} type="time" defaultValue={settings.workingHours[day]?.close ?? ""} /></label></div>)}</div><Button type="submit">Lưu lịch làm việc</Button></form>;
}
