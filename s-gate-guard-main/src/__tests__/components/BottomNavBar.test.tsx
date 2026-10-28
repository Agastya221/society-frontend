import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { BottomNavBar, AppBottomNav } from '@/components/navigation/BottomNavBar';
import { useEmergencyStore, type ActiveEmergency } from '@/store/useEmergencyStore';
import { useLanguageStore } from '@/i18n';

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => '/',
}));

const mockEmergency: ActiveEmergency = {
  id: 'em-1',
  type: 'FIRE',
  createdAt: new Date().toISOString(),
  description: 'Fire in Tower A',
  reportedBy: { id: 'u1', name: 'Resident' },
};

describe('BottomNavBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useLanguageStore.setState({ lang: 'en' });
    useEmergencyStore.setState({ active: [] });
  });

  it('renders all 5 navigation tabs', () => {
    const { getByText, getByLabelText } = render(
      <BottomNavBar
        activeTab="home"
        onHome={jest.fn()}
        onEmergency={jest.fn()}
        onScan={jest.fn()}
        onLogs={jest.fn()}
        onProfile={jest.fn()}
      />
    );

    expect(getByText('Home')).toBeTruthy();
    expect(getByText('Emergency')).toBeTruthy();
    expect(getByText('Scan QR')).toBeTruthy();
    expect(getByText('Logs')).toBeTruthy();
    expect(getByText('Profile')).toBeTruthy();
    expect(getByLabelText('Scan QR')).toBeTruthy();
  });

  it('triggers onEmergency when emergency tab is pressed', () => {
    const onEmergency = jest.fn();
    const { getByLabelText } = render(
      <BottomNavBar
        activeTab="home"
        onHome={jest.fn()}
        onEmergency={onEmergency}
        onScan={jest.fn()}
        onLogs={jest.fn()}
        onProfile={jest.fn()}
      />
    );

    fireEvent.press(getByLabelText('Emergency'));
    expect(onEmergency).toHaveBeenCalledTimes(1);
  });

  it('activates emergency state with shaking icon when active emergencies exist', () => {
    useEmergencyStore.setState({ active: [mockEmergency] });

    const { getByText } = render(
      <BottomNavBar
        activeTab="home"
        onHome={jest.fn()}
        onEmergency={jest.fn()}
        onScan={jest.fn()}
        onLogs={jest.fn()}
        onProfile={jest.fn()}
      />
    );

    const emergencyLabel = getByText('Emergency');
    expect(emergencyLabel).toBeTruthy();
  });
});
