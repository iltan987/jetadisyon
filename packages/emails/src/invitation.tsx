import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import { render } from '@react-email/components';

interface InvitationEmailProps {
  inviteLink: string;
  tenantName: string;
}

export function InvitationEmail({
  inviteLink,
  tenantName,
}: InvitationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>JetAdisyon - {tenantName} davetiyesi</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>JetAdisyon</Heading>
          <Text style={text}>
            <strong>{tenantName}</strong> isimli işletmeye davet edildiniz.
          </Text>
          <Text style={text}>
            Hesabınızı aktifleştirmek için aşağıdaki butona tıklayarak şifrenizi
            belirleyin.
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={inviteLink}>
              Şifreni Belirle
            </Button>
          </Section>
          <Hr style={hr} />
          <Text style={footerText}>
            Bu bağlantı 1 saat süreyle geçerlidir. Süre dolduysa yöneticinizden
            yeni bir davet isteyebilirsiniz.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export async function renderInvitationEmail(
  props: InvitationEmailProps,
): Promise<string> {
  return render(<InvitationEmail {...props} />);
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '560px',
  borderRadius: '8px',
};

const heading = {
  fontSize: '24px',
  fontWeight: '600' as const,
  color: '#1a1a1a',
  textAlign: 'center' as const,
  margin: '0 0 24px',
};

const text = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#4a4a4a',
  margin: '0 0 16px',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '24px 0',
};

const button = {
  backgroundColor: '#0f172a',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  textAlign: 'center' as const,
  padding: '12px 24px',
};

const hr = {
  borderColor: '#e6e6e6',
  margin: '24px 0',
};

const footerText = {
  fontSize: '13px',
  lineHeight: '20px',
  color: '#8c8c8c',
  margin: '0',
};
