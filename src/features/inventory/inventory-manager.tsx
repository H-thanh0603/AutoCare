"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Plus, PackagePlus, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

import {
  adjustStockAction,
  createPartAction,
  receiveStockAction,
} from "@/features/inventory/actions";
import { Button } from "@/components/ui/button";

interface PartOption {
  id: string;
  name: string;
  sku: string;
  unit: string;
}

interface Props {
  parts: PartOption[];
  canWrite: boolean;
  canAdjust: boolean;
}

type Panel = "none" | "create" | "receive" | "adjust";

const inputClass = "h-9 rounded-md border border-input bg-background px-2.5 text-sm";

export function InventoryManager({ parts, canWrite, canAdjust }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [panel, setPanel] = useState<Panel>("none");

  function run(action: () => Promise<{ ok: boolean; message?: string }>, successMsg: string) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(successMsg);
        setPanel("none");
        router.refresh();
      } else {
        toast.error(result.message ?? "Có lỗi xảy ra.");
      }
    });
  }

  function onCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    run(
      () =>
        createPartAction({
          sku: String(fd.get("sku") ?? ""),
          name: String(fd.get("name") ?? ""),
          unit: String(fd.get("unit") ?? "") || undefined,
          costPrice: Number(fd.get("costPrice") ?? 0),
          sellPrice: Number(fd.get("sellPrice") ?? 0),
          quantityInStock: Number(fd.get("quantityInStock") ?? 0),
          lowStockThreshold: Number(fd.get("lowStockThreshold") ?? 0),
        }),
      "Đã thêm phụ tùng mới.",
    );
  }

  function onReceive(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    const unitCost = fd.get("unitCost") ? Number(fd.get("unitCost")) : undefined;
    run(
      () => receiveStockAction(String(fd.get("partId") ?? ""), Number(fd.get("quantity") ?? 0), unitCost, String(fd.get("reason") ?? "") || undefined),
      "Đã nhập kho.",
    );
  }

  function onAdjust(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    run(
      () => adjustStockAction(String(fd.get("partId") ?? ""), Number(fd.get("newQuantity") ?? 0), String(fd.get("reason") ?? "")),
      "Đã điều chỉnh tồn kho.",
    );
  }

  if (!canWrite && !canAdjust) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
      <div className="flex flex-wrap gap-2">
        {canWrite ? (
          <Button variant={panel === "create" ? "default" : "outline"} onClick={() => setPanel(panel === "create" ? "none" : "create")}>
            <Plus className="size-4 mr-1.5" /> Thêm phụ tùng
          </Button>
        ) : null}
        {canAdjust ? (
          <>
            <Button variant={panel === "receive" ? "default" : "outline"} onClick={() => setPanel(panel === "receive" ? "none" : "receive")}>
              <PackagePlus className="size-4 mr-1.5" /> Nhập kho
            </Button>
            <Button variant={panel === "adjust" ? "default" : "outline"} onClick={() => setPanel(panel === "adjust" ? "none" : "adjust")}>
              <SlidersHorizontal className="size-4 mr-1.5" /> Điều chỉnh tồn kho
            </Button>
          </>
        ) : null}
      </div>

      {panel === "create" && canWrite ? (
        <form onSubmit={onCreate} className="grid gap-2 sm:grid-cols-2">
          <input name="sku" required placeholder="Mã SKU" className={inputClass} />
          <input name="name" required placeholder="Tên phụ tùng" className={inputClass} />
          <input name="unit" placeholder="Đơn vị (mặc định: cái)" className={inputClass} />
          <input name="quantityInStock" type="number" min={0} defaultValue={0} placeholder="Tồn kho ban đầu" className={inputClass} />
          <input name="costPrice" type="number" min={0} required placeholder="Giá nhập (VND)" className={inputClass} />
          <input name="sellPrice" type="number" min={0} required placeholder="Giá bán (VND)" className={inputClass} />
          <input name="lowStockThreshold" type="number" min={0} defaultValue={0} placeholder="Ngưỡng cảnh báo" className={inputClass} />
          <Button type="submit" disabled={isPending} className="sm:col-span-2">
            {isPending ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
            Tạo phụ tùng
          </Button>
        </form>
      ) : null}

      {panel === "receive" && canAdjust ? (
        <form onSubmit={onReceive} className="grid gap-2 sm:grid-cols-2">
          <select name="partId" required className={inputClass}>
            {parts.map((part) => (
              <option key={part.id} value={part.id}>
                {part.name} ({part.sku})
              </option>
            ))}
          </select>
          <input name="quantity" type="number" min={1} required placeholder="Số lượng nhập" className={inputClass} />
          <input name="unitCost" type="number" min={0} placeholder="Giá nhập/đơn vị (tùy chọn)" className={inputClass} />
          <input name="reason" placeholder="Lý do / chứng từ" className={inputClass} />
          <Button type="submit" disabled={isPending} className="sm:col-span-2">
            {isPending ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
            Xác nhận nhập kho
          </Button>
        </form>
      ) : null}

      {panel === "adjust" && canAdjust ? (
        <form onSubmit={onAdjust} className="grid gap-2 sm:grid-cols-2">
          <select name="partId" required className={inputClass}>
            {parts.map((part) => (
              <option key={part.id} value={part.id}>
                {part.name} ({part.sku})
              </option>
            ))}
          </select>
          <input name="newQuantity" type="number" min={0} required placeholder="Tồn kho thực tế mới" className={inputClass} />
          <input name="reason" required placeholder="Lý do điều chỉnh (bắt buộc)" className={`${inputClass} sm:col-span-2`} />
          <Button type="submit" disabled={isPending} className="sm:col-span-2">
            {isPending ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
            Xác nhận điều chỉnh
          </Button>
        </form>
      ) : null}
    </div>
  );
}
