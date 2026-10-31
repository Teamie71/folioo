const SUPPORTED_FRONT_PROFILES = ['local', 'dev'] as const;

export type FrontProfileState = (typeof SUPPORTED_FRONT_PROFILES)[number];

export function parseFrontProfileState(state: unknown): FrontProfileState | null {
    if (typeof state !== 'string') {
        return null;
    }

    const normalized = state.trim().toLowerCase();
    return SUPPORTED_FRONT_PROFILES.includes(normalized as FrontProfileState)
        ? (normalized as FrontProfileState)
        : null;
}
