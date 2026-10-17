import { Redirect } from 'expo-router';

// Staff passes are scanned (or typed) on the one scanner now: /scan-verify already
// recognises staff QR codes and codes. This route stays so old links still open.
export default function StaffScanRedirect() {
    return <Redirect href="/scan-verify" />;
}
