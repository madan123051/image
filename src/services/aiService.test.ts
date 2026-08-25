import { createSeedData, DEMO_USER_ID } from '../data/seed';
import { LocalRulesAIProvider } from './aiService';

describe('AI service abstraction', () => {
  it('parses natural-language quick add into a confirmation preview', async () => {
    const data = createSeedData();
    const preferences = data.preferences.find((item) => item.userId === DEMO_USER_ID);
    expect(preferences).toBeDefined();
    if (!preferences) return;
    const provider = new LocalRulesAIProvider();
    const preview = await provider.parseQuickAdd('Tomorrow 3 PM doctor appointment, remind me 1 hour before.', {
      events: data.events,
      tasks: data.tasks,
      routines: data.routines,
      preferences,
    });
    expect(preview.title).toBe('Doctor appointment');
    expect(preview.startTime).toBe('15:00');
    expect(preview.reminderMinutes).toBe(60);
  });
});
