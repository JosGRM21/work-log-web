export const VALID_WORK_STATUSES = ['pending', 'in_progress', 'completed'] as const;
export type WorkStatus = (typeof VALID_WORK_STATUSES)[number];

export const ALLOWED_MEDIA_TYPES = ['image', 'video'] as const;
export type AllowedMediaType = (typeof ALLOWED_MEDIA_TYPES)[number];

const UUID_V4_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(id: string): boolean {
    return typeof id === 'string' && UUID_V4_REGEX.test(id);
}

export interface UserSummary {
    id: string;
    name: string;
    email: string;
}

export interface MediaPreview {
    url: string;
    type: AllowedMediaType;
}

export interface MediaCount {
    images: number;
    videos: number;
}

export interface WorkItemSummary {
    id: string;
    title: string;
    status: WorkStatus;
    reference_date: string;
    media_preview: MediaPreview | null;
    media_count: MediaCount;
    created_at: string;
}

export interface MediaAssetDTO {
    id: string;
    url: string;
    type: AllowedMediaType;
    size_bytes: number;
    sort_order: number;
    created_at: string;
}

export interface WorkItemDetail {
    id: string;
    title: string;
    description: string | null;
    status: WorkStatus;
    reference_date: string;
    start_date: string | null;
    end_date: string | null;
    created_at: string;
    updated_at: string;
    media: MediaAssetDTO[];
}

export interface ApiPaginationMeta {
    total: number;
    limit: number;
    offset: number;
}

export interface WorkListResponse {
    data: WorkItemSummary[];
    meta: ApiPaginationMeta;
}

export interface ApiErrorPayload {
    error: {
        code: string;
        message: string;
        details: unknown[];
    };
}