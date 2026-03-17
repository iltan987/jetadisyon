import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  pixelBasedPreset,
  Preview,
  render,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';

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
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
          theme: {
            extend: {
              fontFamily: {
                sans: [
                  '-apple-system',
                  'BlinkMacSystemFont',
                  '"Segoe UI"',
                  'Roboto',
                  'Helvetica',
                  'Arial',
                  'sans-serif',
                ],
              },
            },
          },
        }}
      >
        <Body className="bg-[#f6f9fc] font-sans">
          <Container className="mx-auto max-w-[560px] rounded-[8px] bg-white px-5 py-10">
            <Heading className="mt-0 mb-6 text-center text-2xl font-semibold text-[#1a1a1a]">
              JetAdisyon
            </Heading>
            <Text className="mt-0 mb-4 text-base leading-6 text-[#4a4a4a]">
              <strong>{tenantName}</strong> isimli işletmeye davet edildiniz.
            </Text>
            <Text className="mt-0 mb-4 text-base leading-6 text-[#4a4a4a]">
              Hesabınızı aktifleştirmek için aşağıdaki butona tıklayarak
              şifrenizi belirleyin.
            </Text>
            <Section className="my-6 text-center">
              <Button
                className="rounded-[6px] bg-[#0f172a] px-6 py-3 text-center text-base font-semibold text-white no-underline"
                href={inviteLink}
              >
                Şifreni Belirle
              </Button>
            </Section>
            <Hr className="my-6 border-[#e6e6e6]" />
            <Text className="m-0 text-[13px] leading-5 text-[#8c8c8c]">
              Bu bağlantı 1 saat süreyle geçerlidir. Süre dolduysa
              yöneticinizden yeni bir davet isteyebilirsiniz.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export async function renderInvitationEmail(
  props: InvitationEmailProps,
): Promise<string> {
  return render(<InvitationEmail {...props} />);
}
