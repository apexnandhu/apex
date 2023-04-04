import { Hosting } from "../../sdk"

export interface CreateAccountRequest {
  email: string
  tenantId: string
  hosting: Hosting
  size: string
  profession: string
  // optional fields
  tenantName?: string
  name?: string
  password: string
}