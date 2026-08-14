import type { MemberDevicePageAccess } from "@/lib/auth/member-device-guard";

export type FounderCycleAccessAction = "REDIRECT_LOGIN" | "REDIRECT_MEMBERSHIP" | "RENDER_DEVICE_GATE" | "LOAD_PRIVATE_PACK";

export function founderCycleAccessAction(status: MemberDevicePageAccess["status"]): FounderCycleAccessAction {
  if (status === "LOGIN_REQUIRED") return "REDIRECT_LOGIN";
  if (status === "MEMBERSHIP_REQUIRED") return "REDIRECT_MEMBERSHIP";
  if (status === "DEVICE_REQUIRED") return "RENDER_DEVICE_GATE";
  return "LOAD_PRIVATE_PACK";
}
