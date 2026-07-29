import { Bell, Check, ChevronRight } from "lucide-react";
import Link from "next/link";

import { listNotificationsForUser } from "@/data/notifications";
import { requireUserPage } from "@/features/auth/guards";
import { markNotificationReadFormAction } from "@/features/notifications/actions";
import { Button } from "@/components/ui/button";

export default async function NotificationsPage() {
  const user = await requireUserPage("/tai-khoan/thong-bao");
  const notifications = await listNotificationsForUser(user.id);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2">
          <Bell className="size-6 text-amber-300" />
          <span>Thông Báo Của Tôi</span>
        </h1>
        <p className="text-blue-100 text-xs sm:text-sm font-medium">
          Cập nhật tiến độ báo giá, xác nhận lịch hẹn và thông báo từ Gara.
        </p>
      </div>

      {/* Notifications List Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <h2 className="text-lg font-black text-slate-900 border-b border-slate-100 pb-3">
          Thông Báo Mới Nhất ({notifications.length})
        </h2>

        {notifications.length === 0 ? (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-slate-500 text-sm">
            Chưa có thông báo nào.
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const href =
                typeof notification.data === "object" &&
                notification.data &&
                "href" in notification.data &&
                typeof notification.data.href === "string"
                  ? notification.data.href
                  : null;

              return (
                <div
                  key={notification.id}
                  className={`border rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                    notification.readAt
                      ? "bg-white border-slate-200 text-slate-600"
                      : "bg-blue-50/60 border-blue-200 text-slate-900 font-bold shadow-sm"
                  }`}
                >
                  <div className="space-y-1">
                    <p className={`text-sm ${notification.readAt ? "font-semibold text-slate-800" : "font-black text-blue-900"}`}>
                      {notification.title}
                    </p>
                    {notification.body && <p className="text-xs text-slate-500 font-medium">{notification.body}</p>}
                    {href && (
                      <Link href={href} className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 pt-1">
                        Xem chi tiết <ChevronRight className="size-3.5" />
                      </Link>
                    )}
                  </div>

                  {!notification.readAt && (
                    <form action={markNotificationReadFormAction} className="shrink-0">
                      <input type="hidden" name="notificationId" value={notification.id} />
                      <Button
                        type="submit"
                        size="sm"
                        variant="outline"
                        className="border-blue-300 bg-white hover:bg-blue-50 text-blue-700 font-bold text-xs rounded-xl"
                      >
                        <Check className="size-3.5 mr-1" />
                        Đã đọc
                      </Button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
