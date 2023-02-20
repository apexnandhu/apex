import {
  OAuth2,
  SSOProfileJson,
  SSOProviderType,
  SSOUser,
  User,
} from "../documents"
import { SaveUserOpts } from "./user"

export interface JwtClaims {
  preferred_username?: string
  email?: string
}

export interface SSOAuthDetails {
  profile?: SSOProfile
  oauth2: OAuth2
  provider: string
  providerType: SSOProviderType
  email?: string
  userId: string
}

export interface SSOProfile {
  id: string
  name?: {
    givenName?: string
    familyName?: string
  }
  _json: SSOProfileJson
  provider?: string
}

export type SaveSSOUserFunction = (
  user: SSOUser,
  opts: SaveUserOpts
) => Promise<User>
