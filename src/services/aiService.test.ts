import { createSeedData, DEMO_USER_ID } from '../data/seed';
import { LocalRulesAIProvider, quickAddPreviewToDates } from './aiService';

describe('AI service abstraction', () => {
  const createContext = () => {
    const data = createSeedData();
    const preferences = data.preferences.find((item) => item.userId === DEMO_USER_ID);
    expect(preferences).toBeDefined();
    if (!preferences) throw new Error('Seed preferences are required');
    return {
      events: data.events,
      tasks: data.tasks,
      routines: data.routines,
      preferences,
    };
  };

  it('parses natural-language quick add into a confirmation preview', async () => {
    const provider = new LocalRulesAIProvider();
    const preview = await provider.parseQuickAdd(
      'Tomorrow 3 PM doctor appointment, remind me 1 hour before.',
      createContext(),
    );
    expect(preview.title).toBe('Doctor appointment');
    expect(preview.startTime).toBe('15:00');
    expect(preview.reminderMinutes).toBe(60);
  });

  it('rolls an event ending after midnight into the next day', async () => {
    const provider = new LocalRulesAIProvider();
    const preview = await provider.parseQuickAdd('Tomorrow 11:30 PM stargazing', createContext());
    const dates = quickAddPreviewToDates(preview);

    expect(preview.startTime).toBe('23:30');
    expect(preview.endTime).toBe('00:30');
    expect(new Date(dates.end).getTime() - new Date(dates.start).getTime()).toBe(60 * 60 * 1_000);
  });

  it('does not treat an invalid 12-hour time as a parsed time', async () => {
    const provider = new LocalRulesAIProvider();
    const preview = await provider.parseQuickAdd('Tomorrow 99:99 PM impossible appointment', createContext());

    expect(preview.startTime).toBe('09:00');
    expect(preview.title).toContain('99:99 PM');
  });
});
