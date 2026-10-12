export type WorkStatus = 'pending' | 'in_progress' | 'completed';

export interface UserSummary {
    id: string;
    name: string;
    email: string;
}

export interface MediaPreview {
    url: string;
    type: 'image' | 'video';
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
    type: 'image' | 'video';
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