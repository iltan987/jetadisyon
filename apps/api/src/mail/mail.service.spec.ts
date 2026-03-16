import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';

import { MailService } from './mail.service';

jest.mock('@repo/emails/invitation', () => ({
  renderInvitationEmail: jest.fn().mockResolvedValue('<html>mock</html>'),
}));

const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'mock-id' });
jest.mock('nodemailer', () => {
  return {
    createTransport: jest.fn().mockImplementation(() => ({
      sendMail: mockSendMail,
    })),
  };
});

describe('MailService', () => {
  let service: MailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultVal: unknown) => {
              const config: Record<string, unknown> = {
                SMTP_HOST: 'localhost',
                SMTP_PORT: 54325,
                SMTP_FROM: 'test@jetadisyon.local',
                SMTP_USER: '',
                SMTP_PASS: '',
              };
              return config[key] ?? defaultVal;
            }),
          },
        },
        {
          provide: PinoLogger,
          useValue: { setContext: jest.fn(), info: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
    mockSendMail.mockClear();
  });

  describe('sendInvitationEmail', () => {
    it('should send invitation email with rendered HTML', async () => {
      await service.sendInvitationEmail(
        'owner@test.com',
        'http://localhost:3001/auth/accept-invite?token_hash=abc&type=invite',
        'Test Restaurant',
      );

      expect(mockSendMail).toHaveBeenCalledWith({
        from: 'test@jetadisyon.local',
        to: 'owner@test.com',
        subject: 'JetAdisyon - Test Restaurant davetiyesi',
        html: '<html>mock</html>',
      });
    });
  });
});
