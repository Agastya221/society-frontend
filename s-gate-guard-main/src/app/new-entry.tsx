import { GiantButton } from '@/components/gate/GiantButton';
import { useKeyboardHeight } from '@/components/gate/useKeyboardHeight';
import { VoiceNameInput } from '@/components/gate/VoiceNameInput';
import { PassPicker } from '@/components/gate/PassPicker';
import { Pressy } from '@/components/gate/Pressy';
import { ResultScreen } from '@/components/gate/ResultScreen';
import { ListedPass, Match, conflictTitle } from '@/components/PreApprovedPass';
import { GuardColors, GuardFonts, GuardTouch, GuardType, guardShadow } from '@/constants/theme';
import { useT } from '@/i18n';
import api from '@/services/api';
import { loadFlatDirectory, type GuardFlat } from '@/services/flatDirectory';
import { useAuthStore } from '@/store/useAuthStore';
import { toEnglishName } from '@/utils/englishName';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    BackHandler,
    Linking,
    Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { backOrHome } from '@/utils/navigation';

// ─── Constants ────────────────────────────────────────────────────────────────

type VType = 'GUEST' | 'DELIVERY' | 'CAB' | 'HELP' | 'SERVICE' | 'OTHER';

const VISITOR_TYPES: { type: VType; labelKey: string; icon: keyof typeof Ionicons.glyphMap; tint: string; bg: string; apiValue: string }[] = [
    { type: 'GUEST',    labelKey: 'common.guest',    icon: 'person',                    tint: '#3B82F6', bg: '#EBF3FF', apiValue: 'VISITOR' },
    { type: 'DELIVERY', labelKey: 'common.delivery', icon: 'cube',                      tint: '#F59E0B', bg: '#FFF4DC', apiValue: 'DELIVERY' },
    { type: 'CAB',      labelKey: 'common.cab',      icon: 'car',                       tint: '#10B981', bg: '#E5FBF3', apiValue: 'CAB' },
    { type: 'HELP',     labelKey: 'common.help',     icon: 'construct',                 tint: '#8657E8', bg: '#F1EBFF', apiValue: 'VISITOR' },
    { type: 'SERVICE',  labelKey: 'common.service',  icon: 'build',                     tint: '#EC4899', bg: '#FFEAF4', apiValue: 'VENDOR' },
    { type: 'OTHER',    labelKey: 'common.other',    icon: 'ellipsis-horizontal-circle', tint: '#6B7280', bg: '#F3F4F6', apiValue: 'VISITOR' },
];

/** Visitor kinds a resident can pre-approve; for these the guard checks for a pass before bothering the resident. */
const PRE_APPROVABLE: Partial<Record<VType, 'CAB' | 'DELIVERY' | 'HELP'>> = { CAB: 'CAB', DELIVERY: 'DELIVERY', SERVICE: 'HELP' };

type ServiceCategory = 'PLUMBER' | 'ELECTRICIAN' | 'APPLIANCE_REPAIR' | 'PEST_CONTROL' | 'CARPENTER' | 'PAINTER' | 'COOK' | 'TUTOR' | 'FITNESS_TRAINER' | 'BEAUTICIAN' | 'PHYSIOTHERAPIST' | 'OTHER';
const SERVICE_CATEGORIES: ServiceCategory[] = [
    'PLUMBER', 'ELECTRICIAN', 'APPLIANCE_REPAIR', 'PEST_CONTROL',
    'CARPENTER', 'PAINTER', 'COOK', 'TUTOR',
    'FITNESS_TRAINER', 'BEAUTICIAN', 'PHYSIOTHERAPIST', 'OTHER',
];

type ProviderTag = 'SWIGGY' | 'ZOMATO' | 'AMAZON' | 'BLINKIT' | 'FLIPKART' | 'BIGBASKET' | 'DUNZO' | 'OTHER';

const PROVIDERS: { tag: ProviderTag; label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { tag: 'SWIGGY',    label: 'Swiggy',     color: '#FF6B00', bg: '#FFF4EE', icon: 'flame' },
    { tag: 'ZOMATO',    label: 'Zomato',     color: '#E23744', bg: '#FFF0F1', icon: 'restaurant' },
    { tag: 'AMAZON',    label: 'Amazon',     color: '#FF9900', bg: '#FFFBF0', icon: 'logo-amazon' },
    { tag: 'BLINKIT',   label: 'Blinkit',    color: '#D9A400', bg: '#FDFBE9', icon: 'flash' },
    { tag: 'FLIPKART',  label: 'Flipkart',   color: '#2874F0', bg: '#EEF4FF', icon: 'cart' },
    { tag: 'BIGBASKET', label: 'BigBasket',  color: '#84C225', bg: '#F3FBEA', icon: 'basket' },
    { tag: 'DUNZO',     label: 'Dunzo',      color: '#00A8B0', bg: '#E6FAFB', icon: 'bicycle' },
    { tag: 'OTHER',     label: '',           color: '#6B7280', bg: '#F3F4F6', icon: 'cube-outline' },
];

type FlatResult = GuardFlat;

type Step = 1 | 2;

type PrePhase =
    | { kind: 'form' }
    | { kind: 'checking' }
    | { kind: 'pass'; matches: Match[]; message?: string }
    | { kind: 'allowed'; match: Match }
    | { kind: 'denied'; title?: string; message: string };

// Keep the most recently selected units available while the guard app is open.
// This makes a queue for the same building much faster without another API call.
let recentFlatsCache: FlatResult[] = [];
let recentGuardId: string | null = null;

async function uploadEntryPhoto(uri: string, signal?: AbortSignal): Promise<string> {
    const localResponse = await fetch(uri, { signal });
    const blob = await localResponse.blob();
    const mimeType = blob.type || 'image/jpeg';
    const fileName = `visitor-${Date.now()}.jpg`;
    const presigned = await api.post('/api/v1/upload/presigned-url', {
        context: 'entry-photo',
        fileName,
        mimeType,
        fileSize: blob.size,
    }, { signal });
    const { uploadUrl, s3Key } = presigned.data?.data ?? {};
    if (!uploadUrl || !s3Key) throw new Error('Photo upload could not be prepared');

    const uploaded = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': mimeType },
        body: blob,
        signal,
    });
    if (!uploaded.ok) throw new Error('Photo upload failed');
    return s3Key;
}

/** How long Notify waits on a still-running background upload, and on the one retry. */
const PHOTO_WAIT_MS = 15_000;

/** Resolves to the promise's value, or null if it takes longer than `ms`. */
function settleWithin<T>(promise: Promise<T | null>, ms: number): Promise<T | null> {
    return new Promise((resolve) => {
        const timer = setTimeout(() => resolve(null), ms);
        promise.then(
            (value) => { clearTimeout(timer); resolve(value); },
            () => { clearTimeout(timer); resolve(null); },
        );
    });
}

