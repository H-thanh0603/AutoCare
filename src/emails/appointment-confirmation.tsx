import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  Button,
} from "@react-email/components";
import * as React from "react";

interface AppointmentConfirmationEmailProps {
  customerName: string;
  garageName: string;
  appointmentDate: string;
  appointmentTime: string;
  vehicleInfo: string;
  serviceNotes: string;
}

export const AppointmentConfirmationEmail = ({
  customerName = "Khách hàng",
  garageName = "AutoCare Garage",
  appointmentDate = "01/01/2027",
  appointmentTime = "08:00",
  vehicleInfo = "Xe oto",
  serviceNotes = "Bảo dưỡng định kỳ",
}: AppointmentConfirmationEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Xác nhận lịch hẹn tại {garageName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Xác nhận Lịch hẹn</Heading>
          <Text style={text}>Xin chào {customerName},</Text>
          <Text style={text}>
            Lịch hẹn của bạn tại <strong>{garageName}</strong> đã được xác nhận thành công.
          </Text>

          <Section style={detailsContainer}>
            <Text style={detailsText}>
              <strong>Thời gian:</strong> {appointmentTime} - {appointmentDate}
            </Text>
            <Text style={detailsText}>
              <strong>Xe:</strong> {vehicleInfo}
            </Text>
            <Text style={detailsText}>
              <strong>Dịch vụ yêu cầu:</strong> {serviceNotes}
            </Text>
          </Section>

          <Text style={text}>
            Vui lòng đến đúng giờ để gara có thể phục vụ bạn tốt nhất. Nếu bạn cần thay đổi lịch hẹn, vui lòng liên hệ trực tiếp với gara.
          </Text>

          <Hr style={hr} />
          
          <Text style={footer}>
            Email này được gửi tự động từ hệ thống AutoCare. Cảm ơn bạn đã tin tưởng sử dụng dịch vụ của chúng tôi!
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default AppointmentConfirmationEmail;

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
  maxWidth: "600px",
};

const h1 = {
  color: "#1e293b",
  fontSize: "24px",
  fontWeight: "bold",
  padding: "0 48px",
  margin: "30px 0",
};

const text = {
  color: "#334155",
  fontSize: "16px",
  lineHeight: "24px",
  padding: "0 48px",
};

const detailsContainer = {
  backgroundColor: "#f8fafc",
  padding: "24px",
  margin: "24px 48px",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
};

const detailsText = {
  color: "#1e293b",
  fontSize: "15px",
  lineHeight: "22px",
  margin: "8px 0",
};

const hr = {
  borderColor: "#e2e8f0",
  margin: "20px 0",
};

const footer = {
  color: "#64748b",
  fontSize: "12px",
  lineHeight: "16px",
  padding: "0 48px",
};
