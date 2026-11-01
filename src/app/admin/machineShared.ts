import type { MachineBrand, MachineType } from "@/lib/sewingMachines";
import { sameName } from "@/lib/sewingMachines";

/** Authenticated JSON fetch, shared by the machine panel and its modals */
export type AdminApi = (url: string, init?: RequestInit) => Promise<Record<string, unknown>>;

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
