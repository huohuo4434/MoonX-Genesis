"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { isCurrentHeartbeatGeneration } from "@/lib/auth/member-device-heartbeat-core";

export function MemberDeviceHeartbeat() {
  const { locale } = useLocale();
  const en = locale === "en";
  const [message, setMessage] = useState<string | null>(null);
  const [blocking, setBlocking] = useState(false);
  const [recoveryHref, setRecoveryHref] = useState("/login");
  const [portalRoot, setPortalRoot] = useState<HTMLDivElement | null>(null);
  const generationRef = useRef(0);
  const requestRef = useRef<AbortController | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!blocking) return;
    const root = document.createElement("div");
    root.dataset.memberSessionGuard = "true";
    document.body.appendChild(root);
    const background = Array.from(document.body.children)
      .filter((node): node is HTMLElement => node instanceof HTMLElement && node !== root)
      .map((node) => ({
        node,
        ariaHidden: node.getAttribute("aria-hidden"),
        inert: node.hasAttribute("inert"),
      }));
    for (const item of background) {
      item.node.setAttribute("aria-hidden", "true");
      item.node.setAttribute("inert", "");
    }
    setPortalRoot(root);
    return () => {
      for (const item of background) {
        if (item.ariaHidden == null) item.node.removeAttribute("aria-hidden");
        else item.node.setAttribute("aria-hidden", item.ariaHidden);
        if (!item.inert) item.node.removeAttribute("inert");
      }
      root.remove();
    };
  }, [blocking]);

  useEffect(() => {
    if (!blocking || !portalRoot) return;
    dialogRef.current?.focus();
    const keepFocusInDialog = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const target = dialogRef.current?.querySelector<HTMLElement>("a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])");
      if (!target) return;
      event.preventDefault();
      target.focus();
    };
    document.addEventListener("keydown", keepFocusInDialog);
    return () => document.removeEventListener("keydown", keepFocusInDialog);
  }, [blocking, portalRoot]);

  useEffect(() => {
    let cancelled = false;

    async function pulse() {
      requestRef.current?.abort();
      const controller = new AbortController();
      requestRef.current = controller;
      const responseGeneration = generationRef.current + 1;
      generationRef.current = responseGeneration;
      try {
        const response = await fetch("/api/member/device-heartbeat", {
          method: "POST",
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        if (!isCurrentHeartbeatGeneration({ responseGeneration, latestGeneration: generationRef.current, cancelled })) return;
        if (response.ok) {
          setMessage(null);
          setBlocking(false);
          setPortalRoot(null);
          return;
        }
        const body = (await response.json().catch(() => null)) as { reason?: string; error?: string } | null;
        if (!isCurrentHeartbeatGeneration({ responseGeneration, latestGeneration: generationRef.current, cancelled })) return;
        if (response.status === 401 || response.status === 403) {
          const next = `${window.location.pathname}${window.location.search}`;
          const href = response.status === 401
            ? `/login?next=${encodeURIComponent(next)}`
            : "/pricing";
          setBlocking(true);
          setRecoveryHref(href);
          setMessage(
            response.status === 401
              ? (en ? "Your session expired. Sign in again to view member content." : "登录已失效，请重新登录后查看会员内容。")
              : (en ? "Your membership is no longer active." : "会员权益已失效，请先续费。"),
          );
          window.location.replace(href);
          return;
        }
        setBlocking(true);
        setRecoveryHref("/account#account-security");
        setMessage(
          body?.reason === "ACTIVE_ELSEWHERE"
            ? (en ? "Member content has moved to another device. This page will recover after access is reclaimed." : "会员内容已切换到另一台设备，本页将在重新取得使用权后恢复。")
            : body?.reason === "DEVICE_LIMIT"
              ? (en ? "Two devices are linked. Remove an old device in account security." : "该账号已绑定两台设备，请先在账户安全中移除旧设备。")
              : body?.error ?? (en ? "The member-device status needs confirmation." : "会员设备状态需要重新确认。")
        );
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        // A transient network failure must not sign the user out.
      }
    }

    void pulse();
    const timer = window.setInterval(() => void pulse(), 60_000);
    return () => {
      cancelled = true;
      generationRef.current += 1;
      requestRef.current?.abort();
      window.clearInterval(timer);
    };
  }, [en]);

  if (!message) return null;
  const notice = (
    <div className={blocking
      ? "fixed inset-0 z-[100] flex items-center justify-center bg-[#07080b] p-6 text-amber-100"
      : "sticky top-16 z-40 mb-4 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-body-sm text-amber-100"}
      role={blocking ? "alertdialog" : "status"}
      aria-modal={blocking ? "true" : undefined}
      aria-live="assertive"
    >
      <div ref={dialogRef} tabIndex={blocking ? -1 : undefined} className={blocking ? "max-w-lg rounded-2xl border border-amber-500/30 bg-[#11131a] p-6 text-center shadow-2xl outline-none" : ""}>
        <p>{message}</p>
        <Link className="mt-3 inline-block font-semibold underline" href={recoveryHref}>{en ? "Continue securely" : "安全继续"}</Link>
      </div>
    </div>
  );
  if (blocking) return portalRoot ? createPortal(notice, portalRoot) : null;
  return notice;
}