/** One upload attempt that gives up after PHOTO_WAIT_MS; null on any failure. */
async function uploadWithTimeout(uri: string): Promise<string | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PHOTO_WAIT_MS);
    try {
        return await uploadEntryPhoto(uri, controller.signal);
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

function flatLabel(f: FlatResult): string {
    if (f.flatNumber === 'OFFICE') return 'Admin Office';
    const block = f.block?.name ? `${f.block.name}-` : '';
    return `${block}${f.flatNumber}`;
}

// ─── Camera Modal ─────────────────────────────────────────────────────────────

function CameraModal({
    visible,
    onCapture,
    onClose,
}: {
    visible: boolean;
    onCapture: (uri: string) => void;
    onClose: () => void;
}) {
    const t = useT();
    const insets = useSafeAreaInsets();
    const [permission, requestPermission] = useCameraPermissions();
    const [captured, setCaptured] = useState<string | null>(null);
    const [taking, setTaking] = useState(false);
    const cameraRef = useRef<CameraView>(null);

    // Reset preview every time modal opens
    useEffect(() => {
        if (visible) setCaptured(null);
    }, [visible]);

    const handleCapture = async () => {
        if (!cameraRef.current || taking) return;
        setTaking(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            // ~0.5 keeps a phone photo well under the server's 5 MB upload cap.
            const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, skipProcessing: true });
            if (photo?.uri) setCaptured(photo.uri);
        } finally {
            setTaking(false);
        }
    };

    const handleUse = () => {
        if (captured) { onCapture(captured); onClose(); }
    };

    return (
        <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
            <View style={cam.root}>
                {!permission?.granted ? (
                    <View style={cam.permRoot}>
                        <Ionicons name="camera-outline" size={64} color="#9CA3AF" />
                        <Text style={cam.permTitle}>{t('visitor.cameraTitle')}</Text>
                        <GiantButton
                            label={t('visitor.allowCamera')}
                            icon="camera"
                            onPress={permission && !permission.canAskAgain ? () => Linking.openSettings() : requestPermission}
                        />
                        <TouchableOpacity style={cam.permCancel} onPress={onClose} hitSlop={8}>
                            <Text style={cam.permCancelText}>{t('visitor.notNow')}</Text>
                        </TouchableOpacity>
                    </View>
                ) : captured ? (
                    // Preview
                    <>
                        <Image source={{ uri: captured }} style={StyleSheet.absoluteFill} contentFit="cover" />
                        <View style={[cam.previewActions, { paddingBottom: insets.bottom + 24 }]}>
                            <TouchableOpacity style={cam.retakeBtn} onPress={() => setCaptured(null)} activeOpacity={0.85}>
                                <Ionicons name="refresh" size={24} color="#fff" />
                                <Text style={cam.retakeBtnText}>{t('visitor.retake')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={cam.useBtn} onPress={handleUse} activeOpacity={0.85}>
                                <Ionicons name="checkmark" size={24} color="#fff" />
                                <Text style={cam.useBtnText}>{t('visitor.usePhoto')}</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                ) : (
                    // Live viewfinder
                    <>
                        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
                        <View style={[cam.topBar, { paddingTop: insets.top + 8 }]}>
                            <TouchableOpacity style={cam.closeBtn} onPress={onClose}>
                                <Ionicons name="close" size={28} color="#fff" />
                            </TouchableOpacity>
                            <Text style={cam.topLabel}>{t('visitor.cameraLabel')}</Text>
                            <View style={{ width: GuardTouch.min }} />
                        </View>
                        <View style={[cam.shutterRow, { paddingBottom: insets.bottom + 32 }]}>
                            <TouchableOpacity
                                testID="camera-shutter"
                                style={cam.shutterBtn}
                                onPress={handleCapture}
                                disabled={taking}
                                activeOpacity={0.85}
                            >
                                {taking
                                    ? <ActivityIndicator size="small" color="#1F2937" />
                                    : <View style={cam.shutterInner} />
                                }
                            </TouchableOpacity>
                        </View>
                    </>
                )}
            </View>
        </Modal>
    );
}

// ─── Step header ──────────────────────────────────────────────────────────────

