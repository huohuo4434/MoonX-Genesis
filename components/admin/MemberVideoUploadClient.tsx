"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MEMBER_VIDEO_CATALOG } from "@/lib/member-videos/catalog";
import { MEMBER_VIDEO_FILE_SIZE_LIMIT } from "@/lib/member-videos/core";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Asset = "video" | "subtitle" | "subtitleEn";
type UploadTicket = { bucket: string; path: string; token: string };
type PrepareResponse = {
  releaseId?: string;
  assets?: Record<Asset, UploadTicket>;
  error?: string;
};
type RemoteFile = { size: number; updatedAt: string | null };

function formatBytes(value: number) {
  if (!value) return "未上传";
  return `${(value / 1024 / 1024).toFixed(value > 1024 * 1024 ? 1 : 3)} MB`;
}

export function MemberVideoUploadClient() {
  const [slug, setSlug] = useState(MEMBER_VIDEO_CATALOG[0]?.slug ?? "");
  const [video, setVideo] = useState<File | null>(null);
  const [subtitle, setSubtitle] = useState<File | null>(null);
  const [subtitleEn, setSubtitleEn] = useState<File | null>(null);
  const [files, setFiles] = useState<Record<string, RemoteFile>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("正在检查私有存储…");
  const refreshSequence = useRef(0);

  const refresh = useCallback(async (selectedSlug: string) => {
    const sequence = ++refreshSequence.current;
    try {
      const response = await fetch(
        `/api/admin/member-videos/upload-url?slug=${encodeURIComponent(selectedSlug)}`,
        { cache: "no-store" },
      );
      const body = (await response.json()) as {
        files?: Record<string, RemoteFile>;
        error?: string;
      };
      if (sequence !== refreshSequence.current) return false;
      if (!response.ok) throw new Error(body.error || "无法读取上传状态");
      setFiles(body.files ?? {});
      return true;
    } catch (error) {
      if (sequence !== refreshSequence.current) return false;
      throw error;
    }
  }, []);

  useEffect(() => {
    setVideo(null);
    setSubtitle(null);
    setSubtitleEn(null);
    setFiles({});
    refresh(slug)
      .then((current) => {
        if (current) setMessage("私有存储已就绪");
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "状态读取失败"));
  }, [refresh, slug]);

  async function uploadOne(asset: Asset, ticket: UploadTicket, file: File) {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) throw new Error("浏览器端存储连接未配置");
    const expectedType = asset === "video" ? "video/mp4" : "text/vtt";
    const normalizedBody = new Blob([file], { type: expectedType });
    const result = await supabase.storage
      .from(ticket.bucket)
      .uploadToSignedUrl(ticket.path, ticket.token, normalizedBody, {
        contentType: expectedType,
        cacheControl: "3600",
      });
    if (result.error) throw new Error(`上传失败：${result.error.message}`);
  }

  async function upload() {
    const selectedVideo = MEMBER_VIDEO_CATALOG.find((item) => item.slug === slug);
    const requiresEnglish = selectedVideo?.subtitleLanguages.includes("en") ?? false;
    if (!video || !subtitle || (requiresEnglish && !subtitleEn)) {
      setMessage(requiresEnglish ? "请同时选择最终版 MP4、中文字幕和英文字幕 VTT" : "请同时选择最终版 MP4 和中文字幕 VTT");
      return;
    }
    if (!video.name.toLowerCase().endsWith(".mp4") || !subtitle.name.toLowerCase().endsWith(".vtt") || (subtitleEn && !subtitleEn.name.toLowerCase().endsWith(".vtt"))) {
      setMessage("视频必须是 MP4，字幕必须是 VTT");
      return;
    }
    if (video.size > MEMBER_VIDEO_FILE_SIZE_LIMIT) {
      setMessage("视频不能超过32MB");
      return;
    }
    setBusy(true);
    try {
      const prepareResponse = await fetch("/api/admin/member-videos/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, action: "prepare" }),
      });
      const prepared = (await prepareResponse.json()) as PrepareResponse;
      if (!prepareResponse.ok || !prepared.releaseId || !prepared.assets) {
        throw new Error(prepared.error || "无法取得安全上传凭证");
      }
      setMessage("正在直传视频到会员私有存储…");
      await uploadOne("video", prepared.assets.video, video);
      setMessage("视频完成，正在上传字幕…");
      await uploadOne("subtitle", prepared.assets.subtitle, subtitle);
      if (requiresEnglish && subtitleEn) {
        setMessage("中文字幕完成，正在上传英文字幕…");
        await uploadOne("subtitleEn", prepared.assets.subtitleEn, subtitleEn);
      }
      setMessage("双文件完成，正在复核并切换正式版本…");
      const publishResponse = await fetch("/api/admin/member-videos/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          action: "publish",
          releaseId: prepared.releaseId,
        }),
      });
      const published = (await publishResponse.json()) as { error?: string };
      if (!publishResponse.ok) throw new Error(published.error || "正式版本切换失败");
      await refresh(slug);
      setMessage("上传并复核完成，会员播放入口已就绪");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "上传失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <label className="block rounded-xl border border-white/10 bg-black/20 p-4">
        <span className="text-sm font-medium text-white">选择要发布的视频</span>
        <select
          value={slug}
          disabled={busy}
          onChange={(event) => {
            refreshSequence.current += 1;
            setSlug(event.target.value);
          }}
          className="mt-3 block min-h-11 w-full rounded-lg border border-white/15 bg-[#11121a] px-3 text-sm text-white"
        >
          {MEMBER_VIDEO_CATALOG.map((item) => (
            <option key={item.slug} value={item.slug}>
              {item.title} · {item.durationLabel}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-3 rounded-xl border border-white/10 bg-black/20 p-4 sm:grid-cols-3">
        <div>
          <p className="text-sm font-medium text-white">视频文件</p>
          <p className="mt-1 text-xs text-white/55">
            线上：{formatBytes(files["video.mp4"]?.size ?? 0)}
          </p>
          <input
            className="mt-3 block w-full text-sm text-white/70 file:mr-3 file:rounded-md file:border-0 file:bg-violet-500 file:px-3 file:py-2 file:text-white"
            type="file"
            accept="video/mp4,.mp4"
            onChange={(event) => setVideo(event.target.files?.[0] ?? null)}
          />
        </div>
        <div>
          <p className="text-sm font-medium text-white">英文字幕</p>
          <p className="mt-1 text-xs text-white/55">
            线上：{formatBytes(files["subtitles.en.vtt"]?.size ?? 0)}
          </p>
          <input
            className="mt-3 block w-full text-sm text-white/70 file:mr-3 file:rounded-md file:border-0 file:bg-violet-500 file:px-3 file:py-2 file:text-white"
            type="file"
            accept="text/vtt,.vtt"
            onChange={(event) => setSubtitleEn(event.target.files?.[0] ?? null)}
          />
        </div>
        <div>
          <p className="text-sm font-medium text-white">中文字幕</p>
          <p className="mt-1 text-xs text-white/55">
            线上：{formatBytes(files["subtitles.vtt"]?.size ?? 0)}
          </p>
          <input
            className="mt-3 block w-full text-sm text-white/70 file:mr-3 file:rounded-md file:border-0 file:bg-violet-500 file:px-3 file:py-2 file:text-white"
            type="file"
            accept="text/vtt,.vtt"
            onChange={(event) => setSubtitle(event.target.files?.[0] ?? null)}
          />
        </div>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={upload}
        className="min-h-11 rounded-lg bg-violet-500 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "上传中…" : "上传／替换正式会员视频"}
      </button>
      <p className="text-sm text-white/70" aria-live="polite">
        {message}
      </p>
      <p className="text-xs leading-5 text-white/45">
        文件由浏览器直接进入私有桶，不经过 Vercel 函数正文，也不会进入 Git。视频和字幕全部复核通过后才会同时切换为正式版本；播放地址只向通过会员与设备校验的账户短时签发。
      </p>
    </div>
  );
}
