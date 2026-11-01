import { useCallback } from "react";
import type { User } from "firebase/auth";
import type { MachineBrand, MachineType } from "@/lib/sewingMachines";
import { sameName } from "@/lib/sewingMachines";
import type { Receipt } from "@/lib/funding";
import { optimiseImage } from "@/lib/imageUpload";

/** Authenticated JSON fetch, shared by the machine panel and its modals */
export type AdminApi = (url: string, init?: RequestInit) => Promise<Record<string, unknown>>;

/** The api() helper: sends the admin's token, JSON bodies as JSON and FormData as-is */
export function useAdminApi(user: User | null): AdminApi {
  return useCallback(
    async (url, init = {}) => {
      const token = await user?.getIdToken();
      const res = await fetch(url, {
        ...init,
        headers: {
          ...(typeof init.body === "string" ? { "Content-Type": "application/json" } : {}),
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json().catch(() => ({ error: `Request failed (${res.status})` }));
      if (!res.ok || data.error) throw new Error(data.error || "Request failed");
      return data;
    },
    [user]
  );
}

/**
 * Upload through the website's server instead of straight to Storage.
 * Photos are shrunk first so they stay under the server's upload limit.
 */
export async function uploadViaServer(api: AdminApi, file: File, kind: "machinePhoto" | "receipt") {
  let upload: Blob = file;
  let name = file.name;
  if (file.type.startsWith("image/") && file.type !== "image/svg+xml") {
    const { variants } = await optimiseImage(file, { widths: [1600] });
    const { blob, ext } = variants[variants.length - 1];
    upload = blob;
    name = `${file.name.replace(/\.[^.]+$/, "")}.${ext}`;
  }
  const body = new FormData();
  body.append("kind", kind);
  body.append("file", upload, name);
  return api("/api/uploads", { method: "POST", body });
}

export const uploadMachinePhoto = async (api: AdminApi, file: File) =>
  (await uploadViaServer(api, file, "machinePhoto")).url as string;

export const uploadReceipt = async (api: AdminApi, file: File) =>
  (await uploadViaServer(api, file, "receipt")).receipt as Receipt;

/** Open a private receipt in a new tab (fetched with the admin's token) */
export async function openReceipt(user: User | null, receipt: Receipt) {
  // Open the tab first: browsers block pop-ups opened after an await
  const tab = window.open("", "_blank");
  try {
    const token = await user?.getIdToken();
    const res = await fetch(`/api/receipts?path=${encodeURIComponent(receipt.path)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Couldn't load the receipt");
    const url = URL.createObjectURL(await res.blob());
    if (tab) tab.location.href = url;
    else window.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (err) {
    tab?.close();
    alert(err instanceof Error ? err.message : "Couldn't load the receipt");
  }
}

export interface MachineLibrary {
  types: MachineType[];
  brands: MachineBrand[];
}

export interface WaitingApplication {
  id: string;
  fullName: string;
  email: string;
  area: string;
  applicantType: "individual" | "communityGroup";
  groupName: string | null;
  status: string;
  machineId?: string;
  createdAt: string | null;
}

// Who a machine is being promised to, as picked in the form
export type AssignChoice =
  | { mode: "none" }
  | { mode: "waiting"; applicationId: string }
  | { mode: "manual"; fullName: string; phone: string; email: string; area: string };

export const findBrand = (library: MachineLibrary, name: string) =>
  name.trim() ? library.brands.find((b) => sameName(b.name, name)) : undefined;

export const findModel = (brand: MachineBrand | undefined, name: string) =>
  name.trim() ? brand?.models.find((m) => sameName(m.name, name)) : undefined;

export const formatDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "-";

/** PATCH body for assigning a machine, or null when nobody was chosen */
export function assignBody(choice: AssignChoice) {
  if (choice.mode === "waiting") return { action: "assign", applicationId: choice.applicationId };
  if (choice.mode === "manual") {
    const { fullName, phone, email, area } = choice;
    return { action: "assign", manual: { fullName, phone, email, area } };
  }
  return null;
}
