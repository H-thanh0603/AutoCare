import PusherServer from "pusher";

// Cấu hình Pusher Server để đẩy dữ liệu Realtime
export const pusherServer = new PusherServer({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_APP_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER! || "ap1",
  useTLS: true,
});

/**
 * Hàm hỗ trợ đẩy thông báo realtime
 * @param channel Tên channel (vd: garage-123-notifications)
 * @param event Tên sự kiện (vd: NEW_BOOKING)
 * @param data Dữ liệu payload cần gửi
 */
export async function triggerRealtimeEvent(channel: string, event: string, data: any) {
  try {
    await pusherServer.trigger(channel, event, data);
  } catch (error) {
    console.error("[Pusher] Lỗi khi đẩy sự kiện:", error);
  }
}
