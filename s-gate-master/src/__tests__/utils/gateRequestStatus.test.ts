import { gateRequestStatus, isGatePushType } from '@/utils/gateRequestStatus';
import { onceScheduleIst, toIstParts } from '@/utils/istTime';

describe('gateRequestStatus', () => {
    it('tells "approved, waiting for the guard" apart from "entered"', () => {
        expect(gateRequestStatus({ status: 'APPROVED', entryId: null }).label).toBe('Approved — waiting for guard');
        expect(gateRequestStatus({ status: 'APPROVED', entryId: 'entry-1' }).label).toBe('Entered');
    });

    it('explains the gate-side endings', () => {
        expect(gateRequestStatus({ status: 'EXPIRED', rejectionReason: 'Visitor left before entering' }).label).toBe('Visitor left without entering');
        expect(gateRequestStatus({ status: 'EXPIRED', rejectionReason: 'Approval expired before arrival' }).label).toBe('Approval expired — visitor never arrived');
        expect(gateRequestStatus({ status: 'EXPIRED', rejectionReason: null }).label).toBe('Expired — no answer in time');
        expect(gateRequestStatus({ status: 'REJECTED', rejectionReason: 'Cancelled by guard' }).label).toBe('Withdrawn by the gate');
    });

    it('shows a resident denial with its reason', () => {
        expect(gateRequestStatus({ status: 'REJECTED', rejectionReason: 'Not expecting anyone' })).toEqual({
            label: 'Denied', tone: 'denied', detail: 'Not expecting anyone',
        });
    });

    it('recognises every gate push type', () => {
        for (const type of ['GATE_REQUEST', 'GATE_APPROVED', 'GATE_DENIED', 'GATE_EXPIRED']) expect(isGatePushType(type)).toBe(true);
        expect(isGatePushType('ONBOARDING_STATUS')).toBe(false);
        expect(isGatePushType(undefined)).toBe(false);
    });
});

describe('IST schedule', () => {
    it('uses the IST calendar date, not the UTC one, just after midnight IST', () => {
        // 00:30 IST on 17 Oct = 19:00 UTC on 16 Oct
        expect(toIstParts('2026-10-16T19:00:00.000Z')).toEqual({ date: '2026-10-17', time: '00:30' });
    });

    it('builds date/startTime/endTime in IST', () => {
        expect(onceScheduleIst({ validFrom: '2026-10-16T19:00:00.000Z', validUntil: '2026-10-16T21:00:00.000Z' }))
            .toEqual({ date: '2026-10-17', startTime: '00:30', endTime: '02:30' });
    });
});
