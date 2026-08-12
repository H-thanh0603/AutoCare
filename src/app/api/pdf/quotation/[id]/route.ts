import { NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { QuotationDocument } from "@/lib/pdf/quotation-document";
import React from "react";

// API handler requires a dynamic ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // TODO: Fetch quotation data from database using Prisma based on ID
    // Dummy data for now
    const dummyQuotation = {
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

    const stream = await renderToStream(
      React.createElement(QuotationDocument, dummyQuotation)
    );

    return new Response(stream as any, {
      headers: {
        "Content-Type": "application/pdf",
        // Force download or inline view
        "Content-Disposition": `inline; filename="Bao_Gia_${id}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Failed to generate PDF:", error);
    return NextResponse.json(
      { error: "Lỗi trong quá trình xuất PDF" },
      { status: 500 }
    );
  }
}
