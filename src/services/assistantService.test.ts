import { createSeedData, DEMO_USER_ID } from '../data/seed';
import { assistantRequestSchema } from './assistantSchema';
import { buildAssistantContext } from './assistantService';

describe('assistant service', () => {
  it('builds a bounded user-scoped context without private event details', () => {
    const data = createSeedData();
    data.events[0].notes = 'private note';
    data.events[0].participants = [{ id: 'p1', name: 'Someone', email: 'private@example.com', response: 'accepted' }];
    data.events.push({ ...data.events[0], id: 'other-event', userId: 'other-user' });

    const context = buildAssistantContext(data, DEMO_USER_ID, new Date('2026-08-26T00:00:00.000Z'));

    expect(context.now).toBe('2026-08-26T00:00:00.000Z');
    expect(context.events.some((event) => event.id === 'other-event')).toBe(false);
    expect(context.events[0]).not.toHaveProperty('notes');
    expect(context.events[0]).not.toHaveProperty('participants');
    expect(context.events[0]).not.toHaveProperty('attachments');
    expect(assistantRequestSchema.safeParse({ prompt: 'Plan my week', context }).success).toBe(true);
  });

  it('rejects oversized and empty prompts before they reach the assistant provider', () => {
    const context = buildAssistantContext(createSeedData(), DEMO_USER_ID);
    expect(assistantRequestSchema.safeParse({ prompt: '', context }).success).toBe(false);
    expect(assistantRequestSchema.safeParse({ prompt: 'x'.repeat(2_001), context }).success).toBe(false);
  });
});
