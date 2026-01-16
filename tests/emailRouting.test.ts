import { describe, it, expect } from 'vitest';
import { 
  extractEmailMetadata, 
  extractDomain, 
  getSourceLabels, 
  getTargetProjectId,
  getClientLabelName,
  shouldCreateClientLabel,
  PROJECT_IDS
} from '../src/emailRouting.js';

describe('emailRouting', () => {
  describe('extractDomain', () => {
    it('should extract domain from email', () => {
      expect(extractDomain('test@example.com')).toBe('example.com');
      expect(extractDomain('user@weapply.se')).toBe('weapply.se');
    });

    it('should handle empty or invalid input', () => {
      expect(extractDomain('')).toBe('');
      expect(extractDomain('invalid')).toBe('');
    });

    it('should clean trailing characters', () => {
      expect(extractDomain('test@example.com)')).toBe('example.com');
      expect(extractDomain('test@example.com>')).toBe('example.com');
    });
  });

  describe('extractEmailMetadata', () => {
    it('should detect internal sender with Linear markdown format', () => {
      const content = 'From: [Pelle Nyman](mailto:pelle@weapply.se)\nTo: [pm](mailto:pm@weapply.se)\n\nHello, this is a test.';
      const result = extractEmailMetadata(content, 'Test Email');
      
      expect(result.senderEmail).toBe('pelle@weapply.se');
      expect(result.senderDomain).toBe('weapply.se');
      expect(result.isInternal).toBe(true);
      expect(result.isForwarded).toBe(false);
      expect(result.assignToEmail).toBe('pelle@weapply.se');
    });

    it('should detect external sender', () => {
      const content = 'From: [Client](mailto:client@acme.com)\nTo: [pm](mailto:pm@weapply.se)\n\nHello from client.';
      const result = extractEmailMetadata(content, 'Client Request');
      
      expect(result.senderEmail).toBe('client@acme.com');
      expect(result.senderDomain).toBe('acme.com');
      expect(result.isInternal).toBe(false);
      expect(result.isExternalDirect).toBe(true);
      expect(result.clientDomain).toBe('acme.com');
    });

    it('should detect forwarded email from title', () => {
      const content = 'From: [Pelle](mailto:pelle@weapply.se)\n\n---------- Forwarded message ----------\nFrom: [Client](mailto:client@bigcorp.com)';
      const result = extractEmailMetadata(content, 'Fwd: Client Request');
      
      expect(result.isForwarded).toBe(true);
      expect(result.forwarderEmail).toBe('pelle@weapply.se');
      expect(result.forwarderDomain).toBe('weapply.se');
    });

    it('should detect forwarded email from content', () => {
      const content = 'From: [Pelle](mailto:pelle@weapply.se)\n\n---------- Forwarded message ----------\nFrom: [Client](mailto:client@bigcorp.com)\n\nOriginal content';
      const result = extractEmailMetadata(content, 'Test');
      
      expect(result.isForwarded).toBe(true);
    });

    it('should classify internal forward correctly', () => {
      const content = 'From: [Pelle](mailto:pelle@weapply.se)\n\n---------- Forwarded message ----------\nFrom: [John](mailto:john@client.com)';
      const result = extractEmailMetadata(content, 'Fwd: Request');
      
      expect(result.isInternalForward).toBe(true);
      expect(result.forwarderDomain).toBe('weapply.se');
      expect(result.assignToEmail).toBe('pelle@weapply.se');
    });

    it('should handle Linear markdown email format', () => {
      const content = 'From: [Pelle Nyman](mailto:pelle@weapply.se)\nTo: [pm](mailto:pm@weapply.se)';
      const result = extractEmailMetadata(content, 'Test');
      
      expect(result.senderEmail).toBe('pelle@weapply.se');
    });

    it('should not assign client domain for internal domain', () => {
      const content = 'From: [Pelle](mailto:pelle@weapply.se)\nTo: [pm](mailto:pm@weapply.se)';
      const result = extractEmailMetadata(content, 'Test');
      
      expect(result.clientDomain).toBeUndefined();
    });

    it('should handle fallback to raw emails in content', () => {
      const content = 'Some content with pelle@weapply.se in the body';
      const result = extractEmailMetadata(content, 'Test');
      
      expect(result.senderEmail).toBe('pelle@weapply.se');
      expect(result.senderDomain).toBe('weapply.se');
    });
  });

  describe('getSourceLabels', () => {
    it('should return Internal Forward label', () => {
      const metadata = {
        senderEmail: 'pelle@weapply.se',
        senderDomain: 'weapply.se',
        isForwarded: true,
        isInternal: true,
        isInternalForward: true,
        isExternalDirect: false,
        forwarderDomain: 'weapply.se',
      } as any;
      
      expect(getSourceLabels(metadata)).toEqual(['Request Source → Internal Forward']);
    });

    it('should return External Direct label', () => {
      const metadata = {
        senderEmail: 'client@acme.com',
        senderDomain: 'acme.com',
        isForwarded: false,
        isInternal: false,
        isInternalForward: false,
        isExternalDirect: true,
      } as any;
      
      expect(getSourceLabels(metadata)).toEqual(['Request Source → External Direct']);
    });

    it('should return Forwarded label for external forwards', () => {
      const metadata = {
        senderEmail: 'someone@other.com',
        senderDomain: 'other.com',
        isForwarded: true,
        isInternal: false,
        isInternalForward: false,
        isExternalDirect: false,
      } as any;
      
      expect(getSourceLabels(metadata)).toEqual(['Request Source → Forwarded']);
    });

    it('should return Email label as default', () => {
      const metadata = {
        senderEmail: 'pelle@weapply.se',
        senderDomain: 'weapply.se',
        isForwarded: false,
        isInternal: true,
        isInternalForward: false,
        isExternalDirect: false,
      } as any;
      
      expect(getSourceLabels(metadata)).toEqual(['Request Source → Email']);
    });
  });

  describe('getTargetProjectId', () => {
    it('should route internal non-forwarded to Mail Inbox', () => {
      const metadata = {
        isInternal: true,
        isForwarded: false,
        isInternalForward: false,
        isExternalDirect: false,
      } as any;
      
      expect(getTargetProjectId(metadata, false)).toBe(PROJECT_IDS.MAIL_INBOX);
    });

    it('should route internal forward with client to Clients', () => {
      const metadata = {
        isInternal: false,
        isForwarded: true,
        isInternalForward: true,
        isExternalDirect: false,
        clientDomain: 'acme.com',
      } as any;
      
      expect(getTargetProjectId(metadata, true)).toBe(PROJECT_IDS.CLIENTS);
    });

    it('should route external direct with client to Clients', () => {
      const metadata = {
        isInternal: false,
        isForwarded: false,
        isInternalForward: false,
        isExternalDirect: true,
        clientDomain: 'acme.com',
      } as any;
      
      expect(getTargetProjectId(metadata, true)).toBe(PROJECT_IDS.CLIENTS);
    });

    it('should route external without client to External', () => {
      const metadata = {
        isInternal: false,
        isForwarded: false,
        isInternalForward: false,
        isExternalDirect: true,
        clientDomain: undefined,
      } as any;
      
      expect(getTargetProjectId(metadata, false)).toBe(PROJECT_IDS.EXTERNAL);
    });
  });

  describe('getClientLabelName', () => {
    it('should create label from domain', () => {
      expect(getClientLabelName('acme.com')).toBe('Client: acme.com');
    });

    it('should strip www prefix', () => {
      expect(getClientLabelName('www.acme.com')).toBe('Client: acme.com');
    });
  });

  describe('shouldCreateClientLabel', () => {
    it('should return true for business domains', () => {
      expect(shouldCreateClientLabel('acme.com')).toBe(true);
      expect(shouldCreateClientLabel('bigcorp.io')).toBe(true);
      expect(shouldCreateClientLabel('client.se')).toBe(true);
    });

    it('should return false for internal domain', () => {
      expect(shouldCreateClientLabel('weapply.se')).toBe(false);
    });

    it('should return false for personal email providers', () => {
      expect(shouldCreateClientLabel('gmail.com')).toBe(false);
      expect(shouldCreateClientLabel('hotmail.com')).toBe(false);
      expect(shouldCreateClientLabel('yahoo.com')).toBe(false);
      expect(shouldCreateClientLabel('outlook.com')).toBe(false);
      expect(shouldCreateClientLabel('icloud.com')).toBe(false);
    });

    it('should return false for empty domain', () => {
      expect(shouldCreateClientLabel('')).toBe(false);
    });
  });
});