function StepHeader({ step, title, onBack }: { step: Step; title: string; onBack: () => void }) {
    const t = useT();
    const insets = useSafeAreaInsets();
    return (
        <View style={[S.header, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('common.back')} testID="step-back" style={S.backBtn} onPress={onBack} activeOpacity={0.7}>
                <Ionicons name="arrow-back" size={26} color={GuardColors.t1} />
            </TouchableOpacity>
            <Text style={S.headerTitle} numberOfLines={1}>{title}</Text>
            <View style={S.dots}>
                {[1, 2].map((n) => <View key={n} style={[S.dot, n === step && S.dotActive, n < step && S.dotDone]} />)}
            </View>
        </View>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function NewEntryScreen() {
    const t = useT();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const keyboardHeight = useKeyboardHeight();
    const guardId = useAuthStore((state) => state.user?.id ?? 'guard');

    const [step, setStep] = useState<Step>(1);

    // Visitor type
    const [type, setType] = useState<VType>('GUEST');
    const [provider, setProvider] = useState<ProviderTag | null>(null);
    const [serviceCategory, setServiceCategory] = useState<ServiceCategory | null>(null);
    const [helpManual, setHelpManual] = useState(false);
    const [cabStage, setCabStage] = useState<'digits' | 'flat'>('digits');
    const [cabDigits, setCabDigits] = useState('');
    const [cabAmbiguous, setCabAmbiguous] = useState(false);
    const [otherPurpose, setOtherPurpose] = useState('');

    // Flat picking with big keys
    const [flatQuery, setFlatQuery] = useState('');
    const [selectedFlat, setSelectedFlat] = useState<FlatResult | null>(null);
    const detailsScroll = useRef<ScrollView>(null);
    useEffect(() => {
        if (keyboardHeight > 0 && selectedFlat) {
            const timer = setTimeout(() => detailsScroll.current?.scrollToEnd({ animated: true }), 80);
            return () => clearTimeout(timer);
        }
    }, [keyboardHeight, selectedFlat]);
    const [flatResults, setFlatResults] = useState<FlatResult[]>([]);
    const [searchingFlat, setSearchingFlat] = useState(false);
    const [allFlats, setAllFlats] = useState<FlatResult[]>([]);
    const [loadingDirectory, setLoadingDirectory] = useState(false);
    const [showKeypad, setShowKeypad] = useState(false);
    const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
    const [recentFlats, setRecentFlats] = useState<FlatResult[]>(recentFlatsCache);

    useEffect(() => {
        if (recentGuardId !== guardId) {
            recentGuardId = guardId;
            recentFlatsCache = [];
            setRecentFlats([]);
        }
    }, [guardId]);

    useEffect(() => {
        if (step !== 2 || selectedFlat) return;
        let cancelled = false;
        setLoadingDirectory(true);
        loadFlatDirectory(guardId).then((flats) => {
            if (cancelled) return;
            setAllFlats(flats);
            setSelectedBlock((current) => current ?? recentFlatsCache[0]?.block?.name ?? flats[0]?.block?.name ?? '');
        }).catch(() => { if (!cancelled) setShowKeypad(true); })
          .finally(() => { if (!cancelled) setLoadingDirectory(false); });
        return () => { cancelled = true; };
    }, [step, selectedFlat, guardId]);

    const blocks = useMemo(() => [...new Set(allFlats.map((flat) => flat.block?.name ?? ''))], [allFlats]);
    const blockFlats = useMemo(() => allFlats.filter((flat) => (flat.block?.name ?? '') === selectedBlock), [allFlats, selectedBlock]);

    // Visitor name — optional, but residents see "Visitor" when it's left blank.
    const [visitorName, setVisitorName] = useState('');

    // Photo
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [cameraOpen, setCameraOpen] = useState(false);
    const [photoUploading, setPhotoUploading] = useState(false);
    const [photoUploadFailed, setPhotoUploadFailed] = useState(false);
    const photoUploadRef = useRef<{ uri: string; promise: Promise<string | null>; controller: AbortController } | null>(null);

    const handlePhotoCapture = (uri: string) => {
        photoUploadRef.current?.controller.abort();
        setPhotoUri(uri);
        setPhotoUploading(true);
        setPhotoUploadFailed(false);
        const controller = new AbortController();
        const promise = uploadEntryPhoto(uri, controller.signal).catch(() => {
            if (photoUploadRef.current?.uri === uri) setPhotoUploadFailed(true);
            return null;
        }).finally(() => {
            if (photoUploadRef.current?.uri === uri) setPhotoUploading(false);
        });
        photoUploadRef.current = { uri, promise, controller };
    };

    const removePhoto = () => {
        photoUploadRef.current?.controller.abort();
        photoUploadRef.current = null;
        setPhotoUri(null);
        setPhotoUploading(false);
        setPhotoUploadFailed(false);
    };

    // A resident may already have pre-approved this cab / delivery / helper.
    const [pre, setPre] = useState<PrePhase>({ kind: 'form' });
    const [preCheckFailed, setPreCheckFailed] = useState(false);
    const [windows, setWindows] = useState<Record<string, ListedPass>>({});
    const [allowingId, setAllowingId] = useState<string | null>(null);
    const allowRef = useRef(false);

    // Submit — the ref blocks a second tap that lands before `submitting` re-renders.
    const [submitting, setSubmitting] = useState(false);
    const submittingRef = useRef(false);

    // Flat search, run as the guard presses keys.
    useEffect(() => {
        const q = flatQuery.trim();
        if (!q) {
            setFlatResults([]);
            return;
        }
        let cancelled = false;
        const timer = setTimeout(async () => {
            setSearchingFlat(true);
            try {
                const res = await api.get(`/api/v1/gate/flats/search?query=${encodeURIComponent(q)}`);
                if (!cancelled) setFlatResults(res.data?.data ?? []);
            } catch {
                if (!cancelled) setFlatResults([]);
            } finally {
                if (!cancelled) setSearchingFlat(false);
            }
        }, 250);
        return () => { cancelled = true; clearTimeout(timer); setSearchingFlat(false); };
    }, [flatQuery]);

    const reset = useCallback(() => {
        setStep(1);
        setType('GUEST');
        setProvider(null);
        setServiceCategory(null);
        setHelpManual(false);
        setCabStage('digits');
        setCabDigits('');
        setCabAmbiguous(false);
        setOtherPurpose('');
        setFlatQuery('');
        setShowKeypad(false);
        setSelectedFlat(null);
        setFlatResults([]);
        setVisitorName('');
        photoUploadRef.current?.controller.abort();
        setPhotoUri(null);
        photoUploadRef.current = null;
        setPhotoUploading(false);
        setPhotoUploadFailed(false);
        setPre({ kind: 'form' });
        setPreCheckFailed(false);
        setWindows({});
    }, []);

    useEffect(() => () => photoUploadRef.current?.controller.abort(), []);

    const goBack = useCallback(() => {
        if (submittingRef.current || allowRef.current) return true;
        if (pre.kind === 'checking') return true;
        if (pre.kind === 'pass' || pre.kind === 'denied') { setPre({ kind: 'form' }); return true; }
        if (pre.kind === 'allowed') { reset(); return true; }
        if (step === 2 && selectedFlat) { setSelectedFlat(null); return true; }
        if (step === 2 && type === 'CAB' && cabStage === 'flat') { setCabStage('digits'); return true; }
        if (step === 2 && type === 'SERVICE' && serviceCategory) { setServiceCategory(null); return true; }
        if (step === 2 && type === 'HELP' && helpManual) { setHelpManual(false); return true; }
        if (step === 2) { setStep(1); setFlatQuery(''); return true; }
        backOrHome(router);
        return true;
    }, [pre.kind, step, selectedFlat, type, cabStage, serviceCategory, helpManual, reset, router]);

    // Hardware back goes one step back instead of dropping a half-filled visitor.
    useEffect(() => {
        const sub = BackHandler.addEventListener('hardwareBackPress', () => goBack());
        return () => sub.remove();
    }, [goBack]);

    // ── Step 1: who ───────────────────────────────────────────────────────────
    const handlePickType = (v: VType) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setType(v);
        setProvider(null);
        setServiceCategory(null);
        setHelpManual(false);
        setCabStage('digits');
        setCabDigits('');
        setCabAmbiguous(false);
        setOtherPurpose('');
        setPreCheckFailed(false);
        setShowKeypad(false);
        setStep(2);
    };

    const handlePickProvider = (tag: ProviderTag) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setProvider(tag);
        if (selectedFlat) checkForPreApproval(selectedFlat, tag);
    };

    // ── Step 2: flat ──────────────────────────────────────────────────────────
    const checkForPreApproval = async (flat: FlatResult, selectedProvider?: ProviderTag) => {
        const preType = PRE_APPROVABLE[type];
        if (!preType) return;
        setPreCheckFailed(false);
        setPre({ kind: 'checking' });
        try {
            const [res, list] = await Promise.all([
                api.post('/api/v1/guard/pre-approved/validate', {
                    flatId: flat.id,
                    type: preType,
                    ...(type === 'SERVICE' && serviceCategory ? { category: serviceCategory } : {}),
                    ...(type === 'DELIVERY' && selectedProvider && selectedProvider !== 'OTHER' ? { companyName: selectedProvider } : {}),
                }),
                api.get(`/api/v1/guard/pre-approved?type=${preType}&limit=100&flatId=${flat.id}`).catch(() => null),
            ]);
            const rawList = list?.data?.data?.entries;
            const listed: ListedPass[] = Array.isArray(rawList) ? rawList : [];
            setWindows(Object.fromEntries(listed.map((p) => [p.id, p])));
            const result: Match = res.data?.data ?? { allowed: false, isPrivate: false };
            if (result.allowed) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setPre({ kind: 'pass', matches: result.matches?.length ? result.matches : [result], message: result.message?.trim() || undefined });
                return;
            }
        } catch {
            // A network failure is different from a confirmed missing pass.
            setPreCheckFailed(true);
        }
        setPre({ kind: 'form' });
    };

    const handleSelectFlat = (flat: FlatResult) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedFlat(flat);
        recentFlatsCache = [flat, ...recentFlatsCache.filter((item) => item.id !== flat.id)].slice(0, 4);
        setRecentFlats(recentFlatsCache);
        if (type !== 'DELIVERY') checkForPreApproval(flat);
    };

    const checkCabDigits = async () => {
        if (!/^\d{4}$/.test(cabDigits)) return;
        setCabAmbiguous(false);
        setPre({ kind: 'checking' });
        try {
            const res = await api.post('/api/v1/guard/pre-approved/validate', { vehicleLast4: cabDigits });
            const result: Match = res.data?.data ?? { allowed: false, isPrivate: false };
            if (result.allowed) {
                setPre({ kind: 'pass', matches: result.matches?.length ? result.matches : [result], message: result.message?.trim() || undefined });
                return;
            }
            if (result.reason === 'AMBIGUOUS') {
                // Several Safe Pickup passes share these digits: the flat is private, so
                // picking a flat can't help — stay here and ask for the QR instead.
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                setCabAmbiguous(true);
                setPre({ kind: 'form' });
                return;
            }
        } catch { setPreCheckFailed(true); }
        setPre({ kind: 'form' });
        setCabStage('flat');
    };

    const handleAllowPass = useCallback(async (match: Match) => {
        if (!match.entryId || allowRef.current) return;
        allowRef.current = true;
        setAllowingId(match.entryId);
        try {
            await api.post(`/api/v1/guard/pre-approved/${match.entryId}/use`, {});
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setPre({ kind: 'allowed', match });
        } catch (err: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setPre({
                kind: 'denied',
                title: conflictTitle(err) ? t('scan.passUsed') : undefined,
                message: err?.response?.data?.message ?? t('scan.couldNotRecord'),
            });
        } finally {
            allowRef.current = false;
            setAllowingId(null);
        }
    }, [t]);

    // ── Step 3: tell the resident ─────────────────────────────────────────────
    const canSubmit = !!selectedFlat && (type !== 'DELIVERY' || !!provider);

    const handleSubmit = async () => {
        if (!canSubmit || submittingRef.current) return;
        submittingRef.current = true;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSubmitting(true);

        try {
            const vt = VISITOR_TYPES.find((v) => v.type === type)!;
            const payload: Record<string, any> = {
                type: vt.apiValue,
                flatId: selectedFlat!.id,
            };
            if (type === 'DELIVERY' && provider) payload.providerTag = provider;
            if (type === 'SERVICE' && serviceCategory) payload.purpose = serviceCategory.replace(/_/g, ' ');
            if (type === 'HELP') payload.purpose = 'Unregistered daily help';
            if (type === 'CAB' && cabDigits) payload.purpose = `Cab ${cabDigits}`;
            if (type === 'OTHER' && otherPurpose.trim()) payload.purpose = otherPurpose.trim().slice(0, 100);
            const name = toEnglishName(visitorName);
            if (name) payload.visitorName = name.slice(0, 100);

            // The photo never blocks Notify: use the background upload if it finished,
            // otherwise try once more, and if that fails too send without the photo.
            let photoSkipped = false;
            if (photoUri) {
                let key = photoUploadRef.current?.uri === photoUri
                    ? await settleWithin(photoUploadRef.current.promise, PHOTO_WAIT_MS)
                    : null;
                if (!key) key = await uploadWithTimeout(photoUri);
                if (key) payload.photoKey = key;
                else photoSkipped = true;
            }
            const res = await api.post('/api/v1/gate/entry-requests', payload);
            const entryId = res.data?.data?.entryRequest?.id ?? res.data?.data?.id ?? null;

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            router.push({
                pathname: '/entry-waiting' as any,
                params: {
                    id:    entryId ?? '',
                    flat:  flatLabel(selectedFlat!),
                    name:  name,
                    type:  type,
                    photo: photoUri ?? '',
                    ...(photoSkipped ? { photoSkipped: '1' } : {}),
                },
            });
        } catch (err: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert(t('visitor.failed'), err?.response?.data?.message ?? err?.message ?? t('visitor.failedText'));
        } finally {
            submittingRef.current = false;
            setSubmitting(false);
        }
    };

    const typeInfo = VISITOR_TYPES.find((v) => v.type === type)!;
    const passName = (m: Match) => (m.entryId ? windows[m.entryId]?.visitorName : null) ?? m.displayLabel;
    const passFlat = (m: Match) => (m.isPrivate ? t('scan.privateFlat') : m.flatNumber ? `${t('common.flat')} ${m.flatNumber === 'OFFICE' ? t('scan.office') : m.flatNumber}` : undefined);

    // ── Pre-approval results (full screen) ────────────────────────────────────
    if (pre.kind === 'pass' && pre.matches.length > 1) {
        return <PassPicker matches={pre.matches} windows={windows} busy={!!allowingId} onAllow={handleAllowPass} onCancel={goBack} cancelLabel={t('visitor.notifyInstead')} />;
    }
    if (pre.kind === 'pass') {
        const m = pre.matches[0];
        return (
            <ResultScreen
                kind="allow"
                title={t('scan.validPass')}
                reason={pre.message ?? t('scan.preApprovedBy')}
                name={passName(m)}
                flat={passFlat(m)}
                primaryLabel={t('scan.allowEntry')}
                onPrimary={() => handleAllowPass(m)}
                secondaryLabel={t('visitor.notifyInstead')}
                onSecondary={goBack}
                busy={!!allowingId}
            />
        );
    }
    if (pre.kind === 'allowed') {
        return (
            <ResultScreen
                kind="allow"
                title={t('common.allow')}
                reason={t('scan.logged')}
                name={passName(pre.match)}
                flat={passFlat(pre.match)}
                primaryLabel={t('visitor.another')}
                onPrimary={reset}
                secondaryLabel={t('common.home')}
                onSecondary={() => router.replace('/')}
                autoReturnSeconds={8}
                onAutoReturn={() => router.replace('/')}
            />
        );
    }
    if (pre.kind === 'denied') {
        return (
            <ResultScreen
                kind="deny"
                title={pre.title ?? t('scan.noValidPass')}
                reason={pre.message}
                primaryLabel={t('visitor.notifyInstead')}
                onPrimary={goBack}
                secondaryLabel={t('common.home')}
                onSecondary={() => router.replace('/')}
            />
        );
    }
    if (pre.kind === 'checking') {
        return (
            <View style={S.checking}>
                <ActivityIndicator size="large" color={GuardColors.goldDeep} />
                <Text style={S.checkingText}>{t('visitor.checkingPass')}</Text>
            </View>
        );
    }

    const title = step === 1 ? t('visitor.stepWho')
        : type === 'CAB' && cabStage === 'digits' ? t('visitor.cabDigitsTitle')
        : type === 'SERVICE' && !serviceCategory ? t('visitor.serviceCategoryTitle')
        : type === 'HELP' && !helpManual ? t('visitor.helpTitle')
        : selectedFlat ? t('visitor.stepPhoto') : t('visitor.stepFlat');

    return (
        <View style={S.root}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            <StepHeader step={step} title={title} onBack={goBack} />

            {/* ── Step 1: who is it ─────────────────────────────────────────── */}
            {step === 1 && (
                <Animated.View key="who" entering={FadeInDown.duration(260)} style={S.body}>
                    <View style={S.typeGrid}>
                        {VISITOR_TYPES.map((v) => (
                            <Pressy
                                key={v.type}
                                wrapStyle={S.typeWrap}
                                testID={`type-${v.type}`}
                                accessibilityLabel={t(v.labelKey)}
                                onPress={() => handlePickType(v.type)}
                                style={S.typeCard}
                            >
                                <View style={[S.typeIcon, { backgroundColor: v.bg }]}>
                                    <Ionicons name={v.icon} size={36} color={v.tint} />
                                </View>
                                <Text style={S.typeLabel} numberOfLines={1}>{t(v.labelKey)}</Text>
                            </Pressy>
                        ))}
                    </View>
                </Animated.View>
            )}

            {step === 2 && type === 'CAB' && cabStage === 'digits' && (
                <View style={S.specialBody}>
                    <Text style={S.specialHint}>{t('visitor.cabDigitsHint')}</Text>
                    <TextInput
                        testID="cab-last4"
                        style={S.cabInput}
                        value={cabDigits}
                        onChangeText={(value) => { setCabDigits(value.replace(/\D/g, '').slice(0, 4)); setCabAmbiguous(false); }}
                        keyboardType="number-pad"
                        maxLength={4}
                        placeholder="0000"
                        placeholderTextColor={GuardColors.t3}
                    />
                    {cabAmbiguous ? <>
                        <Text testID="cab-ambiguous" style={S.preWarning}>{t('visitor.cabAskQr')}</Text>
                        <GiantButton label={t('visitor.scanCabQr')} icon="qr-code" tone="allow" onPress={() => router.replace('/scan-verify')} />
                    </> : null}
                    <GiantButton label={t('visitor.checkCabPass')} icon="shield-checkmark" disabled={cabDigits.length !== 4} onPress={checkCabDigits} />
                    <GiantButton label={t('visitor.cabNoDigits')} icon="home" tone="light" onPress={() => setCabStage('flat')} />
                </View>
            )}

            {step === 2 && type === 'SERVICE' && !serviceCategory && (
                <ScrollView style={S.body} contentContainerStyle={[S.specialScroll, { paddingBottom: insets.bottom + 20 }]}>
                    <Text style={S.specialHint}>{t('visitor.serviceCategoryHint')}</Text>
                    <View style={S.serviceGrid}>
                        {SERVICE_CATEGORIES.map((category) => (
                            <TouchableOpacity key={category} testID={`service-${category}`} style={S.serviceTile} onPress={() => setServiceCategory(category)}>
                                <Text style={S.serviceTileText}>{t(`visitor.service.${category}`)}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>
            )}

            {step === 2 && type === 'HELP' && !helpManual && (
                <View style={S.specialBody}>
                    <Text style={S.specialHint}>{t('visitor.helpHint')}</Text>
                    <GiantButton label={t('visitor.scanStaffPass')} icon="qr-code" onPress={() => router.replace('/scan-verify')} />
                    <GiantButton label={t('visitor.unregisteredHelp')} icon="person-add" tone="light" onPress={() => setHelpManual(true)} />
                </View>
            )}

            {/* ── Step 2: which flat ────────────────────────────────────────── */}
            {step === 2 && !selectedFlat && (type !== 'CAB' || cabStage === 'flat') && (type !== 'SERVICE' || !!serviceCategory) && (type !== 'HELP' || helpManual) && (
                <Animated.View key="flat" entering={FadeInDown.duration(260)} style={[S.body, S.flatBody, { paddingBottom: insets.bottom + 12 + keyboardHeight }]}>
                    <TouchableOpacity testID="early-photo" accessibilityRole="button" style={S.earlyPhoto} onPress={() => setCameraOpen(true)}>
                        {photoUri ? <Image source={{ uri: photoUri }} style={S.earlyPhotoThumb} contentFit="cover" />
                            : <View style={S.earlyPhotoIcon}><Ionicons name="camera" size={27} color={GuardColors.t1} /></View>}
                        <View style={{ flex: 1 }}>
                            <Text style={S.earlyPhotoTitle}>{t(photoUri ? 'visitor.retake' : 'visitor.takePhoto')}</Text>
                            <Text style={[S.earlyPhotoSub, photoUploadFailed && S.preWarning]}>{t(photoUploadFailed ? 'visitor.photoUploadFailed' : photoUploading ? 'visitor.photoUploading' : 'visitor.photoOptional')}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={22} color={GuardColors.t2} />
                    </TouchableOpacity>
                    <TouchableOpacity testID="toggle-flat-search" accessibilityRole="button" style={S.searchToggle} onPress={() => { setShowKeypad((value) => !value); setFlatQuery(''); }}>
                        <Ionicons name={showKeypad ? 'grid' : 'keypad'} size={24} color={GuardColors.t1} />
                        <Text style={S.searchToggleText}>{t(showKeypad ? 'visitor.chooseFromList' : 'visitor.typeFlat')}</Text>
                    </TouchableOpacity>

                    {showKeypad ? <>
                    <TextInput
                        testID="flat-input"
                        value={flatQuery}
                        onChangeText={(text) => setFlatQuery(text.replace(/[^a-zA-Z0-9-]/g, '').toUpperCase().slice(0, 20))}
                        placeholder={t('visitor.pressFlatHint')}
                        placeholderTextColor={GuardColors.t4}
                        autoFocus
                        autoCapitalize="characters"
                        autoCorrect={false}
                        spellCheck={false}
                        autoComplete="off"
                        returnKeyType="search"
                        style={S.flatInput}
                    />

                    <ScrollView style={S.results} contentContainerStyle={S.resultsContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                        {!flatQuery && recentFlats.length > 0 && (
                            <>
                                <Text style={S.resultsLabel}>{t('visitor.recent')}</Text>
                                <View style={S.recentRow}>
                                    {recentFlats.map((flat) => (
                                        <TouchableOpacity key={flat.id} testID={`recent-${flat.id}`} activeOpacity={0.7} style={S.recentChip} onPress={() => handleSelectFlat(flat)}>
                                            <Ionicons name="time-outline" size={18} color={GuardColors.t2} />
                                            <Text style={S.recentChipText}>{flatLabel(flat)}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </>
                        )}
                        {searchingFlat && <ActivityIndicator style={{ marginTop: 10 }} color={GuardColors.goldDeep} />}
                        {!!flatQuery && !searchingFlat && flatResults.length === 0 && (
                            <Text style={S.noFlats}>{t('visitor.noFlats')}</Text>
                        )}
                        {flatResults.map((item) => (
                            <TouchableOpacity key={item.id} testID={`flat-${item.id}`} activeOpacity={0.75} style={S.flatTile} onPress={() => handleSelectFlat(item)}>
                                <View style={S.flatTileIcon}><Ionicons name="home" size={22} color={GuardColors.goldDeep} /></View>
                                <View style={{ flex: 1 }}>
                                    <Text style={S.flatTileTitle}>{flatLabel(item)}</Text>
                                    {!!item.residents?.[0]?.name && <Text style={S.flatTileSub}>{item.residents[0].name}</Text>}
                                </View>
                                <Ionicons name="chevron-forward" size={22} color={GuardColors.t3} />
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    </> : <>
                        {recentFlats.length > 0 ? (
                            <View style={S.recentSection}>
                                <Text style={S.resultsLabel}>{t('visitor.recent')}</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.recentRow}>
                                    {recentFlats.map((flat) => (
                                        <TouchableOpacity key={flat.id} testID={`recent-${flat.id}`} style={S.recentChip} onPress={() => handleSelectFlat(flat)}>
                                            <Text style={S.recentChipText}>{flatLabel(flat)}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        ) : null}
                        {loadingDirectory && allFlats.length === 0 ? <ActivityIndicator style={{ marginTop: 24 }} color={GuardColors.goldDeep} /> : null}
                        {blocks.length > 1 ? (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.blockScroll} contentContainerStyle={S.blockRow}>
                                {blocks.map((block) => (
                                    <TouchableOpacity key={block} accessibilityRole="button" testID={`block-${block}`} style={[S.blockChip, selectedBlock === block && S.blockChipSelected]} onPress={() => setSelectedBlock(block)}>
                                        <Text style={[S.blockChipText, selectedBlock === block && S.blockChipTextSelected]}>{block || t('common.other')}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        ) : null}
                        <ScrollView style={S.results} contentContainerStyle={S.gridResults} showsVerticalScrollIndicator={false}>
                            <Text style={S.resultsLabel}>{t('visitor.chooseFlat')}</Text>
                            <View style={S.flatGrid}>
                                {blockFlats.map((flat) => (
                                    <TouchableOpacity key={flat.id} accessibilityRole="button" testID={`flat-${flat.id}`} style={S.gridTile} onPress={() => handleSelectFlat(flat)}>
                                        <Text style={S.gridNumber} numberOfLines={1}>{flat.flatNumber}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                    </>}
                </Animated.View>
            )}

            {/* ── Same flat screen: optional details and one Send action ─── */}
            {step === 2 && !!selectedFlat && (
                <Animated.View key="details" entering={FadeInDown.duration(220)} style={S.body}>
                    <ScrollView ref={detailsScroll} contentContainerStyle={[S.quickDetails, { paddingBottom: insets.bottom + keyboardHeight + 24 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                        <View style={S.summary}>
                            <View style={[S.summaryIcon, { backgroundColor: typeInfo.bg }]}>
                                <Ionicons name={typeInfo.icon} size={30} color={typeInfo.tint} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={S.summaryType}>{t(typeInfo.labelKey)}</Text>
                                <Text style={S.summaryFlat}>{flatLabel(selectedFlat)}</Text>
                            </View>
                            <TouchableOpacity testID="change-flat" accessibilityRole="button" accessibilityLabel={t('visitor.changeFlat')} style={S.changeFlat} onPress={() => setSelectedFlat(null)}>
                                <Ionicons name="pencil" size={22} color={GuardColors.t1} />
                            </TouchableOpacity>
                        </View>

                        {type === 'DELIVERY' ? (
                            <View>
                                <Text style={S.optionLabel}>{t('visitor.deliveryFrom')}</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.providerChips}>
                                    {PROVIDERS.map((item) => (
                                        <TouchableOpacity key={item.tag} testID={`provider-${item.tag}`} accessibilityRole="button" style={[S.providerChip, provider === item.tag && S.providerChipSelected]} onPress={() => handlePickProvider(item.tag)}>
                                            <Text style={S.providerChipText}>{item.label || t('common.other')}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        ) : null}

                        <VoiceNameInput value={visitorName} onChange={setVisitorName} />

                        {type === 'OTHER' ? (
                            <View>
                                <Text style={S.optionLabel}>{t('visitor.otherPurpose')}</Text>
                                <TextInput style={S.purposeInput} value={otherPurpose} onChangeText={setOtherPurpose} maxLength={100} placeholder={t('visitor.otherPurposeHint')} placeholderTextColor={GuardColors.t3} />
                            </View>
                        ) : null}

                        {type === 'SERVICE' && serviceCategory ? <Text style={S.purposeLabel}>{t(`visitor.service.${serviceCategory}`)}</Text> : null}
                        {type === 'CAB' && cabDigits ? <Text style={S.purposeLabel}>{t('visitor.cabEnding', { digits: cabDigits })}</Text> : null}

                        {preCheckFailed ? <Text style={S.preWarning}>{t('visitor.passCheckFailed')}</Text> : null}

                        {photoUri ? (
                            <View style={S.quickPhotoRow}>
                                <Image source={{ uri: photoUri }} style={S.quickPhoto} contentFit="cover" />
                                <TouchableOpacity style={S.quickPhotoAction} onPress={() => setCameraOpen(true)}><Text style={S.quickPhotoText}>{t('visitor.retake')}</Text></TouchableOpacity>
                                <TouchableOpacity style={S.quickPhotoAction} onPress={removePhoto}><Text style={S.quickPhotoText}>{t('visitor.removePhoto')}</Text></TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity testID="take-photo" accessibilityRole="button" style={S.quickPhotoButton} onPress={() => setCameraOpen(true)}>
                                <Ionicons name="camera" size={24} color={GuardColors.t1} />
                                <Text style={S.quickPhotoText}>{t('visitor.photoOptional')}</Text>
                            </TouchableOpacity>
                        )}

                        {photoUploadFailed ? <Text style={S.preWarning}>{t('visitor.photoUploadFailed')}</Text> : null}

                        <GiantButton label={t('visitor.notify')} icon="notifications" tone="gold" loading={submitting} disabled={!canSubmit} onPress={handleSubmit} />
                    </ScrollView>
                </Animated.View>
            )}

            <CameraModal
                visible={cameraOpen}
                onCapture={handlePhotoCapture}
                onClose={() => setCameraOpen(false)}
            />
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
    root: { flex: 1, backgroundColor: GuardColors.bg },
    body: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
    specialBody: { flex: 1, paddingHorizontal: 20, paddingTop: 20, gap: 18 },
    specialScroll: { paddingTop: 12, gap: 18 },
    specialHint: { color: GuardColors.t2, fontFamily: GuardFonts.medium, fontSize: 18, lineHeight: 27 },
    cabInput: { minHeight: 90, borderRadius: 24, backgroundColor: GuardColors.card, borderWidth: 2, borderColor: GuardColors.gold, color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: 42, textAlign: 'center', letterSpacing: 14 },
    serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    serviceTile: { width: '48%', minHeight: 75, borderRadius: 20, backgroundColor: GuardColors.card, borderWidth: 1, borderColor: GuardColors.border, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
    serviceTileText: { color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: 18, lineHeight: 25, textAlign: 'center' },
    flatBody: { paddingTop: 4 },
    earlyPhoto: { minHeight: 76, borderRadius: 23, backgroundColor: GuardColors.card, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 13, marginBottom: 12, borderWidth: 1, borderColor: GuardColors.border },
    earlyPhotoIcon: { width: 54, height: 54, borderRadius: 16, backgroundColor: GuardColors.goldPale, alignItems: 'center', justifyContent: 'center' },
    earlyPhotoThumb: { width: 54, height: 54, borderRadius: 16 },
    earlyPhotoTitle: { color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: 19 },
    earlyPhotoSub: { color: GuardColors.t2, fontFamily: GuardFonts.medium, fontSize: 15 },
    searchToggle: { alignSelf: 'flex-end', minHeight: GuardTouch.min, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, marginBottom: 8, borderRadius: 16, backgroundColor: GuardColors.card },
    searchToggleText: { color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: 17 },
    recentSection: { marginBottom: 10, gap: 7 },
    blockScroll: { flexGrow: 0, marginBottom: 10 },
    blockRow: { gap: 9, paddingRight: 12 },
    blockChip: { minHeight: GuardTouch.min, minWidth: 85, borderRadius: 18, backgroundColor: GuardColors.card, borderWidth: 1, borderColor: GuardColors.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15 },
    blockChipSelected: { backgroundColor: GuardColors.gold, borderColor: GuardColors.goldDeep },
    blockChipText: { color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: 17 },
    blockChipTextSelected: { color: GuardColors.black },
    gridResults: { paddingBottom: 20, gap: 10 },
    flatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    gridTile: { width: '31%', minHeight: 77, borderRadius: 20, borderWidth: 1, borderColor: GuardColors.border, backgroundColor: GuardColors.card, alignItems: 'center', justifyContent: 'center' },
    gridNumber: { color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: 23 },

    header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 10 },
    backBtn: { width: GuardTouch.min, height: GuardTouch.min, borderRadius: GuardTouch.min / 2, backgroundColor: GuardColors.card, alignItems: 'center', justifyContent: 'center', ...guardShadow('#0D0F14', 1) },
    headerTitle: { flex: 1, color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: 26, lineHeight: 34, fontWeight: '900', letterSpacing: -0.4 },
    dots: { flexDirection: 'row', gap: 6 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: GuardColors.t4 },
    dotActive: { width: 22, backgroundColor: GuardColors.gold },
    dotDone: { backgroundColor: GuardColors.goldDeep },

    // Step 1
    typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingTop: 8 },
    typeWrap: { width: '47.6%' },
    typeCard: { height: 150, borderRadius: 30, backgroundColor: GuardColors.card, borderWidth: 1, borderColor: GuardColors.border, alignItems: 'center', justifyContent: 'center', gap: 12 },
    typeIcon: { width: 72, height: 72, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
    typeLabel: { color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: 21, lineHeight: 28, fontWeight: '800' },
    providerWrap: { width: '47.6%' },
    providerCard: { height: 112, borderRadius: 26, backgroundColor: GuardColors.card, alignItems: 'center', justifyContent: 'center', gap: 8 },
    providerIcon: { width: 54, height: 54, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    providerLabel: { color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: 18, lineHeight: 24, fontWeight: '800' },

    // Step 2
    flatInput: { minHeight: 76, borderRadius: 24, backgroundColor: GuardColors.card, borderWidth: 2, borderColor: GuardColors.gold, textAlign: 'center', color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: 34, fontWeight: '900', letterSpacing: 6, paddingHorizontal: 12, marginTop: 4 },
    displayRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    display: { flex: 1, minHeight: 76, borderRadius: 24, backgroundColor: GuardColors.card, borderWidth: 2, borderColor: GuardColors.gold, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
    displayText: { color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: 36, lineHeight: 44, fontWeight: '900', letterSpacing: 4 },
    displayPlaceholder: { fontSize: 20, lineHeight: 28, letterSpacing: 0, color: GuardColors.t3, fontWeight: '700' },
    displayHint: { color: GuardColors.t3, fontFamily: GuardFonts.medium, fontSize: GuardType.min, lineHeight: 20, fontWeight: '600' },
    deleteKey: { width: 76, height: 76, borderRadius: 24, backgroundColor: GuardColors.card, borderWidth: 1, borderColor: GuardColors.border, alignItems: 'center', justifyContent: 'center' },
    results: { flex: 1, marginVertical: 10 },
    resultsContent: { gap: 10, paddingBottom: 6 },
    resultsLabel: { color: GuardColors.t3, fontFamily: GuardFonts.bold, fontSize: GuardType.min, lineHeight: 22, fontWeight: '800', letterSpacing: 0.5 },
    recentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    recentChip: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: GuardTouch.min, paddingHorizontal: 16, borderRadius: 999, backgroundColor: GuardColors.card, borderWidth: 1, borderColor: GuardColors.border },
    recentChipText: { color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: GuardType.body, lineHeight: 26, fontWeight: '800' },
    noFlats: { marginTop: 12, textAlign: 'center', color: GuardColors.t3, fontFamily: GuardFonts.bold, fontSize: GuardType.body, lineHeight: 26, fontWeight: '700' },
    flatTile: { minHeight: 72, borderRadius: 24, backgroundColor: GuardColors.card, borderWidth: 1, borderColor: GuardColors.border, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 10 },
    flatTileIcon: { width: 46, height: 46, borderRadius: 16, backgroundColor: GuardColors.goldPale, alignItems: 'center', justifyContent: 'center' },
    flatTileTitle: { color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: 22, lineHeight: 28, fontWeight: '900' },
    flatTileSub: { color: GuardColors.t2, fontFamily: GuardFonts.medium, fontSize: GuardType.min + 1, lineHeight: 22, fontWeight: '600' },

    // Step 3
    step3: { paddingHorizontal: 20, paddingTop: 8, gap: 14 },
    summary: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: GuardColors.card, borderRadius: 26, borderWidth: 1, borderColor: GuardColors.border, padding: 16 },
    summaryIcon: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    summaryType: { color: GuardColors.t2, fontFamily: GuardFonts.bold, fontSize: GuardType.body, lineHeight: 26, fontWeight: '800' },
    summaryFlat: { color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: 24, lineHeight: 32, fontWeight: '900' },
    quickDetails: { gap: 18, paddingTop: 8 },
    changeFlat: { width: GuardTouch.min, height: GuardTouch.min, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: GuardColors.goldPale },
    optionLabel: { color: GuardColors.t2, fontFamily: GuardFonts.bold, fontSize: 16, marginBottom: 8 },
    purposeInput: { minHeight: GuardTouch.min, borderRadius: 18, backgroundColor: GuardColors.card, borderWidth: 1, borderColor: GuardColors.border, paddingHorizontal: 16, color: GuardColors.t1, fontFamily: GuardFonts.medium, fontSize: 18 },
    purposeLabel: { color: GuardColors.t2, fontFamily: GuardFonts.bold, fontSize: 18 },
    providerChips: { gap: 8, paddingRight: 12 },
    providerChip: { minHeight: GuardTouch.min, borderRadius: 18, backgroundColor: GuardColors.card, borderWidth: 1, borderColor: GuardColors.border, paddingHorizontal: 18, justifyContent: 'center' },
    providerChipSelected: { backgroundColor: GuardColors.goldPale, borderColor: GuardColors.goldDeep, borderWidth: 2 },
    providerChipText: { color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: 17 },
    quickPhotoButton: { minHeight: GuardTouch.min, borderRadius: 18, backgroundColor: GuardColors.card, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
    quickPhotoRow: { minHeight: 74, borderRadius: 18, backgroundColor: GuardColors.card, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 10 },
    quickPhoto: { width: 58, height: 58, borderRadius: 12 },
    quickPhotoAction: { minHeight: GuardTouch.min, justifyContent: 'center', paddingHorizontal: 4 },
    quickPhotoText: { color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: 17 },
    preWarning: { color: GuardColors.red, fontFamily: GuardFonts.bold, fontSize: 16, lineHeight: 23 },
    photoWrap: { borderRadius: 28, overflow: 'hidden', backgroundColor: '#000' },
    photo: { width: '100%', height: 260 },
    photoActions: { position: 'absolute', left: 12, right: 12, bottom: 12, flexDirection: 'row', gap: 10 },
    photoAction: { flex: 1, minHeight: GuardTouch.min, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.6)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    photoActionText: { color: '#fff', fontFamily: GuardFonts.bold, fontSize: GuardType.body, lineHeight: 26, fontWeight: '800' },
    addName: { minHeight: GuardTouch.min, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4 },
    addNameText: { flex: 1, color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: GuardType.body, lineHeight: 26, fontWeight: '800' },
    addNameSub: { color: GuardColors.t3, fontFamily: GuardFonts.medium, fontSize: GuardType.min, lineHeight: 22, fontWeight: '600' },
    nameBox: { minHeight: 64, borderRadius: 22, backgroundColor: GuardColors.card, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
    nameInput: { flex: 1, color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: 20, fontWeight: '700', paddingVertical: 10 },

    checking: { flex: 1, backgroundColor: GuardColors.bg, alignItems: 'center', justifyContent: 'center', gap: 16 },
    checkingText: { color: GuardColors.t2, fontFamily: GuardFonts.bold, fontSize: GuardType.button, lineHeight: 28, fontWeight: '800' },
});

// ─── Camera styles ────────────────────────────────────────────────────────────

const cam = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#000' },
    permRoot: { flex: 1, backgroundColor: GuardColors.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 16 },
    permTitle: { color: GuardColors.t1, fontFamily: GuardFonts.bold, fontSize: GuardType.title, lineHeight: 36, fontWeight: '900', textAlign: 'center' },
    permCancel: { minHeight: GuardTouch.min, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
    permCancelText: { color: GuardColors.t2, fontFamily: GuardFonts.bold, fontSize: GuardType.body, lineHeight: 26, fontWeight: '800' },
    topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
    closeBtn: { width: GuardTouch.min, height: GuardTouch.min, borderRadius: GuardTouch.min / 2, backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.32)', alignItems: 'center', justifyContent: 'center' },
    topLabel: { color: '#fff', fontFamily: GuardFonts.bold, fontSize: 22, lineHeight: 30, fontWeight: '800' },
    shutterRow: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center' },
    shutterBtn: { width: 88, height: 88, borderRadius: 44, borderWidth: 5, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
    shutterInner: { width: 66, height: 66, borderRadius: 33, backgroundColor: '#fff' },
    previewActions: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 14, paddingHorizontal: 20 },
    retakeBtn: { flex: 1, minHeight: GuardTouch.button, borderRadius: 26, backgroundColor: 'rgba(0,0,0,0.6)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    retakeBtnText: { color: '#fff', fontFamily: GuardFonts.bold, fontSize: GuardType.button, lineHeight: 28, fontWeight: '800' },
    useBtn: { flex: 1.3, minHeight: GuardTouch.button, borderRadius: 26, backgroundColor: '#0FB57A', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    useBtnText: { color: '#fff', fontFamily: GuardFonts.bold, fontSize: GuardType.button, lineHeight: 28, fontWeight: '800' },
});
