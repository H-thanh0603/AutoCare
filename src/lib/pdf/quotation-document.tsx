import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import * as React from "react";

// You can register custom fonts here if needed
// Font.register({ family: 'Roboto', src: '/fonts/Roboto-Regular.ttf' });

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 12,
    fontFamily: "Helvetica",
    color: "#1e293b",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 40,
    borderBottom: "1 solid #e2e8f0",
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0f172a",
  },
  garageInfo: {
    textAlign: "right",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 10,
    backgroundColor: "#f8fafc",
    padding: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    padding: 8,
    fontWeight: "bold",
    marginBottom: 5,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1 solid #f1f5f9",
    padding: 8,
  },
  col1: { width: "10%" },
  col2: { width: "40%" },
  col3: { width: "15%", textAlign: "right" },
  col4: { width: "15%", textAlign: "right" },
  col5: { width: "20%", textAlign: "right" },
  total: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingTop: 10,
    borderTop: "2 solid #e2e8f0",
  },
  totalLabel: {
    fontWeight: "bold",
    marginRight: 20,
  },
  totalAmount: {
    fontWeight: "bold",
    fontSize: 14,
    color: "#10b981", // emerald-500
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 10,
    borderTop: "1 solid #e2e8f0",
    paddingTop: 10,
  }
});

interface QuotationItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface QuotationDocumentProps {
  quotationId: string;
  customerName: string;
  vehiclePlate: string;
  date: string;
  garageName: string;
  items: QuotationItem[];
  totalAmount: number;
}

export const QuotationDocument = ({
  quotationId,
  customerName,
  vehiclePlate,
  date,
  garageName,
  items,
  totalAmount,
}: QuotationDocumentProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>BÁO GIÁ SỬA CHỮA</Text>
          <Text>Mã số: {quotationId}</Text>
          <Text>Ngày: {date}</Text>
        </View>
        <View style={styles.garageInfo}>
          <Text style={{ fontWeight: "bold", fontSize: 16 }}>{garageName}</Text>
          <Text>Hệ thống quản lý AutoCare</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Thông tin khách hàng</Text>
        <View style={styles.row}>
          <Text>Khách hàng: {customerName}</Text>
          <Text>Biển số xe: {vehiclePlate}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Chi tiết báo giá</Text>
        <View style={styles.tableHeader}>
          <Text style={styles.col1}>STT</Text>
          <Text style={styles.col2}>Hạng mục</Text>
          <Text style={styles.col3}>SL</Text>
          <Text style={styles.col4}>Đơn giá</Text>
          <Text style={styles.col5}>Thành tiền</Text>
        </View>
        
        {items.map((item, index) => (
          <View style={styles.tableRow} key={item.id}>
            <Text style={styles.col1}>{index + 1}</Text>
            <Text style={styles.col2}>{item.name}</Text>
            <Text style={styles.col3}>{item.quantity}</Text>
            <Text style={styles.col4}>{item.unitPrice.toLocaleString('vi-VN')}đ</Text>
            <Text style={styles.col5}>{item.total.toLocaleString('vi-VN')}đ</Text>
          </View>
        ))}

        <View style={styles.total}>
          <Text style={styles.totalLabel}>TỔNG CỘNG:</Text>
          <Text style={styles.totalAmount}>{totalAmount.toLocaleString('vi-VN')} VNĐ</Text>
        </View>
      </View>

      <Text style={styles.footer}>
        Báo giá có giá trị trong vòng 07 ngày. Cảm ơn quý khách đã sử dụng dịch vụ!
      </Text>
    </Page>
  </Document>
);
