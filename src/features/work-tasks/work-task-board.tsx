"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { WorkTaskStatus } from "@/generated/prisma/enums";
import { assignTechnicianAction, updateWorkTaskStatusAction } from "@/features/work-tasks/actions";
import { workTaskStatusLabel } from "@/features/repair-orders/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface TaskView {
  id: string;
  title: string;
  status: WorkTaskStatus;
  assignedTo: { id: string; name: string } | null;
}

interface Props {
  tasks: TaskView[];
  technicians: { id: string; name: string }[];
  canAssign: boolean;
  canProgress: boolean;
}

export function WorkTaskBoard({ tasks, technicians, canAssign, canProgress }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: boolean; message?: string }>, successMsg: string) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(successMsg);
        router.refresh();
      } else {
        toast.error(result.message ?? "Có lỗi xảy ra.");
      }
    });
  }

  if (tasks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        Chưa có hạng mục công việc. Công việc được tạo tự động khi khách duyệt báo giá.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {tasks.map((task) => (
        <li key={task.id} className="rounded-lg border p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-sm">{task.title}</span>
            <Badge variant="secondary">{workTaskStatusLabel(task.status)}</Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">
              Phụ trách: {task.assignedTo?.name ?? "Chưa phân công"}
            </span>

            {canAssign ? (
              <select
                defaultValue={task.assignedTo?.id ?? ""}
                disabled={isPending}
                onChange={(event) =>
                  run(
                    () => assignTechnicianAction(task.id, event.target.value || null),
                    "Đã cập nhật phân công.",
                  )
                }
                className="h-7 rounded-md border px-2"
              >
                <option value="">— Bỏ phân công —</option>
                {technicians.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.name}
                  </option>
                ))}
              </select>
            ) : null}
          </div>

          {canProgress ? (
            <div className="flex flex-wrap gap-2">
              {(task.status === "NOT_STARTED" || task.status === "WAITING_PARTS" || task.status === "PAUSED") && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => run(() => updateWorkTaskStatusAction(task.id, "IN_PROGRESS"), "Đã bắt đầu công việc.")}
                >
                  {isPending ? <Loader2 className="size-3.5 animate-spin" /> : "Bắt đầu"}
                </Button>
              )}
              {task.status === "IN_PROGRESS" && (
                <>
                  <Button
                    size="sm"
                    disabled={isPending}
                    onClick={() => run(() => updateWorkTaskStatusAction(task.id, "COMPLETED"), "Đã hoàn tất công việc.")}
                  >
                    Hoàn tất
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => run(() => updateWorkTaskStatusAction(task.id, "PAUSED"), "Đã tạm dừng công việc.")}
                  >
                    Tạm dừng
                  </Button>
                </>
              )}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
