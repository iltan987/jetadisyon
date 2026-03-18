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

interface PasswordResetEmailProps {
  resetLink: string;
}

export function PasswordResetEmail({ resetLink }: PasswordResetEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>JetAdisyon - Şifre Sıfırlama</Preview>
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
              Şifrenizi sıfırlamak için aşağıdaki butona tıklayın.
            </Text>
            <Text className="mt-0 mb-4 text-base leading-6 text-[#4a4a4a]">
              Bu işlemi siz talep etmediyseniz bu e-postayı görmezden
              gelebilirsiniz.
            </Text>
            <Section className="my-6 text-center">
              <Button
                className="rounded-[6px] bg-[#0f172a] px-6 py-3 text-center text-base font-semibold text-white no-underline"
                href={resetLink}
              >
                Şifremi Sıfırla
              </Button>
            </Section>
            <Hr className="my-6 border-[#e6e6e6]" />
            <Text className="m-0 text-[13px] leading-5 text-[#8c8c8c]">
              Şifre sıfırlama bağlantısı geçerlilik süresi 1 saattir.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export async function renderPasswordResetEmail(
  props: PasswordResetEmailProps,
): Promise<string> {
  return render(<PasswordResetEmail {...props} />);
}
