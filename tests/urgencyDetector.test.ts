import { describe, it, expect } from 'vitest';
import { analyzeUrgency, getPriorityName, combinePriority } from '../src/urgencyDetector.js';

describe('urgencyDetector', () => {
  describe('analyzeUrgency', () => {
    it('should detect urgent keywords and return priority 1', () => {
      const result = analyzeUrgency(
        'This is URGENT! We need help ASAP, the system is down!',
        'URGENT: Server Down'
      );
      
      expect(result.suggestedPriority).toBe(1);
      expect(result.score).toBeGreaterThanOrEqual(60);
      expect(result.keywords).toContain('urgent');
      expect(result.keywords).toContain('asap');
    });

    it('should detect high priority keywords', () => {
      const result = analyzeUrgency(
        'We have an important deadline tomorrow and the feature is blocking us.',
        'Blocking issue'
      );
      
      expect(result.suggestedPriority).toBeLessThanOrEqual(2);
      expect(result.keywords).toContain('important');
      expect(result.keywords).toContain('blocking');
    });

    it('should detect business impact keywords', () => {
      const result = analyzeUrgency(
        'Customers affected and we are losing revenue. This is impacting production.',
        'Production Issue'
      );
      
      expect(result.suggestedPriority).toBeLessThanOrEqual(2);
      expect(result.keywords).toContain('revenue');
      expect(result.keywords).toContain('losing');
      expect(result.keywords).toContain('production');
    });

    it('should detect security-related urgency', () => {
      const result = analyzeUrgency(
        'We found a security vulnerability that could lead to a breach.',
        'Security Alert'
      );
      
      expect(result.suggestedPriority).toBeLessThanOrEqual(2);
      expect(result.keywords).toContain('security');
      expect(result.keywords).toContain('vulnerability');
    });

    it('should detect panic patterns (caps, exclamation marks)', () => {
      const result = analyzeUrgency(
        'PLEASE HELP!!! The system crashed and we cannot access anything!!!',
        'HELP NEEDED!!!'
      );
      
      expect(result.suggestedPriority).toBeLessThanOrEqual(2);
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    it('should detect time-sensitive patterns', () => {
      const result = analyzeUrgency(
        'We need this fixed today. The deadline is end of day.',
        'Need fix today'
      );
      
      expect(result.suggestedPriority).toBeLessThanOrEqual(3);
      expect(result.reasons.some(r => r.toLowerCase().includes('today'))).toBe(true);
    });

    it('should return low priority for non-urgent messages', () => {
      const result = analyzeUrgency(
        'When you have time, could you look into this? No rush at all. Just a nice to have feature for the future.',
        'Feature request - low priority'
      );
      
      expect(result.suggestedPriority).toBeGreaterThanOrEqual(3);
      expect(result.keywords).toContain('no rush');
    });

    it('should return normal priority for neutral messages', () => {
      const result = analyzeUrgency(
        'Hello, I would like to request some changes to our dashboard. The current layout could be improved.',
        'Dashboard changes'
      );
      
      expect(result.suggestedPriority).toBe(3);
    });

    it('should cap score at 100', () => {
      const result = analyzeUrgency(
        'URGENT EMERGENCY CRITICAL ASAP!!! HELP!!! Security breach! Customers affected! Production down! We are LOSING MONEY!!!',
        'EMERGENCY!!!'
      );
      
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should handle empty content gracefully', () => {
      const result = analyzeUrgency('', '');
      
      expect(result.suggestedPriority).toBe(3);
      expect(result.score).toBe(0);
    });
  });

  describe('getPriorityName', () => {
    it('should return correct names', () => {
      expect(getPriorityName(1)).toBe('Urgent');
      expect(getPriorityName(2)).toBe('High');
      expect(getPriorityName(3)).toBe('Normal');
      expect(getPriorityName(4)).toBe('Low');
    });

    it('should default to Normal for unknown values', () => {
      expect(getPriorityName(0)).toBe('Normal');
      expect(getPriorityName(5)).toBe('Normal');
    });
  });

  describe('combinePriority', () => {
    it('should return the more urgent priority', () => {
      expect(combinePriority(3, 1)).toBe(1);
      expect(combinePriority(1, 3)).toBe(1);
      expect(combinePriority(2, 2)).toBe(2);
    });
  });
});
