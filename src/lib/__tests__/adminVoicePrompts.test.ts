import { describe, it, expect } from 'vitest';
import { getAdminVoicePrompt } from '../adminVoicePrompts';

describe('getAdminVoicePrompt', () => {
  it('includes admin name and store name in the prompt', () => {
    const prompt = getAdminVoicePrompt('Jean', 'Eco CBD');
    expect(prompt).toContain('Jean');
    expect(prompt).toContain('Eco CBD');
  });

  it("includes today's date in French long format", () => {
    const prompt = getAdminVoicePrompt('Admin', 'Shop');
    const today = new Date().toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    expect(prompt).toContain(today);
  });

  it('defines the assistant persona as Manon', () => {
    const prompt = getAdminVoicePrompt('Admin', 'Shop');
    expect(prompt).toContain('Manon');
  });

  it('enforces French-only, no markdown constraints', () => {
    const prompt = getAdminVoicePrompt('Admin', 'Shop');
    expect(prompt).toContain('Langue française uniquement');
    expect(prompt).toContain('Zéro markdown');
  });

  it('lists all 9 available tools', () => {
    const prompt = getAdminVoicePrompt('Admin', 'Shop');
    const expectedTools = [
      'query_dashboard',
      'search_orders',
      'search_customers',
      'check_stock',
      'search_products',
      'update_order_status',
      'update_customer_points',
      'navigate_admin',
      'close_session',
    ];
    for (const tool of expectedTools) {
      expect(prompt).toContain(tool);
    }
  });

  it('documents customer_name parameter for search_orders', () => {
    const prompt = getAdminVoicePrompt('Admin', 'Shop');
    expect(prompt).toContain('customer_name');
  });

  it('documents both add and set modes for update_customer_points', () => {
    const prompt = getAdminVoicePrompt('Admin', 'Shop');
    expect(prompt).toContain("mode \"add\"");
    expect(prompt).toContain("mode \"set\"");
  });

  it('documents all navigate_admin tab values', () => {
    const prompt = getAdminVoicePrompt('Admin', 'Shop');
    const expectedTabs = ['dashboard', 'orders', 'products', 'customers', 'stock', 'analytics'];
    for (const tab of expectedTabs) {
      expect(prompt).toContain(`"${tab}"`);
    }
  });

  it('returns a non-empty string for empty names', () => {
    const prompt = getAdminVoicePrompt('', '');
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(100);
  });
});
