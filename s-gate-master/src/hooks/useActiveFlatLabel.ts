import { useAuthStore } from '@/store/useAuthStore';

/**
 * "Tower A - A101" for the flat the resident is currently acting for.
 *
 * The stored user often has no flat (or a flat without its block), but the
 * selected home context always carries both, so it is the fallback.
 */
export function useActiveFlatLabel(): string | null {
    const flat = useAuthStore(state => state.user?.flat);
    const context = useAuthStore(state =>
        state.userContexts.find(c => c.membershipId === state.selectedResidentContextId));

    const number = flat?.number ?? flat?.flatNumber ?? context?.flatNumber ?? null;
    if (!number) return null;
    const block = flat?.block?.name ?? context?.blockName ?? null;
    return block ? `${block} - ${number}` : `Flat ${number}`;
}
