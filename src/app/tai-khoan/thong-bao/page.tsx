import Link from "next/link";
import { listNotificationsForUser } from "@/data/notifications";
import { requireUserPage } from "@/features/auth/guards";
import { markNotificationReadFormAction } from "@/features/notifications/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NotificationsPage() {
  const user = await requireUserPage("/tai-khoan/thong-bao");
  const notifications = await listNotificationsForUser(user.id);
  return <div className="space-y-6"><h1 className="text-2xl font-semibold">Thông báo</h1><Card><CardHeader><CardTitle>Gần đây</CardTitle></CardHeader><CardContent className="space-y-3">{notifications.length === 0 ? <p className="text-muted-foreground">Chưa có thông báo.</p> : notifications.map((notification) => { const href = typeof notification.data === "object" && notification.data && "href" in notification.data && typeof notification.data.href === "string" ? notification.data.href : null; return <div key={notification.id} className="flex items-start justify-between gap-3 border-b pb-3 last:border-0"><div><p className={notification.readAt ? "" : "font-medium"}>{notification.title}</p>{notification.body && <p className="text-muted-foreground text-sm">{notification.body}</p>}{href && <Link href={href} className="text-sm underline">Xem chi tiết</Link>}</div>{!notification.readAt && <form action={markNotificationReadFormAction}><input type="hidden" name="notificationId" value={notification.id}/><Button type="submit" size="sm" variant="outline">Đã đọc</Button></form>}</div>})}</CardContent></Card></div>;
}
