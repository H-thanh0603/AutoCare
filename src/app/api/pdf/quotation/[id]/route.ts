import { NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { QuotationDocument, type QuotationDocumentProps } from "@/lib/pdf/quotation-document";
import React from "react";
import { getSessionUser } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { assertRateLimit, getClientIp } from "@/lib/rate-limit";
import { requireGarageScope, requirePermission } from "@/lib/rbac";

// NOTE: this endpoint currently renders placeholder data (the Prisma lookup is
// not wired yet). The authz below MUST stay — the moment a real quotation
// lookup lands here, an unauthenticated route would become a cross-tenant IDOR
// exposing customer names, plates and financials for enumerable ids.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clientIp = getClientIp(request);
    await assertRateLimit({ identifier: `pdf-quotation:${clientIp}`, maxRequests: 20, windowMs: 60_000 });

    const user = requirePermission(await getSessionUser(), "quotation:read");
    requireGarageScope(user);

    const { id } = await params;

    // TODO: Fetch quotation data from database using Prisma based on ID
    // (must be scoped: findFirst({ where: { id, garageId } })).
    // Dummy data for now
    const quotation: QuotationDocumentProps = {
      quotationId: id,
      customerName: "Nguyễn Văn Khách",
      vehiclePlate: "51H-123.45",
      date: new Date().toLocaleDateString("vi-VN"),
      garageName: "AutoCare Premium",
      items: [
        { id: "1", name: "Thay dầu nhớt máy 4L", quantity: 1, unitPrice: 600000, total: 600000 },
        { id: "2", name: "Bảo dưỡng cúp-lê phanh", quantity: 2, unitPrice: 350000, total: 700000 },
      ],
      totalAmount: 1300000,
    };

    const stream = await renderToStream(React.createElement(QuotationDocument, quotation));

    return new Response(stream, {
      headers: {
        "Content-Type": "application/pdf",
        // Force download or inline view
        "Content-Disposition": `inline; filename="Bao_Gia_${id}.pdf"`,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.httpStatus });
    }
    console.error("Failed to generate PDF:", error);
    return NextResponse.json(
      { error: "Lỗi trong quá trình xuất PDF" },
      { status: 500 }
    );
  }
}
