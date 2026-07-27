"use client";

import { LogOut } from "lucide-react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { logoutAction } from "./actions";

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(() => logoutAction())}
    >
      <LogOut className="size-3.5" aria-hidden />
      {isPending ? "Đang thoát…" : "Đăng xuất"}
    </Button>
  );
}
