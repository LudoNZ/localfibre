import { db } from "./firebaseAdmin"
import { OPEN_STATUSES } from "./sewingMachines"
import { manualImpact } from "@/data/impact"

export interface ImpactNumbers {
  machinesRepurposed: number | null
  machinesInWorkshop: number | null
  peopleWaiting: number | null
  eventsHeld: number | null
  eventAttendees: number | null
  textilesDivertedKg: number | null
}

async function count(query: FirebaseFirestore.Query): Promise<number | null> {
  try {
    const snapshot = await query.count().get()
    return snapshot.data().count
  } catch (error) {
    console.error("Impact count failed:", error)
    return null
  }
}

/** Public impact figures. Counts only: no personal details are read. */
export async function getImpactNumbers(): Promise<ImpactNumbers> {
  const machines = db.collection("sewingMachines")

  const [machinesRepurposed, machinesInWorkshop, peopleWaiting, eventsHeld] = await Promise.all([
    count(machines.where("status", "==", "repurposed")),
    count(machines.where("status", "in", ["servicing", "ready", "assigned"])),
    count(db.collection("sewingMachineApplications").where("status", "in", OPEN_STATUSES)),
    count(db.collection("events").where("isUpcoming", "==", false)),
  ])

  return {
    machinesRepurposed,
    machinesInWorkshop,
    peopleWaiting,
    eventsHeld,
    ...manualImpact,
  }
}

export interface GalleryMachine {
  id: string
  number: number
  label: string
  photo: string
}

/** Photos of rehomed machines for the public gallery. Never includes recipients. */
export async function getRepurposedGallery(limit = 8): Promise<GalleryMachine[]> {
  try {
    const snapshot = await db
      .collection("sewingMachines")
      .where("status", "==", "repurposed")
      .select("number", "brand", "model", "photos")
      .get()

    return snapshot.docs
      .map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          number: data.number as number,
          label: [data.brand, data.model].filter(Boolean).join(" "),
          photo: (data.photos as string[] | undefined)?.[0] ?? "",
        }
      })
      .filter((machine) => machine.photo)
      .sort((a, b) => b.number - a.number)
      .slice(0, limit)
  } catch (error) {
    console.error("Failed to load machine gallery:", error)
    return []
  }
}
