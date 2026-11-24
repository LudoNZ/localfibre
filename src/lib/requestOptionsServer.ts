import { cache } from "react"
import { db } from "./firebaseAdmin"
import { BUILT_IN_KINDS, parseRequestKinds, RequestKindDef } from "./requestOptions"

export const requestOptionsDoc = () => db.collection("settings").doc("requestOptions")

/** The kinds of machine on the waiting-list form, in order. Read once per request. */
export const getRequestKinds = cache(async (): Promise<RequestKindDef[]> => {
  try {
    const snap = await requestOptionsDoc().get()
    const data = snap.data()
    return parseRequestKinds(data?.kinds ?? data?.options)
  } catch (error) {
    // Keep the form working rather than break the page
    console.error("Error loading request options:", error)
    return BUILT_IN_KINDS
  }
})

/** How many applications (any status) have asked for this kind */
export async function requestsForKind(id: string) {
  const snap = await db.collection("sewingMachineApplications").where(`request.${id}`, ">", 0).count().get()
  return snap.data().count
}
