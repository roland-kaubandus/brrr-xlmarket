import { z } from "zod";
export declare const slideSchema: z.ZodObject<{
    badge: z.ZodString;
    title: z.ZodString;
    text: z.ZodString;
    cta: z.ZodString;
    ctaHref: z.ZodString;
    bg: z.ZodString;
}, "strip", z.ZodTypeAny, {
    badge: string;
    title: string;
    text: string;
    cta: string;
    ctaHref: string;
    bg: string;
}, {
    badge: string;
    title: string;
    text: string;
    cta: string;
    ctaHref: string;
    bg: string;
}>;
export declare const promoSchema: z.ZodObject<{
    tag: z.ZodString;
    tagTone: z.ZodEnum<["amber", "red", "green", "navy"]>;
    title: z.ZodString;
    sub: z.ZodString;
    image: z.ZodOptional<z.ZodString>;
    bg: z.ZodOptional<z.ZodString>;
    href: z.ZodString;
}, "strip", z.ZodTypeAny, {
    sub: string;
    title: string;
    tag: string;
    tagTone: "amber" | "red" | "green" | "navy";
    href: string;
    bg?: string | undefined;
    image?: string | undefined;
}, {
    sub: string;
    title: string;
    tag: string;
    tagTone: "amber" | "red" | "green" | "navy";
    href: string;
    bg?: string | undefined;
    image?: string | undefined;
}>;
export declare const homepageSchema: z.ZodObject<{
    slides: z.ZodArray<z.ZodObject<{
        badge: z.ZodString;
        title: z.ZodString;
        text: z.ZodString;
        cta: z.ZodString;
        ctaHref: z.ZodString;
        bg: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        badge: string;
        title: string;
        text: string;
        cta: string;
        ctaHref: string;
        bg: string;
    }, {
        badge: string;
        title: string;
        text: string;
        cta: string;
        ctaHref: string;
        bg: string;
    }>, "many">;
    promos: z.ZodArray<z.ZodObject<{
        tag: z.ZodString;
        tagTone: z.ZodEnum<["amber", "red", "green", "navy"]>;
        title: z.ZodString;
        sub: z.ZodString;
        image: z.ZodOptional<z.ZodString>;
        bg: z.ZodOptional<z.ZodString>;
        href: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        sub: string;
        title: string;
        tag: string;
        tagTone: "amber" | "red" | "green" | "navy";
        href: string;
        bg?: string | undefined;
        image?: string | undefined;
    }, {
        sub: string;
        title: string;
        tag: string;
        tagTone: "amber" | "red" | "green" | "navy";
        href: string;
        bg?: string | undefined;
        image?: string | undefined;
    }>, "many">;
    nav_short_names: z.ZodRecord<z.ZodString, z.ZodString>;
}, "strip", z.ZodTypeAny, {
    slides: {
        badge: string;
        title: string;
        text: string;
        cta: string;
        ctaHref: string;
        bg: string;
    }[];
    promos: {
        sub: string;
        title: string;
        tag: string;
        tagTone: "amber" | "red" | "green" | "navy";
        href: string;
        bg?: string | undefined;
        image?: string | undefined;
    }[];
    nav_short_names: Record<string, string>;
}, {
    slides: {
        badge: string;
        title: string;
        text: string;
        cta: string;
        ctaHref: string;
        bg: string;
    }[];
    promos: {
        sub: string;
        title: string;
        tag: string;
        tagTone: "amber" | "red" | "green" | "navy";
        href: string;
        bg?: string | undefined;
        image?: string | undefined;
    }[];
    nav_short_names: Record<string, string>;
}>;
export type HomepageContent = z.infer<typeof homepageSchema>;
export declare const kitSchema: z.ZodObject<{
    slug: z.ZodString;
    name: z.ZodString;
    priceFrom: z.ZodNumber;
    icon: z.ZodString;
    tagline: z.ZodString;
    includes: z.ZodArray<z.ZodString, "many">;
    image: z.ZodString;
}, "strip", z.ZodTypeAny, {
    includes: string[];
    image: string;
    slug: string;
    name: string;
    priceFrom: number;
    icon: string;
    tagline: string;
}, {
    includes: string[];
    image: string;
    slug: string;
    name: string;
    priceFrom: number;
    icon: string;
    tagline: string;
}>;
export declare const starterKitsSchema: z.ZodObject<{
    kits: z.ZodArray<z.ZodObject<{
        slug: z.ZodString;
        name: z.ZodString;
        priceFrom: z.ZodNumber;
        icon: z.ZodString;
        tagline: z.ZodString;
        includes: z.ZodArray<z.ZodString, "many">;
        image: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        includes: string[];
        image: string;
        slug: string;
        name: string;
        priceFrom: number;
        icon: string;
        tagline: string;
    }, {
        includes: string[];
        image: string;
        slug: string;
        name: string;
        priceFrom: number;
        icon: string;
        tagline: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    kits: {
        includes: string[];
        image: string;
        slug: string;
        name: string;
        priceFrom: number;
        icon: string;
        tagline: string;
    }[];
}, {
    kits: {
        includes: string[];
        image: string;
        slug: string;
        name: string;
        priceFrom: number;
        icon: string;
        tagline: string;
    }[];
}>;
export type StarterKitsContent = z.infer<typeof starterKitsSchema>;
export declare const legalPageSchema: z.ZodObject<{
    title: z.ZodString;
    effective_date: z.ZodString;
    body_md: z.ZodString;
}, "strip", z.ZodTypeAny, {
    title: string;
    effective_date: string;
    body_md: string;
}, {
    title: string;
    effective_date: string;
    body_md: string;
}>;
export type LegalPageContent = z.infer<typeof legalPageSchema>;
export declare const plainPageSchema: z.ZodObject<{
    title: z.ZodString;
    body_md: z.ZodString;
}, "strip", z.ZodTypeAny, {
    title: string;
    body_md: string;
}, {
    title: string;
    body_md: string;
}>;
export type PlainPageContent = z.infer<typeof plainPageSchema>;
export declare const globalSchema: z.ZodObject<{
    company_name: z.ZodString;
    reg_number: z.ZodString;
    vat_number: z.ZodString;
    email_info: z.ZodString;
    email_b2b: z.ZodString;
    phone: z.ZodString;
    address: z.ZodString;
    domain: z.ZodString;
    slogan: z.ZodString;
}, "strip", z.ZodTypeAny, {
    company_name: string;
    reg_number: string;
    vat_number: string;
    email_info: string;
    email_b2b: string;
    phone: string;
    address: string;
    domain: string;
    slogan: string;
}, {
    company_name: string;
    reg_number: string;
    vat_number: string;
    email_info: string;
    email_b2b: string;
    phone: string;
    address: string;
    domain: string;
    slogan: string;
}>;
export type GlobalContent = z.infer<typeof globalSchema>;
export declare const PAGE_REGISTRY: Record<string, {
    title: string;
    schema: z.ZodTypeAny;
}>;
export declare function validateContent(pageKey: string, content: unknown): {
    ok: boolean;
    error?: string;
};
