import type { Metadata } from "next";

import { getGarageById } from "@/data/garages";
import { requireStaffPermissionPage } from "@/features/auth/guards";
import { AppointmentSettingsForm } from "@/features/appointments/settings-form";
import { updateAppointmentSettingsFormAction } from "@/features/appointments/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Cài đặt · AutoCare" };

export default async function SettingsPage() {
  const { garageId } = await requireStaffPermissionPage("/cai-dat", "garage-member:read");
  const garage = await getGarageById(garageId);
  return <div className="space-y-6"><div><h1 className="text-2xl font-semibold">Cài đặt</h1><p className="text-muted-foreground mt-1 text-sm">Thông tin gara và lịch làm việc cho lịch hẹn.</p></div><Card><CardHeader><CardTitle>Thông tin gara</CardTitle></CardHeader><CardContent className="space-y-1 text-sm"><p>{garage.name}</p><p className="text-muted-foreground">{garage.phone ?? "Chưa có số điện thoại"}</p></CardContent></Card><Card><CardHeader><CardTitle>Lịch hẹn</CardTitle></CardHeader><CardContent>{garage.appointmentSettings ? <AppointmentSettingsForm settings={garage.appointmentSettings} action={updateAppointmentSettingsFormAction} /> : null}</CardContent></Card></div>;
}
