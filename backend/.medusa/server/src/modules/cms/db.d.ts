import { Client } from "pg";
export declare function makePgClient(): Client;
export interface CmsPage {
    id: string;
    page_key: string;
    locale: string;
    title: string;
    schema_ver: number;
    content: Record<string, unknown>;
    updated_at: string | null;
    updated_by: string | null;
}
export interface CmsPageRevision {
    id: number;
    page_id: string;
    locale: string;
    content: Record<string, unknown>;
    created_at: string;
    created_by: string | null;
    note: string | null;
}
export declare function getPage(pageKey: string, locale?: string): Promise<CmsPage | null>;
export declare function listPages(locale?: string): Promise<CmsPage[]>;
export declare function upsertPage(pageKey: string, title: string, content: Record<string, unknown>, updatedBy: string, locale?: string): Promise<CmsPage>;
export declare function getRevisions(pageKey: string, limit?: number, locale?: string): Promise<CmsPageRevision[]>;
export declare function rollbackToRevision(pageKey: string, revisionId: number, rolledBackBy: string, locale?: string): Promise<CmsPage | null>;
