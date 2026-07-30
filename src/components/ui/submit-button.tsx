"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type SubmitButtonProps = React.ComponentProps<typeof Button> & {
  pendingText?: string;
};

/**
 * Submit button for server-action `<form>`s. Reads the enclosing form's pending
 * state via useFormStatus, so it disables and shows a spinner during submission
 * without turning the whole form into a client component.
 */
export function SubmitButton({ children, pendingText, disabled, ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} {...props}>
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin mr-2" aria-hidden="true" />
          {pendingText ?? "Đang xử lý…"}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
