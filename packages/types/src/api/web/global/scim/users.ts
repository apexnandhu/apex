import { ScimResource, ScimMeta, ScimPatchOperation } from "scim-patch"
import { ScimListResponse } from "./shared"

export interface ScimUserResponse extends ScimResource {
  schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"]
  id: string
  externalId: string
  meta: ScimMeta & {
    resourceType: "User"
  }
  userName: string
  name: {
    formatted: string
    familyName: string
    givenName: string
  }
  active: boolean
  emails: [
    {
      value: string
      type: "work"
      primary: true
    }
  ]
}

export interface ScimCreateUserRequest {
  schemas: [
    "urn:ietf:params:scim:schemas:core:2.0:User",
    "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"
  ]
  externalId: string
  userName: string
  active: boolean
  emails: [
    {
      primary: true
      type: "work"
      value: string
    }
  ]
  meta: {
    resourceType: "User"
  }
  name: {
    formatted: string
    familyName: string
    givenName: string
  }
  roles: []
}

export interface ScimUpdateRequest {
  schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"]
  Operations: ScimPatchOperation[]
}

export interface ScimUserListResponse
  extends ScimListResponse<ScimUserResponse> {}
