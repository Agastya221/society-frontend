import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { WaitingAtGateSection } from '@/components/home/ResidentHomeWidgets';
import type { EntryRequest } from '@/types/api';

const waitingVisitor: EntryRequest = {
  id: 'visitor-1',
  type: 'VISITOR',
  visitorName: 'Amit Kumar',
  status: 'PENDING',
  flatId: 'flat-1',
  gate: 'Gate 1',
  createdAt: new Date(Date.now() - 3 * 60_000).toISOString(),
};

describe('Resident Home waiting-at-gate states', () => {
  it('renders the reassuring empty state without a live indicator', () => {
    const screen = render(
      <WaitingAtGateSection
        requests={[]}
        isLoading={false}
        onAllow={jest.fn()}
        onDecline={jest.fn()}
        onViewAll={jest.fn()}
      />,
    );

    expect(screen.getByText('No visitors waiting right now')).toBeTruthy();
    expect(screen.queryByText('Live')).toBeNull();
  });

  const renderWaiting = () => {
    const onAllow = jest.fn();
    const onDecline = jest.fn();
    const screen = render(
      <WaitingAtGateSection
        requests={[waitingVisitor]}
        isLoading={false}
        onAllow={onAllow}
        onDecline={onDecline}
        onViewAll={jest.fn()}
      />,
    );
    return { screen, onAllow, onDecline };
  };

  it('renders a waiting visitor and wires Allow to the request', () => {
    const { screen, onAllow } = renderWaiting();

    expect(screen.getByText('Live')).toBeTruthy();
    expect(screen.getByText('Amit Kumar')).toBeTruthy();
    expect(screen.getByText('Visitor • Gate 1')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Allow visitor'));
    expect(onAllow).toHaveBeenCalledWith('visitor-1');
  });

  it('wires Decline to the request', () => {
    const { screen, onDecline } = renderWaiting();
    fireEvent.press(screen.getByLabelText('Decline visitor'));
    expect(onDecline).toHaveBeenCalledWith('visitor-1');
  });

  it('ignores a second tap once the card is leaving', () => {
    const { screen, onAllow, onDecline } = renderWaiting();
    fireEvent.press(screen.getByLabelText('Allow visitor'));
    fireEvent.press(screen.getByLabelText('Decline visitor'));
    expect(onAllow).toHaveBeenCalledTimes(1);
    expect(onDecline).not.toHaveBeenCalled();
  });
});
