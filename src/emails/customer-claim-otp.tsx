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
} from "@react-email/components";
import * as React from "react";

interface CustomerClaimOtpEmailProps {
  code: string;
  minutes: number;
}

/** One-time code proving control of the email stored on a garage customer record. */
export const CustomerClaimOtpEmail = ({
  code = "000000",
  minutes = 10,
}: CustomerClaimOtpEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Mã xác thực liên kết hồ sơ AutoCare</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Xác thực liên kết hồ sơ</Heading>
          <Text style={text}>
            Bạn (hoặc ai đó) vừa yêu cầu liên kết hồ sơ khách hàng có sẵn tại gara
            với số điện thoại này vào tài khoản AutoCare.
          </Text>

          <Section style={codeContainer}>
            <Text style={codeText}>{code}</Text>
          </Section>

          <Text style={text}>
            Mã có hiệu lực trong <strong>{minutes} phút</strong>. Nếu bạn không yêu
            cầu, hãy bỏ qua email này — hồ sơ của bạn sẽ không bị thay đổi.
          </Text>

          <Hr style={hr} />
          <Text style={footer}>
            Email này được gửi tự động từ hệ thống AutoCare.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default CustomerClaimOtpEmail;

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
  fontSize: "22px",
  fontWeight: "bold",
  padding: "0 48px",
  margin: "30px 0",
};

const text = {
  color: "#334155",
  fontSize: "15px",
  lineHeight: "24px",
  padding: "0 48px",
};

const codeContainer = {
  backgroundColor: "#eff6ff",
  border: "1px solid #bfdbfe",
  borderRadius: "12px",
  padding: "16px",
  margin: "24px 48px",
  textAlign: "center" as const,
};

const codeText = {
  color: "#1d4ed8",
  fontSize: "32px",
  fontWeight: "bold",
  letterSpacing: "10px",
  margin: "0",
  fontFamily: "monospace",
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
