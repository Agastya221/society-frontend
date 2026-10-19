import { AppAlert } from '@/components/ui/AppAlert';

/**
 * A group arrived together: ask how many the resident lets in. One person goes straight through.
 * onChoose(undefined) means everyone; onChoose(n) means only n.
 */
export function chooseHowManyToAllow(
  visitor: { name?: string | null; peopleCount?: number | null },
  onChoose: (count?: number) => void,
): void {
  const total = visitor.peopleCount ?? 1;
  if (total <= 1) {
    onChoose(undefined);
    return;
  }
  const some = Array.from({ length: Math.min(total - 1, 4) }, (_, i) => i + 1).map((n) => ({
    text: n === 1 ? 'Only 1 person' : `Only ${n} people`,
    onPress: () => onChoose(n),
  }));
  AppAlert.show(
    `${visitor.name || 'Visitor'} + ${total - 1} more`,
    `${total} people are at the gate. How many should be let in?`,
    [
      { text: `Let all ${total} in`, onPress: () => onChoose(undefined) },
      ...some,
      { text: 'Cancel', style: 'cancel' },
    ],
  );
}

/** "Rahul + 3 more", or just the name for one person */
export function withGroup(name: string, peopleCount?: number | null): string {
  return peopleCount && peopleCount > 1 ? `${name} + ${peopleCount - 1} more` : name;
}
